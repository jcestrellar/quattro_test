//
//	MIDIClient.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.MIDIClient.*;

import android.webkit.JavascriptInterface;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MIDIClient extends JavaScriptObject
{
	private final String interfaceName = "midi";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _MIDIClientDelegate implements MIDIClientDelegate, MIDIInputDelegate {
		public void midiInputPortConnectFailed(HashMap<String,Object> endpoint) {
			JSONObject json = new JSONObject(endpoint);
			postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + json.toString());
		}
		public void midiOutputPortConnectFailed(HashMap<String,Object> endpoint) {
			JSONObject json = new JSONObject(endpoint);
			postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + json.toString());
		}
		public void midiObjectAddedRemoved() {
			postEvent(getInterfaceName() + "\f" + "changed");
		}
		public void midiErrorDidOccur(int error) {
			postEvent(getInterfaceName() + "\f" + "error" + "\f" + String.valueOf(error));
		}
		public void midiInputMessage(byte[] msg, long msec) {
			postEvent(getInterfaceName() + "\f" + "message" + "\f" + toHexString(msg) + "\f" + String.valueOf(msec));
		}
	}

	quattro.MIDIClient.MIDIClient midi = null;

	public MIDIClient(JavaScriptHandler h) {
		super(h);
		midi = new quattro.MIDIClient.MIDIClient(h.getMIDIServer());
		_MIDIClientDelegate _midi = new _MIDIClientDelegate();
		midi.delegate = _midi;
		midi.inputPort.delegate = _midi;
	}

	@JavascriptInterface
	public String inendpoints() {
		JSONArray json = new JSONArray(midi.inputPort.endpoints());
		return json.toString();
	}

	@JavascriptInterface
	public void inconnect(String json) throws JSONException {
		midi.inputPort.connectEndpoint(map(json));
	}

	@JavascriptInterface
	public void inconnect() {
		midi.inputPort.connectAllEndpoints();
	}

	@JavascriptInterface
	public void indisconnect(String json) throws JSONException {
		midi.inputPort.disconnectEndpoint(map(json));
	}

	@JavascriptInterface
	public void indisconnect() {
		midi.inputPort.disconnectAllEndpoints();
	}

	@JavascriptInterface
	public String outendpoints() {
		JSONArray json = new JSONArray(midi.outputPort.endpoints());
		return json.toString();
	}

	@JavascriptInterface
	public void outconnect(String json) throws JSONException {
		midi.outputPort.connectEndpoint(map(json));
	}

	@JavascriptInterface
	public void outconnect() {
		midi.outputPort.connectAllEndpoints();
	}

	@JavascriptInterface
	public void outdisconnect(String json) throws JSONException {
		midi.outputPort.disconnectEndpoint(map(json));
	}

	@JavascriptInterface
	public void outdisconnect() {
		midi.outputPort.disconnectAllEndpoints();
	}

	@JavascriptInterface
	public void send(String msg) {
		midi.outputPort.send(toByteArray(msg));
	}

	@JavascriptInterface
	public void panel() {
		handler.midiPanel();
	}

	@Override
	public void onDestroy() {
		if (midi != null) {
			midi.inputPort.delegate = null;
			midi.delegate = null;
			midi.destroy();
			midi = null;
		}
	}

	public quattro.MIDIClient.MIDIClient getClient() {
		return midi;
	}
}
