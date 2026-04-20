//
//	Store.java (Billing)
//
//	Copyright 2021 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClient.ProductType;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingFlowParams.ProductDetailsParams;
import com.android.billingclient.api.BillingFlowParams.SubscriptionUpdateParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import quattro.Billing.BillingAdapter;
import quattro.Billing.BillingManager;
import quattro.app.R;

public class Store extends JavaScriptObject implements BillingAdapter {

	private final String interfaceName = "store";

	public static final String SkuDetailsType = "type";
	public static final String SkuDetailsId = "id";
	public static final String SkuDetailsTitle = "title";
	public static final String SkuDetailsDescription = "desc";
	public static final String SkuDetailsPrice = "price";
	public static final String SkuDetailsSubscription = "subscription";
	public static final String SkuDetailsFreeTrial = "freetrial";
	public static final String SkuDetailsIntroductory = "introductory";
	public static final String SkuDetailsIntroPrice = "introprice";
	public static final String SkuDetailsPayUpFront = "payupfront";

	public String getInterfaceName() {
		return interfaceName;
	}

	public Store(JavaScriptHandler h) {
		super(h);
		BillingManager billingManager = handler.getBillingManager();
		billingManager.setAdapter(this);
	}

	@Override
	public void onDestroy() {
		BillingManager billingManager = handler.getBillingManager();
		billingManager.destroy();
	}

	@JavascriptInterface
	public void query(String products) {
		try {
			JSONArray array = new JSONArray(products);
			if (array.length() > 0) {
				final List<String> skuList = new ArrayList<String>();
				for (int i = 0; i < array.length(); i++) {
					skuList.add(array.getString(i));
				}
				querySkuDetailsAsync(skuList);
			}
		} catch (JSONException e) { }
	}

	@JavascriptInterface
	public void launchflow(String _params) {
		try {
			JSONObject params = new JSONObject(_params);
			String skuType = params.getString(SkuDetailsType);
			String skuId = params.getString(SkuDetailsId);

			BillingManager billingManager = handler.getBillingManager();
			BillingFlowParams.Builder builder = BillingFlowParams.newBuilder();
			if (!params.isNull("account") && !params.getString("account").isEmpty()) {
				builder.setObfuscatedAccountId(params.getString("account"));
			}
			if (!params.isNull("old") && !params.getString("old").isEmpty()) {
				String oldSku = params.getString("old");
				String purchaseToken = null;
				List<Purchase> purchaseList = billingManager.queryPurchases(skuType);
				for (Purchase purchase : purchaseList) {
					if (purchase.getProducts().get(0).equals(oldSku)) {
						purchaseToken = purchase.getPurchaseToken();
						break;
					}
				}
				if (purchaseToken != null) {
					int replaceSkusProrationMode = SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION;
					if (!params.isNull("proration")) {
						replaceSkusProrationMode = params.getInt("proration");
					}
					BillingFlowParams.SubscriptionUpdateParams subscriptionUpdateParams =
							BillingFlowParams.SubscriptionUpdateParams.newBuilder()
							.setOldPurchaseToken(purchaseToken)
							.setSubscriptionReplacementMode(replaceSkusProrationMode)
							.build();
					builder.setSubscriptionUpdateParams(subscriptionUpdateParams);
				}
			}
			startPurchaseFlow(skuType, skuId, builder);
		} catch (JSONException e) { }
	}

	@JavascriptInterface
	public void accept(String originalJson) {
		try {
			String orderId = (new JSONObject(originalJson)).getString("orderId");
			BillingManager billingManager = handler.getBillingManager();
			List<Purchase> purchasesList = billingManager.queryAllPurchases();
			if (purchasesList != null) {
				for (Purchase purchase : purchasesList) {
					if (purchase.getOrderId().equals(orderId))  {
						billingManager.acknowledgePurchase(purchase);
						return;
					}
				}
			}
		} catch (JSONException e) { }
	}

	@JavascriptInterface
	public void recover() {
		BillingManager billingManager = handler.getBillingManager();
		List<Purchase> purchasesList = billingManager.queryAllPurchases();
		if (purchasesList != null) {
			for (Purchase purchase : purchasesList) {
				if ((purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED)
						&& !purchase.isAcknowledged()) {
					onPurchaseStateUpdated(purchase.getProducts().get(0), BillingManager.PURCHASE_STATE_PAYMENT);
					onPurchasePayment(billingManager, purchase);
				}
			}
		}
	}

	private void querySkuDetailsAsync(final List<String> skuList) {
		final BillingManager billingManager = handler.getBillingManager();
		billingManager.querySkuDetailsAsync(ProductType.INAPP, skuList, new ProductDetailsResponseListener() {
			@Override
			public void onProductDetailsResponse(BillingResult billingResult, final List<ProductDetails> productDetailsList) {
				if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
					billingManager.querySkuDetailsAsync(ProductType.SUBS, skuList, new ProductDetailsResponseListener() {
						@Override
						public void onProductDetailsResponse(BillingResult billingResult, List<ProductDetails> productDetailsListSubs) {
							if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
								productDetailsList.addAll(productDetailsListSubs);
								JSONArray array = new JSONArray(getSkuDetailsList(productDetailsList));
								postEvent(getInterfaceName() + "\f" + "reply" + "\f" + array.toString());
							}
						}
					});
				}
			}
		});
	}

	private ArrayList<HashMap<String, Object>> getSkuDetailsList(List<ProductDetails> ProductDetailsList) {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		if (ProductDetailsList != null) {
			for (ProductDetails productDetails : ProductDetailsList) {
				HashMap<String, Object> map = new HashMap<String, Object>();
				map.put(SkuDetailsType, productDetails.getProductType());
				map.put(SkuDetailsId, productDetails.getProductId());
				map.put(SkuDetailsTitle, productDetails.getTitle());
				map.put(SkuDetailsDescription, productDetails.getDescription());
				if (productDetails.getProductType().equals(ProductType.SUBS)) {
					ProductDetails.SubscriptionOfferDetails plan = productDetails.getSubscriptionOfferDetails().get(0);
					List<ProductDetails.PricingPhase> pricingPhaseList = plan.getPricingPhases().getPricingPhaseList();
					int lastIndex = pricingPhaseList.size() - 1;
					map.put(SkuDetailsPrice, pricingPhaseList.get(lastIndex).getFormattedPrice());
					map.put(SkuDetailsSubscription, pricingPhaseList.get(lastIndex).getBillingPeriod());
					map.put(SkuDetailsFreeTrial, "");
					map.put(SkuDetailsIntroductory, "");
					map.put(SkuDetailsIntroPrice, "");
					for (int index = 0; index < lastIndex; index++) {
						if (pricingPhaseList.get(index).getPriceAmountMicros() == 0) {
							map.put(SkuDetailsFreeTrial, pricingPhaseList.get(index).getBillingPeriod());
						} else {
							map.put(SkuDetailsIntroductory, pricingPhaseList.get(index).getBillingPeriod());
							map.put(SkuDetailsIntroPrice, pricingPhaseList.get(index).getFormattedPrice());
						}
					}
				} else {
					map.put(SkuDetailsPrice, productDetails.getOneTimePurchaseOfferDetails().getFormattedPrice());
					map.put(SkuDetailsSubscription, "");
					map.put(SkuDetailsFreeTrial, "");
					map.put(SkuDetailsIntroductory, "");
					map.put(SkuDetailsIntroPrice, "");
				}
				map.put(SkuDetailsPayUpFront, Boolean.FALSE);
				list.add(map);
			}
		}
		return list;
	}

	private void startPurchaseFlow(String skuType, String skuId, final BillingFlowParams.Builder builder) throws JSONException {
		BillingManager billingManager = handler.getBillingManager();
		billingManager.querySkuDetailsAsync(skuType, Arrays.asList(skuId), new ProductDetailsResponseListener() {
			@Override
			public void onProductDetailsResponse(BillingResult billingResult, List<ProductDetails> productDetailsList) {
				if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
					BillingManager billingManager = handler.getBillingManager();
					if (productDetailsList != null && !productDetailsList.isEmpty()) {
						List<ProductDetailsParams> paramsList = new ArrayList<>();
						for (ProductDetails productDetails : productDetailsList) {
							BillingFlowParams.ProductDetailsParams.Builder params = ProductDetailsParams.newBuilder().setProductDetails(productDetails);
							if (productDetails.getProductType().equals(ProductType.SUBS)) {
								params.setOfferToken(productDetails.getSubscriptionOfferDetails().get(0).getOfferToken());
							}
							paramsList.add(params.build());
						}
						builder.setProductDetailsParamsList(paramsList);
						BillingFlowParams billingFlowParams = builder.build();
						billingManager.launchBillingFlow(handler.getMainActivity(), billingFlowParams);
					} else {
						billingManager.alertQuerySkuDetailsError(billingResult);
					}
				}
			}
		});
	}

	@Override /* BillingAdapter */
	public boolean isConsumable(String skuId) {
		return handler.isConsumable(skuId);
	}

	@Override /* BillingAdapter */
	public void onPurchaseStateUpdated(String skuId, int state) {
		postEvent(getInterfaceName() + "\f" + "changed" + "\f" + skuId + "\f" + state);
	}

	@Override /* BillingAdapter */
	public void onPurchasePayment(BillingManager billingManager, Purchase purchase) {
		//billingManager.acknowledgePurchase(purchase);
		postEvent(getInterfaceName() + "\f" + "purchased" + "\f" + purchase.getOriginalJson() + "\f" + purchase.getSignature());
	}

	@Override /* BillingAdapter */
	public void alertQuerySkuDetailsError(BillingResult billingResult) {
		Toast.makeText(handler.getMainActivity(), R.string.query_products, Toast.LENGTH_LONG).show();
	}

}
