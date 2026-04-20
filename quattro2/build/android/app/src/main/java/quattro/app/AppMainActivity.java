package quattro.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import quattro.Activity.MainActivity;

public class AppMainActivity extends MainActivity {

	@Override
	protected void config() {
	//	CONTENTS_URL = "http://localhost/html/index.html";
		CONTENTS_URL = "file:///android_asset/html/index.html";
		CONTENTS_DEBUG = false; /* chrome://inspect */
	//	CONTENT_WIDTH  = 320;
	//	CONTENT_HEIGHT = 568;
	//	ENABLE_APP_EXIT = true;
	//	PREFERS_STATUSBAR_HIDDEN = true;
	//	WEBVIEW_NO_BOUNCE = true;
	}

	@Override
	public String getAudioPlayerClassName() {
	//	return "quattro.Audio.AudioPlayer";
		return "quattro.Audio.MediaCodecPlayer";
	}

	@Override
	public String getAudioRecorderClassName() {
	//	return "quattro.Audio.AudioRecorder";
		return "quattro.Audio.MediaCodecRecorder";
	}

	@Override
	public boolean isConsumable(String skuId) {
	//	return skuId.equals("com.example.product.002");
		return false;
	}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		webView.addJavascriptInterface(new NativeCall_calc(), "$$" + interfaceName);
	}

	@Override
	public void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
	}
/*
	@Override
	public void onBackPressed() {
		super.onBackPressed();
	}
*/
	@Override
	public void onRestart() {
		super.onRestart();
	}

	@Override
	public void onStart() {
		super.onStart();
	}

    @Override
    public void onPause() {
        super.onPause();
    }

	@Override
	public void onResume() {
		super.onResume();
	}

	@Override
	public void onStop() {
		super.onStop();
	}

	@Override
	public void onDestroy() {
		super.onDestroy();
	}

	/* native API extensions */

	private final String interfaceName = "calc";

	class NativeCall_calc {
		@JavascriptInterface
		public int multiple(int a, int b) {
			return (a * b);
		}
	}

	@Override
	public void control(String request) {
		postEvent(interfaceName + "\f" + "alert" + "\f" + request);
	}

}
