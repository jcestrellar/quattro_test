//
//	NetServiceDiscoveryDelegate.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Network;

public interface NetServiceDiscoveryDelegate {

	public abstract void netServiceDidResolve(String name, String address, int port);
	public abstract void netServiceDidRemoveService(String name);
	public abstract void netServiceDidStopSearch(int errorCode);

}
