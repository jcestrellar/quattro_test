//
//	RWCNetServer.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

abstract class RWCNetServer implements Runnable {

	abstract void streamOpenCompleted();
	abstract void streamEndEncountered();

	abstract boolean streamRunLoop(DataInputStream in, DataOutputStream out);

	private int portNo = 0;
	private ServerSocket listeningSocket = null;
	private Thread listeningThread = null;
	private Connection connection = null;
	private Object lock = new Object();
	private boolean acceptable = false;

	boolean connecting = false;

	RWCNetServer(int port) {
		portNo = port;
	}

	synchronized protected void startServer() {
		try {
			listeningSocket = new ServerSocket(portNo);
			listeningThread = new Thread(this);
			listeningThread.start();
		} catch (IOException e) {}
	}

	synchronized protected void stopServer() {
		stopConnection();
		if (listeningThread != null) {
			try {
				listeningSocket.close();
			} catch (IOException e) {}
			try {
				listeningThread.join();
			} catch (InterruptedException e) {}
			listeningSocket = null;
			listeningThread = null;
		}
	}

	synchronized protected int getLocalPort() {
		return (listeningSocket != null) ? listeningSocket.getLocalPort() : 0;
	}

	@Override
	public void run() {
		try {
			while (true) {
				Socket clientSocket = listeningSocket.accept();
				synchronized (lock) {
					connection = new Connection(clientSocket);
					connection.start();
				}
				try {
					connection.join();
				} catch (InterruptedException e) {}
				synchronized (lock) {
					connection = null;
				}
				clientSocket.close();
				clientSocket = null;
			}
		} catch (IOException e) {}
	}

	protected void acceptConnection() {
		acceptable = true;
	}

	void stopConnection() {
		acceptable = false;
		synchronized (lock) {
			if (connection != null) {
				connection.kill();
				try {
					connection.join();
				} catch (InterruptedException e) {}
			}
		}
	}

	private class Connection extends Thread {

		private Socket socket = null;

		Connection(Socket s) {
			socket = s;
		}

		@Override
		public void run() {
			try {
				DataInputStream in = new DataInputStream(socket.getInputStream());
				DataOutputStream out = new DataOutputStream(socket.getOutputStream());
				connecting = true;
				streamOpenCompleted();
				while (acceptable && streamRunLoop(in, out)) ;
				connecting = false;
				if (acceptable) {
					acceptable = false;
					streamEndEncountered();
				}
				socket.close();
			} catch (IOException e) {}
		}

		void kill() {
			try {
				socket.close();
			} catch (IOException e) {}
		}

	}
}
