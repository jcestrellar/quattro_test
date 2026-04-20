//
//	RWCMIDIService.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.lang.ref.WeakReference;

public class RWCMIDIService {

	private WeakReference<RWCConnection> conn = null;
	private boolean streaming = false;
	private float streamingDelayTime = RWCProtocol.kDefaultStreamingDelayTime;

	public RWCMIDIServiceDelegate delegate = null;

	RWCMIDIService(RWCConnection c) {
		conn = new WeakReference<RWCConnection>(c);
	}

	public boolean streaming() {
		return streaming;
	}

	public void streaming(boolean on) {
		streaming = on;
	}

	public float streamingDelayTime() {
		return streamingDelayTime;
	}

	public void streamingDelayTime(float sec) {
		streamingDelayTime = sec;
		conn.get().send(RWCProtocol.toStreamingDelayTime(sec));
	}

	public void send(byte[] msg) {
		send(msg, 0);
	}

	public void send(byte[] msg, int cable) {
		if (0 <= cable && cable < RWCProtocol.kRWCNumOfMIDICables && msg != null && msg.length > 0) {
			conn.get().send(RWCProtocol.toMIDIPacket(cable, msg, streaming));
		}
	}

	void read(byte[] data, int size) {
		if (delegate != null) {
			conn.get().dispatchMIDIPacket(data, size, delegate);
		}
	}

}
