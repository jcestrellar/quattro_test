//
//	RWCAudioOutputStream.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.ref.WeakReference;

public class RWCAudioOutputStream extends RWCNetServer {

	private WeakReference<RWCConnection> conn = null;

	public RWCAudioOutputStreamDelegate delegate = null;

	RWCAudioOutputStream(RWCConnection c) {
		super(0);
		conn = new WeakReference<RWCConnection>(c);
	}

	public void start() {
		acceptConnection();
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_OUTPUT_START,
						(byte)(getLocalPort() >> 8),
						(byte)(getLocalPort() >> 0))
				);
	}

	public void pause() {
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_OUTPUT_PAUSE)
				);
	}

	public void stop() {
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_OUTPUT_STOP)
				);

		stopConnection();
	}

	public void volume(float gain) {
		if (0 <= gain && gain <= 1.0) {
			conn.get().send(
					RWCProtocol.toAudioControl(
							RWCProtocol.RNP_SUBTYPE_OUTPUT_VOLUME,
							(byte)(gain * 127))
					);
		}
	}

	public float volume() {
		return (float)(conn.get().audioStatusOutputVolume / 127.0);
	}

	public int numberOfChannels() {
		return RWCProtocol.kRWCNumOfChannels;
	}

	public float peakPowerForChannel(int channelNumber) {
		if (channelNumber < 0 || channelNumber >= RWCProtocol.kRWCNumOfChannels)
			return 0;
		return conn.get().outputLevel(channelNumber);
	}

	public float currentTime() {
		long currentDeviceFrame = conn.get().audioStatusOutputFrame;
		return (float)(currentDeviceFrame / RWCProtocol.kRWCSampleRate);
	}

	public int status() {
		if (connecting) {
			return conn.get().audioStatusOutputStatus;
		}
		return RWCProtocol.RNP_AUDIO_STATUS_STOP;
	}

	private static final int OUTPUT_BUF_SIZE = 8192;
	private byte[] buffer = new byte[OUTPUT_BUF_SIZE];

	@Override
	void streamOpenCompleted() {}

	@Override
	void streamEndEncountered() {}

	@Override
	boolean streamRunLoop(DataInputStream in, DataOutputStream out) {
		if (delegate == null) {
			return false;
		}

		int len = delegate.outputStream(buffer);

		try {
			out.write(buffer, 0, len);
		} catch (IOException e) {
			return false;
		}

		return true;
	}

}
