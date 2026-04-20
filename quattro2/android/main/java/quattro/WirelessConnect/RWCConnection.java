//
//	RWCConnection.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.IOException;
import java.util.HashMap;

public class RWCConnection extends RWCProtocol
{
	public HashMap<String,Object> device = null;

	public RWCConnectionDelegate delegate = null;

	public final RWCMIDIService midiService;
	public final RWCAudioInputStream inputStream;
	public final RWCAudioOutputStream outputStream;

	public RWCConnection() {
		resetProtocol();
		midiService = new RWCMIDIService(this);
		inputStream = new RWCAudioInputStream(this);
		outputStream = new RWCAudioOutputStream(this);
	}

	public void destroy() {
		disconnect();
		delegate = null;
	}

	public void connect(HashMap<String,Object> device) {
		disconnect();
		this.device = device;
		if (device == null) {
			streamOpenFailed();
			return;
		}
		inputStream.startServer();
		outputStream.startServer();
		connectToServer(
				device.get(RWCProtocol.deviceAddressKey).toString(),
				Integer.parseInt(device.get(RWCProtocol.devicePortNoKey).toString())
				);
	}

	public void disconnect() {
		stopConnection();
		inputStream.stopServer();
		outputStream.stopServer();
		device = null;
		resetProtocol();
	}

	@Override
	void streamOpenCompleted() {
		if (delegate != null) {
			delegate.connectionDidEstablished(device);
		}
	}

	@Override
	void streamOpenFailed() {
		if (delegate != null) {
			delegate.connectionFailed(device);
		}
		device = null;
	}

	@Override
	void streamErrorOccurred() {
		if (delegate != null) {
			delegate.connectionErrorDidOccur(device);
		}
		device = null;
	}

	@Override
	void streamEndEncountered() {
		if (delegate != null) {
			delegate.connectionDidClosed(device);
		}
		device = null;
	}

	private static final int READ_BUF_SIZE = 0x8000;

	private byte[] header = new byte[RWCProtocol.RNP_HEADER_SIZE];
	private byte[] buffer = new byte[READ_BUF_SIZE];

	private boolean recv(DataInputStream in, byte[] data, int length) {
		int n, offset = 0;
		while (length > 0) {
			try {
				if ((n = in.read(data, offset, length)) < 0) {
					return false;
				}
			} catch (IOException e) {
				return false;
			}
			offset += n;
			length -= n;
		}
		return true;
	}

	@Override
	boolean streamRunLoop(DataInputStream in) {

		if (delegate == null) {
			return false;
		}

		if (!recv(in, header, header.length)) {
			return false;
		}

		int dataSize = RWCProtocol.getRNPDataSize(header);
		if (dataSize > buffer.length) {
			return false;
		}
		if (!recv(in, buffer, dataSize)) {
			return false;
		}

		int type = RWCProtocol.getRNPDataType(header);

		switch (type) {
			case RWCProtocol.RNP_TYPE_KEEP_ALIVE:
				dispatchKeepAlive(header, buffer);
				break;

			case RWCProtocol.RNP_TYPE_SYNC_TIMESTAMP:
				dispatchSyncTimeStamp(header, buffer);
				break;

			case RWCProtocol.RNP_TYPE_MIDI_PACKET:
				midiService.read(buffer, dataSize);
				break;

			case RWCProtocol.RNP_TYPE_AUDIO_STATUS:
				dispatchAudioStatus(buffer);
				break;

			default:
				break;
		}

		return true;
	}

}
