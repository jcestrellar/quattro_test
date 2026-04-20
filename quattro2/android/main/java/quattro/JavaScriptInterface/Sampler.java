//
//	Sampler.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.app.Audio.*;
import quattro.Audio.*;

import android.webkit.JavascriptInterface;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Sampler extends JavaScriptObject
{
	private final String interfaceName = "sampler";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _SamplePlayerDelegate implements SamplePlayerDelegate {
		final private int id;

		public _SamplePlayerDelegate(int id) { this.id = id; }

		public void samplePlayerDidEndSong(String url) {
			postEvent(getInterfaceName() + "\f" + "eof" + "\f" + id + "\f" + url);
		}
	}

	private ExtSamplePlayer[] sampler = null;

	public Sampler(JavaScriptHandler h) {
		super(h);
	}

	@JavascriptInterface
	public void create(int count) {
		if (sampler != null) return;
		sampler = new ExtSamplePlayer[count];
		for (int i = 0; i < count; i++) {
			sampler[i] = new ExtSamplePlayer(getApplicationContext());
			sampler[i].delegate = new _SamplePlayerDelegate(i);
		}
	}

	@JavascriptInterface
	public String device(int id, String uid) {
		return ""; /* Not supported */
	}
	@JavascriptInterface
	public String device(int id) {
		return ""; /* Not supported */
	}

	@JavascriptInterface
	public boolean open(int id, String url) {
		if (sampler == null) return false;
		return sampler[id].open(url);
	}

	@JavascriptInterface
	public void close(int id) {
		if (sampler == null) return;
		sampler[id].close();
	}

	@JavascriptInterface
	public void play(int id) {
		if (sampler == null) return;
		sampler[id].play();
	}

	@JavascriptInterface
	public void pause(int id) {
		if (sampler == null) return;
		sampler[id].pause();
	}

	@JavascriptInterface
	public void stop() {
		if (sampler == null) return;
		for (int i = 0; i < sampler.length; i++) {
			sampler[i].stop(true);
		}
	}
	@JavascriptInterface
	public void stop(int id) {
		if (sampler == null) return;
		sampler[id].stop(false);
	}
	@JavascriptInterface
	public void stop(int id, boolean shouldStopImmediate) {
		if (sampler == null) return;
		sampler[id].stop(shouldStopImmediate);
	}

	@JavascriptInterface
	public void locate(int id, float time) {
		if (sampler == null) return;
		sampler[id].locate(time);
	}

	@JavascriptInterface
	public float begin(int id, float time) {
		if (sampler == null) return 0.0f;
		sampler[id].begin(time);
		return sampler[id].begin();
	}
	@JavascriptInterface
	public float begin(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].begin();
	}

	@JavascriptInterface
	public float end(int id, float time) {
		if (sampler == null) return 0.0f;
		sampler[id].end(time);
		return sampler[id].end();
	}
	@JavascriptInterface
	public float end(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].end();
	}

	@JavascriptInterface
	public float volume(int id, float gain) {
		if (sampler == null) return 1.0f;
		sampler[id].volume(gain);
		return sampler[id].volume();
	}
	@JavascriptInterface
	public float volume(int id) {
		if (sampler == null) return 1.0f;
		return sampler[id].volume();
	}

	@JavascriptInterface
	public int repeat(int id, int count) {
		if (sampler == null) return 0;
		sampler[id].repeat(count);
		return sampler[id].repeat();
	}
	@JavascriptInterface
	public int repeat(int id) {
		if (sampler == null) return 0;
		return sampler[id].repeat();
	}

	@JavascriptInterface
	public float speed(int id, float rate) {
		if (sampler == null) return 1.0f;
		sampler[id].speed(rate);
		return sampler[id].speed();
	}
	@JavascriptInterface
	public float speed(int id) {
		if (sampler == null) return 1.0f;
		return sampler[id].speed();
	}

	@JavascriptInterface
	public float pitch(int id, float cent) {
		if (sampler == null) return 0.0f;
		sampler[id].pitch(cent);
		return sampler[id].pitch();
	}
	@JavascriptInterface
	public float pitch(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].pitch();
	}

	@JavascriptInterface
	public float fadein(int id, float time) {
		if (sampler == null) return 0.0f;
		sampler[id].fadeIn(time);
		return sampler[id].fadeIn();
	}
	@JavascriptInterface
	public float fadein(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].fadeIn();
	}

	@JavascriptInterface
	public float fadeout(int id, float time) {
		if (sampler == null) return 0.0f;
		sampler[id].fadeOut(time);
		return sampler[id].fadeOut();
	}
	@JavascriptInterface
	public float fadeout(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].fadeOut();
	}

	@JavascriptInterface
	public String control(int id, String params) {
		if (sampler == null) return "";
		return sampler[id].control(params);
	}

	@JavascriptInterface
	public String file(int id) {
		if (sampler == null) return "";
		return (sampler[id].file() != null) ?  sampler[id].file() : "";
	}

	@JavascriptInterface
	public float totaltime(int id) {
		if (sampler == null) return 0.0f;
		return sampler[id].totalTime();
	}

	@JavascriptInterface
	public String status() throws JSONException {
		if (sampler == null) return "";
		JSONArray array = new JSONArray();
		for (int i = 0; i < sampler.length; i++) {
			JSONObject obj = new JSONObject();
			obj.put("time", Float.valueOf(sampler[i].currentTime()));
			obj.put("state", Integer.valueOf(sampler[i].state()));
			JSONArray peakpower = new JSONArray();
			float[] v = sampler[i].peakPowerForChannels();
			for (int ch = 0; ch < v.length; ch++) {
				peakpower.put(Float.valueOf(v[ch]));
			}
			obj.put("peakpower", peakpower);
			array.put(obj);
		}
		return array.toString();
	}

	@Override
	public void onDestroy() {
		if (sampler != null) {
			for (int i = 0; i < sampler.length; i++) {
				sampler[i].delegate = null;
				sampler[i].destroy();
				sampler[i] = null;
			}
			sampler = null;
		}
	}

}
