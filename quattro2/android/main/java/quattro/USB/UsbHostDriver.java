//
//	UsbHostDriver.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;

public abstract class UsbHostDriver extends Service {

	private static final String ACTION_USB_PERMISSION = "quattro.USB.USB_PERMISSION";

	protected List<UsbDevice> getDeviceList() {
		UsbManager manager = (UsbManager)getSystemService(Context.USB_SERVICE);
		HashMap<String, UsbDevice> hash = manager.getDeviceList();
		if (hash == null) return null;

		List<UsbDevice> list = new ArrayList<UsbDevice>();
		Iterator<String> it = hash.keySet().iterator();
		while (it.hasNext()) {
			String key = it.next();
			UsbDevice device = hash.get(key);
			if (device != null) {
				list.add( device );
			}
		}
		return list;
	}

	protected boolean checkVendor(UsbDevice device, int vendor) {
		if (device == null) return false;
		if (checkValue(device.getVendorId(), vendor)) {
			return true;
		}
		return false;
	}

	protected boolean checkProduct(UsbDevice device, int product) {
		if (device == null) return false;
		if (checkValue(device.getProductId(), product)) {
			return true;
		}
		return false;
	}

	protected List<UsbInterface> findInterface(UsbDevice device, int cls, int sub) {
		if (device == null) return null;
		List<UsbInterface> list = new ArrayList<UsbInterface>();
		int count = device.getInterfaceCount();
		for (int i = 0; i < count; i++) {
			UsbInterface usbInterface = device.getInterface(i);
			if (checkValue(usbInterface.getInterfaceClass(), cls) &&
				checkValue(usbInterface.getInterfaceSubclass(), sub)) {
				list.add(usbInterface);
			}
		}
		return list;
	}

	protected List<UsbEndpoint> findEndpoint(UsbInterface usbInterface, int dir, int type) {
		List<UsbEndpoint> list = new ArrayList<UsbEndpoint>();
		int count = usbInterface.getEndpointCount();
		for (int i = 0; i < count; i++) {
			UsbEndpoint endpoint = usbInterface.getEndpoint(i);
			if (checkValue(endpoint.getDirection(), dir) &&
					checkValue(endpoint.getType(), type)) {
				list.add(endpoint);
			}
		}
		return list;
	}

	protected boolean checkValue(int current, int target) {
		return (current == target);
	}

	private final BroadcastReceiver receiver = new BroadcastReceiver() {

		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();

			UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
			if (device == null) return;

			if (ACTION_USB_PERMISSION.equals(action)) {
				if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
					receiveAttached(device);
				}
			} else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
				requestPermission(device);
			} else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
				receiveDetached(device);
			}
		}
	};

	protected void registerAttached() {
		IntentFilter filter = new IntentFilter(UsbManager.ACTION_USB_DEVICE_ATTACHED);
		registerReceiver(receiver, filter);
	}

	protected void registerDetached() {
		IntentFilter filter = new IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED);
		registerReceiver(receiver, filter);
	}

	protected void registerPermission() {
		IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
			registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED);
		} else {
			registerReceiver(receiver, filter);
		}
    }

	protected void unregister() {
		unregisterReceiver(receiver);
	}

	protected abstract void receiveAttached(UsbDevice device);
	protected abstract void receiveDetached(UsbDevice device);

	protected void requestPermission(UsbDevice device) {
		if (device == null) return;
		Intent intent = new Intent(ACTION_USB_PERMISSION);
		intent.setPackage(getApplicationContext().getPackageName());
		PendingIntent pending = PendingIntent.getBroadcast(getApplicationContext(), 0, intent, PendingIntent.FLAG_MUTABLE);
		UsbManager manager = (UsbManager)getSystemService(Context.USB_SERVICE);
		manager.requestPermission(device, pending);
	}

	protected boolean hasPermission(UsbDevice device) {
		UsbManager manager = (UsbManager)getSystemService(Context.USB_SERVICE);
		return manager.hasPermission(device);
	}

	protected UsbDeviceConnection openDevice(UsbDevice device) {
		UsbManager manager = (UsbManager)getSystemService(Context.USB_SERVICE);
		return manager.openDevice(device);
	}

	protected String getProductName(UsbDeviceConnection usbDeviceConnection) {

		final int STD_USB_REQUEST_GET_DESCRIPTOR = 0x06;
		final int LIBUSB_DT_STRING = 0x03;

		String product = null;

		byte[] desc = usbDeviceConnection.getRawDescriptors();
		try {
			int idxProduct = desc[15];

			byte[] buffer = new byte[255];
			int length = usbDeviceConnection.controlTransfer(
					UsbConstants.USB_DIR_IN | UsbConstants.USB_TYPE_STANDARD,
					STD_USB_REQUEST_GET_DESCRIPTOR,
					(LIBUSB_DT_STRING << 8) | idxProduct,
					0, buffer, buffer.length, 2000);
			if (length > 2) {
				product = new String(buffer, 2, length - 2, "UTF-16LE");
			}
		} catch (UnsupportedEncodingException e) { }

		return product;
	}
}
