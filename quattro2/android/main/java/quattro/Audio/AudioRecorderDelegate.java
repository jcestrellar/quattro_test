//
//  AudioRecorderDelegate.java
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Audio;

public interface AudioRecorderDelegate {

	public abstract void audioRecorderDidFinishRecording(String url);
	public abstract void audioRecorderErrorDidOccur(String url);

}
