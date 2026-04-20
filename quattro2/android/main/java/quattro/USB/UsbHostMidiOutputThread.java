//
//	UsbHostMidiOutputThread.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import java.nio.ByteBuffer;
import java.util.LinkedList;
import java.util.Queue;

import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbRequest;
import android.os.Build;
import android.os.Handler;
import android.os.Handler.Callback;
import android.os.Message;

public final class UsbHostMidiOutputThread {

	private final UsbDeviceConnection conn;
	private final UsbEndpoint ep;

	private OutputThread thread = null;

	public UsbHostMidiOutputThread(	UsbDeviceConnection conn, UsbEndpoint ep) {
		this.conn = conn;
		this.ep = ep;

		thread = new OutputThread();
		thread.start();
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
		if (thread == null) return;
		thread.running = false;
		resume();
		while (thread.isAlive()) {
			try {
				Thread.sleep(100);
			} catch (InterruptedException e) { }
		}
		thread = null;
	}

	private final Queue<byte[]> queue = new LinkedList<byte[]>();
	private int queueSize = 0;

	private final Handler handler = new Handler(new Callback() {
		@Override
		public synchronized boolean handleMessage(Message msg) {
			if (!(msg.obj instanceof byte[])) {
				return false;
			}
			byte[] buf = (byte[]) msg.obj;
			synchronized (queue) {
				queue.add(buf);
			}
			if ((thread != null) && thread.running) {
				thread.interrupt();
			}
			return true;
		}
	});

	public Handler getHandler() {
		return handler;
	}

	private final class OutputThread extends Thread {

		volatile boolean suspend;
		volatile boolean running;

		OutputThread() {
			suspend = false;
			running = true;
		}

		private final int maxPacketSize = ep.getMaxPacketSize();
		private final byte[] ep_buf = new byte[maxPacketSize];
		private int ep_buflen = 0;
		private byte[] data_buf = null;
		private int data_buflen = 0;

		private UsbRequest req = null;

		@Override
		public void run() {
			while (running) {
				data_buf = null;
				synchronized (queue) {
					queueSize = queue.size();
					if (queueSize > 0) {
						data_buf = queue.poll();
					}
				}

				if (data_buf != null) {
					data_buflen = data_buf.length;

					if (req == null) {
						req = new UsbRequest();
						req.initialize(conn, ep);
					}

					for (int pos = 0; pos < data_buflen; pos += maxPacketSize) {
						if (pos + maxPacketSize > data_buflen) {
							ep_buflen = data_buflen % maxPacketSize;
						} else {
							ep_buflen = maxPacketSize;
						}
						System.arraycopy(data_buf, pos, ep_buf, 0, ep_buflen);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							while (running && req.queue(ByteBuffer.wrap(ep_buf, 0, ep_buflen)) == false) ;
						} else {
                            while (running && req.queue(ByteBuffer.wrap(ep_buf), ep_buflen) == false) ;
						}
						while (running && req.equals(conn.requestWait()) == false) ;
					}
				}

				if (queueSize == 0 && !interrupted()) {
					try {
						sleep(100);
					} catch (InterruptedException e) { }
				}

				while (suspend) {
					try {
						sleep(1000);
					} catch (InterruptedException e) { }
				}

			}

			if (req != null) {
				req.close();
			}
		}

	}

}
