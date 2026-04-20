//
//  NativeCall+store.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

#ifdef USE_IN_APP_PURCHASE
static NSString *const OBJ_NAME = @"store";

static NSString *const kProductType          = @"type";
static NSString *const kProductId            = @"id";
static NSString *const kProductTitle	     = @"title";
static NSString *const kProductDescription   = @"desc";
static NSString *const kProductFamilySharing = @"family";
static NSString *const kProductPrice         = @"price";
static NSString *const kProductSubscription  = @"subscription";
static NSString *const kProductFreeTrial     = @"freetrial";
static NSString *const kProductIntroductory  = @"introductory";
static NSString *const kProductIntroPrice    = @"introprice";
static NSString *const kProductPayUpFront    = @"payupfront";

NSString *const kPaymentOrderId      = @"orderId";
NSString *const kPaymentProductId    = @"productId";
NSString *const kPaymentQuantity     = @"quantity";
NSString *const kPaymentPackageName  = @"packageName";
NSString *const kPaymentAccountId    = @"obfuscatedAccountId";
NSString *const kPaymentPurchaseTime = @"purchaseTime";
NSString *const kPaymentReceipt      = @"jwsRepresentation";
#endif

@interface NativeCall (store) @end

@implementation NativeCall (store)

- (NSString *)$$store_query:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_IN_APP_PURCHASE
	NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
	NSArray *productIDs = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
	[store getProductsWithProductIDs:productIDs completionHandler:^(NSArray *results) {
		NSMutableArray *array = [[[NSMutableArray alloc] init] autorelease];
		for (ProductDetails *details in results) {
			NSDictionary *dict = @{
				kProductType: details.type,
				kProductId: details.productID,
				kProductTitle: details.displayName,
				kProductDescription: details.localizedDescription,
				kProductFamilySharing: @(details.isFamilyShareable),
				kProductPrice: details.displayPrice,
				kProductSubscription: details.subscriptionPeriod ? details.subscriptionPeriod : @"",
				kProductFreeTrial: details.freeTrialPeriod ? details.freeTrialPeriod : @"",
				kProductIntroductory: details.introductoryPeriod ? details.introductoryPeriod: @"",
				kProductIntroPrice: details.introductoryPrice ? details.introductoryPrice : @"",
				kProductPayUpFront: @(details.payUpFront)
			};
			[array addObject:dict];
		}
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"reply", JSONStringWithObject(array)];
		[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
	}];
#endif
	undefined;
}

- (NSString *)$$store_launchflow:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_IN_APP_PURCHASE
	NSDictionary *dict = dictionaryWithJSONString(param1);
	NSString *productID = [dict objectForKey:kProductId];
	NSInteger value = [[dict objectForKey:kPaymentQuantity] integerValue];
	NSInteger quantity = MAX(1, MIN(value, 10));
	NSString *account = [dict objectForKey:@"account"];
	[store purchaseWithProductID:productID quantity:quantity appAccountToken:account completionHandler:^{}];
#endif
	undefined;
}

- (NSString *)$$store_accept:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_IN_APP_PURCHASE
	NSDictionary *dict = dictionaryWithJSONString(param1);
	NSNumber *transactionID = [dict objectForKey:kPaymentOrderId];
	[store finishTransactionWithTransactionID:[transactionID unsignedLongLongValue] completionHandler:^{}];
#endif
	undefined;
}

- (NSString *)$$store_recover:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_IN_APP_PURCHASE
	[store checkForUnfinishedTransactionsWithCompletionHandler:^{}];
#endif
	undefined;
}

@end

#ifdef USE_IN_APP_PURCHASE
@implementation _StoreManagerDelegate

- (void)updateStateWithProductID:(NSString *)productID state:(NSInteger)state
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%d", OBJ_NAME, @"changed", productID, (int)state];
	[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

- (void)purchasedWithReceipt:(Receipt *)receipt
{
	NSMutableDictionary *dict = [NSMutableDictionary dictionary];
	[dict setDictionary:@{
		kPaymentOrderId: @(receipt.transactionID),
		kPaymentProductId: receipt.productID,
		kPaymentQuantity: @(receipt.purchasedQuantity),
		kPaymentPackageName: receipt.appBundleID,
		kPaymentPurchaseTime: @(receipt.purchaseTime * 1000),
		kPaymentReceipt: receipt.jwsRepresentation
	}];
	if (receipt.appAccountToken.length) {
		dict[kPaymentAccountId] = receipt.appAccountToken;
	}

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"purchased", JSONStringWithObject(dict), @""];
	[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

- (void)revokedWithProductID:(NSString *)productID
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"revoked", JSONStringWithObject(@[productID])];
	[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

@end
#endif
