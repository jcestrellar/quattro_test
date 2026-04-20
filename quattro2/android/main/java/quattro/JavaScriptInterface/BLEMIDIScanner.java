//
//	BLEMIDIScanner.java
//
//	Copyright 2024 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelUuid;
import android.webkit.JavascriptInterface;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import org.json.JSONArray;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import quattro.BLE.CoreMIDIBLEDriver;

public class BLEMIDIScanner extends JavaScriptObject {

	public static final String TAG = "BLEMIDIScanner";

	private final String interfaceName = "blemidi";

	public String getInterfaceName() {
		return interfaceName;
	}

	private static final int STATE_IDLE = 0;
	private static final int STATE_SCANNING = 1;

	private static final int STATE_DISCONNECTED = 0;
	private static final int STATE_CONNECTING = 1;
	private static final int STATE_CONNECTED = 2;
	private static final int STATE_DISCONNECTING = 3;

	private final BluetoothAdapter bluetoothAdapter;
	private BleScanner bleScanner;

	private CoreMIDIBLEDriver coreMIDIBLEDriver = null;
	private HashMap<String,String> devices = new HashMap<String,String>();

	private int scanState = STATE_IDLE;

	public BLEMIDIScanner(JavaScriptHandler h) {
		super(h);

		IntentFilter intentFilter = new IntentFilter();
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_CONNECTED);
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_DISCONNECTED);
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_CONNECT_FAILED);
		LocalBroadcastManager.getInstance(getApplicationContext()).registerReceiver(coreMIDIBLEServiceReceiver, intentFilter);
		getApplicationContext().bindService(new Intent(getApplicationContext(), CoreMIDIBLEDriver.class), serviceConnection, Context.BIND_AUTO_CREATE);

		bleScanner = new BleScanner();

		BluetoothManager bluetoothManager = (BluetoothManager) getApplicationContext().getSystemService(Context.BLUETOOTH_SERVICE);
		if (bluetoothManager != null) {
			bluetoothAdapter = bluetoothManager.getAdapter();
			getApplicationContext().registerReceiver(bluetoothAdapterStateReceiver, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED));
		} else {
			bluetoothAdapter = null;
		}
	}

	private ServiceConnection serviceConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			coreMIDIBLEDriver = ((CoreMIDIBLEDriver.LocalBinder)rawBinder).getService();
		}
		public void onServiceDisconnected(ComponentName classname) {
			coreMIDIBLEDriver = null;
		}
	};

	private final BroadcastReceiver coreMIDIBLEServiceReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			notifyDeviceState();
		}
	};

	private final BroadcastReceiver bluetoothAdapterStateReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)) {
				if (bluetoothAdapter.getState() == BluetoothAdapter.STATE_TURNING_OFF) {
					bleScanner.stop();
					if (coreMIDIBLEDriver != null) {
						coreMIDIBLEDriver.disconnect();
					}
					devices.clear();
					notifyDeviceState();
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
		bleScanner = null;
		try {
			LocalBroadcastManager.getInstance(getApplicationContext()).unregisterReceiver(coreMIDIBLEServiceReceiver);
		} catch (Exception e) { }
		getApplicationContext().unbindService(serviceConnection);
	}

	@TargetApi(Build.VERSION_CODES.M)
	private class BleScanner {

		void start() {
			stop();

			devices.clear();
			if (coreMIDIBLEDriver != null) {
				Set<CoreMIDIBLEDriver.BluetoothGattConnection> connections = coreMIDIBLEDriver.getCurrentConnections();
				for (CoreMIDIBLEDriver.BluetoothGattConnection connection : connections) {
					devices.put(connection.getAddress(), connection.getName());
				}
			}
			notifyDeviceState();

			List<ScanFilter> scanFilterList = new ArrayList<>();
			ParcelUuid uuid = new ParcelUuid(CoreMIDIBLEDriver.CoreMIDI_BLE_SERVICE_UUID);
			ScanFilter.Builder scanFilerBuilder = new ScanFilter.Builder().setServiceUuid(uuid);
			ScanFilter scanFilter = scanFilerBuilder.build();
			scanFilterList.add(scanFilter);

			ScanSettings.Builder scanSettingBuilder = new ScanSettings.Builder().setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
			scanSettingBuilder.setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT);
			scanSettingBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
			ScanSettings scanSettings = scanSettingBuilder.build();

			if (bluetoothAdapter != null) {
				BluetoothLeScanner bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
				if (bluetoothLeScanner != null) {
					scanState = STATE_SCANNING;
					bluetoothLeScanner.startScan(scanFilterList, scanSettings, scanCallback);
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
						if (CoreMIDIBLEDriver.CoreMIDI_BLE_SERVICE_UUID.equals(uuid.next())) {
							String address = result.getDevice().getAddress();
							if (coreMIDIBLEDriver != null) {
								coreMIDIBLEDriver.detach(address);
							}
							String name = result.getScanRecord().getDeviceName();
							if (name == null) { name = "(null)"; }
							if (!devices.containsKey(address) || !devices.get(address).equals(name)) {
								devices.put(address, name);
								notifyDeviceState();
							}
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

	public static final int REQUEST_BLEMIDI_SCANNER = 0x00be;

	@JavascriptInterface
	public void scanstart() {
		if (bluetoothAdapter != null) {
			new Handler(Looper.getMainLooper()).post(new Runnable() {
				@Override
				public void run() {
					Activity activity = handler.getMainActivity();
					if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
						if (activity.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
							activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}, REQUEST_BLEMIDI_SCANNER);
							return;
						}
					} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
						if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
							activity.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_BLEMIDI_SCANNER);
							return;
						}
					}
					if (!bluetoothAdapter.isEnabled()) {
						Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
						handler.getMainActivity().startActivityForResult(enableBtIntent, REQUEST_BLEMIDI_SCANNER);
					} else {
						bleScanner.start();
					}
				}
			});
		}
	}

	@JavascriptInterface
	public void scanstop() {
		bleScanner.stop();
	}

	@JavascriptInterface
	public void connect(String address) {
		if (coreMIDIBLEDriver != null) {
			if (coreMIDIBLEDriver.connect(address)) {
				notifyDeviceState();
			}
		}
	}

	@JavascriptInterface
	public void disconnect(String address) {
		if (coreMIDIBLEDriver != null) {
			coreMIDIBLEDriver.disconnect(address);
			notifyDeviceState();
		}
	}

	private void notifyDeviceState() {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (Map.Entry<String, String> entry : devices.entrySet()) {
			int state = STATE_DISCONNECTED;
			if (coreMIDIBLEDriver != null) {
				state = coreMIDIBLEDriver.getConnectionState(entry.getKey());
			}
			HashMap<String,Object> map = new HashMap<String,Object>();
			map.put("id", entry.getKey());
			map.put("name", entry.getValue());
			map.put("state", new Integer(state));
			list.add(map);
		}
		JSONArray array = new JSONArray(list);
		postEvent("midi\f" + "ble" + "\f" + array.toString());
	}

}
