//
//	StoreManager.swift
//
//	Copyright 2025 Roland Corporation. All rights reserved.
//

import Foundation
import StoreKit
#if os(iOS)
import UIKit
#elseif os(macOS)
import Cocoa
#endif

@objc protocol StoreManagerDelegate {
	func updateState(productID: String, state: Int)
	func purchased(receipt: StoreManager.Receipt)
	func revoked(productID: String)
}

@objcMembers
@MainActor
class StoreManager : NSObject {

	enum PurchaseState: Int {
		case none = 0
		case purchasing
		case pending
		case purchased
		case finished
	}

	@objc class ProductDetails: NSObject {
		@objc let productID: String
		@objc let type: String
		@objc let displayName: String
		@objc let displayPrice: String
		@objc let localizedDescription: String
		@objc let isFamilyShareable: Bool
		@objc var subscriptionPeriod: String?
		@objc var freeTrialPeriod: String?
		@objc var introductoryPeriod: String?
		@objc var introductoryPrice: String?
		@objc var payUpFront: Bool

		init(_ product: Product) {
			productID = product.id
			type = product.type.rawValue
			displayName = product.displayName
			displayPrice = product.displayPrice
			localizedDescription = product.description
			isFamilyShareable = product.isFamilyShareable
			payUpFront = false
		}

		func subscriptionInfo(_ subscription: Product.SubscriptionInfo) async {
			subscriptionPeriod = ISO8601Period(subscription.subscriptionPeriod.value, subscription.subscriptionPeriod.unit)
			if await subscription.isEligibleForIntroOffer {
				if let introductoryOffer = subscription.introductoryOffer {
					let value = introductoryOffer.period.value * introductoryOffer.periodCount
					let period = ISO8601Period(value, introductoryOffer.period.unit)
					switch introductoryOffer.paymentMode {
					case Product.SubscriptionOffer.PaymentMode.freeTrial:
						freeTrialPeriod = period
					case Product.SubscriptionOffer.PaymentMode.payUpFront:
						payUpFront = true
						fallthrough
					case Product.SubscriptionOffer.PaymentMode.payAsYouGo:
						introductoryPeriod = period
						introductoryPrice = introductoryOffer.displayPrice
					default: break
					}
				}
			}
		}

		private func ISO8601Period(_ value: Int, _ unit: Product.SubscriptionPeriod.Unit) -> String {
			switch unit {
			case .day:   return "P" + String(value) + "D"
			case .month: return "P" + String(value) + "W"
			case .week:  return "P" + String(value) + "M"
			case .year:  return "P" + String(value) + "Y"
			@unknown default: break
			}
			return ""
		}
	}

	@objc class Receipt : NSObject {
		@objc let transactionID: UInt64
		@objc let productID: String
		@objc let purchasedQuantity: Int
		@objc let purchaseTime: Int
		@objc let appBundleID: String
		@objc let appAccountToken: String?
		@objc let jwsRepresentation: String
		
		init(_ transaction: Transaction, _ jwsRepresentation: String) {
			transactionID = transaction.id
			productID = transaction.productID
			purchasedQuantity = transaction.purchasedQuantity
			purchaseTime = Int(transaction.purchaseDate.timeIntervalSince1970)
			appBundleID = transaction.appBundleID
			appAccountToken = transaction.appAccountToken?.uuidString
			self.jwsRepresentation = jwsRepresentation;
		}
	}

	private var transactionUpdatesTask: Task<Void, Never>? = nil
	weak var delegate: StoreManagerDelegate?

	override init() {
		super.init()
		transactionUpdatesTask = observeTransactionUpdates()
	}

	deinit {
		transactionUpdatesTask?.cancel()
	}

	private func observeTransactionUpdates() -> Task<Void, Never> {
		Task(priority: .background) {
			for await verificationResult in Transaction.updates {
				guard case .verified(let transaction) = verificationResult else {
					continue
				}
				if transaction.revocationDate == nil {
					purchased(transaction, verificationResult.jwsRepresentation)
				} else {
					delegate?.revoked(productID: transaction.productID)
				}
			}
		}
	}

	func getProducts(productIDs : [String]) async -> NSArray {
		var results: [ProductDetails] = []
		do {
			let products = try await Product.products(for: productIDs)
			for product in products {
				let details = ProductDetails(product)
				if let subscription = product.subscription {
					await details.subscriptionInfo(subscription)
				}
				results.append(details)
			}
		} catch {
			showAlert(message: error.localizedDescription)
		}
		return results as NSArray
	}

	func purchase(productID: String, quantity: Int, appAccountToken: String?) async {

		delegate?.updateState(productID: productID, state: PurchaseState.purchasing.rawValue)

		do {
			let products = try await Product.products(for: [productID])
			if products.count == 0 {
				throw Product.PurchaseError.productUnavailable
			}
			let product = products[0]
			var options: Set<Product.PurchaseOption> = []
			if let appAccountToken, let uuid = UUID(uuidString: appAccountToken) {
				options.insert(.appAccountToken(uuid))
			}
			if product.type == Product.ProductType.consumable {
				options.insert(.quantity(quantity))
			}
			let result = try await product.purchase(options: options)
			switch result {
			case .success(let verificationResult):
				switch verificationResult {
				case .verified(_):
					_ = await processTransaction(productID)
				case let .unverified(_, verificationError):
					throw verificationError
				}
			case .pending:
				delegate?.updateState(productID: productID, state: PurchaseState.pending.rawValue)
			case .userCancelled:
				delegate?.updateState(productID: productID, state: PurchaseState.none.rawValue)
				break
			@unknown default: break
			}
			return
		} catch Product.PurchaseError.productUnavailable {
			showAlert(message: String(localized:"!PRODUCT_NOT_AVAILABLE"))
		} catch Product.PurchaseError.purchaseNotAllowed {
			showAlert(message: String(localized:"!PAYMENT_NOT_AUTHORIZED"))
		} catch {
			var message = String(localized: "!COULD_NOT_BE_PURCHASED")
			message += "\n\n(\(error.localizedDescription))"
			showAlert(message: message)
		}
		delegate?.updateState(productID: productID, state: PurchaseState.none.rawValue)
	}

	private func processTransaction(_ productID: String) async -> Bool {
		for await verificationResult in Transaction.unfinished {
			guard case .verified(let transaction) = verificationResult else {
				continue
			}
			if transaction.productID == productID {
				purchased(transaction, verificationResult.jwsRepresentation)
				return true;
			}
		}
		delegate?.updateState(productID: productID, state: PurchaseState.none.rawValue)
		return false
	}

	private func purchased(_ transaction: Transaction, _ jwsRepresentation: String) {
		delegate?.updateState(productID: transaction.productID, state: PurchaseState.purchased.rawValue)
		delegate?.purchased(receipt: Receipt(transaction, jwsRepresentation))
	}

	func finishTransaction(transactionID : UInt64) async {
		for await verificationResult in Transaction.unfinished {
			guard case .verified(let transaction) = verificationResult else {
				continue
			}
			if transaction.id != transactionID {
				continue
			}
			await transaction.finish()
			delegate?.updateState(productID: transaction.productID, state: PurchaseState.finished.rawValue)
		}
	}

	func checkForUnfinishedTransactions() async {
		for await verificationResult in Transaction.unfinished {
			guard case .verified(let transaction) = verificationResult else {
				continue
			}
			purchased(transaction, verificationResult.jwsRepresentation)
		}
	}

#if os(iOS)
	static var viewController: UIViewController?
	class func setViewController(viewController: UIViewController) {
		self.viewController = viewController
	}
	
	private func showAlert(message: String) {
		let alert = UIAlertController(title: String(localized:"!PURCHASE"),
									  message: message,
									  preferredStyle: UIAlertController.Style.alert)
		alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
		StoreManager.viewController?.present(alert, animated: true, completion: nil)
	}
#elseif os(macOS)
	private func showAlert(message: String) {
		let alert = NSAlert()
		alert.messageText = String(localized:"!PURCHASE")
		alert.informativeText = message
		alert.addButton(withTitle: "OK")
		_ = alert.runModal()
	}
#else
	private func showAlert(message: String) {
	}
#endif

}
