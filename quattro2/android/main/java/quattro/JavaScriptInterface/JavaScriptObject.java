//
//	JavaScriptObject.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import java.util.HashMap;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

abstract public class JavaScriptObject {

	protected JavaScriptHandler handler;

	public JavaScriptObject(JavaScriptHandler h) {
		handler = h;
	}

	abstract public String getInterfaceName();
	abstract public void onDestroy();
	public void onPause() {};
	public void onResume() {};

	protected Context getApplicationContext() {
		return handler.getContext();
	}

	protected void postEvent(String ev) {
		handler.postEvent(ev);
	}

	static byte[] toByteArray(String hexString) {
		int len = hexString.length() / 2;
		byte[] data = new byte[len];
		for (int i = 0, j = 0; (len-- > 0); ) {
			data[j++] = (byte)(
				(Character.digit(hexString.charAt(i++), 16) << 4) +
				(Character.digit(hexString.charAt(i++), 16))
			);
		}
		return data;
	}

	static String toHexString(byte[] b) {
		return toHexString(b, b.length);
	}

	private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();
	static String toHexString(byte[] b, int length) {
		char[] hex = new char[length * 2];
		for (int i = 0, j = 0; i < length; i++, j += 2) {
			int v = b[i] & 0xff;
			hex[j + 0] = HEX_ARRAY[v >>> 4 ];
			hex[j + 1] = HEX_ARRAY[v & 0x0f];
		}
		return new String(hex);
	}

	static HashMap<String,Object> map(String json) throws JSONException {
		HashMap<String,Object> map = new HashMap<String,Object>();
		JSONObject root = new JSONObject(json);

		map.put(quattro.MIDIClient.MIDIClient.deviceNameKey,
				root.getString(quattro.MIDIClient.MIDIClient.deviceNameKey));
		map.put(quattro.MIDIClient.MIDIClient.entityNameKey,
				root.getString(quattro.MIDIClient.MIDIClient.entityNameKey));
		map.put(quattro.MIDIClient.MIDIClient.endpointUIDKey,
				root.getString(quattro.MIDIClient.MIDIClient.endpointUIDKey));
		map.put(quattro.MIDIClient.MIDIClient.endpointIndexKey,
				root.getString(quattro.MIDIClient.MIDIClient.endpointIndexKey));
		return map;
	}

}
