//
//	MIDIDriver.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import android.annotation.TargetApi;
import android.app.Service;
import android.bluetooth.BluetoothDevice;
import android.content.Context;
import android.content.Intent;
import android.media.midi.*;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

@TargetApi(Build.VERSION_CODES.M)
public class MIDIDriver extends Service implements MIDIServer.Driver
{
	private MidiManager manager = null;
	private Set<MIDIDevice> devices = null;
	private Map<MIDIDevice, Set<MIDIServer.Endpoint>> inputEndpoints;
	private Map<MIDIDevice, Set<MIDIServer.Endpoint>> outputEndpoints;

	private final IBinder binder = new LocalBinder();

	public class LocalBinder extends Binder {
		public MIDIDriver getService() {
			return MIDIDriver.this;
		}
	}

	@Override
	public IBinder onBind(Intent intent) { return binder; }

	@Override
	public void onCreate() {
		manager = (MidiManager)getSystemService(Context.MIDI_SERVICE);

		devices = new HashSet<MIDIDevice>();
		inputEndpoints = new HashMap<MIDIDevice, Set<MIDIServer.Endpoint>>();
		outputEndpoints = new HashMap<MIDIDevice, Set<MIDIServer.Endpoint>>();

		manager.registerDeviceCallback(notify, new Handler(Looper.getMainLooper()));
		MidiDeviceInfo[] devs = manager.getDevices();
		for (int i = 0; i < devs.length; i++) {
			openDevice(devs[i]);
		}
	}

	@Override
	public void onDestroy() {
		manager.unregisterDeviceCallback(notify);

		for (Set<MIDIServer.Endpoint> endpoints : inputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep != null) ep.close();
			}
		}
		inputEndpoints.clear();

		for (Set<MIDIServer.Endpoint> endpoints : outputEndpoints.values()) {
			if (endpoints == null) continue;
			for (MIDIServer.Endpoint ep : endpoints) {
				if (ep != null) ep.close();
			}
		}
		outputEndpoints.clear();

		for (MIDIDevice device : devices) {
			device.close();
		}
		devices.clear();
	}

	@Override
	public void start() { }
	@Override
	public void stop() { }

	public void connect(BluetoothDevice dev) {
		manager.openBluetoothDevice(dev, listner, new Handler(Looper.getMainLooper()));
	}

	private void openDevice(MidiDeviceInfo info) {
		if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) {
			Bundle properties = info.getProperties();
			BluetoothDevice dev = (BluetoothDevice)properties.get(MidiDeviceInfo.PROPERTY_BLUETOOTH_DEVICE);
			manager.openBluetoothDevice(dev, listner, new Handler(Looper.getMainLooper()));
		} else {
			manager.openDevice(info, listner, new Handler(Looper.getMainLooper()));
		}
	}

	private final MidiManager.DeviceCallback notify = new MidiManager.DeviceCallback() {
		@Override
		public void onDeviceAdded(MidiDeviceInfo info) {
			openDevice(info);
		}
		@Override
		public void onDeviceRemoved(MidiDeviceInfo info) {

			for (MIDIDevice device : devices) {
				if (device == null) continue;
				if (device.getDeviceInfo().equals(info)) {
					Set<MIDIServer.Endpoint> removedInputEndpoints = inputEndpoints.get(device);
					Set<MIDIServer.Endpoint> removerdOutputEndpoints = outputEndpoints.get(device);

					if (removedInputEndpoints != null) {
						for (MIDIServer.Endpoint ep : removedInputEndpoints) {
							if (ep != null) ep.close();
						}
					}
					if (removerdOutputEndpoints != null) {
						for (MIDIServer.Endpoint ep : removerdOutputEndpoints) {
							if (ep != null) ep.close();
						}
					}
					device.close();

					inputEndpoints.remove(device);
					outputEndpoints.remove(device);
					devices.remove(device);

					deviceRemoveNotification(removedInputEndpoints, removerdOutputEndpoints);
					return;
				}
			}
		}
	};

	private final MidiManager.OnDeviceOpenedListener listner = new MidiManager.OnDeviceOpenedListener() {
		@Override
		public void onDeviceOpened(MidiDevice dev) {
			if (dev != null) {
				for (MIDIDevice device : devices) {
					if (device.getDeviceInfo().equals(dev.getInfo())) {
						return;
					}
				}
				devices.add(new MIDIDevice(dev));
				deviceAddNotification();
			}
		}
	};

	public class MIDIDevice {

		class InputEndpoint implements MIDIServer.Endpoint {
			private MidiOutputPort port = null;
			private int portNumber = 0;
			private String uid = null;

			private byte running = 0;
			private int sysex_len = 0;
			private byte[] sysex_buf = new byte[512];

			public InputEndpoint(int portNumber) {
				this.portNumber = portNumber;
				uid = getUID(portNumber) + ":1";
			}

			@Override
			public void open() {
				if (port == null) {
					port = device.openOutputPort(portNumber);
					if (port != null) {
						port.connect(receiver);
					}
				}
			}

			@Override
			public void close() {
				if (port != null) {
					port.disconnect(receiver);
					try {
						port.close();
					} catch (IOException e) {}
					port = null;
					running = 0;
					sysex_len = 0;
				}
			}

			@Override
			public HashMap<String,Object> getMap() {
				HashMap<String,Object> map = new HashMap<String,Object>();
				map.put(MIDIClient.deviceNameKey,    getName());
				map.put(MIDIClient.entityNameKey,    getEntityName(portNumber));
				map.put(MIDIClient.endpointUIDKey,   uid);
				map.put(MIDIClient.endpointIndexKey, getIndex(portNumber));
				return map;
			}

			@Override
			public void send(byte[] msg) {}

			private final MidiReceiver receiver = new MidiReceiver() {

				@Override
				public void onSend(byte[] data, int offset, int count, long timestamp) {

					while (count > 0) {

						byte sts;
						if ((data[offset] & 0x80) != 0) {
							sts = data[offset++]; count--;
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

									//		case 0x0f8:
									case 0x0fa:
									case 0x0fb:
									case 0x0fc:
									//		case 0x0fe:
									case 0x0ff: len = 1; break;

									default: continue;
								}
								break;
						}

						if (len > 0) {
							byte[] msg = new byte[len];
							msg[0] = sts;
							if (len > 1) { msg[1] = data[offset++]; count--; }
							if (len > 2) { msg[2] = data[offset++]; count--; }
							input(uid, msg, timestamp);
						} else if ((sts & 0xff) == 0x0f0) {
							sysex_len = 0;
							sysex_buf[sysex_len++] = sts;
						} else if ((sts & 0xff) == 0x0f7) {
							if (sysex_len > 0) {
								sysex_buf[sysex_len++] = (byte) 0x0f7;
								byte[] msg = new byte[sysex_len];
								System.arraycopy(sysex_buf, 0, msg, 0, sysex_len);
								sysex_len = 0;
								input(uid, msg, timestamp);
							}
						} else {
							if (running > 0 && sysex_len < (sysex_buf.length - 1)) {
								sysex_buf[sysex_len++] = data[offset];
							}
							offset++; count--;
						}
					}
				}

			};
		}

		class OutputEndpoint implements MIDIServer.Endpoint {
			private MidiInputPort port = null;
			private int portNumber = 0;
			private String uid = null;

			public OutputEndpoint(int portNumber) {
				this.portNumber = portNumber;
				uid = getUID(portNumber) + ":0";
			}

			@Override
			public void open() {
				if (port == null) {
					port = device.openInputPort(portNumber);
				}
			}

			@Override
			public void close() {
				if (port != null) {
					try {
						port.close();
					} catch (IOException e) {}
					port = null;
				}
			}

			@Override
			public HashMap<String,Object> getMap() {
				HashMap<String,Object> map = new HashMap<String,Object>();
				map.put(MIDIClient.deviceNameKey,    getName());
				map.put(MIDIClient.entityNameKey,    getEntityName(portNumber));
				map.put(MIDIClient.endpointUIDKey,   uid);
				map.put(MIDIClient.endpointIndexKey, getIndex(portNumber));
				return map;
			}

			@Override
			public void send(byte[] msg) {
				if (port != null) {
					try {
						port.send(msg, 0, msg.length);
					} catch (IOException e) {}
				}
			}
		}

		private MidiDevice device = null;

		public MIDIDevice(MidiDevice mididev) {
			device = mididev;
			Set<MIDIServer.Endpoint> inEps = new HashSet<MIDIServer.Endpoint>();
			Set<MIDIServer.Endpoint> outEps = new HashSet<MIDIServer.Endpoint>();
			for (int i = 0; i < getDeviceInfo().getOutputPortCount(); i++) {
				inEps.add(new InputEndpoint(i));
			}
			for (int i = 0; i < getDeviceInfo().getInputPortCount(); i++) {
				outEps.add(new OutputEndpoint(i));
			}
			inputEndpoints.put(this, inEps);
			outputEndpoints.put(this, outEps);
		}

		public void close() {
			try {
				device.close();
			} catch (IOException e) {}
		}

		public MidiDeviceInfo getDeviceInfo() {
			return device.getInfo();
		}

		public String getName() {
			MidiDeviceInfo info = getDeviceInfo();
			Bundle properties = getDeviceInfo().getProperties();
			if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) {
				return properties.getString(MidiDeviceInfo.PROPERTY_NAME);
			} else {
				return properties.getString(MidiDeviceInfo.PROPERTY_PRODUCT);
			}
		}

		public String getEntityName(int portNumber) {
			String name = getName();
			MidiDeviceInfo info = getDeviceInfo();
			if (info.getOutputPortCount() > 1) {
				name += " #" + String.valueOf(portNumber + 1);
			}
			return name;
		}

		public String getUID(int portNumber) {
			MidiDeviceInfo info = getDeviceInfo();
			if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) {
				Bundle properties = info.getProperties();
				BluetoothDevice dev = (BluetoothDevice)properties.get(MidiDeviceInfo.PROPERTY_BLUETOOTH_DEVICE);
				return dev.getAddress() + ":BLE";
			} else {
				return String.valueOf(portNumber) + ":" +  getName() + ":" + String.valueOf(info.getType());
			}
		}

        public String getIndex(int portNumber) {
            MidiDeviceInfo info = getDeviceInfo();
            if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) {
                Bundle properties = info.getProperties();
                BluetoothDevice dev = (BluetoothDevice)properties.get(MidiDeviceInfo.PROPERTY_BLUETOOTH_DEVICE);
                return dev.getAddress();
            } else {
                return getEntityName(portNumber);
            }
        }

	}

	private void deviceAddNotification() {
		Intent intent = new Intent(MIDIServer.ACTION_ADD_DEVICE);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
	}

	private void deviceRemoveNotification(
			Set<MIDIServer.Endpoint> removedInputEndpoints,
			Set<MIDIServer.Endpoint> removerdOutputEndpoints) {

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

		if (removerdOutputEndpoints != null) {
			intent = new Intent(MIDIServer.ACTION_REMOVE_OUTPUT_ENDPOINTS);
			uids = new HashSet<String>();
			for (MIDIServer.Endpoint ep : removerdOutputEndpoints) {
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

	private void input(String uid, byte[] data, long nano) {
		long msec = nano / 1000000L;
		Intent intent = new Intent(MIDIServer.ACTION_MIDI_INPUT);
		intent.putExtra("uid", uid);
		intent.putExtra("data", data);
		intent.putExtra("msec", msec);
		LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
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

}
