//
//	AudioPlayer.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Audio.*;

import android.content.Context;
import android.webkit.JavascriptInterface;

import java.lang.reflect.Constructor;

public class AudioPlayer extends JavaScriptObject
{
	private final String interfaceName = "player";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _AudioPlayerDelegate implements AudioPlayerDelegate {
		public void audioPlayerDidEndSong(String url) {
			postEvent(getInterfaceName() + "\f" + "eof" + "\f" + url);
		}
		public void audioPlayerDidFinishPlaying(String url) {
			postEvent(getInterfaceName() + "\f" + "stop" + "\f" + url);
		}
		public void audioPlayerErrorDidOccur(String url) {
			postEvent(getInterfaceName() + "\f" + "error" + "\f" + url);
		}
	}

	private quattro.Audio.AudioPlayer player = null;

	public AudioPlayer(JavaScriptHandler h) {
		super(h);
		try {
			String className = h.getAudioPlayerClassName();
			Class<?> c = Class.forName(className);
			Constructor constructor = c.getDeclaredConstructor(Context.class);
			player = (quattro.Audio.AudioPlayer)constructor.newInstance(getApplicationContext());
		} catch (Exception e) {
			player = new quattro.Audio.AudioPlayer(getApplicationContext());
		}
		player.delegate = new _AudioPlayerDelegate();
	}

	@JavascriptInterface
	public String device(String uid) {
		return ""; /* Not supported */
	}
	@JavascriptInterface
	public String device() {
		return ""; /* Not supported */
	}

	@JavascriptInterface
	public boolean open(String url) {
		return player.open(url);
	}

	@JavascriptInterface
	public void play() {
		player.play();
	}

	@JavascriptInterface
	public void pause() {
		player.pause();
	}

	@JavascriptInterface
	public void stop() {
		player.stop();
	}

	@JavascriptInterface
	public void locate(float time) {
		player.locate(time);
	}

	@JavascriptInterface
	public float volume(float gain) {
		player.volume(gain);
		return player.volume();
	}

	@JavascriptInterface
	public float volume() {
		return player.volume();
	}

	@JavascriptInterface
	public float speed(float rate) {
		player.speed(rate);
		return player.speed();
	}

	@JavascriptInterface
	public float speed() {
		return player.speed();
	}

	@JavascriptInterface
	public float pitch(float cent) {
		player.pitch(cent);
		return player.pitch();
	}

	@JavascriptInterface
	public float pitch() {
		return player.pitch();
	}

	@JavascriptInterface
	public String file() {
		return (player.file() != null) ?  player.file() : "";
	}

	@JavascriptInterface
	public int status() {
		return player.status();
	}

	@JavascriptInterface
	public int channels() {
		return player.numberOfChannels();
	}

	@JavascriptInterface
	public float peakpower(int channel) {
		return player.peakPowerForChannel(channel);
	}

	@JavascriptInterface
	public float time() {
		return player.currentTime();
	}

	@JavascriptInterface
	public float totaltime() {
		return player.totalTime();
	}

	@JavascriptInterface
	public void output(boolean network) {
		player.output(network);
	}

	@Override
	public void onDestroy() {
		player.delegate = null;
		player.destroy();
		player = null;
	}

}
