//
//	MIDIXClient.java
//
//	Copyright 2018 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.MIDIClient.*;

import android.webkit.JavascriptInterface;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MIDIXClient extends JavaScriptObject
{
	private final String interfaceName = "midix";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _MIDIXClientDelegate implements MIDIClientDelegate, MIDIInputDelegate {
		final private int cid;
		public boolean thru;

		public _MIDIXClientDelegate(int id) { cid = id; thru = false; }

		public void midiInputPortConnectFailed(HashMap<String,Object> endpoint) {
			JSONObject json = new JSONObject(endpoint);
			postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + cid + "\f" + json.toString());
		}
		public void midiOutputPortConnectFailed(HashMap<String,Object> endpoint) {
			JSONObject json = new JSONObject(endpoint);
			postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + cid + "\f" + json.toString());
		}
		public void midiObjectAddedRemoved() {
			if (cid != 0) return;
			postEvent(getInterfaceName() + "\f" + "changed");
		}
		public void midiErrorDidOccur(int error) {
			postEvent(getInterfaceName() + "\f" + "error" + "\f" + cid + "\f" + String.valueOf(error));
		}
		public void midiInputMessage(byte[] msg, long msec) {
			if (thru) { clients[cid].outputPort.send(msg); }
			postEvent(getInterfaceName() + "\f" + "message" + "\f" + cid + "\f" + toHexString(msg) + "\f" + String.valueOf(msec));
		}
	}

	private quattro.MIDIClient.MIDIClient[] clients = null;

	public MIDIXClient(JavaScriptHandler h) {
		super(h);
	}

	@JavascriptInterface
	public void client(int count) {
		if (clients != null) return;
		clients = new quattro.MIDIClient.MIDIClient[count];
		for (int i = 0; i < count; i++) {
			quattro.MIDIClient.MIDIClient c = new quattro.MIDIClient.MIDIClient(handler.getMIDIServer());
			_MIDIXClientDelegate d = new _MIDIXClientDelegate(i);
			c.delegate = d;
			c.inputPort.delegate = d;
			clients[i] = c;
		}
	}

	@JavascriptInterface
	public String inendpoints() {
		JSONArray json = new JSONArray(clients[0].inputPort.endpoints());
		return json.toString();
	}

	@JavascriptInterface
	public void inconnect(int cid, String json) throws JSONException {
		clients[cid].inputPort.connectEndpoint(map(json));
	}

	@JavascriptInterface
	public void inconnect(int cid) {
		clients[cid].inputPort.connectAllEndpoints();
	}

	@JavascriptInterface
	public void indisconnect(int cid, String json) throws JSONException {
		clients[cid].inputPort.disconnectEndpoint(map(json));
	}

	@JavascriptInterface
	public void indisconnect(int cid) {
		clients[cid].inputPort.disconnectAllEndpoints();
	}

	@JavascriptInterface
	public String outendpoints() {
		JSONArray json = new JSONArray(clients[0].outputPort.endpoints());
		return json.toString();
	}

	@JavascriptInterface
	public void outconnect(int cid, String json) throws JSONException {
		clients[cid].outputPort.connectEndpoint(map(json));
	}

	@JavascriptInterface
	public void outconnect(int cid) {
		clients[cid].outputPort.connectAllEndpoints();
	}

	@JavascriptInterface
	public void outdisconnect(int cid, String json) throws JSONException {
		clients[cid].outputPort.disconnectEndpoint(map(json));
	}

	@JavascriptInterface
	public void outdisconnect(int cid) {
		clients[cid].outputPort.disconnectAllEndpoints();
	}

	@JavascriptInterface
	public void send(int cid, String msg) {
		clients[cid].outputPort.send(toByteArray(msg));
	}

	@JavascriptInterface
	public void thru(int cid, boolean enable) {
		((_MIDIXClientDelegate)clients[cid].delegate).thru = enable;
	}

	@JavascriptInterface
	public void panel() {
		handler.midiPanel();
	}

	@Override
	public void onDestroy() {
		if (clients != null) {
			for (int i = 0; i < clients.length; i++) {
				clients[i].inputPort.delegate = null;
				clients[i].delegate = null;
				clients[i].destroy();
				clients[i] = null;
			}
			clients = null;
		}
	}

}
