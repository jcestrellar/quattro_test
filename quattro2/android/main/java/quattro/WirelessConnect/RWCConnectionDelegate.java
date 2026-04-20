//
//	RWCConnectionDelegate.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

import java.util.HashMap;

public interface RWCConnectionDelegate {

	public abstract void connectionFailed(HashMap<String,Object> device);
	public abstract void connectionDidEstablished(HashMap<String,Object> device);
	public abstract void connectionDidClosed(HashMap<String,Object> device);
	public abstract void connectionErrorDidOccur(HashMap<String,Object> device);

}
