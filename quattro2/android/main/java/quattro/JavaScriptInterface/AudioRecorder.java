//
//	AudioRecorder.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Audio.*;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;

import java.lang.reflect.Constructor;

public class AudioRecorder extends JavaScriptObject
{
	private final String interfaceName = "recorder";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _AudioRecorderDelegate implements AudioRecorderDelegate {
		public void audioRecorderDidFinishRecording(String url) {
			postEvent(getInterfaceName() + "\f" + "stop" + "\f" + url);
		}
		public void audioRecorderErrorDidOccur(String url) {
			postEvent(getInterfaceName() + "\f" + "error" + "\f" + url);
		}
	}

	private quattro.Audio.AudioRecorder recorder = null;

	public AudioRecorder(JavaScriptHandler h) {
		super(h);
		try {
			String className = h.getAudioRecorderClassName();
			Class<?> c = Class.forName(className);
			Constructor constructor = c.getDeclaredConstructor(Context.class);
				recorder = (quattro.Audio.AudioRecorder)constructor.newInstance(getApplicationContext());
		} catch (Exception e) {
			recorder = new quattro.Audio.AudioRecorder(getApplicationContext());
		}
		recorder.delegate = new _AudioRecorderDelegate();
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
	public boolean create(String url, int format) {
		return recorder.create(url, format);
	}

	public static final int REQUEST_RECORD_AUDIO = 0x00aa;

	@JavascriptInterface
	public void unauthorized() {
		postEvent(getInterfaceName() + "\f" + "unauthorized");
	}

	@JavascriptInterface
	public void record() {
		new Handler(Looper.getMainLooper()).post(new Runnable() {
			@Override
			public void run() {
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
					Activity activity = handler.getMainActivity();
					if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
						activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
						return;
					}
				}
				recorder.record();
			}
		});
	}

	@JavascriptInterface
	public void pause() {
		recorder.pause();
	}

	@JavascriptInterface
	public void stop() {
		recorder.stop(false);
	}

	@JavascriptInterface
	public float volume(float gain) {
		recorder.volume(gain);
		return recorder.volume();
	}

	@JavascriptInterface
	public float volume() {
		return recorder.volume();
	}

	@JavascriptInterface
	public String file() {
		return (recorder.file() != null) ?  recorder.file() : "";
	}

	@JavascriptInterface
	public int status() {
		return recorder.status();
	}

	@JavascriptInterface
	public int channels() {
		return recorder.numberOfChannels();
	}

	@JavascriptInterface
	public float peakpower(int channel) {
		return recorder.peakPowerForChannel(channel);
	}

	@JavascriptInterface
	public float time() {
		return recorder.currentTime();
	}

	@JavascriptInterface
	public void input(boolean network) {
		recorder.input(network);
	}

	@Override
	public void onDestroy() {
		recorder.delegate = null;
		recorder.destroy();
		recorder = null;
	}

}
