//
//	RWCAudioInputStream.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.ref.WeakReference;

public class RWCAudioInputStream extends RWCNetServer {

	private WeakReference<RWCConnection> conn = null;
	private int inputMode = RWCProtocol.RNP_INPUT_MODE_MIX;

	public RWCAudioInputStreamDelegate delegate = null;

	RWCAudioInputStream(RWCConnection c) {
		super(0);
		conn = new WeakReference<RWCConnection>(c);
	}

	public void inputMode(int mode) {
		inputMode = mode;
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_INPUT_MODE,
						(byte)mode)
				);
	}

	public int inputMode() {
		return inputMode;
	}

	public void start() {
		acceptConnection();
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_INPUT_START,
						(byte)(getLocalPort() >> 8),
						(byte)(getLocalPort() >> 0))
				);
	}

	public void pause() {
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_INPUT_PAUSE)
				);
	}

	public void stop(boolean shouldStopImmediate) {
		conn.get().send(
				RWCProtocol.toAudioControl(
						RWCProtocol.RNP_SUBTYPE_INPUT_STOP)
				);

		if (shouldStopImmediate) {
			stopConnection();
		}
	}

	public void volume(float gain) {
		if (0 <= gain && gain <= 1.0) {
			conn.get().send(
					RWCProtocol.toAudioControl(
							RWCProtocol.RNP_SUBTYPE_INPUT_VOLUME,
							(byte)(gain * 127))
					);
		}
	}

	public float volume() {
		return (float)(conn.get().audioStatusInputVolume / 127.0);
	}

	public int numberOfChannels() {
		return RWCProtocol.kRWCNumOfChannels;
	}

	public float peakPowerForChannel(int channelNumber) {
		if (channelNumber < 0 || channelNumber >= RWCProtocol.kRWCNumOfChannels)
			return 0;
		return conn.get().inputLevel(channelNumber);
	}

	public float currentTime() {
		long currentDeviceFrame = conn.get().audioStatusInputFrame;
		return (float)(currentDeviceFrame / RWCProtocol.kRWCSampleRate);
	}

	public int status() {
		if (connecting) {
			return conn.get().audioStatusInputStatus;
		}
		return RWCProtocol.RNP_AUDIO_STATUS_STOP;
	}

	private static final int INPUT_BUF_SIZE = 8192;
	private byte[] buffer = new byte[INPUT_BUF_SIZE];
	private int offset = 0;


	@Override
	void streamOpenCompleted() {
		offset = 0;
	}

	@Override
	void streamEndEncountered() {
		if (delegate != null) {
			delegate.inputStreamDidClosed();
		}
	}

	@Override
	boolean streamRunLoop(DataInputStream in, DataOutputStream out) {
		if (delegate == null) {
			return false;
		}

		int len;
		try {
			if ((len = in.read(buffer, offset, buffer.length - offset)) < 0) {
				return false;
			}
		} catch (IOException e) {
			return false;
		}

		len += offset;
		int frames = len / RWCProtocol.kRWCBytesPerFrame;
		if (frames > 0) {
			delegate.inputStream(buffer, frames * RWCProtocol.kRWCBytesPerFrame);
		}

		offset = len & (RWCProtocol.kRWCBytesPerFrame - 1);
		if (offset > 0) {
			int n = len & ~(RWCProtocol.kRWCBytesPerFrame - 1);
			for (int i = 0; i < offset; i++)
				buffer[i] = buffer[n + i];
		}

		return true;
	}

}
