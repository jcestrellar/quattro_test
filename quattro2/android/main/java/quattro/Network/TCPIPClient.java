//
//	TCPIPClient.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Network;

import android.util.Log;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

public class TCPIPClient extends Thread {

	private static final int READ_BUFSIZ = 0x10000;

	public TCPIPClientDelegate delegate = null;

	private Socket sock = null;
	private DataOutputStream out = null;

	public Boolean connect(String address, int port, int timeout) {
		try {
			InetSocketAddress addr = new InetSocketAddress(address, port);
			sock = new Socket();
			sock.connect(addr, timeout * 1000);
			out = new DataOutputStream(sock.getOutputStream());
			return true;
		} catch (IOException e) {
			close();
		}
		return false;
	}

	public synchronized void close() {
		try {
			if (out != null) { out.close(); }
		} catch (IOException e) {}
		out = null;
		try {
			if (sock != null) { sock.close(); }
		} catch (IOException e) {}
		sock = null;
	}

	public void send(byte[] buf) {
		try {
			if (out != null) { out.write(buf); }
		} catch (IOException e) {}
	}

	@Override
	public void run() {
		byte[] buf = new byte[READ_BUFSIZ];
		InputStream in = null;
		try {
            in  = sock.getInputStream();
			for (int n; (n = in.read(buf)) > 0; ) {
				if (delegate != null) {
					delegate.received(buf, n);
				}
			}
		} catch (IOException e) {}
        try {
            if (in != null) { in.close(); }
        } catch (IOException e) {}

		close();

		if (delegate != null) {
			delegate.closed();
		}
	}

}
