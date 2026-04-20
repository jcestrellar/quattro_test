//
//	MIDIInputDelegate.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

public interface MIDIInputDelegate {

	public abstract void midiInputMessage(byte[] msg, long msec);

}
