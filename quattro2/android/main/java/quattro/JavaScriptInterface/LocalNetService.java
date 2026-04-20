//
//	LocalNetService.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Network.*;

import android.webkit.JavascriptInterface;

import org.json.JSONException;
import org.json.JSONObject;

public class LocalNetService extends JavaScriptObject {

	private final String interfaceName = "netservice";

	public String getInterfaceName() {
		return interfaceName;
	}

	private NetServiceDiscovery discovery = null;

	public LocalNetService(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onPause() {
		stop();
	}

	@Override
	public void onDestroy() {
		if (discovery != null) {
			discovery.stop();
			discovery = null;
		}
	}

	@JavascriptInterface
	public boolean search(String serviceType) {
		if (discovery == null) {
			discovery = new NetServiceDiscovery(getApplicationContext(), discoveryListener);
		}
		return discovery.search(serviceType);
	}

	@JavascriptInterface
	public void stop() {
		if (discovery != null) {
			discovery.stop();
		}
	}

	private NetServiceDiscoveryDelegate discoveryListener = new NetServiceDiscoveryDelegate() {

		@Override
		public void netServiceDidResolve(String name, String address, int port) {
			JSONObject obj = new JSONObject();
			try {
				obj.put("name", name);
				obj.put("address", address);
				obj.put("port",	Integer.valueOf(port));
				postEvent(getInterfaceName() + "\f" + "resolved" + "\f" + obj.toString());
			} catch (JSONException e) {}
		}

		@Override
		public void netServiceDidRemoveService(String name) {
			postEvent(getInterfaceName() + "\f" + "lost" + "\f" + name);
		}

		@Override
		public void netServiceDidStopSearch(int errorCode) {
			String error = (errorCode != 0) ? ("" + errorCode) : "";
			postEvent(getInterfaceName() + "\f" + "stopped" + "\f" + error);
		}
	};

}
