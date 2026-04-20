//
//	MIDIOutputPort.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;

public class MIDIOutputPort
{
	private WeakReference<MIDIClient> client = null;

	public MIDIOutputPort(MIDIClient c) {
		client = new WeakReference<MIDIClient>(c);
	}

	public ArrayList<HashMap<String, Object>> endpoints() {
		return client.get().server.getOutputEndpoints();
	}

	public void connectEndpoint(HashMap<String,Object> ep) {
		if (!client.get().server.connectEndpoint(this, ep)) {
			client.get().delegate.midiOutputPortConnectFailed(ep);
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

	public void send(byte[] msg) {
		client.get().server.output(this, msg);
	}

}
