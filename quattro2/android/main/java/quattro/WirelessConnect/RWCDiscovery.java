//
//	RWCDiscovery.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.Vector;

public class RWCDiscovery extends Thread {

	private ServerSocket listeningSocket = null;

	private Vector<HashMap<String, Object>> devices = new Vector<HashMap<String, Object>>();

	public RWCDiscoveryDelegate delegate = null;

	public RWCDiscovery() {
		try {
			listeningSocket = new ServerSocket(0);
			start();
		} catch (IOException e) {}
	}

	@SuppressWarnings("deprecation")
	public void destroy() {
		if (listeningSocket != null) {
			try {
				listeningSocket.close();
			} catch (IOException e) {}
		}
	}

	public InetAddress getBoradcastAddress() throws UnknownHostException {
		return InetAddress.getByName("255.255.255.255");
	}

	public void search() {

		synchronized (devices) {
			devices.clear();
		}

		byte[] data = RWCProtocol.toDevDiscovery(listeningSocket.getLocalPort());

		DatagramSocket socket;
		try {
			InetAddress address = getBoradcastAddress();
			DatagramPacket packet = new DatagramPacket(data, data.length, address, RWCProtocol.discoveryPortNo);
			socket = new DatagramSocket();
			socket.setBroadcast(true);
			socket.send(packet);
		} catch (IOException e) {}
	}

	@Override
	public void run() {
		try {
			while (true) {
				Socket clientSocket = listeningSocket.accept();
				new Thread(new Response(this, clientSocket)).start();
				clientSocket = null;
			}
		} catch (IOException e) {}
	}

	private class Response implements Runnable {

		private RWCDiscovery discovery = null;
		private Socket socket = null;

		public Response(RWCDiscovery d , Socket s) {
			discovery = d;
			socket = s;
		}

		@Override
		public void run() {
			try {
				byte[] data = new byte[RWCProtocol.RNP_DEV_INFO_SIZE];
				DataInputStream in = new DataInputStream(socket.getInputStream());
				in.read(data);

				HashMap<String,Object> dev = RWCProtocol.getHashMap(data,
						socket.getInetAddress().getHostAddress());
				if (dev != null) {
					addDevice(dev);
				}
				socket.close();
			} catch (IOException e) {}
			discovery = null;
			socket = null;
		}

		void addDevice(HashMap<String,Object> dev) {
			String uid = dev.get(RWCProtocol.deviceUIDKey).toString();
			synchronized (discovery.devices) {
				for (int i = 0; i < discovery.devices.size(); i++) {
					HashMap<String,Object> e = discovery.devices.elementAt(i);
					if (uid.equals(e.get(RWCProtocol.deviceUIDKey).toString()))
						return;
				}
				discovery.devices.addElement(dev);
			}
			if (discovery.delegate != null) {
				discovery.delegate.discoveryDeviceDidFound(dev);
			}
		}

	}

}
