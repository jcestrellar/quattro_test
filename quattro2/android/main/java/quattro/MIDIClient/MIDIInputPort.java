//
//	MIDIInputPort.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;

public class MIDIInputPort
{
	private WeakReference<MIDIClient> client = null;

	public MIDIInputDelegate delegate = null;

	public MIDIInputPort(MIDIClient c) {
		client = new WeakReference<MIDIClient>(c);
	}

	public ArrayList<HashMap<String, Object>> endpoints() {
		return client.get().server.getInputEndpoints();
	}

	public void connectEndpoint(HashMap<String,Object> ep) {
		if (!client.get().server.connectEndpoint(this, ep)) {
			client.get().delegate.midiInputPortConnectFailed(ep);
		}
	}

	public void connectAllEndpoints() {
		client.get().server.connectAllEndpoints(this);
	}

	public void disconnectEndpoint(HashMap<String,Object> ep) {
		client.get().server.disconnectEndpoint(this, ep);
	}

	public void disconnectAllEndpoints() {
		client.get().server.disconnectAllEndpoints(this);
	}

	public void input(byte[] msg, long msec) {
		if (delegate != null) {
			delegate.midiInputMessage(msg, msec);
		}
	}

}
