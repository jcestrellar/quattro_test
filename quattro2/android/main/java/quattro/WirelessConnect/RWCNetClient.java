//
//	RWCInputStream.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;

abstract class RWCNetClient {

	abstract void streamOpenCompleted();
	abstract void streamOpenFailed();
	abstract void streamErrorOccurred();
	abstract void streamEndEncountered();

	abstract boolean streamRunLoop(DataInputStream in);

	protected int connectTimeout = RWCProtocol.kDefaultConnectTimeout;
	protected int keepAliveTimeout = RWCProtocol.kDefaultKeepAliveTimeout;

	public int connectTimeout() {
		return connectTimeout;
	}

	public void connectTimeout(int sec) {
		connectTimeout = sec;
	}

	public int keepAliveTimeout() {
		return keepAliveTimeout;
	}

	public void keepAliveTimeout(int sec) {
		keepAliveTimeout = sec;
		send(RWCProtocol.toKeepAliveTimeout(sec));
	}

	private InetSocketAddress address = null;
	private Socket socket = null;
	private Connection connection = null;
	private boolean acceptable = false;
	private boolean connecting = false;

	synchronized protected void connectToServer(String addr, int port) {
		acceptable = true;
		address = new InetSocketAddress(addr, port);
		socket = new Socket();
		connection = new Connection();
		connection.start();
	}

	synchronized protected void stopConnection() {
		acceptable = false;
		if (connection != null) {
			try {
				socket.close();
			} catch (IOException e) {}
			try {
				connection.join();
			} catch (InterruptedException e) {}
			socket = null;
			connection = null;
		}
	}

	synchronized void send(byte[] data) {
		if (connection != null) {
			connection.send(data);
		}
	}

	private class Connection extends Thread {

		private DataInputStream in = null;
		private DataOutputStream out = null;

		@Override
		public void run() {

			try {
				socket.connect(address, connectTimeout * 1000);
				in = new DataInputStream(socket.getInputStream());
				out = new DataOutputStream(socket.getOutputStream());
			} catch (IOException e) {
				streamOpenFailed();
				return;
			}

			connecting = true;
			streamOpenCompleted();

			KeepAlive keepAlive = new KeepAlive(this);
			keepAlive.start();

			while (acceptable && streamRunLoop(in)) {
				keepAlive.touch();
			}

			keepAlive.kill();

			connecting = false;
			if (acceptable) {
				acceptable = false;
				streamEndEncountered();
			}

			try {
				keepAlive.join();
			} catch (InterruptedException e) {}

			in = null;
			out = null;
			try {
				socket.close();
			} catch (IOException e) {}
		}

		synchronized void send(byte[] data) {
			if (out != null && data != null) {
				try {
					out.write(data);
				} catch (IOException e) {}
			}
		}
	}

	private class KeepAlive extends Thread {

		private Connection conn = null;
		private boolean repeat = true;
		private int counter = 0;

		public KeepAlive(Connection c) {
			conn = c;
		}
		public void touch() {
			counter = 0;
		}
		public void kill() {
			repeat = false;
		}

		@Override
		public void run() {
			long t0 = System.currentTimeMillis();
			while (repeat) {
				try {
					Thread.sleep(100);
				} catch (InterruptedException e) {}
				long t = System.currentTimeMillis();
				if ((t - t0) < 1000) continue;
				t0 = t;

				int timeout = keepAliveTimeout;
				if (connecting && timeout > 0) {
					conn.send(RWCProtocol.toKeepAlive());
					if (++counter > timeout) {
						try {
							socket.close();
						} catch (IOException e) {}
						break;
					}
				}
			}
			conn = null;
		}
	}

}
