//
//	UsbHostMidiDriver.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import quattro.MIDIClient.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import android.content.Intent;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.os.Binder;
import android.os.IBinder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class UsbHostMidiDriver extends UsbHostDriver
	implements UsbHostMidiInputThread.InputListener, MIDIServer.Driver {

	private static final int SUBCLASS_MIDI_STREAMING = 3;

	public static final int kNumOfMIDICables = 16;
	public static final int USB_MIDI_PACKET_SIZE = 4;

	private Map<UsbDevice, UsbDeviceConnection> connections = null;
	private Map<UsbDevice, Set<MIDIServer.Endpoint>> inputEndpoints = null;
	private Map<UsbDevice, Set<MIDIServer.Endpoint>> outputEndpoints = null;

	private boolean prepared = false;

	private final IBinder binder = new LocalBinder();

	public class LocalBinder extends Binder {
		public UsbHostMidiDriver getService() {
			return UsbHostMidiDriver.this;
		}
	}

	@Override
	public IBinder onBind(Intent intent) {
		return binder;
	}

	@Override
	public void onCreate() {
		connections = new HashMap<UsbDevice, UsbDeviceConnection>();
		inputEndpoints = new HashMap<UsbDevice, Set<MIDIServer.Endpoint>>();
		outputEndpoints = new HashMap<UsbDevice, Set<MIDIServer.Endpoint>>();
	}

	public void prepare() {
		prepared = true;
		registerAttached();
		registerDetached();
		registerPermission();
		start();
	}

	@Override
	public void start() {
		if (!prepared) return;
		List<UsbDevice> list = getDeviceList();
		for (int i = 0; i < list.size(); i++) {
			UsbDevice device = list.get(i);
			if (device != null) {
				if (hasPermission(device)) {
					receiveAttached(device);
				} else {
					requestPermission(device);
				}
			}
		}
	}

	@Override
	public void stop() {
		if (!prepared) return;
		for (UsbDevice device : connections.keySet()) {
			if (device != null) {
				receiveDetached(device);
			}
		}
	}

	@Override
	public void onDestroy() {
		unregister();

		connections.clear();
		inputEndpoints.clear();
		outputEndpoints.clear();

		connections = null;
		inputEndpoints = null;
		outputEndpoints = null;
	}

	protected synchronized void receiveAttached(UsbDevice device) {
		open(device);
		deviceAddNotification();
	}

	protected synchronized void receiveDetached(UsbDevice device) {
		Set<MIDIServer.Endpoint>removedInputEndpoints = inputEndpoints.get(device);
		Set<MIDIServer.Endpoint>removerdOutputEndpoints = outputEndpoints.get(device);
		close(device);
		deviceRemoveNotification(removedInputEndpoints, removerdOutputEndpoints);
	}

	protected synchronized void open(UsbDevice device) {

		if (device.getDeviceClass() != 0) return;

		int count = device.getInterfaceCount();
		for (int index = 0; index < count; index++) {
			UsbInterface intf = device.getInterface(index);
			if (checkValue(intf.getInterfaceClass(), UsbConstants.USB_CLASS_AUDIO) &&
				checkValue(intf.getInterfaceSubclass(), SUBCLASS_MIDI_STREAMING)) {

				List<UsbEndpoint> usbInputEndpoints = findEndpoint(intf,
						UsbConstants.USB_DIR_IN, UsbConstants.USB_ENDPOINT_XFER_BULK);
				List<UsbEndpoint> usbOutputEndpoints = findEndpoint(intf,
						UsbConstants.USB_DIR_OUT, UsbConstants.USB_ENDPOINT_XFER_BULK);
				if (usbInputEndpoints.size() == 0 && usbOutputEndpoints.size() == 0) {
					continue;
				}

				UsbDeviceConnection conn = connections.get(device);
				if (conn == null) {
					conn = openDevice(device);
					if (conn == null) continue;
					connections.put(device, conn);
				}

				String productName = getProductName(conn);
				if (productName == null) {
					productName = device.getDeviceName();
				}
				if (!conn.claimInterface(intf, true)) {
					conn.releaseInterface(intf);
				}

				if (usbInputEndpoints.size() > 0) {
					Set<MIDIServer.Endpoint> endpoints = inputEndpoints.get(device);
					for (int portNumber = 0; portNumber < usbInputEndpoints.size(); portNumber++) {
						UsbEndpoint usbEndpoint = usbInputEndpoints.get(portNumber);
						UsbHostMidiInputThread thread = new UsbHostMidiInputThread(conn, usbEndpoint, this);
						int cables = numberOfCables(conn, usbEndpoint);
						for (int cableNumber = 0; cableNumber < cables; cableNumber++) {
							String entity = productName;
							if (usbInputEndpoints.size() > 1) { entity += (" #" + String.valueOf(portNumber + 1)); }
							if (cables > 1) { entity += (" (" + String.valueOf(cableNumber + 1) + ")"); 	}
							String uid = getUID(device, intf, usbEndpoint, portNumber, cableNumber);
							MIDIServer.Endpoint ep = new UsbHostMidiInputEndpoint(thread, productName, entity, uid);
							if (endpoints == null) {
								endpoints = new HashSet<MIDIServer.Endpoint>();
							}
							endpoints.add(ep);
						}
					}
					inputEndpoints.put(device, endpoints);
				}
				if (usbOutputEndpoints.size() > 0) {
					Set<MIDIServer.Endpoint> endpoints = outputEndpoints.get(device);
					for (int portNumber = 0; portNumber < usbOutputEndpoints.size(); portNumber++) {
						UsbEndpoint usbEndpoint = usbOutputEndpoints.get(portNumber);
						UsbHostMidiOutputThread thread = new UsbHostMidiOutputThread(conn, usbEndpoint);
						int cables = numberOfCables(conn, usbEndpoint);
						for (int cableNumber = 0; cableNumber < cables; cableNumber++) {
							String entity = productName;
							if (usbOutputEndpoints.size() > 1) { entity += (" #" + String.valueOf(portNumber + 1)); }
							if (cables > 1) { entity += (" (" + String.valueOf(cableNumber + 1) + ")"); 	}
							String uid = getUID(device, intf, usbEndpoint, portNumber, cableNumber);
							MIDIServer.Endpoint ep = new UsbHostMidiOutputEndpoint(thread, productName, entity, uid, cableNumber);
							if (endpoints == null) {
								endpoints = new HashSet<MIDIServer.Endpoint>();
							}
							endpoints.add(ep);
						}
					}
					outputEndpoints.put(device, endpoints);
				}
			}
		}
	}

	protected synchronized void close(UsbDevice device) {

		Set<MIDIServer.Endpoint> endpoints;

		endpoints = outputEndpoints.get(device);
		if (endpoints != null) {
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				((UsbHostMidiOutputEndpoint)ep).kill();
			}
		}
		outputEndpoints.remove(device);

		endpoints = inputEndpoints.get(device);
		if (endpoints != null) {
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				((UsbHostMidiInputEndpoint)ep).kill();
			}
		}
		inputEndpoints.remove(device);

		UsbDeviceConnection conn = connections.get(device);
		if (conn != null) {
			conn.close();
		}
		connections.remove(device);
	}

	protected int numberOfCables(UsbDeviceConnection conn, UsbEndpoint ep) {

		final int STD_USB_REQUEST_GET_DESCRIPTOR = 0x06;
		final int LIBUSB_DT_ENDPOINT = 0x05;

		int number = 0;

		byte[] buffer = new byte[16];
		int length = conn.controlTransfer(
				UsbConstants.USB_DIR_IN | UsbConstants.USB_TYPE_STANDARD,
				STD_USB_REQUEST_GET_DESCRIPTOR,
				(LIBUSB_DT_ENDPOINT << 8) | ep.getAddress(),
				0, buffer, buffer.length, 2000);
		if (length > 12) {
			number = buffer[12]; // 12 == numbers of embedded MIDI Jack
		}

		return Math.min(kNumOfMIDICables, Math.max(1, number));
	}

	private String getUID(UsbDevice device, UsbInterface intf, UsbEndpoint usbEndpoint, int portNumber, int cableNumber) {
		return (
				String.valueOf(device.getVendorId()) + ":" +
				String.valueOf(device.getProductId()) + ":" +
				String.valueOf(intf.getId()) + ":" +
				String.valueOf(portNumber) + ":" +
				String.valueOf(usbEndpoint.getType()) + ":" +
				String.valueOf(usbEndpoint.getDirection()) + ":" +
				String.valueOf(cableNumber)
		);
	}

	@Override
	public synchronized ArrayList<HashMap<String, Object>> getInputEndpointsMap() {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (Set<MIDIServer.Endpoint> endpoints : inputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				list.add(ep.getMap());
			}
		}
		return list;
	}

	@Override
	public synchronized ArrayList<HashMap<String, Object>> getOutputEndpointsMap() {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (Set<MIDIServer.Endpoint> endpoints : outputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				list.add(ep.getMap());
			}
		}
		return list;
	}

	@Override
	public Set<MIDIServer.Endpoint> getInputEndpoints() {
		Set<MIDIServer.Endpoint> set = new HashSet<MIDIServer.Endpoint>();
		for (Set<MIDIServer.Endpoint> endpoints : inputEndpoints.values()) {
			if (endpoints == null) continue;
			set.addAll(endpoints);
		}
		return set;
	}

	@Override
	public Set<MIDIServer.Endpoint> getOutputEndpoints() {
		Set<MIDIServer.Endpoint> set = new HashSet<MIDIServer.Endpoint>();
		for (Set<MIDIServer.Endpoint> endpoints : outputEndpoints.values()) {
			if (endpoints == null) continue;
			set.addAll(endpoints);
		}
		return set;
	}

	@Override
	public MIDIServer.Endpoint findInputEndpoint(HashMap<String, Object> map) {
		String uid = map.get(MIDIClient.endpointUIDKey).toString();
		for (Set<MIDIServer.Endpoint> endpoints : inputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					return ep;
				}
			}
		}
		return null;
	}

	@Override
	public MIDIServer.Endpoint findOutputEndpoint(HashMap<String, Object> map) {
		String uid = map.get(MIDIClient.endpointUIDKey).toString();
		for (Set<MIDIServer.Endpoint> endpoints : outputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					return ep;
				}
			}
		}
		return null;
	}

	private void deviceAddNotification() {
		Intent intent = new Intent(MIDIServer.ACTION_ADD_DEVICE);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	private void deviceRemoveNotification(
			Set<MIDIServer.Endpoint> removedInputEndpoints,
			Set<MIDIServer.Endpoint> removedOutputEndpoints) {

		Intent intent;
		Set<String> uids;

		if (removedInputEndpoints != null) {
			intent = new Intent(MIDIServer.ACTION_REMOVE_INPUT_ENDPOINTS);
			uids = new HashSet<String>();
			for (MIDIServer.Endpoint ep : removedInputEndpoints) {
				uids.add(ep.getMap().get(MIDIClient.endpointUIDKey).toString());
			}
			String[] array = new String[uids.size()];
			uids.toArray(array);
			intent.putExtra("uids", array);
			LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
		}

		if (removedOutputEndpoints != null) {
			intent = new Intent(MIDIServer.ACTION_REMOVE_OUTPUT_ENDPOINTS);
			uids = new HashSet<String>();
			for (MIDIServer.Endpoint ep : removedOutputEndpoints) {
				uids.add(ep.getMap().get(MIDIClient.endpointUIDKey).toString());
			}
			String[] array = new String[uids.size()];
			uids.toArray(array);
			intent.putExtra("uids", array);
			LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
		}

		intent = new Intent(MIDIServer.ACTION_REMOVE_DEVICE);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	public void input(MIDIServer.Endpoint ep, byte[] msg, long msec) {
		Intent intent = new Intent(MIDIServer.ACTION_MIDI_INPUT);
		intent.putExtra("uid", ep.getMap().get(MIDIClient.endpointUIDKey).toString());
		intent.putExtra("data", msg);
		intent.putExtra("msec", msec);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

}
