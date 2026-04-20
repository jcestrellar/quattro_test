//
//	Store.java (Basic)
//
//	Copyright 2021 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.webkit.JavascriptInterface;

public class Store extends JavaScriptObject
{
	private final String interfaceName = "store";

	public String getInterfaceName() {
		return interfaceName;
	}

	public Store(JavaScriptHandler h) {
		super(h);
	}

	@JavascriptInterface
	public void query(String products) { }
	@JavascriptInterface
	public void launchflow(String params) { }
	@JavascriptInterface
	public void accept(String originalJson) { }
	@JavascriptInterface
	public void recover() { }

	@Override
	public void onDestroy() { }
}
