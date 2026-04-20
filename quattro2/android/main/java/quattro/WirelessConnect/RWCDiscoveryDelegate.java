//
//	RWCDiscoveryDelegate.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.util.HashMap;

public interface RWCDiscoveryDelegate {

	public abstract void discoveryDeviceDidFound(HashMap<String,Object> device);

}
