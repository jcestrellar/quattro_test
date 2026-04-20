//
//	BLECentralManager.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothGattDescriptor;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.UUID;

public class BLECentralManager extends JavaScriptObject {

	public static final String TAG = "BLECentralManager";

	private final String interfaceName = "ble";

	public String getInterfaceName() {
		return interfaceName;
	}

	public static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

	public static final String peripheralKey		= "BLEPeripheralKey";
	public static final String serviceKey			= "BLEServiceKey";
	public static final String characteristicKey	= "BLECharacteristicKey";

	private static final int STATE_IDLE = 0;
	private static final int STATE_SCANNING = 1;

	private static final int STATE_DISCONNECTED = 0;
	private static final int STATE_CONNECTING = 1;
	private static final int STATE_CONNECTED = 2;
	private static final int STATE_DISCONNECTING = 3;

	private static final long RETRY_CONNECT_TIMEOUT_MS = 10000;

	private final BluetoothAdapter bluetoothAdapter;
	private BleScanner bleScanner;
	private HashMap<String, BluetoothGattConnection> connections;

	private int scanState = STATE_IDLE;

	public BLECentralManager(JavaScriptHandler h) {
		super(h);

		bleScanner = new BleScanner();

		connections = new HashMap<String, BluetoothGattConnection>();
		BluetoothManager bluetoothManager = (BluetoothManager) getApplicationContext().getSystemService(Context.BLUETOOTH_SERVICE);
		if (bluetoothManager != null) {
			bluetoothAdapter = bluetoothManager.getAdapter();
			getApplicationContext().registerReceiver(bluetoothAdapterStateReceiver, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED));
		} else {
			bluetoothAdapter = null;
		}
	}

	private final BroadcastReceiver bluetoothAdapterStateReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)) {
				if (bluetoothAdapter.getState() == BluetoothAdapter.STATE_TURNING_OFF) {
					bleScanner.stop();
					disconnect();
					connections.clear();
				}
			}
		}
	};

	@Override
	public void onPause() {
		bleScanner.stop();
	}

	@Override
	public void onDestroy() {
		bleScanner.stop();
		disconnect();
		connections.clear();
		connections = null;
		bleScanner = null;
	}

	@TargetApi(Build.VERSION_CODES.M)
	private class BleScanner {

		private List<UUID> scanFilterList = new ArrayList<>();

		void start(String services) {
			stop();

			scanFilterList.clear();
			try {
				JSONArray uuids = new JSONArray(services);
				for (int i = 0; i < uuids.length(); i++) {
					scanFilterList.add(UUID.fromString(uuids.getString(i)));
				}
			} catch (JSONException e) { return; }

			ScanSettings.Builder scanSettingBuilder = new ScanSettings.Builder().setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
			scanSettingBuilder.setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT);
			scanSettingBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
			ScanSettings scanSettings = scanSettingBuilder.build();

			if (bluetoothAdapter != null) {
				BluetoothLeScanner bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
				if (bluetoothLeScanner != null) {
					scanState = STATE_SCANNING;
					bluetoothLeScanner.startScan(new ArrayList<ScanFilter>(), scanSettings, scanCallback);
				}
			}
		}

		void stop() {
			if (scanState == STATE_SCANNING) {
				scanState = STATE_IDLE;
				assert bluetoothAdapter != null;
				BluetoothLeScanner bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
				if (bluetoothLeScanner != null) {
					bluetoothLeScanner.stopScan(scanCallback);
				}
			}
		}

		private final ScanCallback scanCallback = new ScanCallback() {
			@Override
			public void onScanResult(int callbackType, ScanResult result) {
				if (result.getScanRecord() != null) {
					byte[] scanRecord = result.getScanRecord().getBytes();
					List<UUID> uuids = parseUuids(scanRecord);
					Iterator<UUID> uuid = uuids.iterator();
					while (uuid.hasNext()) {
						if (scanFilterList.contains(uuid.next())) {
							String name = result.getScanRecord().getDeviceName();
							if (name == null) { name = "(null)"; }
							postEvent(getInterfaceName() + "\f" + "found" +
									"\f" + result.getDevice().getAddress() +
									"\f" + name +
									"\f" + result.getRssi()
							);
						}
					}
				}
			}
		};

		private List<UUID> parseUuids(byte[] advertisedData) {
			List<UUID> uuids = new ArrayList<>();

			ByteBuffer buffer = ByteBuffer.wrap(advertisedData).order(ByteOrder.LITTLE_ENDIAN);
			while (buffer.remaining() > 2) {
				byte length = buffer.get();
				if (length == 0) break;

				byte type = buffer.get();
				switch (type) {
					case 0x02: // Partial list of 16-bit UUIDs
					case 0x03: // Complete list of 16-bit UUIDs
						while (length >= 2) {
							uuids.add(UUID.fromString(String.format(
									"%08x-0000-1000-8000-00805f9b34fb", buffer.getShort())));
							length -= 2;
						}
						break;

					case 0x06: // Partial list of 128-bit UUIDs
					case 0x07: // Complete list of 128-bit UUIDs
						while (length >= 16) {
							long lsb = buffer.getLong();
							long msb = buffer.getLong();
							uuids.add(new UUID(msb, lsb));
							length -= 16;
						}
						break;

					default:
						buffer.position(buffer.position() + length - 1);
						break;
				}
			}
			return uuids;
		}

	}

	public static final int REQUEST_BLE_CENTRAL = 0x00bc;
	private String _services = null;

	@JavascriptInterface
	public void scanstart(final String services) {
		if (bluetoothAdapter != null) {
			_services = services;
			new Handler(Looper.getMainLooper()).post(new Runnable() {
				@Override
				public void run() {
					Activity activity = handler.getMainActivity();
					if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
						if (activity.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
							activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}, REQUEST_BLE_CENTRAL);
							return;
						}
					} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
						if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
							activity.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_BLE_CENTRAL);
							return;
						}
					}
					if (!bluetoothAdapter.isEnabled()) {
						Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
						handler.getMainActivity().startActivityForResult(enableBtIntent, REQUEST_BLE_CENTRAL);
					} else {
						bleScanner.start(services);
					}
				}
			});
		}
	}

	public void scanstart() {
		if (_services != null) {
			scanstart(_services);
		}
	}

	@JavascriptInterface
	public void scanstop() {
		_services = null;
		bleScanner.stop();
	}

	public void unauthorized() {
		postEvent(getInterfaceName() + "\f" + "unauthorized");
	}

	@JavascriptInterface
	public boolean connect(String address) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			return connection.connect();
		}
		connection = new BluetoothGattConnection();
		if (connection.connect(address)) {
			connections.put(address, connection);
			return true;
		} else {
			return false;
		}
	}

	@JavascriptInterface
	public void disconnect() {
		for (BluetoothGattConnection connection : connections.values()) {
			connection.disconnect();
		}
	}

	@JavascriptInterface
	public void disconnect(String address) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.disconnect();
		}
	}

	@JavascriptInterface
	public void discover(String address, String service) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.discoverServices(service);
		}
	}

	@JavascriptInterface
	public String properties(String ep) throws JSONException {
		String address = toHashMap(ep).get(peripheralKey);
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			return connection.getProperties(ep);
		}
		return "{}";
	}

	@JavascriptInterface
	public void notify(String ep, boolean enabled) throws JSONException {
		String address = toHashMap(ep).get(peripheralKey);
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.setNotification(ep, enabled);
		}
	}

	@JavascriptInterface
	public void read(String ep) throws JSONException {
		String address = toHashMap(ep).get(peripheralKey);
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.read(ep);
		}
	}

	@JavascriptInterface
	public void write(String ep, String data) throws JSONException {
		String address = toHashMap(ep).get(peripheralKey);
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.writeWithResponse(ep, toByteArray(data));
		}
	}

	@JavascriptInterface
	public void writewithoutresponse(String ep, String data) throws JSONException {
		String address = toHashMap(ep).get(peripheralKey);
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.writeWithoutResponse(ep, toByteArray(data));
		}
	}

	private HashMap<String,String> toHashMap(String json) throws JSONException {
		HashMap<String,String> map = new HashMap<String,String>();
		JSONObject obj = new JSONObject(json);
		map.put(peripheralKey,     obj.getString(peripheralKey));
		map.put(serviceKey,        obj.getString(serviceKey));
		map.put(characteristicKey, obj.getString(characteristicKey));
		return map;
	}

	public class BluetoothGattConnection extends BluetoothGattCallback {

		private BluetoothDevice device = null;
		private BluetoothGatt bluetoothGatt = null;

		private String name = null;
		private int connectionState = STATE_DISCONNECTED;
		private long retry_t0 = 0;
		private String targetService = null;

		public boolean connect(String address) {
			if (connectionState != STATE_DISCONNECTED) {
				return true;
			}
			if (bluetoothAdapter == null) {
				return false;
			}
			device = bluetoothAdapter.getRemoteDevice(address);
			if (device == null) {
				return false;
			}

			retry_t0 = System.currentTimeMillis();
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				bluetoothGatt = device.connectGatt(getApplicationContext(), false, this, BluetoothDevice.TRANSPORT_LE);
			} else {
				bluetoothGatt = device.connectGatt(getApplicationContext(), false, this);
			}
			connectionState = STATE_CONNECTING;
			return true;
		}

		public boolean connect() {
			if (connectionState != STATE_DISCONNECTED) {
				return true;
			}
			retry_t0 = System.currentTimeMillis();
			if ((bluetoothGatt != null) && bluetoothGatt.connect()) {
				connectionState = STATE_CONNECTING;
				return true;
			} else {
				return false;
			}
		}

		public void disconnect() {
			if (connectionState != STATE_DISCONNECTED) {
				connectionState = (connectionState == STATE_CONNECTED) ? STATE_DISCONNECTING : STATE_DISCONNECTED;
				bluetoothGatt.disconnect();
			}
		}

		public void close() {
			if (bluetoothGatt != null) {
				bluetoothGatt.close();
				bluetoothGatt = null;
			}
			device = null;
			queue.clear();
		}

		public String getAddress() {
			return device.getAddress();
		}

		public String getName() {
			if (name == null) {
				name = device.getName();
			}
			return name;
		}

		private String toJSON(BluetoothGattCharacteristic characteristic) {
			HashMap<String,Object> map = new HashMap<String,Object>();
			map.put(peripheralKey, getAddress());
			map.put(serviceKey, characteristic.getService().getUuid().toString());
			map.put(characteristicKey, characteristic.getUuid().toString());
			return (new JSONObject(map)).toString();
		}

		public void discoverServices(String service) {
			if (connectionState != STATE_CONNECTED) return;
			if (bluetoothGatt != null) {
				targetService = service;
				bluetoothGatt.discoverServices();
			}
		}

		public String getProperties(String ep) {
			BluetoothGattCharacteristic characteristic = getCharacteristic(ep);
			if (characteristic != null) {
				int properties = characteristic.getProperties();
				return ('{' +
					" \"broadcast\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_BROADCAST) != 0) +
					",\"read\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_READ) != 0) +
					",\"writeWithoutResponse\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0) +
					",\"write\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0) +
					",\"notify\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0) +
					",\"indicate\":" + ((properties & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) +
				"}");
			}
			return "{}";
		}

		public void setNotification(String ep, boolean enabled) {
			BluetoothGattCharacteristic characteristic = getCharacteristic(ep);
			if (characteristic != null) {
				bluetoothGatt.setCharacteristicNotification(characteristic, enabled);
				BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CCCD);
				if (descriptor != null) {
					descriptor.setValue(enabled ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE);
					bluetoothGatt.writeDescriptor(descriptor);
				}
			}
		}

		public void read(String ep) {
			BluetoothGattCharacteristic characteristic = getCharacteristic(ep);
			if (characteristic != null) {
				if ((characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0) {
					bluetoothGatt.readCharacteristic(characteristic);
				} else {
					postEvent(getInterfaceName() + "\f" + "changed" + "\f" + toJSON(characteristic) + "\f\f" + BluetoothGatt.GATT_READ_NOT_PERMITTED);
				}
			}
		}

		public void writeWithResponse(String ep, byte[] data) {
			BluetoothGattCharacteristic characteristic = getCharacteristic(ep);
			if (characteristic != null) {
				if ((characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0) {
					characteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
					enqueue(characteristic, data);
				} else {
					postEvent(getInterfaceName() + "\f" + "write" + "\f" + toJSON(characteristic) + "\f\f" + BluetoothGatt.GATT_WRITE_NOT_PERMITTED);
				}
			}
		}

		public void writeWithoutResponse(String ep, byte[] data) {
			BluetoothGattCharacteristic characteristic = getCharacteristic(ep);
			if (characteristic != null) {
				if ((characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0) {
					characteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
					enqueue(characteristic, data);
				} else {
					postEvent(getInterfaceName() + "\f" + "write" + "\f" + toJSON(characteristic) + "\f\f" + BluetoothGatt.GATT_WRITE_NOT_PERMITTED);
				}
			}
		}

		@Override
		public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
			if (newState == BluetoothProfile.STATE_CONNECTED) {
				synchronized (queue) { queue.clear(); onWriting = false; }
				connectionState = STATE_CONNECTED;
				postEvent(getInterfaceName() + "\f" + "connected" + "\f" + getAddress() + "\f" + getName());
			} else if (status == 133 && newState == BluetoothProfile.STATE_DISCONNECTED) {
				if (System.currentTimeMillis() - retry_t0 > RETRY_CONNECT_TIMEOUT_MS) {
					connectionState = STATE_DISCONNECTED;
					postEvent(getInterfaceName() + "\f" + "connectfailed" + "\f" + getAddress() + "\f" + getName());
				} else {
					if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
						bluetoothGatt = device.connectGatt(getApplicationContext(), false, this, BluetoothDevice.TRANSPORT_LE);
					} else {
						bluetoothGatt = device.connectGatt(getApplicationContext(), false, this);
					}
				}
			} else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
				if (status != BluetoothGatt.GATT_SUCCESS) {
					gatt.disconnect();
				}
				connectionState = STATE_DISCONNECTED;
				postEvent(getInterfaceName() + "\f" + "disconnected" + "\f" + getAddress() + "\f" + getName());
			}
		}

		@Override
		public void onServicesDiscovered(BluetoothGatt gatt, int status) {
			BluetoothGattService service = gatt.getService(UUID.fromString(targetService));
			if ((status != BluetoothGatt.GATT_SUCCESS) || (service == null)) {
				Log.w(TAG, "onServicesDiscovered() status = " + status);
				postEvent(getInterfaceName() + "\f" + "discoverfailed" + "\f" + getAddress() + "\f" + status);
				return;
			}
			JSONArray array = new JSONArray();
			List<BluetoothGattCharacteristic> characteristics = service.getCharacteristics();
			for (BluetoothGattCharacteristic c : characteristics) {
				array.put(c.getUuid().toString());
			}
			postEvent(getInterfaceName() + "\f" + "discovered" + "\f" + getAddress() + "\f" + targetService + "\f" + array.toString());
		}

		@Override
		public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			if (status != BluetoothGatt.GATT_SUCCESS) {
				Log.w(TAG, "onCharacteristicRead() status = " + status);
				postEvent(getInterfaceName() + "\f" + "changed" + "\f" + toJSON(characteristic) + "\f\f" + status);
			} else {
				onCharacteristicChanged(gatt, characteristic);
			}
		}

		@Override
		public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
			byte[] data = characteristic.getValue();
			String value = (data != null) ? toHexString(data) : "";
			postEvent(getInterfaceName() + "\f" + "changed" + "\f" + toJSON(characteristic) + "\f" + value + "\f");
		}

		public BluetoothGattCharacteristic getCharacteristic(String json) {

			if (connectionState != STATE_CONNECTED) return null;

			HashMap<String,String> map;
			try {
				map = toHashMap(json);
			} catch (JSONException e) { return null; }

			BluetoothGattCharacteristic characteristic = null;
			try {
				BluetoothGattService service = bluetoothGatt.getService(UUID.fromString(map.get(serviceKey)));
				if (service != null) {
					characteristic = service.getCharacteristic(UUID.fromString(map.get(characteristicKey)));
				}
			} catch (IllegalArgumentException e) {}
			return characteristic;
		}

		/* workaround for the lack of BLE MIDI packet in simultaneous TX/RX processing */
		public class BluetoothGattWriteCharacteristic extends BluetoothGattCharacteristic {
			private final int instanceId;
			private final BluetoothGattService service;
			public BluetoothGattWriteCharacteristic(BluetoothGattCharacteristic c) {
				super(c.getUuid(), c.getProperties(), c.getPermissions());
				setWriteType(c.getWriteType());
				instanceId = c.getInstanceId();
				service = c.getService();
			}
			@Override
			public BluetoothGattService getService() {
				return service;
			}
			@Override
			public int getInstanceId() {
				return instanceId;
			}
		}

		private final Queue<byte[]> queue = new LinkedList<byte[]>();
		private boolean onWriting = false;
		private int writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT;

		/* workaround for Galaxy S10+, Pixel3 */
		private static final long kNanosPerMillisecond = 1000000L;
		private static final long kMinWriteInterval = (11 * kNanosPerMillisecond);
		private long nextWriteTime = 0;

		private void enqueue(BluetoothGattCharacteristic characteristic, byte[] data) {

			if (connectionState != STATE_CONNECTED) return;

			byte[] value;
			synchronized (queue) {
				int offset = 0;
				do {
					byte[] v = new byte[Math.min(20, data.length - offset)];
					System.arraycopy(data, offset, v, 0, v.length);
					queue.add(v);
					offset += v.length;
				} while (offset < data.length);
				if (onWriting) return;
				onWriting = true;
				value = queue.poll();
				writeType = characteristic.getWriteType();
			}

			BluetoothGattWriteCharacteristic _characteristic = new BluetoothGattWriteCharacteristic(characteristic);
			_characteristic.setValue(value);
			if (!bluetoothGatt.writeCharacteristic(_characteristic)) {
				Log.w(TAG, "enqueue - writeCharacteristic() failed.");
				disconnect();
			}

			/* workaround for Galaxy S10+, Pixel3 */
			nextWriteTime = (System.nanoTime() + kMinWriteInterval);
		}

		@Override
		public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
//Log.i("qttr", "onCharacteristicWrite:status = " + status);
			if (status != BluetoothGatt.GATT_SUCCESS) {
				Log.w(TAG, "onCharacteristicWrite() status = " + status);
			}

			if (connectionState != STATE_CONNECTED) return;

			byte[] value;
			synchronized (queue) {
				value = queue.poll();
				if (value == null) {
					onWriting = false;
					if (writeType == BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) {
						String result = (status != BluetoothGatt.GATT_SUCCESS) ? ("" + status) : "";
						postEvent(getInterfaceName() + "\f" + "write" + "\f" + toJSON(characteristic) + "\f" + result);
					}
					return;
				}
			}

			characteristic.setValue(value);

			/* workaround for Galaxy S10+, Pixel3 */
			long nanosToWait = nextWriteTime - System.nanoTime();
			if (nanosToWait > 0) {
				try {
					Thread.sleep(1 + (nanosToWait  / kNanosPerMillisecond));
				} catch (InterruptedException e) {}
			}

			if (!gatt.writeCharacteristic(characteristic)) {
				Log.w(TAG, "onCharacteristicWrite - writeCharacteristic() failed.");
				disconnect();
			}

			/* workaround for Galaxy S10+, Pixel3 */
			nextWriteTime = (System.nanoTime() + kMinWriteInterval);
		}

	}

}
