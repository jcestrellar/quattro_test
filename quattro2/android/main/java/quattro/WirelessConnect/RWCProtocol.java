//
//	RWCProtocol.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.ByteArrayOutputStream;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;

public abstract class RWCProtocol extends RWCNetClient {

	public static final String deviceAddressKey				= "RWCDeviceAddressKey";
	public static final String devicePortNoKey				= "RWCDevicePortNoKey";
	public static final String deviceUIDKey					= "RWCDeviceUIDKey";
	public static final String deviceCapsKey				= "RWCDeviceCapsKey";
	public static final String deviceImageKey				= "RWCDeviceImageKey";
	public static final String deviceStatusKey				= "RWCDeviceStatusKey";
	public static final String deviceManufacturerKey		= "RWCDeviceManufacturerKey";
	public static final String deviceVersionKey				= "RWCDeviceVersionKey";
	public static final String deviceNameKey				= "RWCDeviceNameKey";

	public static final int RNP_CAPS_MIDI_IN				= 0x001;
	public static final int RNP_CAPS_MIDI_OUT				= 0x002;
	public static final int RNP_CAPS_AUDIO_OUTPUT			= 0x004;
	public static final int RNP_CAPS_AUDIO_INPUT			= 0x008;
	public static final int RNP_CAPS_AUDIO_INPUT_MODE		= 0x010;
	public static final int RNP_CAPS_MIDI_STREAMING 		= 0x080;

	public static final byte RNP_IMAGE_UNKNOWN				= 0;
	public static final byte RNP_IMAGE_PIANO 				= 1;
	public static final byte RNP_IMAGE_GRANDPIANO			= 2;
	public static final byte RNP_IMAGE_ORGAN 				= 3;
	public static final byte RNP_IMAGE_SYNTHESIZER			= 4;
	public static final byte RNP_IMAGE_ACCORDION 			= 5;
	public static final byte RNP_IMAGE_DRUM					= 6;
	public static final byte RNP_IMAGE_PERCUSSION_SAMPLER	= 7;
	public static final byte RNP_IMAGE_GUITAR				= 8;
	public static final byte RNP_IMAGE_MIXER 				= 9;
	public static final byte RNP_IMAGE_COMPUTER				= 10;

	public static final byte RNP_STATUS_LISTEN				= 0;
	public static final byte RNP_STATUS_SESSION				= 1;
	public static final byte RNP_STATUS_BUSY 				= 2;

	public static final byte RNP_AUDIO_STATUS_STOP			= 0;
	public static final byte RNP_AUDIO_STATUS_START			= 1;
	public static final byte RNP_AUDIO_STATUS_PAUSE			= 2;

	public static final byte RNP_INPUT_MODE_MIX				= 0;
	public static final byte RNP_INPUT_MODE_SOLO 			= 1;

	public static final float kRWCSampleRate				= 44100.0f;
	public static final int   kRWCBytesPerFrame				= 4; /* 16Bit-Stereo */
	public static final int   kRWCNumOfChannels				= 2;
	public static final int   kRWCNumOfMIDICables			= 16;

	/* RNP DATA SIZE */
	static final int RNP_DEV_DISCOVERY_SIZE			= 8;
	static final int RNP_DEV_INFO_SIZE				= 84;

	static final int RNP_HEADER_SIZE				= 4;
	static final int RNP_TIMESTAMP_SIZE				= 4;
	static final int USB_MIDI_PACKET_SIZE			= 4;
	static final int NET_AUDIO_STATUS_SIZE			= 16;

	/* RNP_HEADER (type) */
	static final byte RNP_TYPE_KEEP_ALIVE 			= 0;
	static final byte RNP_TYPE_SYNC_TIMESTAMP 		= 1;
	static final byte RNP_TYPE_MIDI_PACKET			= 2;
	static final byte RNP_TYPE_AUDIO_STATUS			= 3;
	static final byte RNP_TYPE_AUDIO_CONTROL		= 4;
	static final byte RNP_TYPE_MIDI_STREAMING 		= 7;

	/* RNP_HEADER (subtype) */
	static final byte RNP_SUBTYPE_0					= 0;
	static final byte RNP_SUBTYPE_SET_TIMEOUT		= 1;

	static final byte RNP_SUBTYPE_SYNC_CONNECT		= 0;
	static final byte RNP_SUBTYPE_SYNC_OUTPUT_START	= 1;
	static final byte RNP_SUBTYPE_SYNC_OUTPUT_STOP	= 2;
	static final byte RNP_SUBTYPE_SYNC_INPUT_START	= 3;
	static final byte RNP_SUBTYPE_SYNC_INPUT_STOP	= 4;

	static final byte RNP_SUBTYPE_OUTPUT_START		= 1;
	static final byte RNP_SUBTYPE_OUTPUT_PAUSE		= 2;
	static final byte RNP_SUBTYPE_OUTPUT_STOP 		= 3;
	static final byte RNP_SUBTYPE_INPUT_START 		= 4;
	static final byte RNP_SUBTYPE_INPUT_PAUSE 		= 5;
	static final byte RNP_SUBTYPE_INPUT_STOP		= 6;
	static final byte RNP_SUBTYPE_OUTPUT_VOLUME		= 9;
	static final byte RNP_SUBTYPE_INPUT_VOLUME		= 10;
	static final byte RNP_SUBTYPE_INPUT_MODE		= 11;

	/* Other definitions */
	static final String discoveryHeader				= "RDDPv1";
	static final int discoveryPortNo				= 9314;

	static final int kDefaultConnectTimeout			= 5;
	static final int kDefaultKeepAliveTimeout		= 3;
	static final int kDefaultStreamingDelayTime		= 1;


	static byte[] toDevDiscovery(int portNo) {

		byte[] b = new byte[RNP_DEV_DISCOVERY_SIZE];

		b[0] = (byte)'R';
		b[1] = (byte)'D';
		b[2] = (byte)'D';
		b[3] = (byte)'P';
		b[4] = (byte)'v';
		b[5] = (byte)'1';

		b[6] = (byte)((portNo >> 8) & 0xff);
		b[7] = (byte)((portNo >> 0) & 0xff);

		return b;
	}

	static byte[] toKeepAlive() {

		byte[] b = new byte[RNP_HEADER_SIZE];
		b[0] = RNP_TYPE_KEEP_ALIVE;
		b[1] = RNP_SUBTYPE_0;
		b[2] = 0;
		b[3] = 0;
		return b;
	}

	static byte[] toKeepAliveTimeout(int seconds) {

		byte[] b = new byte[RNP_HEADER_SIZE + 1];
		b[0] = RNP_TYPE_KEEP_ALIVE;
		b[1] = RNP_SUBTYPE_SET_TIMEOUT;
		b[2] = 0;
		b[3] = 1;

		b[4] = (byte)seconds;

		return b;
	}

	static byte[] toAudioControl(byte subtype) {
		return toAudioControl(0, subtype, (byte)0, (byte)0);
	}

	static byte[] toAudioControl(byte subtype, byte value0) {
		return toAudioControl(1, subtype, value0, (byte)0);
	}

	static byte[] toAudioControl(byte subtype, byte value0, byte value1) {
		return toAudioControl(2, subtype, value0, value1);
	}

	static byte[] toAudioControl(int size, byte subtype, byte value0, byte value1) {

		byte[] b = new byte[RNP_HEADER_SIZE + size];
		b[0] = RNP_TYPE_AUDIO_CONTROL;
		b[1] = subtype;
		b[2] = 0;
		b[3] = (byte)size;

		if (size > 0) {
			b[4] = value0;
		}
		if (size > 1) {
			b[5] = value1;
		}

		return b;
	}

	static byte[] toStreamingDelayTime(float sec) {

		byte[] b = new byte[RNP_HEADER_SIZE + 4];
		b[0] = RNP_TYPE_MIDI_STREAMING;
		b[1] = RNP_SUBTYPE_0;
		b[2] = 0;
		b[3] = 4;

		long msec = (long)(sec * 1000);

		b[4] = (byte)((msec >> 24) & 0xff);
		b[5] = (byte)((msec >> 16) & 0xff);
		b[6] = (byte)((msec >>	8) & 0xff);
		b[7] = (byte)((msec >>	0) & 0xff);

		return b;
	}

	static byte[] toMIDIPacket(int cable, byte[] msg, boolean streaming) {

		ByteArrayOutputStream buf = new ByteArrayOutputStream();

		/* RNP_HEADER */
		buf.write(RNP_TYPE_MIDI_PACKET);
		buf.write(RNP_SUBTYPE_0);
		buf.write(0);
		buf.write(0);

		/* RNP_TIMESTAMP */
		if (streaming) {
			long time = System.currentTimeMillis();
			if (time == 0) time = 1;
			buf.write((int)((time >> 24) & 0xff));
			buf.write((int)((time >> 16) & 0xff));
			buf.write((int)((time >>  8) & 0xff));
			buf.write((int)((time >>  0) & 0xff));
		} else {
			buf.write(0);
			buf.write(0);
			buf.write(0);
			buf.write(0);
		}

		/* USB_MIDI_PACKET */
		byte cin = 0;
		switch (msg[0] & 0xf0) {
			case 0x080: cin = 0x8; break;
			case 0x090: cin = 0x9; break;
			case 0x0a0: cin = 0xa; break;
			case 0x0b0: cin = 0xb; break;
			case 0x0c0: cin = 0xc; break;
			case 0x0d0: cin = 0xd; break;
			case 0x0e0: cin = 0xe; break;
			case 0x0f0:
				switch (msg[0] & 0xff) {
					case 0x0f1: cin = 0x2; break;
					case 0x0f2: cin = 0x3; break;
					case 0x0f3: cin = 0x2; break;

					case 0x0f6: cin = 0x5; break;

					case 0x0f8:
					case 0x0fa:
					case 0x0fb:
					case 0x0fc:
					case 0x0fe:
					case 0x0ff: cin = 0xf; break;
				}
				break;
		}

		int length = msg.length;
		int packets = 0;

		if (cin > 0) {

			packets = 1;

			buf.write((cable << 4) | cin);
			buf.write(msg[0]);

			if (length == 1) {
				buf.write(0);
				buf.write(0);
			} else if (length == 2) {
				buf.write(msg[1]);
				buf.write(0);
			} else {
				buf.write(msg[1]);
				buf.write(msg[2]);
			}

		} else if ((msg[0] & 0xff) == 0x0f0) {

			for (int n = 0; length > 0; length -= 3, packets++) {
				if (length > 3) {
					cin = 4;
					buf.write((cable << 4) | cin);
					buf.write(msg[n++]);
					buf.write(msg[n++]);
					buf.write(msg[n++]);
				} else if (length == 1) {
					cin = 5;
					buf.write((cable << 4) | cin);
					buf.write(msg[n++]);
					buf.write(0);
					buf.write(0);
				} else if (length == 2) {
					cin = 6;
					buf.write((cable << 4) | cin);
					buf.write(msg[n++]);
					buf.write(msg[n++]);
					buf.write(0);
				} else if (length == 3) {
					cin = 7;
					buf.write((cable << 4) | cin);
					buf.write(msg[n++]);
					buf.write(msg[n++]);
					buf.write(msg[n++]);
				}
			}

		}

		int size = RNP_TIMESTAMP_SIZE + (USB_MIDI_PACKET_SIZE * packets);

		byte[] b = buf.toByteArray();
		b[2] = (byte)((size >> 8) & 0xff);
		b[3] = (byte)((size >> 0) & 0xff);

		return b;
	}

	static int getRNPDataType(byte[] header) {
		return (header[0] & 0xff);
	}
	static int getRNPDataSubtype(byte[] header) {
		return (header[1] & 0xff);
	}
	static int getRNPDataSize(byte[] header) {
		return ((header[2] & 0xff) << 8) | (header[3] & 0xff);
	}

	static private String getString(byte[] data, int offset, int size) {
		String s;
		try {
			int n;
			for (n = 0; n < size && data[offset + n] != 0; n++) ;
			s = new String(data, offset, n, "ISO-8859-1");
		} catch (UnsupportedEncodingException e) {
			s = "?";
		}
		return s;
	}

	static HashMap<String,Object> getHashMap(byte[] data, String address) {

		String header = getString(data, 0, 6);
		if (!header.equals(RWCProtocol.discoveryHeader)) {
			return null;
		}

		String manufacturer   = getString(data, 20, 16);
		String productCode	  = getString(data, 36,  8);
		String productVersion = getString(data, 44,  8);
		String name 		  = getString(data, 52, 16);

		int port   = ((data[ 6] & 0xff) <<	8) |
					 ((data[ 7] & 0xff) <<	0);
		int serial = ((data[ 8] & 0xff) << 24) |
					 ((data[ 9] & 0xff) << 16) |
					 ((data[10] & 0xff) <<	8) |
					 ((data[11] & 0xff) <<	0);
		int caps   =  (data[12] & 0xff);
		int image  =  (data[13] & 0xff);
		int status =  (data[14] & 0xff);

		String uid = productCode + "-" + Integer.toHexString(serial);

		HashMap<String,Object> map = new HashMap<String,Object>();

		map.put(RWCProtocol.deviceAddressKey,		address);
		map.put(RWCProtocol.devicePortNoKey,		new Integer(port));
		map.put(RWCProtocol.deviceUIDKey,			uid);
		map.put(RWCProtocol.deviceCapsKey,			new Integer(caps));
		map.put(RWCProtocol.deviceImageKey,			new Integer(image));
		map.put(RWCProtocol.deviceStatusKey,		new Integer(status));
		map.put(RWCProtocol.deviceManufacturerKey,	manufacturer);
		map.put(RWCProtocol.deviceVersionKey,		productVersion);
		map.put(RWCProtocol.deviceNameKey,			name);

		return map;
	}

	/* Instance parameters and methods */

	private byte[][] sysexbuf = new byte[kRWCNumOfMIDICables][512];
	private int[] sysexlen = new int[kRWCNumOfMIDICables];

	long connectStartTimeStamp;
	long inputStartTimeStamp;
	long inputStopTimeStamp;
	long outputStartTimeStamp;
	long outputStopTimeStamp;

	long audioStatusInputFrame;
	int  audioStatusInputVolume;
	int  audioStatusInputStatus;

	long audioStatusOutputFrame;
	int  audioStatusOutputVolume;
	int  audioStatusOutputStatus;

	private float audioStatusInputPeakPowerL;
	private float audioStatusInputPeakPowerR;
	private float audioStatusOutputPeakPowerL;
	private float audioStatusOutputPeakPowerR;

	private float[] peakPower = new float[4];

	void resetProtocol() {

		for (int i = 0; i < 16; i++) {
			sysexlen[i] = 0;
		}

		connectStartTimeStamp = 0;
		outputStartTimeStamp = 0;
		outputStopTimeStamp = 0;
		inputStartTimeStamp = 0;
		inputStopTimeStamp = 0;

		audioStatusInputFrame  = 0;
		audioStatusInputVolume = 0;
		audioStatusInputStatus = 0;

		audioStatusOutputFrame	= 0;
		audioStatusOutputVolume = 0;
		audioStatusOutputStatus = 0;

		audioStatusInputPeakPowerL	= -120.0f;
		audioStatusInputPeakPowerR	= -120.0f;
		audioStatusOutputPeakPowerL = -120.0f;
		audioStatusOutputPeakPowerR = -120.0f;

		for (int i = 0; i < peakPower.length; i++) {
			peakPower[i] = -120.0f;
		}
	}

	float inputLevel(int channelNumber) {
		float peak;
		if (channelNumber == 0) {
			peak = peakPower[2]; peakPower[2] = audioStatusInputPeakPowerL;
		} else {
			peak = peakPower[3]; peakPower[3] = audioStatusInputPeakPowerR;
		}
		return peak;
	}

	float outputLevel(int channelNumber) {
		float peak;
		if (channelNumber == 0) {
			peak = peakPower[0]; peakPower[0] = audioStatusOutputPeakPowerL;
		} else {
			peak = peakPower[1]; peakPower[1] = audioStatusOutputPeakPowerR;
		}
		return peak;
	}

	void dispatchKeepAlive(byte[] header, byte[] data) {
		int subtype = header[1];
		if (subtype == RWCProtocol.RNP_SUBTYPE_SET_TIMEOUT) {
			keepAliveTimeout = data[0];
		}
	}

	void dispatchSyncTimeStamp(byte[] header, byte[] data) {
		int subtype = header[1];
		long timeStamp =
				((data[0] << 24) & 0xff) |
				((data[1] << 16) & 0xff) |
				((data[2] <<  8) & 0xff) |
				((data[3]	   ) & 0xff);
		switch (subtype) {
			case RWCProtocol.RNP_SUBTYPE_SYNC_CONNECT:
				connectStartTimeStamp = timeStamp;
				break;
			case RWCProtocol.RNP_SUBTYPE_SYNC_OUTPUT_START:
				outputStartTimeStamp = timeStamp;
				break;
			case RWCProtocol.RNP_SUBTYPE_SYNC_OUTPUT_STOP:
				outputStopTimeStamp = timeStamp;
				break;
			case RWCProtocol.RNP_SUBTYPE_SYNC_INPUT_START:
				inputStartTimeStamp = timeStamp;
				break;
			case RWCProtocol.RNP_SUBTYPE_SYNC_INPUT_STOP:
				inputStopTimeStamp = timeStamp;
				break;
		}
	}

	void dispatchAudioStatus(byte[] data) {
		int n = 0;
		audioStatusOutputStatus 	=  (data[0 + n] & 0xff);
		audioStatusOutputVolume 	=  (data[1 + n] & 0xff);
		audioStatusOutputPeakPowerL =	data[2 + n];
		audioStatusOutputPeakPowerR =	data[3 + n];
		audioStatusOutputFrame		= ((data[4 + n] & 0xff) << 24) |
									  ((data[5 + n] & 0xff) << 16) |
									  ((data[6 + n] & 0xff) <<	8) |
									  ((data[7 + n] & 0xff) 	 );
		n += NET_AUDIO_STATUS_SIZE;
		audioStatusInputStatus		=  (data[0 + n] & 0xff);
		audioStatusInputVolume		=  (data[1 + n] & 0xff);
		audioStatusInputPeakPowerL	=	data[2 + n];
		audioStatusInputPeakPowerR	=	data[3 + n];
		audioStatusInputFrame		= ((data[4 + n] & 0xff) << 24) |
									  ((data[5 + n] & 0xff) << 16) |
									  ((data[6 + n] & 0xff) <<	8) |
									  ((data[7 + n] & 0xff) 	 );

		if (peakPower[2] < audioStatusInputPeakPowerL)
			peakPower[2] = audioStatusInputPeakPowerL;
		if (peakPower[3] < audioStatusInputPeakPowerR)
			peakPower[3] = audioStatusInputPeakPowerR;

		if (peakPower[0] < audioStatusOutputPeakPowerL)
			peakPower[0] = audioStatusOutputPeakPowerL;
		if (peakPower[1] < audioStatusOutputPeakPowerR)
			peakPower[1] = audioStatusOutputPeakPowerR;
	}

	void dispatchMIDIPacket(byte[] buf, int length, RWCMIDIServiceDelegate delegate) {

		long timeStamp =
				((buf[0] & 0xff) << 24) |
				((buf[1] & 0xff) << 16) |
				((buf[2] & 0xff) <<  8) |
				((buf[3] & 0xff)	  );

		int idx = RNP_TIMESTAMP_SIZE;
		int head = 0;
		int data = 1;

		int packets = (length - idx) / USB_MIDI_PACKET_SIZE;

		for ( ; packets > 0; packets--, idx += USB_MIDI_PACKET_SIZE) {

			int datalen = 0;
			switch (buf[idx + data] & 0xf0) {
				case 0x080: datalen = 3; break;
				case 0x090: datalen = 3; break;
				case 0x0a0: datalen = 3; break;
				case 0x0b0: datalen = 3; break;
				case 0x0c0: datalen = 2; break;
				case 0x0d0: datalen = 2; break;
				case 0x0e0: datalen = 3; break;
				case 0x0f0:
					switch (buf[idx + data] & 0xff) {
						case 0x0f1: datalen = 2; break;
						case 0x0f2: datalen = 3; break;
						case 0x0f3: datalen = 2; break;

						case 0x0f6:
						case 0x0f8:
						case 0x0fa:
						case 0x0fb:
						case 0x0fc:
						case 0x0fe:
						case 0x0ff: datalen = 1; break;
					}
					break;
			}

			int cable = (buf[idx + head] & 0xf0) >> 4;
			if (datalen > 0) {
				byte[] msg = new byte[datalen];
				System.arraycopy(buf, idx + data, msg, 0, msg.length);
				delegate.midiInputMessage(msg, timeStamp, cable);
			} else {
				byte[] msg = null;
				switch (buf[idx + head] & 0x0f) {
					case 4:
						sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
						sysexbuf[cable][sysexlen[cable] + 1] = buf[idx + data + 1];
						sysexbuf[cable][sysexlen[cable] + 2] = buf[idx + data + 2];
						sysexlen[cable] += 3;
						break;

					case 5:
						sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
						sysexlen[cable] += 1;
						msg = new byte[sysexlen[cable]];
						System.arraycopy(sysexbuf[cable], 0, msg, 0, msg.length);
						delegate.midiInputMessage(msg, timeStamp, cable);
						sysexlen[cable] = 0;
						break;

					case 6:
						sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
						sysexbuf[cable][sysexlen[cable] + 1] = buf[idx + data + 1];
						sysexlen[cable] += 2;
						msg = new byte[sysexlen[cable]];
						System.arraycopy(sysexbuf[cable], 0, msg, 0, msg.length);
						delegate.midiInputMessage(msg, timeStamp, cable);
						sysexlen[cable] = 0;
						break;

					case 7:
						sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
						sysexbuf[cable][sysexlen[cable] + 1] = buf[idx + data + 1];
						sysexbuf[cable][sysexlen[cable] + 2] = buf[idx + data + 2];
						sysexlen[cable] += 3;
						msg = new byte[sysexlen[cable]];
						System.arraycopy(sysexbuf[cable], 0, msg, 0, msg.length);
						delegate.midiInputMessage(msg, timeStamp, cable);
						sysexlen[cable] = 0;
						break;
				}
			}
		}
	}

	public long connectStartTimeStamp() { return connectStartTimeStamp; }
	public long inputStartTimeStamp()	{ return inputStartTimeStamp; }
	public long inputStopTimeStamp()	{ return inputStopTimeStamp; }
	public long outputStartTimeStamp()	{ return outputStartTimeStamp; }
	public long outputStopTimeStamp()	{ return outputStopTimeStamp; }

}
