//
//	RolandWirelessConnect.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.WirelessConnect.*;

import android.webkit.JavascriptInterface;
import java.util.HashMap;
import org.json.JSONException;
import org.json.JSONObject;

public class RolandWirelessConnect extends JavaScriptObject
{
	private final String interfaceName = "rwc";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _RWCDiscoveryDelegate implements RWCDiscoveryDelegate {
		public void discoveryDeviceDidFound(HashMap<String,Object> device) {
			JSONObject json = new JSONObject(device);
			postEvent(getInterfaceName() + "\f" + "found" + "\f" + json.toString());
		}
	}

	private class _RWCConnectionDelegate implements RWCConnectionDelegate, RWCMIDIServiceDelegate {
		public void connectionFailed(HashMap<String,Object> device) {
			JSONObject json = new JSONObject(device);
			postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + json.toString());
		}
		public void connectionDidEstablished(HashMap<String,Object> device) {
			JSONObject json = new JSONObject(device);
			postEvent(getInterfaceName() + "\f" + "connected" + "\f" + json.toString());
		}
		public void connectionDidClosed(HashMap<String,Object> device) {
			JSONObject json = new JSONObject(device);
			postEvent(getInterfaceName() + "\f" + "closed" + "\f" + json.toString());
		}
		public void connectionErrorDidOccur(HashMap<String,Object> device) {
			JSONObject json = new JSONObject(device);
			postEvent(getInterfaceName() + "\f" + "error" + "\f" + json.toString());
		}
		public void midiInputMessage(byte[] msg, long msec, int cable) {
			postEvent(getInterfaceName() + "\f" + "message" + "\f" + toHexString(msg));
		}
	}

	private RWCDiscovery discovery = null;
	private RWCConnection conn = null;

	public RolandWirelessConnect(JavaScriptHandler h) {
		super(h);
		discovery = new RWCDiscovery();
		discovery.delegate = new _RWCDiscoveryDelegate();
		conn = new RWCConnection();
		_RWCConnectionDelegate _conn = new _RWCConnectionDelegate();
		conn.delegate = _conn;
		conn.midiService.delegate = _conn;
	}

	@JavascriptInterface
	public String device() {
		if (conn.device != null) {
			JSONObject json = new JSONObject(conn.device);
			return json.toString();
		}
		return null;
	}

	@JavascriptInterface
	public void discovery() {
		discovery.search();
	}

	@JavascriptInterface
	public void connect(String json) throws JSONException {

		HashMap<String,Object> map = new HashMap<String,Object>();
		JSONObject root = new JSONObject(json);

		map.put(RWCProtocol.deviceAddressKey,		root.getString(RWCProtocol.deviceAddressKey));
		map.put(RWCProtocol.devicePortNoKey,		root.getString(RWCProtocol.devicePortNoKey));
		map.put(RWCProtocol.deviceUIDKey,			root.getString(RWCProtocol.deviceUIDKey));
		map.put(RWCProtocol.deviceCapsKey,			root.getString(RWCProtocol.deviceCapsKey));
		map.put(RWCProtocol.deviceImageKey,			root.getString(RWCProtocol.deviceImageKey));
		map.put(RWCProtocol.deviceStatusKey,		root.getString(RWCProtocol.deviceStatusKey));
		map.put(RWCProtocol.deviceManufacturerKey,	root.getString(RWCProtocol.deviceManufacturerKey));
		map.put(RWCProtocol.deviceVersionKey,		root.getString(RWCProtocol.deviceVersionKey));
		map.put(RWCProtocol.deviceNameKey,			root.getString(RWCProtocol.deviceNameKey));

		conn.connect(map);
	}

	@JavascriptInterface
	public void disconnect() {
		conn.disconnect();
	}

	@JavascriptInterface
	public void send(String msg) {
		conn.midiService.send(toByteArray(msg));
	}

	@JavascriptInterface
	public void inputmode(int mode) {
		conn.inputStream.inputMode(mode);
	}

	@JavascriptInterface
	public int timeout(int seconds) {
		conn.connectTimeout(seconds);
		return conn.connectTimeout();
	}

	@JavascriptInterface
	public int timeout() {
		return conn.connectTimeout();
	}

	@JavascriptInterface
	public int keepalive(int seconds) {
		conn.keepAliveTimeout(seconds);
		return conn.keepAliveTimeout();
	}

	@JavascriptInterface
	public int keepalive() {
		return conn.keepAliveTimeout();
	}

	@Override
	public void onDestroy() {
		if (discovery != null) {
			discovery.delegate = null;
			discovery.destroy();
			discovery = null;
		}
		if (conn != null) {
			conn.midiService.delegate = null;
			conn.delegate = null;
			conn.destroy();
			conn = null;
		}
	}

}
