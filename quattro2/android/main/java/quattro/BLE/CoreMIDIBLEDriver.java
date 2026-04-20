/*
 * Copyright (C) 2013 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package quattro.BLE;

import quattro.MIDIClient.*;

import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import android.util.Log;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;

public class CoreMIDIBLEDriver extends Service implements MIDIServer.Driver {

	/* workaround for Galaxy S10+, Pixel3 */
	private static final boolean enableWriteInterval = true;

	public static final String TAG = "CoreMIDIBLEDriver";

	public static final UUID CoreMIDI_BLE_SERVICE_UUID = UUID.fromString("03b80e5a-ede8-4b33-a751-6ce34ec4c700");
	public static final UUID MIDI_IO_CHAR_UUID = UUID.fromString("7772e5db-3868-4112-a1a9-f2669d106bf3");
	public static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
	
	private BluetoothManager bluetoothManager;
	private BluetoothAdapter bluetoothAdapter;

	private static final int STATE_DISCONNECTED = 0;
	private static final int STATE_CONNECTING = 1;
	private static final int STATE_CONNECTED = 2;
	private static final int STATE_DISCONNECTING = 3;

	public static final String ACTION_GATT_CONNECTED		= "quattro.CoreMIDIBLEDriver.ACTION_GATT_CONNECTED";
	public static final String ACTION_GATT_DISCONNECTED		= "quattro.CoreMIDIBLEDriver.ACTION_GATT_DISCONNECTED";
	public static final String ACTION_GATT_CONNECT_FAILED	= "quattro.CoreMIDIBLEDriver.ACTION_GATT_CONNECT_FAILED";

	private long RETRY_CONNECT_TIMEOUT_MS = 10000;

	private HashMap<String, BluetoothGattConnection> connections = null;

	private final IBinder binder = new LocalBinder();

	public class LocalBinder extends Binder {
		public CoreMIDIBLEDriver getService() {
			return CoreMIDIBLEDriver.this;
		}
	}

	@Override
	public IBinder onBind(Intent intent) {
		return binder;
	}

	@Override
	public void onCreate() {
		connections = new HashMap<String, BluetoothGattConnection>();
		if (bluetoothManager == null) {
			bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
		}
		if (bluetoothManager != null) {
			bluetoothAdapter = bluetoothManager.getAdapter();
		}
		this.registerReceiver(bluetoothAdapterStateReceiver, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED));
	}

	@Override
	public void onDestroy() {
		try {
			this.unregisterReceiver(bluetoothAdapterStateReceiver);
		} catch (Exception e) { }

		if (connections != null) {
			for (BluetoothGattConnection connection : connections.values()) {
				connection.close();
			}
			connections.clear();
			connections = null;
		}
	}

	@Override
	public void start() { }
	@Override
	public void stop() { }

	public BluetoothGattConnection getConnection(String address) {
		return connections.get(address);
	}

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

	public void disconnect(String address) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			connection.disconnect();
		}
	}

	public void disconnect() {
		for (BluetoothGattConnection connection : connections.values()) {
			connection.disconnect();
		}
	}

	public void detach(String address) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			if (connection.getConnectionState() != STATE_DISCONNECTED) {
				connection.close();
				connections.remove(address);
			}
		}
	}

	public int getConnectionState(String address) {
		BluetoothGattConnection connection = connections.get(address);
		if (connection != null) {
			return connection.getConnectionState();
		}
		return STATE_DISCONNECTED;
	}

	public Set<BluetoothGattConnection> getCurrentConnections() {
		Set<BluetoothGattConnection> set = new HashSet<BluetoothGattConnection>();
		for (BluetoothGattConnection connection : connections.values()) {
			if (connection.isCconnected()) {
				set.add(connection);
			}
		}
		return set;
	}

	@Override
	public ArrayList<HashMap<String, Object>> getInputEndpointsMap() {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (BluetoothGattConnection connection : connections.values()) {
			if (connection.isCconnected()) {
				list.add(connection.getInputEndpoint().getMap());
			}
		}
		return list;
	}

	@Override
	public ArrayList<HashMap<String, Object>> getOutputEndpointsMap() {
		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (BluetoothGattConnection connection : connections.values()) {
			if (connection.isCconnected()) {
				list.add(connection.getOutputEndpoint().getMap());
			}
		}
		return list;
	}

	@Override
	public Set<MIDIServer.Endpoint> getInputEndpoints() {
		Set<MIDIServer.Endpoint> set = new HashSet<MIDIServer.Endpoint>();
		for (BluetoothGattConnection connection : connections.values()) {
			if (connection.isCconnected()) {
				set.add(connection.getInputEndpoint());
			}
		}
		return set;
	}

	@Override
	public Set<MIDIServer.Endpoint> getOutputEndpoints() {
		Set<MIDIServer.Endpoint> set = new HashSet<MIDIServer.Endpoint>();
		for (BluetoothGattConnection connection : connections.values()) {
			if (connection.isCconnected()) {
				set.add(connection.getOutputEndpoint());
			}
		}
		return set;
	}

	@Override
	public MIDIServer.Endpoint findInputEndpoint(HashMap<String, Object> map) {
		String uid = map.get(MIDIClient.endpointUIDKey).toString();
		for (BluetoothGattConnection connection : connections.values()) {
			if (!connection.isCconnected()) continue;
			if (uid.equals(connection.getInputEndpoint().getMap().get(MIDIClient.endpointUIDKey))) {
				return connection.getInputEndpoint();
			}
		}
		return null;
	}

	@Override
	public MIDIServer.Endpoint findOutputEndpoint(HashMap<String, Object> map) {
		String uid = map.get(MIDIClient.endpointUIDKey).toString();
		for (BluetoothGattConnection connection : connections.values()) {
			if (!connection.isCconnected()) continue;
			if (uid.equals(connection.getOutputEndpoint().getMap().get(MIDIClient.endpointUIDKey))) {
				return connection.getOutputEndpoint();
			}
		}
		return null;
	}

	private final BroadcastReceiver bluetoothAdapterStateReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			String action = intent.getAction();
			if (action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)) {
				if (bluetoothAdapter.getState() == BluetoothAdapter.STATE_TURNING_OFF) {
					if (connections != null) {
						for (BluetoothGattConnection connection : connections.values()) {
							connection.disconnect();
							broadcastUpdate(connection.getAddress(), ACTION_GATT_DISCONNECTED);
						}
						connections.clear();
					}
				}
			}
		}
	};

	public class BluetoothGattConnection extends BluetoothGattCallback {

		class InputEndpoint implements MIDIServer.Endpoint {
			public String getUID() { return device.getAddress() + ":BLE:1"; }
			@Override
			public HashMap<String,Object> getMap() {
				HashMap<String,Object> map = new HashMap<String,Object>();
				map.put(MIDIClient.deviceNameKey,		getName());
				map.put(MIDIClient.entityNameKey,		getName());
				map.put(MIDIClient.endpointUIDKey,		getUID());
				map.put(MIDIClient.endpointIndexKey,	device.getAddress());
				return map;
			}
			@Override
			public void open() {}
			@Override
			public void close() {}
			@Override
			public void send(byte[] msg) {}
		}

		class OutputEndpoint implements MIDIServer.Endpoint {
			public String getUID() { return device.getAddress() + ":BLE:0"; }
			@Override
			public HashMap<String,Object> getMap() {
				HashMap<String,Object> map = new HashMap<String,Object>();
				map.put(MIDIClient.deviceNameKey,		getName());
				map.put(MIDIClient.entityNameKey,		getName());
				map.put(MIDIClient.endpointUIDKey,		getUID());
				map.put(MIDIClient.endpointIndexKey,	device.getAddress());
				return map;
			}
			@Override
			public void open() {}
			@Override
			public void close() {}
			@Override
			public void send(byte[] msg) {
				BluetoothGattConnection.this.send(msg);
			}
		}

        /* workaround for the lack of BLE MIDI packet in simultaneous TX/RX processing */
        public class BluetoothGattWriteCharacteristic extends BluetoothGattCharacteristic {
            private final BluetoothGattService service;
            private final int instanceId;
            public BluetoothGattWriteCharacteristic(BluetoothGattCharacteristic c) {
                super(c.getUuid(), c.getProperties(), c.getPermissions());
                setWriteType(c.getWriteType());
                service = c.getService();
                instanceId = c.getInstanceId();
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

		private BluetoothDevice device = null;
		private BluetoothGatt bluetoothGatt = null;
		private BluetoothGattCharacteristic _characteristic = null;
		private InputEndpoint inputEndpoint = null;
		private OutputEndpoint outputEndpoint = null;

		private String name = null;
		private boolean connected = false;
		private int connectionState = STATE_DISCONNECTED;
		private long retry_t0 = 0;

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

			inputEndpoint = new InputEndpoint();
			outputEndpoint = new OutputEndpoint();
			retry_t0 = System.currentTimeMillis();
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				bluetoothGatt = device.connectGatt(CoreMIDIBLEDriver.this, false, this, BluetoothDevice.TRANSPORT_LE);
			} else {
				bluetoothGatt = device.connectGatt(CoreMIDIBLEDriver.this, false, this);
			}
			connected = false;
			connectionState = STATE_CONNECTING;
			return true;
		}

		public boolean connect() {
			if (connectionState != STATE_DISCONNECTED) {
				return true;
			}
			retry_t0 = System.currentTimeMillis();
			if ((bluetoothGatt != null) && bluetoothGatt.connect()) {
				connected = false;
				connectionState = STATE_CONNECTING;
				return true;
			} else {
				return false;
			}
		}

		public void disconnect() {
			if (connectionState != STATE_DISCONNECTED) {
				connectionState = connected ? STATE_DISCONNECTING : STATE_DISCONNECTED;
			}
			bluetoothGatt.disconnect();
		}

        public void close() {
			if (bluetoothGatt != null) {
				bluetoothGatt.close();
				bluetoothGatt = null;
			}
            _characteristic = null;
			device = null;
			inputEndpoint = null;
			outputEndpoint = null;
			queue.clear();
			queue = null;
		}

        public String getName() {
			if (name == null) {
				name = device.getName();
			}
			return name;
		}

		public String getAddress() {
			return device.getAddress();
		}

		public boolean isCconnected() {
			return (connectionState == STATE_CONNECTED);
		}

		public int getConnectionState() {
			return connectionState;
		}

		public MIDIServer.Endpoint getInputEndpoint() {
			return inputEndpoint;
		}

		public MIDIServer.Endpoint getOutputEndpoint() {
			return outputEndpoint;
		}

		@Override
		public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
			if (newState == BluetoothProfile.STATE_CONNECTED) {
				connected = true;
				bluetoothGatt.discoverServices();
			} else if (status == 133 && newState == BluetoothProfile.STATE_DISCONNECTED) {
				if (System.currentTimeMillis() - retry_t0 > RETRY_CONNECT_TIMEOUT_MS) {
					connected = false;
					connectionState = STATE_DISCONNECTED;
					broadcastUpdate(getAddress(), ACTION_GATT_DISCONNECTED);
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
				connected = false;
				connectionState = STATE_DISCONNECTED;
				broadcastUpdate(getAddress(), ACTION_GATT_DISCONNECTED);
			}
		}

		@Override
		public void onServicesDiscovered(BluetoothGatt gatt, int status) {
			if (status != BluetoothGatt.GATT_SUCCESS) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
			BluetoothGattService service = bluetoothGatt.getService(CoreMIDI_BLE_SERVICE_UUID);
			if (service == null) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
			BluetoothGattCharacteristic characteristic = service.getCharacteristic(MIDI_IO_CHAR_UUID);
			if (characteristic == null) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
            /*
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
            }
            */
			gatt.setCharacteristicNotification(characteristic, true);
			BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CCCD);
			descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
			gatt.writeDescriptor(descriptor);
			characteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
		}

		@Override
		public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
			if (status != BluetoothGatt.GATT_SUCCESS) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
			BluetoothGattService service = bluetoothGatt.getService(CoreMIDI_BLE_SERVICE_UUID);
			if (service == null) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
			BluetoothGattCharacteristic characteristic = service.getCharacteristic(MIDI_IO_CHAR_UUID);
			if (characteristic == null) {
				disconnect();
				broadcastUpdate(getAddress(), ACTION_GATT_CONNECT_FAILED);
				return;
			}
			gatt.readCharacteristic(characteristic);
		}

		@Override
		public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			if (status != BluetoothGatt.GATT_SUCCESS) {
				Log.w(TAG, "onCharacteristicRead() status = " + status);
			}

			_characteristic = new BluetoothGattWriteCharacteristic(characteristic);

			resetParams();

            connectionState = STATE_CONNECTED;
            broadcastUpdate(getAddress(), ACTION_GATT_CONNECTED);
		}

        private static final long BLE_MIDI_HEADER = 0x80;
		private static final long BLE_MIDI_TIMESTAMP = 0x80;
		private static final long TIMESTAMP_RANGE = (0x1fff + 1) /* 8192 msec */;

		private byte running = 0;
		private int sysex_len = 0;
		private byte[] sysex_buf = new byte[512];
		private long msec = 0;

        private void resetParams() {
            synchronized (queue) {
                queue.clear();
                onWriting = false;
            }
            sysex_len = 0;
            running = _running = 0;
            t_prev = ts_prev = msec = 0;
        }

        @Override
		public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {

			byte[] data = characteristic.getValue();
			if (data == null) return;

			int data_idx = 0;
			int data_len = data.length;

			long ts = (data[data_idx++] & 0x3f) << 7; data_len--;
			long t = System.nanoTime() / 1000000L;

			while (data_len > 0) {

				if ((data[data_idx] & 0x80) != 0) {
					ts = (ts & ~0x7f) | (data[data_idx++] & 0x7f); data_len--;
					timestampToLocaltime(t, ts); /* "msec" is updated */
				}

				byte sts;
				if ((data[data_idx] & 0x80) != 0) {
					sts = data[data_idx++]; data_len--;
				} else {
					sts = running;
				}

				int len = 0;
				switch (sts & 0xf0) {
					case 0x080: len = 3; running = sts; break;
					case 0x090: len = 3; running = sts; break;
					case 0x0a0: len = 3; running = sts; break;
					case 0x0b0: len = 3; running = sts; break;
					case 0x0c0: len = 2; running = sts; break;
					case 0x0d0: len = 2; running = sts; break;
					case 0x0e0: len = 3; running = sts; break;
					case 0x0f0:
						switch (sts & 0xff) {
							case 0x0f0: running = 1; break;
							case 0x0f7: running = 0; break;

							case 0x0f1: len = 2; break;
							case 0x0f2: len = 3; break;
							case 0x0f3: len = 2; break;
							case 0x0f6: len = 1; break;

						//	case 0x0f8:
							case 0x0fa:
							case 0x0fb:
							case 0x0fc:
						//	case 0x0fe:
							case 0x0ff: len = 1; break;

							default: continue;
						}
						break;
				}

				if (len > 0) {
					byte[] msg = new byte[len];
					msg[0] = sts;
					if (len > 1) { msg[1] = data[data_idx++]; data_len--; }
					if (len > 2) { msg[2] = data[data_idx++]; data_len--; }
					input(inputEndpoint.getUID(), msg, msec);
				} else if ((sts & 0xff) == 0x0f0) {
					sysex_len = 0;
					sysex_buf[sysex_len++] = sts;
				} else if ((sts & 0xff) == 0x0f7) {
					if (sysex_len > 0) {
						sysex_buf[sysex_len++] = (byte) 0x0f7;
						byte[] msg = new byte[sysex_len];
						System.arraycopy(sysex_buf, 0, msg, 0, sysex_len);
						sysex_len = 0;
						input(inputEndpoint.getUID(), msg, msec);
					}
				} else {
					if (running > 0 && sysex_len < (sysex_buf.length - 1)) {
						sysex_buf[sysex_len++] = data[data_idx];
					}
					data_idx++; data_len--;
				}
			}
		}

		private long t_prev = 0;
		private long ts_prev = 0;

		private void timestampToLocaltime(long t, long ts) {
			long elapsed = t - t_prev;
			if (elapsed >= TIMESTAMP_RANGE) {
				msec = t;
			} else {
				long delta = ts - ts_prev;
				if (delta < 0) {
					delta += TIMESTAMP_RANGE;
				}
				if ((delta < 100) && (elapsed > (TIMESTAMP_RANGE - 100))) {
					delta += TIMESTAMP_RANGE;
				}
				if (Math.abs(elapsed - delta) > 100) {
					delta = 0; ts = ts_prev;
				}
				msec += delta;
			}
			t_prev = t; ts_prev = ts;
		}

        private Queue<byte[]> queue = new LinkedList<byte[]>();
        private boolean onWriting = false;
		private byte _running = 0;

		private void send(byte[] msg) {

			long now = System.nanoTime() / 1000000L;

			byte header = (byte)(BLE_MIDI_HEADER | ((now >>> 7) & 0x3f));
			byte timestamp = (byte)(BLE_MIDI_TIMESTAMP | (now & 0x7f));

			int msg_idx = 0;
			int msg_len = msg.length;

			int data_len = 0;
			byte[] data_buf = new byte[20];

			data_buf[data_len++] = header;

			while (msg_len > 0) {

				byte sts;
				if ((msg[msg_idx] & 0x080) != 0) {
					sts = msg[msg_idx++]; msg_len--;
				} else {
					sts = _running;
				}

				int len = 0;
				switch (sts & 0xf0) {
					case 0x080: len = 3; _running = sts; break;
					case 0x090: len = 3; _running = sts; break;
					case 0x0a0: len = 3; _running = sts; break;
					case 0x0b0: len = 3; _running = sts; break;
					case 0x0c0: len = 2; _running = sts; break;
					case 0x0d0: len = 2; _running = sts; break;
					case 0x0e0: len = 3; _running = sts; break;
					case 0x0f0:
						switch (sts & 0xff) {
							case 0x0f0: _running = 1; break;
							case 0x0f7: _running = 0; break;

							case 0x0f1: len = 2; break;
							case 0x0f2: len = 3; break;
							case 0x0f3: len = 2; break;
							case 0x0f6: len = 1; break;

							case 0x0f8:
							case 0x0fa:
							case 0x0fb:
							case 0x0fc:
							case 0x0fe:
							case 0x0ff: len = 1; break;

							default: continue;
						}
						break;
				}

				if (len > 0) {

					if (data_len + len + 1 > data_buf.length) {
						enqueue(data_buf, data_len);
						data_len = 0;
						data_buf[data_len++] = header;
					}

					data_buf[data_len++] = timestamp;
					data_buf[data_len++] = sts;
					if (len > 1) { data_buf[data_len++] = msg[msg_idx++]; msg_len--; }
					if (len > 2) { data_buf[data_len++] = msg[msg_idx++]; msg_len--; }

				} else if (((sts & 0xff) == 0x0f0) || ((sts & 0xff) == 0x0f7)) {

					if (data_len + 2 > data_buf.length) {
						enqueue(data_buf, data_len);
						data_len = 0;
						data_buf[data_len++] = header;
					}

					data_buf[data_len++] = timestamp;
					data_buf[data_len++] = sts;

				} else if (_running > 0) {

					if (data_len + 1 > data_buf.length) {
						enqueue(data_buf, data_len);
						data_len = 0;
						data_buf[data_len++] = header;
					}

					data_buf[data_len++] = msg[msg_idx++]; msg_len--;

				} else {

					msg_idx++; msg_len--;

				}
			}

			if (data_len > 0) {
				enqueue(data_buf, data_len);
			}
		}

		/* workaround for Galaxy S10+, Pixel3 */
		private static final long kNanosPerMillisecond = 1000000L;
		private static final long kMinWriteInterval = (11 * kNanosPerMillisecond);
		private long nextWriteTime = 0;

		private void enqueue(byte[] data, int len) {

			if (connectionState != STATE_CONNECTED) return;

			byte[] v = new byte[len];
			System.arraycopy(data, 0, v, 0, len);
            synchronized (queue) {
                if (onWriting) {
                    queue.add(v);
				    return;
                }
				onWriting = true;
			}

            _characteristic.setValue(v);
            if (!bluetoothGatt.writeCharacteristic(_characteristic)) {
                /* fail safe (use original characteristic) */
                BluetoothGattService service = bluetoothGatt.getService(CoreMIDI_BLE_SERVICE_UUID);
                BluetoothGattCharacteristic characteristic = service.getCharacteristic(MIDI_IO_CHAR_UUID);
                characteristic.setValue(v);
                if (!bluetoothGatt.writeCharacteristic(characteristic)) {
                    disconnect();
                    broadcastUpdate(getAddress(), ACTION_GATT_DISCONNECTED);
                }
            }

			/* workaround for Galaxy S10+, Pixel3 */
			nextWriteTime = (System.nanoTime() + kMinWriteInterval);
		}

        private byte[] packet = new byte[20];

		@Override
		public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {

            if (connectionState != STATE_CONNECTED) return;

			int pos = 0;

			synchronized (queue) {
				byte[] v = queue.poll();
				if (v == null) {
					onWriting = false;
					return;
				}
				byte header = v[0];
				int len = v.length;
				System.arraycopy(v, 0, packet, pos, len);
				pos += len;
				while ((v = queue.peek()) != null) {
					len = v.length - 1;
					if ((v[0] != header) || (pos + len >= 20)) break;
					System.arraycopy(v, 1, packet, pos, len);
					pos += len;
					queue.poll();
				}
			}

            byte[] value = new byte[pos];
			System.arraycopy(packet, 0, value, 0, value.length);
			characteristic.setValue(value);

			/* workaround for Galaxy S10+, Pixel3 */
			if (enableWriteInterval) {
				long nanosToWait = nextWriteTime - System.nanoTime();
				if (nanosToWait > 0) {
					try {
						Thread.sleep(1 + (nanosToWait  / kNanosPerMillisecond));
					} catch (InterruptedException e) {}
				}
			}

			if (!gatt.writeCharacteristic(characteristic)) {
                disconnect();
                broadcastUpdate(getAddress(), ACTION_GATT_DISCONNECTED);
            }

			/* workaround for Galaxy S10+, Pixel3 */
			nextWriteTime = (System.nanoTime() + kMinWriteInterval);
		}

	};

	private void broadcastUpdate(String address, String action) {
		/* for MIDIServer */
		if (action.equals(ACTION_GATT_CONNECTED)) {
			deviceAddNotification();
		} else if (action.equals(ACTION_GATT_DISCONNECTED) || action.equals(ACTION_GATT_CONNECT_FAILED)) {
			BluetoothGattConnection connection = getConnection(address);
			Set<MIDIServer.Endpoint> inputEndpoints = new HashSet<MIDIServer.Endpoint>();
			Set<MIDIServer.Endpoint> outputEndpoints = new HashSet<MIDIServer.Endpoint>();
			inputEndpoints.add(connection.getInputEndpoint());
			outputEndpoints.add(connection.getOutputEndpoint());
			deviceRemoveNotification(inputEndpoints, outputEndpoints);
		}

		/* for All Receivers */
		Intent intent = new Intent(action);
		intent.putExtra("address", address);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	private void deviceAddNotification() {
		Intent intent = new Intent(MIDIServer.ACTION_ADD_DEVICE);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	private void deviceRemoveNotification(
			Set<MIDIServer.Endpoint> inputEndpoints, Set<MIDIServer.Endpoint> outputEndpoints) {

		Intent intent;
		Set<String> uids;
		String[] array;

		intent = new Intent(MIDIServer.ACTION_REMOVE_INPUT_ENDPOINTS);
		uids = new HashSet<String>();
		for (MIDIServer.Endpoint ep : inputEndpoints) {
			uids.add(ep.getMap().get(MIDIClient.endpointUIDKey).toString());
		}
		array = new String[uids.size()];
		uids.toArray(array);
		intent.putExtra("uids", array);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);

		intent = new Intent(MIDIServer.ACTION_REMOVE_OUTPUT_ENDPOINTS);
		uids = new HashSet<String>();
		for (MIDIServer.Endpoint ep : outputEndpoints) {
			uids.add(ep.getMap().get(MIDIClient.endpointUIDKey).toString());
		}
		array = new String[uids.size()];
		uids.toArray(array);
		intent.putExtra("uids", array);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);

		intent = new Intent(MIDIServer.ACTION_REMOVE_DEVICE);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	private void input(String uid, byte[] data, long msec) {
		Intent intent = new Intent(MIDIServer.ACTION_MIDI_INPUT);
		intent.putExtra("uid", uid);
		intent.putExtra("data", data);
		intent.putExtra("msec", msec);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

}
