//
//	RWCMIDIServiceDelegate.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.WirelessConnect;

public interface RWCMIDIServiceDelegate {

	public abstract void midiInputMessage(byte[] msg, long msec, int cable);

}
