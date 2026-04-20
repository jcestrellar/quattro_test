//
//	TCPIPClientDelegate.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Network;

public interface TCPIPClientDelegate {

	public abstract void received(byte[] buf, int len);
	public abstract void closed();

}
