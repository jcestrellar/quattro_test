package quattro.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import androidx.annotation.Nullable;

import quattro.Activity.MainActivity;

public class AppMainActivity extends MainActivity {

	@Override
	protected void config() {
		CONTENTS_URL = "file:///android_asset/html/index.html";
		CONTENTS_DEBUG = false; /* chrome://inspect */
		//	CONTENT_WIDTH  = 320;
		//	CONTENT_HEIGHT = 568;
			ENABLE_APP_EXIT = true;
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
		webView.addJavascriptInterface(new NativeCall_battery(this), "$$" + interfaceNameBattery);
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
	private final String interfaceNameBattery = "battery";

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

	/// Sample Project 用に追加
	class NativeCall_battery {
		private Context context;

		private boolean mEnabled = false;

		/// バッテリー残量
		/// 0.0 ~ 1.0 の範囲。
		/// 取得失敗を表現する場合は -1.0 とする
		private float mLevel = 0;

		/// バッテリー状態
		/// Javascript 用の値を保持する
		private int mState = 0;

		public NativeCall_battery(Context context) {
			this.context = context.getApplicationContext();
		}

		private final BroadcastReceiver batteryReceiver = new BroadcastReceiver() {
			public void onReceive(Context context, Intent intent) {

				// バッテリー残量
				float level = currentLevel(intent);
				if (level != mLevel) {
					postEvent(interfaceNameBattery + "\f" + "levelChanged" + "\f" + level);
					mLevel = level;
				}

				// バッテリー状態
				int state = currentState(intent);
				if (state != mState) {
					postEvent(interfaceNameBattery + "\f" + "stateChanged" + "\f" + state);
					mState = state;
				}
			}
		};

		/// バッテリー残量を取得する
		/// 引数を指定した場合、その Intent を使用して値を取得する.
		private float currentLevel(@Nullable Intent intent) {
			if (!mEnabled) {
				mLevel = -1;
				return mLevel;
			}

			Intent batteryIntent;
			if (intent != null) {
				batteryIntent = intent;
			}
			else {
				IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
				batteryIntent = this.context.registerReceiver(null, filter);
			}

			if (batteryIntent == null) {
				return -1;
			}

			int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
			int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);

			// 0.0 〜 1.0 の範囲になるように整形する
			return level * 100 / (float)scale / 100;
		}

		/// バッテリー状態を取得する
		/// Intent を指定した場合、その Intent を使用して値を取得する
		private int currentState(@Nullable Intent intent) {
			Intent batteryIntent;
			if (intent != null) {
				batteryIntent = intent;
			}
			else {
				IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
				batteryIntent = this.context.registerReceiver(null, filter);
			}

			if (batteryIntent == null) {
				return 0;
			}

			int states = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, 0);

			/*
			    public static final int BATTERY_STATUS_CHARGING = 2;
    			public static final int BATTERY_STATUS_DISCHARGING = 3;
    			public static final int BATTERY_STATUS_FULL = 5;
    			public static final int BATTERY_STATUS_NOT_CHARGING = 4;
    			public static final int BATTERY_STATUS_UNKNOWN = 1;
			 */
			// Javascript へ渡す値へ変換する
			int state;
			switch (states) {
				case BatteryManager.BATTERY_STATUS_DISCHARGING:
				case BatteryManager.BATTERY_STATUS_NOT_CHARGING:
					state = 1;
					break;
				case BatteryManager.BATTERY_STATUS_CHARGING:
					state = 2;
					break;
				case BatteryManager.BATTERY_STATUS_FULL:
					state = 3;
					break;
				case BatteryManager.BATTERY_STATUS_UNKNOWN:;
				default: state = 0; break;
			}
			return state;
		}

		@JavascriptInterface
		public void monitoring(boolean enabled) {
			if (enabled) {
				mEnabled = true;
				mLevel = currentLevel(null);
				mState = currentState(null);

				IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
				registerReceiver(this.batteryReceiver, filter);
			}
			else {
				mEnabled = false;
				mLevel = -1;
				mState = 0;
				try {
					unregisterReceiver(this.batteryReceiver);
				}
				catch(Exception ignored) {
					// Register していない Receiver を Unregister すると例外が発生するのでケアする
				}
			}
		}

		@JavascriptInterface
		public float level() {
			if (!mEnabled) {
				return mLevel;
			}

			return currentLevel(null);
		}

		@JavascriptInterface
		public double state() {
			if (!mEnabled) {
				return mState;
			}

			return currentState(null);
		}
	}

}
