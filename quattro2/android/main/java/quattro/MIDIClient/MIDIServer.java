//
//	MIDIService.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

import quattro.BLE.*;
import quattro.USB.*;
import quattro.Sound.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.IBinder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class MIDIServer {

	public final static String ACTION_ADD_DEVICE				= "MIDIServer.ADD";
	public final static String ACTION_REMOVE_DEVICE				= "MIDIServer.REMOVE";
	public final static String ACTION_REMOVE_INPUT_ENDPOINTS	= "MIDIServer.REMOVE_IN";
	public final static String ACTION_REMOVE_OUTPUT_ENDPOINTS	= "MIDIServer.REMOVE_OOT";
	public final static String ACTION_MIDI_INPUT				= "MIDIServer.INPUT";

	public interface Endpoint {
		public abstract HashMap<String, Object> getMap();
		public abstract void open();
		public abstract void send(byte[] msg);
		public abstract void close();
	}

	public interface Driver {

		public abstract void start();
		public abstract void stop();

		public abstract ArrayList<HashMap<String, Object>> getInputEndpointsMap();

		public abstract ArrayList<HashMap<String, Object>> getOutputEndpointsMap();

		public abstract Set<Endpoint> getInputEndpoints();

		public abstract Set<Endpoint> getOutputEndpoints();

		public abstract Endpoint findInputEndpoint(HashMap<String, Object> map);

		public abstract Endpoint findOutputEndpoint(HashMap<String, Object> map);

	}

	private Set<Driver> drivers = null;
	private Set<MIDIClient> clients = null;
	private HashMap<String, Endpoint> inputEndpoints = null;
	private HashMap<String, Endpoint> outputEndpoints = null;
	private HashMap<MIDIInputPort, Set<Endpoint>> inputPortEndpoints = null;
	private HashMap<MIDIOutputPort, Set<Endpoint>> outputPortEndpoints = null;

	private final Context context;

	public MIDIServer(Context context) {
		this.context = context;
	}

	public void onCreate() {

		drivers = new HashSet<Driver>();
		clients = new HashSet<MIDIClient>();
		inputEndpoints = new HashMap<String, Endpoint>();
		outputEndpoints = new HashMap<String, Endpoint>();
		inputPortEndpoints = new HashMap<MIDIInputPort, Set<Endpoint>>();
		outputPortEndpoints = new HashMap<MIDIOutputPort, Set<Endpoint>>();

		IntentFilter intentFilter = new IntentFilter();
		intentFilter.addAction(ACTION_ADD_DEVICE);
		intentFilter.addAction(ACTION_REMOVE_DEVICE);
		intentFilter.addAction(ACTION_REMOVE_INPUT_ENDPOINTS);
		intentFilter.addAction(ACTION_REMOVE_OUTPUT_ENDPOINTS);
		intentFilter.addAction(ACTION_MIDI_INPUT);
		LocalBroadcastManager.getInstance(context).registerReceiver(receiver, intentFilter);

		startService();
	}

	public void onStart() {
		for (Driver driver : drivers) {
			driver.start();
		}
	}

	public void onStop() {
		for (Driver driver : drivers) {
			driver.stop();
		}
	}

	public synchronized void onDestroy() {
		try {
			LocalBroadcastManager.getInstance(context).unregisterReceiver(receiver);
		} catch (Exception e) { }

		stopService();

		drivers.clear();
		clients.clear();
		inputEndpoints.clear();
		outputEndpoints.clear();
		inputPortEndpoints.clear();
		outputPortEndpoints.clear();
	}

	private final BroadcastReceiver receiver = new BroadcastReceiver() {
		public void onReceive(Context context, Intent intent) {

			String action  = intent.getAction();

            synchronized (MIDIServer.this) {

                if (action.equals(ACTION_MIDI_INPUT)) {
                    String uid = intent.getStringExtra("uid");
                    Endpoint ep = inputEndpoints.get(uid);
                    if (ep != null) {
                        byte[] value = intent.getByteArrayExtra("data");
                        long msec = intent.getLongExtra("msec", 0);
                        input(ep, value, msec);
                    }
                    return;
                }

                if (action.equals(ACTION_ADD_DEVICE)) {
                    for (Driver driver : drivers) {
                        Set<Endpoint> inputs = driver.getInputEndpoints();
                        if (inputs != null) {
                            for (Endpoint ep : inputs) {
                                String uid = ep.getMap().get(MIDIClient.endpointUIDKey).toString();
                                inputEndpoints.put(uid, ep);
                            }
                        }
                        Set<Endpoint> outputs = driver.getOutputEndpoints();
                        if (outputs != null) {
                            for (Endpoint ep : outputs) {
                                String uid = ep.getMap().get(MIDIClient.endpointUIDKey).toString();
                                outputEndpoints.put(uid, ep);
                            }
                        }
                    }
                    for (MIDIClient client : clients) {
                        if (client != null) {
                            client.deviceAddNotification();
                        }
                    }
                    return;
                }

                if (action.equals(ACTION_REMOVE_DEVICE)) {
                    for (MIDIClient client : clients) {
                        if (client != null) {
                            client.deviceRemoveNotification();
                        }
                    }
                    return;
                }

                String[] uids = intent.getStringArrayExtra("uids");
                if (uids == null) return;

                if (action.equals(ACTION_REMOVE_INPUT_ENDPOINTS)) {
                    Set<Endpoint> removed = new HashSet<Endpoint>();
                    for (int i = 0; i < uids.length; i++) {
                        Endpoint ep = inputEndpoints.get(uids[i]);
                        if (ep == null) continue;
                        inputEndpoints.remove(uids[i]);
                        removed.add(ep);
                    }
                    for (MIDIInputPort port : inputPortEndpoints.keySet()) {
                        if (port == null) continue;
                        Set<Endpoint> endpoints = inputPortEndpoints.get(port);
                        if (endpoints == null) continue;
                        endpoints.removeAll(removed);
                    }
                } else
                if (action.equals(ACTION_REMOVE_OUTPUT_ENDPOINTS)) {
                    Set<Endpoint> removed = new HashSet<Endpoint>();
                    for (int i = 0; i < uids.length; i++) {
                        Endpoint ep = outputEndpoints.get(uids[i]);
                        if (ep == null) continue;
                        outputEndpoints.remove(uids[i]);
                        removed.add(ep);
                    }
                    for (MIDIOutputPort port : outputPortEndpoints.keySet()) {
                        if (port == null) continue;
                        Set<Endpoint> endpoints = outputPortEndpoints.get(port);
                        if (endpoints == null) continue;
                        endpoints.removeAll(removed);
                    }
                }

            }
		}
	};

	public synchronized void addClient(MIDIClient c) {
		if (c != null) {
			clients.add(c);
		}
	}

	public synchronized void removeClient(MIDIClient c) {
		if (c != null) {
			clients.remove(c);
		}
	}

	public synchronized ArrayList<HashMap<String, Object>> getInputEndpoints() {

		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (Driver driver : drivers) {
			list.addAll(driver.getInputEndpointsMap());
		}
		return list;
	}

	public synchronized ArrayList<HashMap<String, Object>> getOutputEndpoints() {

		ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
		for (Driver driver : drivers) {
			list.addAll(driver.getOutputEndpointsMap());
		}
		return list;
	}

	public synchronized boolean connectEndpoint(MIDIInputPort port, HashMap<String, Object> map) {

		if (port == null || map == null) return false;

		String uid = map.get(MIDIClient.endpointUIDKey).toString();

		Set<Endpoint> endpoints = inputPortEndpoints.get(port);
		if (endpoints != null) {
			for (Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					return true;
				}
			}
		} else {
			endpoints = new HashSet<Endpoint>();
		}

		Endpoint ep = null;
		for (Driver driver : drivers) {
			ep = driver.findInputEndpoint(map);
			if (ep != null) {
				break;
			}
		}
		if (ep == null) {
			return false;
		}
		ep.open();
		endpoints.add(ep);
		inputPortEndpoints.put(port, endpoints);
		return true;
	}

	public synchronized void connectAllEndpoints(MIDIInputPort port) {

		if (port != null) {
			Set<Endpoint> endpoints = new HashSet<Endpoint>();
			for (Driver driver : drivers) {
				Set<Endpoint> set = driver.getInputEndpoints();
				if (set != null) {
					for (Endpoint ep : set) {
						if (ep != null) {
							ep.open();
						}
					}
					endpoints.addAll(set);
				}
			}
			inputPortEndpoints.put(port, endpoints);
		}
	}

	public synchronized boolean disconnectEndpoint(MIDIInputPort port, HashMap<String, Object> map) {

		if (port == null || map == null) return false;

		String uid = map.get(MIDIClient.endpointUIDKey).toString();

		for (MIDIInputPort p : inputPortEndpoints.keySet()) {
			if (p != port) continue;
			Set<Endpoint> endpoints = inputPortEndpoints.get(port);
			if (endpoints == null) continue;
			for (Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					ep.close();
					endpoints.remove(ep);
				}
			}
		}

		return true;
	}

	public synchronized void disconnectAllEndpoints(MIDIInputPort port) {

		if (port != null) {
			Set<Endpoint> endpoints = inputPortEndpoints.get(port);
			if (endpoints != null) {
				for (Endpoint ep : endpoints) {
					if (ep != null) {
						ep.close();
					}
				}
			}
			inputPortEndpoints.remove(port);
		}
	}

	public synchronized boolean connectEndpoint(MIDIOutputPort port, HashMap<String, Object> map) {

		if (port == null || map == null) return false;

		String uid = map.get(MIDIClient.endpointUIDKey).toString();

		Set<Endpoint> endpoints = outputPortEndpoints.get(port);
		if (endpoints != null) {
			for (Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					return true;
				}
			}
		} else {
			endpoints = new HashSet<Endpoint>();
		}

		Endpoint ep = null;
		for (Driver driver : drivers) {
			ep = driver.findOutputEndpoint(map);
			if (ep != null) {
				break;
			}
		}
		if (ep == null) {
			return false;
		}
		ep.open();
		endpoints.add(ep);
		outputPortEndpoints.put(port, endpoints);
		return true;
	}

	public synchronized void connectAllEndpoints(MIDIOutputPort port) {

		if (port != null) {
			Set<Endpoint> endpoints = new HashSet<Endpoint>();
			for (Driver driver : drivers) {
				Set<Endpoint> set = driver.getOutputEndpoints();
				if (set != null) {
					for (Endpoint ep : set) {
						if (ep != null) {
							ep.open();
						}
					}
					endpoints.addAll(set);
				}
			}
			outputPortEndpoints.put(port, endpoints);
		}
	}

	public synchronized boolean disconnectEndpoint(MIDIOutputPort port, HashMap<String, Object> map) {

		if (port == null || map == null) return false;

		String uid = map.get(MIDIClient.endpointUIDKey).toString();

		for (MIDIOutputPort p : outputPortEndpoints.keySet()) {
			if (p != port) continue;
			Set<Endpoint> endpoints = outputPortEndpoints.get(port);
			if (endpoints == null) continue;
			for (Endpoint ep : endpoints) {
				if (ep == null) continue;
				if (uid.equals(ep.getMap().get(MIDIClient.endpointUIDKey))) {
					ep.close();
					endpoints.remove(ep);
				}
			}
		}

		return true;
	}

	public synchronized void disconnectAllEndpoints(MIDIOutputPort port) {

		if (port != null) {
			Set<Endpoint> endpoints = outputPortEndpoints.get(port);
			if (endpoints != null) {
				for (Endpoint ep : endpoints) {
					if (ep != null) {
						ep.close();
					}
				}
			}
			outputPortEndpoints.remove(port);
		}
	}

	public synchronized void output(MIDIOutputPort port, byte[] msg) {

		if (port == null) return;
		if (msg == null || msg.length == 0) return;

		Set<Endpoint> endpoints = outputPortEndpoints.get(port);
		if (endpoints == null) return;

		for (Endpoint ep : endpoints) {
			if (ep != null) {
				ep.send(msg);
			}
		}
	}

	void input(Endpoint ep, byte[] msg, long msec) {

		if (isSoundDriverConnected() && SoundDriver.thru()) {
			SoundDriver.MIDISend(msg, msec * 1000000L);
		}

		if (inputPortEndpoints != null) {
			for (MIDIInputPort port : inputPortEndpoints.keySet()) {
				if (port == null) continue;
				Set<Endpoint> endpoints = inputPortEndpoints.get(port);
				if (endpoints == null) continue;
				if (endpoints.contains(ep)) {
					port.input(msg, msec);
				}
			}
		}
	}

	/* MIDI Drivers */

	boolean hasSystemFeatureMIDI() {
		return context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_MIDI);
	}

	void startService() {
		if (hasSystemFeatureMIDI()) {
			context.bindService(new Intent(context, MIDIDriver.class),
					midiDriverConnection, Context.BIND_AUTO_CREATE);
		} else {
			context.bindService(new Intent(context, UsbHostMidiDriver.class),
					usbDriverConnection, Context.BIND_AUTO_CREATE);
		}
		context.bindService(new Intent(context, CoreMIDIBLEDriver.class),
				bleDriverConnection, Context.BIND_AUTO_CREATE);
		context.bindService(new Intent(context, SoundDriver.class),
				soundConnection, Context.BIND_AUTO_CREATE);
	}

	void stopService() {
		if (hasSystemFeatureMIDI()) {
			context.unbindService(midiDriverConnection);
		} else {
			context.unbindService(usbDriverConnection);
		}
		context.unbindService(bleDriverConnection);
		context.unbindService(soundConnection);
	}

	private ServiceConnection midiDriverConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			MIDIDriver driver = ((MIDIDriver.LocalBinder)rawBinder).getService();
			drivers.add(driver);
		}
		public void onServiceDisconnected(ComponentName classname) { }
	};

	private ServiceConnection usbDriverConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			UsbHostMidiDriver driver = ((UsbHostMidiDriver.LocalBinder)rawBinder).getService();
			drivers.add(driver);
			driver.prepare();
		}
		public void onServiceDisconnected(ComponentName classname) { }
	};

	private ServiceConnection bleDriverConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			CoreMIDIBLEDriver driver = ((CoreMIDIBLEDriver.LocalBinder)rawBinder).getService();
			drivers.add(driver);
		}
		public void onServiceDisconnected(ComponentName classname) { }
	};

	private boolean soundDriverConnected = false;

	private ServiceConnection soundConnection = new ServiceConnection() {
		public void onServiceConnected(ComponentName className, IBinder rawBinder) {
			SoundDriver driver = ((SoundDriver.LocalBinder)rawBinder).getService();
			soundDriverConnected = true;
			drivers.add(driver);
			Intent intent = new Intent(MIDIServer.ACTION_ADD_DEVICE);
			LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
		}
		public void onServiceDisconnected(ComponentName classname) {
			soundDriverConnected = false;
		}
	};

	public boolean isSoundDriverConnected() {
		return soundDriverConnected;
	}

	public void panel(Activity activity) {
		Intent intent = new Intent(activity, quattro.Activity.BLEDeviceListActivity.class);
		activity.startActivity(intent);
	}

}
