//
// @(#)AudioPlayerDelegate.java
//
// Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Audio;

public interface AudioPlayerDelegate {

	public abstract void audioPlayerDidEndSong(String url);
	public abstract void audioPlayerDidFinishPlaying(String url);
	public abstract void audioPlayerErrorDidOccur(String url);

}
