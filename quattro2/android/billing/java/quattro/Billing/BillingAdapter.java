//
//	BillingAdapter.java (Billing)
//
//	Copyright 2021 Roland Corporation. All rights reserved.
//

package quattro.Billing;

import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.Purchase;

public interface BillingAdapter {

	public abstract boolean isConsumable(String skuId);
	public abstract void onPurchaseStateUpdated(String skuId, int state);
	public abstract void onPurchasePayment(BillingManager billingManager, Purchase purchase);
	public abstract void alertQuerySkuDetailsError(BillingResult billingResult);

}
