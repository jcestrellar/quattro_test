//
//	UsbHostMidiOutputEndpoint.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import quattro.MIDIClient.*;

import java.util.HashMap;

import android.os.Handler;
import android.os.Message;

public final class UsbHostMidiOutputEndpoint implements MIDIServer.Endpoint {

	private final UsbHostMidiOutputThread thread;
	private final String device;
	private final String entity;
	private final String uid;
	private final int cableNumber;

	public UsbHostMidiOutputEndpoint(UsbHostMidiOutputThread thread, String device, String entity, String uid, int cableNumber) {

		this.thread = thread;
		this.device = device;
		this.entity = entity;
		this.uid = uid;
        this.cableNumber = cableNumber;
	}

    public void kill() {
        thread.kill();
    }

	@Override
	public void open() {}
	@Override
	public void close() {}

	@Override
	public HashMap<String,Object> getMap() {
		HashMap<String,Object> map = new HashMap<String,Object>();
		map.put(MIDIClient.deviceNameKey,		device);
		map.put(MIDIClient.entityNameKey,		entity);
		map.put(MIDIClient.endpointUIDKey,		uid);
		map.put(MIDIClient.endpointIndexKey,	entity);
		return map;
	}

	private byte running = 0;
	private int sysex_len = 0;
	private byte[] sysex_buf = new byte[512];

	@Override
	public void send(byte[] msg) {

		Handler handler = thread.getHandler();

		int offset = 0;
		int count = msg.length;
		while (count > 0) {

			byte sts;
			if ((msg[offset] & 0x80) != 0) {
				sts = msg[offset++]; count--;
			} else {
				sts = running;
			}

			byte cin = 0;
			int len = 0;
			switch (sts & 0xf0) {
				case 0x080: cin = 0x8; len = 3; running = sts; break;
				case 0x090: cin = 0x9; len = 3; running = sts; break;
				case 0x0a0: cin = 0xa; len = 3; running = sts; break;
				case 0x0b0: cin = 0xb; len = 3; running = sts; break;
				case 0x0c0: cin = 0xc; len = 2; running = sts; break;
				case 0x0d0: cin = 0xd; len = 2; running = sts; break;
				case 0x0e0: cin = 0xe; len = 3; running = sts; break;
				case 0x0f0:
					switch (sts & 0xff) {
						case 0x0f0: running = 1; break;
						case 0x0f7: running = 0; break;

						case 0x0f1: cin = 0x2; len = 2; break;
						case 0x0f2: cin = 0x3; len = 3; break;
						case 0x0f3: cin = 0x2; len = 2; break;
						case 0x0f6: cin = 0x5; len = 1; break;

						case 0x0f8:
						case 0x0fa:
						case 0x0fb:
						case 0x0fc:
						case 0x0fe:
						case 0x0ff: cin = 0xf; len = 1; break;

						default: continue;
					}
					break;
			}

			if (len > 0) {
				byte[] packet = new byte[4];
				packet[0] = (byte)((cableNumber << 4) | cin);
				packet[1] = sts;
				if (len == 1) {
					packet[2] = 0;
					packet[3] = 0;
				} else if (len == 2) {
					packet[2] = msg[offset++]; count--;
					packet[3] = 0;
				} else {
					packet[2] = msg[offset++]; count--;
					packet[3] = msg[offset++]; count--;
				}
				handler.sendMessage(Message.obtain(handler, 0, packet));
			} else if ((sts & 0xff) == 0x0f0) {
				sysex_len = 0;
				sysex_buf[sysex_len++] = sts;
			} else if ((sts & 0xff) == 0x0f7) {
				if (sysex_len > 0) {
					sysex_buf[sysex_len++] = (byte) 0x0f7;
					for (int n = 0; sysex_len > 0; sysex_len -= 3) {
						byte[] packet = new byte[4];
						if (sysex_len > 3) {
							cin = 4;
							packet[0] = (byte)((cableNumber << 4) | cin);
							packet[1] = sysex_buf[n++];
							packet[2] = sysex_buf[n++];
							packet[3] = sysex_buf[n++];
						} else if (sysex_len == 1) {
							cin = 5;
							packet[0] = (byte)((cableNumber << 4) | cin);
							packet[1] = sysex_buf[n++];
							packet[2] = 0;
							packet[3] = 0;
						} else if (sysex_len == 2) {
							cin = 6;
							packet[0] = (byte)((cableNumber << 4) | cin);
							packet[1] = sysex_buf[n++];
							packet[2] = sysex_buf[n++];
							packet[3] = 0;
						} else if (sysex_len == 3) {
							cin = 7;
							packet[0] = (byte)((cableNumber << 4) | cin);
							packet[1] = sysex_buf[n++];
							packet[2] = sysex_buf[n++];
							packet[3] = sysex_buf[n++];
						}
						handler.sendMessage(Message.obtain(handler, 0, packet));
					}
					sysex_len = 0;
				}
			} else {
				if (running > 0 && sysex_len < (sysex_buf.length - 1)) {
					sysex_buf[sysex_len++] = msg[offset];
				}
				offset++; count--;
			}
		}

	}
}
