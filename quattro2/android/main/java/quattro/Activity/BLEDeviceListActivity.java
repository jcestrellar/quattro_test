package quattro.Activity;

import quattro.app.R;
import quattro.app.BondedDeviceFilter;
import quattro.BLE.*;

import android.Manifest;
import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.ParcelUuid;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import android.view.View;
import android.view.View.OnClickListener;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.Toast;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class BLEDeviceListActivity extends AppCompatActivity {

	/* workaround for scan filter bug of Galaxy S6 edge (Android 7.0) */
	private static final boolean disableScanFilter = false;

	private static final int REQUEST_ENABLE_BT= 1;
	private static final int REQUEST_LOCATION = 2;

	private static final int STATE_DISCONNECTED = 0;
	private static final int STATE_CONNECTING = 1;
	private static final int STATE_CONNECTED = 2;

	class DeviceItem {

		private String name = null;
		private String address = null;
		private int state = STATE_DISCONNECTED;

		DeviceItem(String name, String address) {
			if (name == null) { name = "(null)"; }
			this.name = name;
			this.address = address;
		}

		public String toString() {
			switch (state) {
			case STATE_CONNECTED:
				return name + " *";
			case STATE_CONNECTING:
				return name + " (Connecting ...)";
			}
			return name;
		}

		public String getName() { return name; }
		public String getAddress() { return address; }
		public int getState() { return state; }
		public void setState(int state) {
			this.state = state;
		}
	}
	
	private static final int STATE_IDLE = 0;
	private static final int STATE_SCANNING = 1;
	private int state = STATE_IDLE;

	private CoreMIDIBLEDriver service = null;
	private BluetoothAdapter bluetoothAdapter = null;
	private BluetoothScanner bluetoothScanner = null;
	private BleScanner bleScanner = null;
	private List<DeviceItem> deviceList = null;
	private ArrayAdapter<DeviceItem> adapter = null;

	private boolean scanMidi = true;
	private ListView listView = null;
	private Button scanBtn = null;
	private ImageView closeBtn = null;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.ble_device_list);
		ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
			Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
			v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
			return insets;
		});

		deviceList = new ArrayList<DeviceItem>();

		closeBtn = (ImageView)findViewById(R.id.imageView1);
		closeBtn.setOnClickListener(new OnClickListener() {
			@Override
			public void onClick(View v) {
				finish();
			}
		});

		scanBtn = (Button)findViewById(R.id.button1);
		scanBtn.setOnClickListener(new OnClickListener() {
		    @Override
		    public void onClick(View v) {
				if (state == STATE_IDLE) {
					scan();
				} else {
					stop();
				}
		    }
		});

		listView = (ListView)findViewById(R.id.listView1);
        listView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position,long id) {
				stop();
  				if (service != null) {
					if (deviceList.get(position).getState() == STATE_CONNECTED) {
						service.disconnect(deviceList.get(position).getAddress());
					} else if (deviceList.get(position).getState() == STATE_DISCONNECTED) {
						service.connect(deviceList.get(position).getAddress());
						deviceList.get(position).setState(STATE_CONNECTING);
						adapter.notifyDataSetChanged();
					}
				}
            }
        });
    	adapter = new ArrayAdapter<DeviceItem>(this, android.R.layout.simple_list_item_1, deviceList);
        listView.setAdapter(adapter);

		registerReceiver();

		Intent bindIntent = new Intent(this, CoreMIDIBLEDriver.class);
		bindService(bindIntent, serviceConnection, Context.BIND_AUTO_CREATE);

		final BluetoothManager bluetoothManager = (BluetoothManager)getSystemService(Context.BLUETOOTH_SERVICE);
		bluetoothAdapter = bluetoothManager.getAdapter();
		if (bluetoothAdapter == null) {
			Toast.makeText(this, R.string.ble_not_supported, Toast.LENGTH_SHORT).show();
			finish();
			return;
		}
	}

	private boolean contains(String address) {
		for (DeviceItem item : deviceList) {
			if (item.getAddress().equals(address)) {
				return true;
			}
		}
		return false;
	}

	private void scan() {

		stop();

		deviceList.clear();

		if (!bluetoothAdapter.isEnabled()) {
			adapter.notifyDataSetChanged();
			Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
			startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
			return;
		}

		if (service != null) {
			Set<CoreMIDIBLEDriver.BluetoothGattConnection> connections = service.getCurrentConnections();
			for (CoreMIDIBLEDriver.BluetoothGattConnection connection : connections) {
				DeviceItem item = new DeviceItem(connection.getName(), connection.getAddress());
				item.setState(STATE_CONNECTED);
				adapter.add(item);
			}
			if (BondedDeviceFilter.enabled) {
				Set<BluetoothDevice> devices = bluetoothAdapter.getBondedDevices();
				if (devices.size() > 0) {
					for (BluetoothDevice device : devices) {
						if (!contains(device.getAddress()) && BondedDeviceFilter.matches(device)) {
							DeviceItem item = new DeviceItem(device.getName(), device.getAddress());
							adapter.add(item);
						}
					}
				}
			}
		}
		adapter.notifyDataSetChanged();

		(new Handler()).postDelayed(new Runnable() {
				@Override
				public void run() {
					stop();
				}
			}, 10000); // 10 seconds

		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
			if (bleScanner == null) {
				bleScanner = new BleScanner();
				if (bluetoothAdapter.getBluetoothLeScanner() == null) return;
			}
			bleScanner.start();
		} else {
			if (bluetoothScanner == null) {
				bluetoothScanner = new BluetoothScanner();
			}
			bluetoothScanner.start();
		}

		state = STATE_SCANNING;
		scanBtn.setText(R.string.ble_scan_stop);
	}

	private void stop() {
		if (state == STATE_SCANNING) {
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				if (bleScanner != null) {
					bleScanner.stop();
				}
			} else {
				if (bluetoothScanner != null) {
					bluetoothScanner.stop();
				}
			}
		}
		state = STATE_IDLE;
		scanBtn.setText(R.string.ble_scan);
	}

	private class BluetoothScanner {

		@SuppressWarnings("deprecation")
		void start() {
			bluetoothAdapter.startLeScan(leScanCallback);
		}

		@SuppressWarnings("deprecation")
		void stop() {
			bluetoothAdapter.stopLeScan(leScanCallback);
		}

		private BluetoothAdapter.LeScanCallback leScanCallback =
				new BluetoothAdapter.LeScanCallback() {

			@Override
			public void onLeScan(final BluetoothDevice device, final int rssi, byte[] scanRecord) {
				if (contains(device.getAddress())) return;
				if (scanMidi) {
					List<UUID> uuids = parseUuids(scanRecord);
					Iterator<UUID> uuid = uuids.iterator();
					while (uuid.hasNext()) {
						if (CoreMIDIBLEDriver.CoreMIDI_BLE_SERVICE_UUID.equals(uuid.next())) {
							runOnUiThread(new Runnable() {
								@Override
								public void run() {
									DeviceItem item = new DeviceItem(device.getName(), device.getAddress());
									adapter.add(item);
									adapter.notifyDataSetChanged();
								}
							});
						}
					}
				} else {
					runOnUiThread(new Runnable() {
						@Override
						public void run() {
							DeviceItem item = new DeviceItem(device.getName(), device.getAddress());
							adapter.add(item);
							adapter.notifyDataSetChanged();
						}
					});
				}
			}

		};

	};

	@TargetApi(Build.VERSION_CODES.M)
	private class BleScanner {

		void start() {
			List<ScanFilter> scanFilterList = new ArrayList<>();
			if (!disableScanFilter) {
				ParcelUuid uuid = new ParcelUuid(CoreMIDIBLEDriver.CoreMIDI_BLE_SERVICE_UUID);
				ScanFilter.Builder scanFilerBuilder = new ScanFilter.Builder().setServiceUuid(uuid);
				ScanFilter scanFilter = scanFilerBuilder.build();
				scanFilterList.add(scanFilter);
			}

			ScanSettings.Builder scanSettingBuilder = new ScanSettings.Builder().setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
			scanSettingBuilder.setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT);
			scanSettingBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
			ScanSettings scanSettings = scanSettingBuilder.build();

			BluetoothLeScanner bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
			if (bluetoothLeScanner != null) {
				bluetoothLeScanner.startScan(scanFilterList, scanSettings, scanCallback);
			}
		}

		void stop() {
			BluetoothLeScanner bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
			if (bluetoothLeScanner != null) {
				bluetoothLeScanner.stopScan(scanCallback);
			}
		}

		private ScanCallback scanCallback = new ScanCallback() {
			@Override
			public void onScanResult(int callbackType, ScanResult result) {
				if (contains(result.getDevice().getAddress())) return;
				if (!disableScanFilter) {
					DeviceItem item = new DeviceItem(result.getScanRecord().getDeviceName(), result.getDevice().getAddress());
					adapter.add(item);
					adapter.notifyDataSetChanged();
				} else if (result.getScanRecord() != null) {
					byte[] scanRecord = result.getScanRecord().getBytes();
					List<UUID> uuids = parseUuids(scanRecord);
					Iterator<UUID> uuid = uuids.iterator();
					while (uuid.hasNext()) {
						if (CoreMIDIBLEDriver.CoreMIDI_BLE_SERVICE_UUID.equals(uuid.next())) {
			  				if (service != null) {
								service.detach(result.getDevice().getAddress());
							}
							DeviceItem item = new DeviceItem(result.getScanRecord().getDeviceName(), result.getDevice().getAddress());
							adapter.add(item);
							adapter.notifyDataSetChanged();
							return;
						}
					}
				}
			}
		};

	};

	private List<UUID> parseUuids(byte[] advertisedData) {
		List<UUID> uuids = new ArrayList<UUID>();

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

	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);
		if (requestCode == REQUEST_ENABLE_BT) {
			if (resultCode != RESULT_OK) {
				finish();
			} else {
				scan();
			}
		}
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
		if (requestCode == REQUEST_LOCATION) {
			if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
				Toast.makeText(BLEDeviceListActivity.this, R.string.ble_cannot_scan, Toast.LENGTH_SHORT).show();
			} else {
				scan();
			}
		} else {
			super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		}
	}

	private ServiceConnection serviceConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			service = ((CoreMIDIBLEDriver.LocalBinder)rawBinder).getService();
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
				if (checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
					requestPermissions(new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}, REQUEST_LOCATION);
					return;
				}
			} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
					requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_LOCATION);
					return;
				}
			}
			scan();
		}
		public void onServiceDisconnected(ComponentName classname) {
			service = null;
		}
	};

	private void registerReceiver() {
		IntentFilter intentFilter = new IntentFilter();
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_CONNECTED);
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_DISCONNECTED);
		intentFilter.addAction(CoreMIDIBLEDriver.ACTION_GATT_CONNECT_FAILED);
		LocalBroadcastManager.getInstance(this).registerReceiver(serviceReceiver, intentFilter);
	}

	private void unregisterReceiver() {
		try {
			LocalBroadcastManager.getInstance(this).unregisterReceiver(serviceReceiver);
		} catch (Exception e) { }
	}

	private final BroadcastReceiver serviceReceiver = new BroadcastReceiver() {

		public void onReceive(Context context, Intent intent) {
			String action  = intent.getAction();
			String address = intent.getStringExtra("address");

			DeviceItem found = null;
			for (DeviceItem item : deviceList) {
	            if (item.getAddress().equals(address)) {
	            	found = item;
	            	break;
	            }
	        }
			
			if (found != null) {
				if (action.equals(CoreMIDIBLEDriver.ACTION_GATT_CONNECTED)) {
					found.setState(STATE_CONNECTED);
				} else if (action.equals(CoreMIDIBLEDriver.ACTION_GATT_DISCONNECTED)) {
					found.setState(STATE_DISCONNECTED);
				} else if (action.equals(CoreMIDIBLEDriver.ACTION_GATT_CONNECT_FAILED)) {
					found.setState(STATE_DISCONNECTED);
				}
				adapter.notifyDataSetChanged();
			}
		}
	};

    @Override
    public void onStop() {
        super.onStop();
        stop();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stop();
        unregisterReceiver();
		unbindService(serviceConnection);
	}

}
