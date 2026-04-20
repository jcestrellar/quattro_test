package quattro.app;

import android.bluetooth.BluetoothDevice;

public class BondedDeviceFilter {

	public static final boolean enabled = false;

	public static boolean matches(BluetoothDevice device) {
		String name = device.getName();
		return ((name != null) && name.matches(".+"));
	}
}
