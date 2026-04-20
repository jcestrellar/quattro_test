//
//	Utility.java
//
//	Copyright 2018 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.webkit.JavascriptInterface;

import java.io.UnsupportedEncodingException;

public class Utility extends JavaScriptObject {

	private final String interfaceName = "util";

	public String getInterfaceName() {
		return interfaceName;
	}

	public Utility(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
	}

	@JavascriptInterface
	public String bytes(String text) {
		try {
			byte[] bytes = text.getBytes("UTF-8");
			return toHexString(bytes);
		} catch (UnsupportedEncodingException e) {
			return "";
		}
	}

	@JavascriptInterface
	public String text(String bytes) {
		try {
			return new String(toByteArray(bytes), "UTF-8");
		} catch (UnsupportedEncodingException e) {
			return "";
		}
	}

}
