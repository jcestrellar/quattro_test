//
//	UsbHostMidiInputThread.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import quattro.MIDIClient.*;

import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;

import java.util.ArrayList;
import java.util.List;

public final class UsbHostMidiInputThread {

	public interface InputListener {
		public void input(MIDIServer.Endpoint ep, byte[] msg, long msec);
	}

	private final UsbDeviceConnection conn;
	private final UsbEndpoint ep;
	private final InputListener listener;

	private InputThread thread = null;
	List<MIDIServer.Endpoint> cables = null;

	public UsbHostMidiInputThread(UsbDeviceConnection conn, UsbEndpoint ep, InputListener listener) {

		cables = new ArrayList<MIDIServer.Endpoint>();

		this.conn = conn;
		this.ep = ep;
		this.listener = listener;

		thread = new InputThread();
		thread.setPriority(8);
		thread.start();
	}

	public void addCable(MIDIServer.Endpoint ep) {
		cables.add(ep);
	}

	public void suspend() {
		thread.suspend = true;
		thread.interrupt();
	}

	public void resume() {
		thread.suspend = false;
		thread.interrupt();
	}

	public void kill() {
		if (thread != null) {
			thread.running = false;
			resume();
			while (thread.isAlive()) {
				try {
					Thread.sleep(100);
				} catch (InterruptedException e) {
				}
			}
			thread = null;
		}
	}

	final class InputThread extends Thread {

		volatile boolean suspend;
		volatile boolean running;

		InputThread() {
			suspend = false;
			running = true;
		}

		private final int maxPacketSize = ep.getMaxPacketSize();
		private final byte[] bulkReadBuf = new byte[maxPacketSize];
		private final byte[] readBuf = new byte[maxPacketSize * 2];
		private final byte[] read = new byte[maxPacketSize * 2];
		private int readBufSize = 0;

		@Override
		public void run() {

			while (running) {
					while (suspend) {
						try {
						sleep(1000);
						} catch (InterruptedException e) { }
					}
				
				int length = conn.bulkTransfer(ep, bulkReadBuf, maxPacketSize, 100);
				if (length <= 0) {
					continue;
				}

				System.arraycopy(bulkReadBuf, 0, readBuf, readBufSize, length);
				readBufSize += length;
				if (readBufSize < UsbHostMidiDriver.USB_MIDI_PACKET_SIZE) {
					continue;
				}

				final int readSize = (readBufSize / UsbHostMidiDriver.USB_MIDI_PACKET_SIZE)
						* UsbHostMidiDriver.USB_MIDI_PACKET_SIZE;
				System.arraycopy(readBuf, 0, read, 0, readSize);

				final int unreadSize = readBufSize - readSize;
				if (unreadSize > 0) {
					System.arraycopy(readBuf, readSize, readBuf, 0, unreadSize);
					readBufSize = unreadSize;
				} else {
					readBufSize = 0;
				}

				dispatchMIDIPacket(read, readSize);
			}
		}

		private final byte[][] sysexbuf = new byte[UsbHostMidiDriver.kNumOfMIDICables][512];
		private final int[] sysexlen = new int[UsbHostMidiDriver.kNumOfMIDICables];

		void dispatchMIDIPacket(byte[] buf, int length) {

			long timeStamp = System.nanoTime() / 1000000L;

			final int head = 0;
			final int data = 1;

			int packets = length / UsbHostMidiDriver.USB_MIDI_PACKET_SIZE;

			int idx  = 0;
			for ( ; packets > 0; packets--, idx += UsbHostMidiDriver.USB_MIDI_PACKET_SIZE) {

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
					if (cable < cables.size()) {
						listener.input(cables.get(cable), msg, timeStamp);
					}
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
							if (cable < cables.size()) {
								listener.input(cables.get(cable), msg, timeStamp);
							}
							sysexlen[cable] = 0;
							break;

						case 6:
							sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
							sysexbuf[cable][sysexlen[cable] + 1] = buf[idx + data + 1];
							sysexlen[cable] += 2;
							msg = new byte[sysexlen[cable]];
							System.arraycopy(sysexbuf[cable], 0, msg, 0, msg.length);
							if (cable < cables.size()) {
								listener.input(cables.get(cable), msg, timeStamp);
							}
							sysexlen[cable] = 0;
							break;

						case 7:
							sysexbuf[cable][sysexlen[cable] + 0] = buf[idx + data + 0];
							sysexbuf[cable][sysexlen[cable] + 1] = buf[idx + data + 1];
							sysexbuf[cable][sysexlen[cable] + 2] = buf[idx + data + 2];
							sysexlen[cable] += 3;
							msg = new byte[sysexlen[cable]];
							System.arraycopy(sysexbuf[cable], 0, msg, 0, msg.length);
							if (cable < cables.size()) {
								listener.input(cables.get(cable), msg, timeStamp);
							}
							sysexlen[cable] = 0;
							break;
					}
				}
			}
		}

	}

}
