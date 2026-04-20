//
//	MIDIClientDelegate.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

import java.util.HashMap;

public interface MIDIClientDelegate {

	public abstract void midiInputPortConnectFailed(HashMap<String,Object> endpoint);
	public abstract void midiOutputPortConnectFailed(HashMap<String,Object> endpoint);
	public abstract void midiObjectAddedRemoved();
	public abstract void midiErrorDidOccur(int error);

}
