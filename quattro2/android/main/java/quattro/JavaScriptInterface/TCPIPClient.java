//
//	TCPIPClient.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Network.*;

import android.webkit.JavascriptInterface;

import java.util.Vector;

public class TCPIPClient extends JavaScriptObject {

	private final String interfaceName = "tcpip";

	public String getInterfaceName() {
		return interfaceName;
	}

	private static final int CONNECT_TIMEOUT = 5;

	private Vector<quattro.Network.TCPIPClient> connections
			= new Vector<quattro.Network.TCPIPClient>();

	public TCPIPClient(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
		for (int i = 0; i < connections.size(); i++) {
			quattro.Network.TCPIPClient conn = connections.elementAt(i);
			if (conn != null) {
				conn.delegate = null;
				conn.close();
				try {
					conn.join();
				} catch (InterruptedException e) {}
			}
		}
		connections = null;
	}

	@JavascriptInterface
	public int connect(String address, int  port) {
		int fd = -1;
		quattro.Network.TCPIPClient conn = new quattro.Network.TCPIPClient();
		if (conn.connect(address, port, CONNECT_TIMEOUT)) {
			synchronized (connections) {
				for (int i = 0; i < connections.size(); i++) {
					if (connections.elementAt(i) == null) { fd = i; break; }
				}
				if (fd == -1) {
					fd = connections.size();
					connections.addElement(conn);
				} else {
					connections.set(fd, conn);
				}
			}
			conn.delegate = new _TCPIPClientDelegate(fd);
			conn.start();
		}
		return fd;
	}

	@JavascriptInterface
	public void close(int fd) {
		synchronized(connections) {
			try {
				connections.elementAt(fd).close();
			} catch (Exception e) {}
		}
	}

	@JavascriptInterface
	public void write(int fd, String hex) {
		synchronized(connections) {
			try {
				connections.elementAt(fd).send(toByteArray(hex));
			} catch (Exception e) {}
		}
	}

	private class _TCPIPClientDelegate implements TCPIPClientDelegate {

		private int fd;
		_TCPIPClientDelegate(int fd) { this.fd = fd; }

		@Override
		public void received(byte[] buf, int len) {
			postEvent(getInterfaceName() + "\f" + "read" + "\f" + String.valueOf(fd) + "\f" + toHexString(buf, len));
		}

		@Override
		public void closed() {
			synchronized(connections) {
				connections.set(fd, null);
			}
			postEvent(getInterfaceName() + "\f" + "closed" + "\f" + String.valueOf(fd));
		}
	}

}
