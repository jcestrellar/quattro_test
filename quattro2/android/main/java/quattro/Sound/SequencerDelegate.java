//
//	SequencerDelegate.java
//
//	Copyright 2025 Roland Corporation. All rights reserved.
//

package quattro.Sound;

public interface SequencerDelegate {

	public abstract void sequencerMIDISend(byte[] data, byte[] metro);
	public abstract void sequencerTempoDidChange(int bpm);
	public abstract void sequencerDidFinishPlaying();

}
