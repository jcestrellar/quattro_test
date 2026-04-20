//
//	RWCAudioInputStreamDelegate.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

public interface RWCAudioInputStreamDelegate {

	public abstract void inputStream(byte[] buffer, int length);
	public abstract void inputStreamDidClosed();

}
