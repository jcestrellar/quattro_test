//
//	BillingProvider.java (Billing)
//
//	Copyright 2021 Roland Corporation. All rights reserved.
//

package quattro.Billing;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClient.ProductType;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingClient.BillingResponseCode;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.CountDownLatch;

public class BillingManager implements PurchasesUpdatedListener {

	private static final String TAG = "BillingManager";

	public static final int PURCHASE_STATE_NONE = 0;
	public static final int PURCHASE_STATE_PURCHASING = 1;
	public static final int PURCHASE_STATE_PENDING = 2;
	public static final int PURCHASE_STATE_PAYMENT = 3;
	public static final int PURCHASE_STATE_PURCHASED = 4;

	private final BillingClient mBillingClient;

	private Queue<Runnable> pendingQueue = new LinkedList<Runnable>();
	private BillingAdapter adapter = null;

	public BillingManager(Context context) {
		PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
				.enableOneTimeProducts()
				.enablePrepaidPlans()
				.build();
		mBillingClient = BillingClient.newBuilder(context)
							.enablePendingPurchases(pendingPurchasesParams)
							.setListener(this)
							.build();
	}

	public void setAdapter(BillingAdapter adapter) {
		this.adapter = adapter;
		startServiceConnection(null);
	}

	public void destroy() {
		mBillingClient.endConnection();
	}

	private void startServiceConnection(Runnable executeOnSuccess) {
		if (mBillingClient.isReady()) {
			if (executeOnSuccess != null) {
				executeOnSuccess.run();
			}
		} else {
			if (executeOnSuccess != null) {
				synchronized (pendingQueue) {
					pendingQueue.add(executeOnSuccess);
				}
			}
			mBillingClient.startConnection(new BillingClientStateListener() {
				@Override
				public void onBillingSetupFinished(BillingResult billingResult) {
					if (billingResult.getResponseCode() == BillingResponseCode.OK) {
						Runnable execute;
						synchronized (pendingQueue) {
							while ((execute = pendingQueue.poll()) != null) {
								execute.run();
							}
						}
					} else {
						Log.w(TAG, "onBillingSetupFinished() error: " + billingResult.getResponseCode());
					}
				}
				@Override
				public void onBillingServiceDisconnected() {
					Log.w(TAG, "onBillingServiceDisconnected()");
				}
			});
		}
	}

	public void querySkuDetailsAsync(final String skuType, final List<String> skuList, final ProductDetailsResponseListener listener) {
		BillingResult billingResult = mBillingClient.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS);
		if (skuType.equals(ProductType.SUBS) && (billingResult.getResponseCode() != BillingResponseCode.OK)) {
			billingResult = BillingResult.newBuilder().setResponseCode(BillingResponseCode.OK).build();
			listener.onProductDetailsResponse(billingResult, new ArrayList<ProductDetails>());
		} else {
			Runnable executeOnConnectedService = new Runnable() {
				@Override
				public void run() {
					List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
					for (String skuId : skuList) {
						QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
								.setProductId(skuId)
								.setProductType(skuType)
								.build();
						productList.add(product);
					}
					QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
							.setProductList(productList)
							.build();
					mBillingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
						@Override
						public void onProductDetailsResponse(BillingResult billingResult, List<ProductDetails> productDetailsList) {
							if (billingResult.getResponseCode() != BillingResponseCode.OK) {
								alertQuerySkuDetailsError(billingResult);
							}
							listener.onProductDetailsResponse(billingResult, productDetailsList);
						}
					});
				}
			};
			startServiceConnection(executeOnConnectedService);
		}
	}

	public void alertQuerySkuDetailsError(BillingResult billingResult) {
		adapter.alertQuerySkuDetailsError(billingResult);
	}

	public void launchBillingFlow(final Activity activity, final BillingFlowParams billingFlowParams) {
		new Handler(Looper.getMainLooper()).post(new Runnable() {
			@Override
			public void run() {
				BillingResult billingResult = mBillingClient.launchBillingFlow(activity, billingFlowParams);
				if (billingResult.getResponseCode() != BillingResponseCode.OK) {
					Log.w(TAG, "launchBillingFlow() error: " + billingResult.getResponseCode());
				}
			}
		});
	}

	@Override
	public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchasesList) {
		if (billingResult.getResponseCode() == BillingResponseCode.OK) {
			if (purchasesList != null) {
				for (Purchase purchase : purchasesList) {
					if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
						adapter.onPurchaseStateUpdated(purchase.getProducts().get(0), PURCHASE_STATE_PENDING);
					} else if ((purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) && !purchase.isAcknowledged()) {
						adapter.onPurchaseStateUpdated(purchase.getProducts().get(0), PURCHASE_STATE_PAYMENT);
						adapter.onPurchasePayment(this, purchase);
					}
				}
			}
		}
	}

	public void acknowledgePurchase(final Purchase purchase) {
		if (adapter.isConsumable(purchase.getProducts().get(0))) {
			consumePurchase(purchase);
			return;
		}
		AcknowledgePurchaseParams acknowledgePurchaseParams =
				AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build();
		mBillingClient.acknowledgePurchase(acknowledgePurchaseParams, new AcknowledgePurchaseResponseListener() {
			@Override
			public void onAcknowledgePurchaseResponse(BillingResult billingResult) {
				if (billingResult.getResponseCode() == BillingResponseCode.OK) {
					adapter.onPurchaseStateUpdated(purchase.getProducts().get(0), PURCHASE_STATE_PURCHASED);
				} else {
					Log.w(TAG, "onAcknowledgePurchaseResponse() error: " + billingResult.getResponseCode());
				}
			}
		});
	}

	public void consumePurchase(final Purchase purchase) {
		ConsumeParams consumeParams =
				ConsumeParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build();
		mBillingClient.consumeAsync(consumeParams, new ConsumeResponseListener() {
			@Override
			public void onConsumeResponse(BillingResult billingResult, String purchaseToken) {
				if (billingResult.getResponseCode() == BillingResponseCode.OK) {
					adapter.onPurchaseStateUpdated(purchase.getProducts().get(0), PURCHASE_STATE_PURCHASED);
				} else {
					Log.w(TAG, "onConsumeResponse() error: " + billingResult.getResponseCode());
				}
			}
		});
	}

	public List<Purchase> queryPurchases(String skuType) {
		BillingResult billingResult = mBillingClient.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS);
		if (skuType.equals(ProductType.SUBS) && (billingResult.getResponseCode() != BillingResponseCode.OK)) {
			return new ArrayList<Purchase>();
		}
		CountDownLatch latch = new CountDownLatch(1);
		List<Purchase> list = new ArrayList<Purchase>();
		new Thread() {
			public void run() {
			mBillingClient.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(skuType).build(), new PurchasesResponseListener() {
				@Override
				public void onQueryPurchasesResponse(BillingResult billingResult, List<Purchase> purchases) {
					if (billingResult.getResponseCode() == BillingResponseCode.OK) {
						list.addAll(purchases);
					}
					latch.countDown();
				}
			});
			}
		}.start();
		try {
			latch.await();
		} catch (InterruptedException e) {}
		return list;
	}

	public List<Purchase> queryAllPurchases() {
		List<Purchase> purchasesList = queryPurchases(ProductType.INAPP);
		if (purchasesList == null) return null;
		List<Purchase> purchasesListSubs = queryPurchases(ProductType.SUBS);
		if (purchasesListSubs == null) return null;
		purchasesList.addAll(purchasesListSubs);
		return purchasesList;
	}

}
