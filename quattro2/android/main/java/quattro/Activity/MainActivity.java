package quattro.Activity;

import android.Manifest;
import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.graphics.Point;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.ParcelFileDescriptor;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.provider.OpenableColumns;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.auth.AuthTabIntent;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.documentfile.provider.DocumentFile;

import android.provider.Settings;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.view.WindowMetrics;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Vector;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import quattro.app.R;
import quattro.Billing.BillingManager;
import quattro.MIDIClient.MIDIServer;
import quattro.JavaScriptInterface.*;

public class MainActivity extends AppCompatActivity implements JavaScriptHandler {

	protected String CONTENTS_URL = "about:blank";

	protected boolean CONTENTS_DEBUG = false; /* chrome://inspect */
	protected boolean ENABLE_APP_EXIT = false;
	protected boolean PREFERS_STATUSBAR_HIDDEN = false;
	protected boolean WEBVIEW_NO_BOUNCE = false;
	protected boolean FORCE_MIDI_PANEL = false;
	protected int CONTENT_WIDTH  = -1;
	protected int CONTENT_HEIGHT = -1;

	private static final int RESULT_MIDI_PANEL		= 0;
	private static final int RESULT_OPEN_PANEL		= 1;
	private static final int RESULT_SAVE_PANEL		= 2;
	private static final int RESULT_CHOOSE_FOLDER	= 3;
	private static final int RESULT_IMPORT_FILE		= 4;
	private static final int RESULT_IMPORT_FILES	= 5;
	private static final int RESULT_EXPORT_FILE		= 6;
	private static final int RESULT_WEBCLIENT		= 7;
	private static final int RESULT_INPUT_FILE		= 8;
	private static final int RESULT_RECORD_AUDIO	= AudioRecorder.REQUEST_RECORD_AUDIO;
	private static final int RESULT_BLEMIDI_SCANNER	= BLEMIDIScanner.REQUEST_BLEMIDI_SCANNER;
	private static final int RESULT_BLE_CENTRAL		= BLECentralManager.REQUEST_BLE_CENTRAL;

	protected WebView webView = null;

	private MIDIServer midiServer = null;
	private BillingManager billingManager = null;
	private Vector<JavaScriptObject> vec = new Vector<JavaScriptObject>();
	private PermissionRequest webClientRequest = null;
	private ValueCallback<Uri[]> filePathCallback = null;
	private AuthTabIntent authTabIntent = null;
	private boolean authTabCanceled = false;

	protected static Handler handler = new Handler();
	protected ExportFile exportFile = null;

	protected void config() {}
	protected void control(String request) {}

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.activity_main);
		ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
			Insets safeArea = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
			v.setPadding(safeArea.left, safeArea.top, safeArea.right, safeArea.bottom);
			if (CONTENT_WIDTH > 0 && CONTENT_HEIGHT > 0) {
				Point pt = new Point();
				WindowManager windowManager = getWindowManager();
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
					WindowMetrics metrics = windowManager.getCurrentWindowMetrics();
					Rect bounds = metrics.getBounds();
					pt.x = bounds.right - bounds.left;
					pt.y = bounds.bottom - bounds.top;
				} else {
					Display display = windowManager.getDefaultDisplay();
					display.getSize(pt);
				}
				pt.x -= (safeArea.left + safeArea.right);
				pt.y -= (safeArea.top + safeArea.bottom);
				double scale = Math.min((int) (100 * pt.x / CONTENT_WIDTH), (int) (100 * pt.y / CONTENT_HEIGHT));
				webView.setInitialScale((int)scale);
				webView.getSettings().setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);
			}
			return insets;
		});
		if (savedInstanceState != null) {
			authTabCanceled = savedInstanceState.getBoolean("STATE_AUTH", false);
		}
		appLog(null, "__app_open");

		config();

		if (ENABLE_APP_EXIT) {
			getOnBackPressedDispatcher().addCallback(new OnBackPressedCallback(true) {
				@Override
				public void handleOnBackPressed() {
					Application app = (Application) getObject("app");
					app.command("exit", "back");
				}
			});
		}
		if (PREFERS_STATUSBAR_HIDDEN) {
    		getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    	}

		billingManager = new BillingManager(this);
		midiServer = new MIDIServer(MainActivity.this);
		midiServer.onCreate();

		setupWebView(CONTENTS_URL);

		onNewIntent(getIntent());
	}

	@Override
	protected void onNewIntent(Intent intent) {
		super.onNewIntent(intent);

		if (Intent.ACTION_SEND.equals(intent.getAction())) {
			Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
			if (uri != null) {
				String path = inputStreamToFile(uri);
				if (path != null) {
					Application app = (Application) getObject("app");
					app.command("open", path);
				}
			}
		} else if (Intent.ACTION_VIEW.equals(intent.getAction())) {
			Uri uri = intent.getData();
			if (uri != null && uri.getScheme().equals("https")) {
				authTabCanceled = false;
				Application app = (Application) getObject("app");
				app.command("url", uri.toString());
			}
		}
	}

	@Override
	protected void onRestart() {
		super.onRestart();
		callJavaScriptFunction("$native.restart()");
		appLog("app_restart", null);
	}

	@Override
	protected void onStart() {
		super.onStart();
		midiServer.onStart();
	}

    @Override
	protected void onPause() {
		super.onPause();
		for (int i = 0; i < vec.size(); i++) {
			JavaScriptObject obj = vec.elementAt(i);
			obj.onPause();
		}
		webView.onPause();
    }

	@Override
	protected void onResume() {
		super.onResume();
		webView.onResume();
		for (int i = 0; i < vec.size(); i++) {
			JavaScriptObject obj = vec.elementAt(i);
			obj.onResume();
		}
		if (authTabCanceled) {
			authTabCanceled = false;
			Application app = (Application) getObject("app");
			app.command("url", "");
		}
	}

	@Override
	protected void onStop() {
		super.onStop();
		midiServer.onStop();
		callJavaScriptFunction("$native.stop()");
		appLog("app_stop", "__app_close");
	}

	@Override
	protected void onSaveInstanceState(Bundle outState) {
		super.onSaveInstanceState(outState);
		outState.putBoolean("STATE_AUTH", authTabIntent != null);
	}

	@Override
	protected void onDestroy() {
		super.onDestroy();

		for (int i = 0; i < vec.size(); i++) {
			JavaScriptObject obj = vec.elementAt(i);
			obj.onDestroy();
			webView.removeJavascriptInterface(obj.getInterfaceName());
		}
		vec.clear();
		vec = null;

		webView.destroy();
		webView = null;

		midiServer.onDestroy();
		midiServer = null;
	}

	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);

		LocalFileSystem fs = (LocalFileSystem) getObject("fs");
		Bundle bundle =  (data != null) ? data.getExtras() : null;

		switch (requestCode) {
			case RESULT_OPEN_PANEL:
				if (resultCode == RESULT_OK) {
					fs.openPanel(bundle.getString("file"));
				} else if (resultCode == RESULT_CANCELED) {
					fs.openPanel("");
				}
				break;

			case RESULT_SAVE_PANEL:
				if (resultCode == RESULT_OK) {
					fs.savePanel(bundle.getString("file"));
				} else if (resultCode == RESULT_CANCELED) {
					fs.savePanel("");
				}
				break;

			case RESULT_CHOOSE_FOLDER:
				if (resultCode == RESULT_OK) {
					fs.chooseFolder(bundle.getString("path"));
				} else if (resultCode == RESULT_CANCELED) {
					fs.chooseFolder("");
				}
				break;

			case RESULT_IMPORT_FILE:
			case RESULT_IMPORT_FILES: {
				Application app = (Application) getObject("app");
				if (resultCode == RESULT_OK) {
					JSONArray array = new JSONArray();
					if (data.getData() != null) {
						String path = inputStreamToFile(data.getData());
						if (path != null) { array.put(path); }
						if (requestCode == RESULT_IMPORT_FILE) {
							app.command("import", (path != null) ? path : "");
							break;
						}
					} else {
						ClipData clipData = data.getClipData();
						int count = clipData.getItemCount();
						for (int i = 0; i < count; i++) {
							ClipData.Item item = clipData.getItemAt(i);
							String path = inputStreamToFile(item.getUri());
							if (path != null) { array.put(path); }
						}
					}
					app.command("import", array.toString());
				}
				break;
			}

			case RESULT_EXPORT_FILE: {
				if (resultCode == RESULT_OK) {
					Thread thread = new Thread(new Runnable() {
						@Override
						public void run() {
							exportFile.export(data);
						}
					});
					try {
						thread.start();
                        thread.join(3000);
                    } catch (InterruptedException e) {}
                } else {
					Application app = (Application) getObject("app");
					app.command("export", "");
				}
				break;
			}

			case RESULT_INPUT_FILE: {
				Uri[] results = null;
				if (resultCode == RESULT_OK) {
					Uri uri = data.getData();
					ClipData clipData = data.getClipData();
					if (clipData != null) {
						final int count = clipData.getItemCount();
						results = new Uri[count];
						for (int i = 0; i < count; i++) {
							results[i] = clipData.getItemAt(i).getUri();
						}
					} else if (uri != null) {
						results = new Uri[]{uri};
					}
				}
				filePathCallback.onReceiveValue(results);
				filePathCallback = null;
				break;
			}

			case RESULT_BLEMIDI_SCANNER:
				if (resultCode == RESULT_OK) {
					BLEMIDIScanner blemidi = (BLEMIDIScanner) getObject("blemidi");
					blemidi.scanstart();
				}
				break;

			case RESULT_BLE_CENTRAL:
				if (resultCode == RESULT_OK) {
					BLECentralManager ble = (BLECentralManager) getObject("ble");
					ble.scanstart();
				}
				break;

			default:
				break;
		}
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
		if ((grantResults == null) || (grantResults.length == 0)) {
			return;
		}
		if (requestCode == RESULT_MIDI_PANEL) {
			if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
				BLECentralManager ble = (BLECentralManager) getObject("ble");
				ble.unauthorized();
			} else {
				midiServer.panel(MainActivity.this);
			}
		} else if (requestCode == RESULT_BLEMIDI_SCANNER) {
			if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
				BLECentralManager ble = (BLECentralManager) getObject("ble");
				ble.unauthorized();
			} else {
				BLEMIDIScanner blemidi = (BLEMIDIScanner) getObject("blemidi");
				blemidi.scanstart();
			}
		} else if (requestCode == RESULT_BLE_CENTRAL) {
			BLECentralManager ble = (BLECentralManager) getObject("ble");
			if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
				ble.unauthorized();
			} else {
				ble.scanstart();
			}
		} else if (requestCode == RESULT_RECORD_AUDIO) {
			AudioRecorder recorder = (AudioRecorder) getObject("recorder");
			if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
				recorder.unauthorized();
			} else {
				recorder.record();
			}
		} else if (requestCode == RESULT_WEBCLIENT) {
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				List<String> resources = new ArrayList<String>();
				for (int i = 0; i < permissions.length; i++) {
					if (permissions[i].equals(Manifest.permission.CAMERA)) {
						if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
							resources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
						}
					}
					if (permissions[i].equals(Manifest.permission.RECORD_AUDIO)) {
						if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
							resources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
						}
					}
				}
				webClientRequest.grant(resources.toArray(new String[resources.size()]));
			}
		} else {
			super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		}
	}

	private String inputStreamToFile(Uri uri) {

		File cacheDir = getExternalCacheDir();
		if (cacheDir == null)  { cacheDir = getCacheDir(); }
		File Inbox = new File(cacheDir, "Inbox");
		Inbox.mkdir();
		String contentName =  getContentName(uri);
		File file = new File(Inbox, contentName);

		InputStream in = null;
		FileOutputStream out = null;
		try {
			in = getContentResolver().openInputStream(uri);
			out = new FileOutputStream(file);

			byte[] buffer = new byte[4096];
			for (int len; (len = in.read(buffer)) != -1; ) { out.write(buffer, 0, len); }
			out.flush();
		} catch (Exception e) { file = null; }

		try { if (in  != null) { in.close();  } } catch (IOException e) {}
		try { if (out != null) { out.close(); } } catch (IOException e) {}

		return (file != null) ? file.getAbsolutePath() : null;
	}

	private boolean outputStreamToUri(Uri uri, String path) {

		Pattern pattern = Pattern.compile("/[0-9A-F]{4}-[0-9A-F]{4}%");
		Matcher matcher = pattern.matcher(uri.toString());
		boolean sync = matcher.find();

		boolean success = true;

		ParcelFileDescriptor pfd = null;
		FileOutputStream out = null;
		FileInputStream in = null;
		try {
			pfd = getContentResolver().openFileDescriptor(uri, "wt");
			out = new FileOutputStream(pfd.getFileDescriptor());
			in = new FileInputStream(new File(path));

			byte[] buffer = new byte[4096];
			for (int len; (len = in.read(buffer)) != -1; ) { out.write(buffer, 0, len); }
			out.flush();
			if (sync) {
				out.getFD().sync();
			}
		} catch (Exception e) { success = false; }

		try { if (in  != null) { in.close();  } } catch (IOException e) {}
		try { if (out != null) { out.close(); } } catch (IOException e) {}
		try { if (pfd != null) { pfd.close(); } } catch (IOException e) {}

		return success;
	}

	private String getContentName(Uri uri) {
		String name = null;
		if (uri.getScheme().equals("content")) {
			Cursor cursor = getContentResolver().query(uri, null, null, null, null);
			try {
				if (cursor != null && cursor.moveToFirst()) {
					name = cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME));
				}
			} finally { cursor.close(); }
		}
		if (name == null) {
			name = uri.getPath();
			int cut = name.lastIndexOf('/');
			if (cut != -1) {
				name = name.substring(cut + 1);
			} else {
				name = "unknown";
			}
		}
		return name;
	}

	private String copyAssets(String path) {

		File cacheDir = getExternalCacheDir();
		if (cacheDir == null)  { cacheDir = getCacheDir(); }
		File file = new File(cacheDir, path.substring(path.lastIndexOf("/") + 1));

		InputStream in = null;
		FileOutputStream out = null;
		try {
			AssetManager assetManager = getResources().getAssets();
			in = assetManager.open(path);
			out = new FileOutputStream(file);

			byte[] buffer = new byte[4096];
			for (int len; (len = in.read(buffer)) != -1; ) { out.write(buffer, 0, len); }
			out.flush();
		} catch (Exception e) { file = null; }

		try { if (in  != null) { in.close();  } } catch (IOException e) {}
		try { if (out != null) { out.close(); } } catch (IOException e) {}

		return (file != null) ? file.getAbsolutePath() : null;
	}

	@SuppressLint("JavascriptInterface")
	protected void setupWebView(String url) {
		webView = (WebView) findViewById(R.id.webview);
		webView.setWebContentsDebuggingEnabled(CONTENTS_DEBUG);
		if (WEBVIEW_NO_BOUNCE) {
			webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
		}
		String userAgent = webView.getSettings().getUserAgentString();
		webView.getSettings().setUserAgentString(userAgent + " roland.quattro(Android)");

		webView.getSettings().setBuiltInZoomControls(true);
		webView.getSettings().setJavaScriptEnabled(true);
		webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
		webView.getSettings().setSupportMultipleWindows(true);
		webView.getSettings().setDomStorageEnabled(true);
		webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
			webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
		}

		webView.setLongClickable(true);
		webView.setOnLongClickListener(new View.OnLongClickListener() {
			@Override
			public boolean onLongClick(View v) {
				return true;
			}
		});

		webView.setWebViewClient(new WebViewClient() {
			@Override
			public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
				String host = request.getUrl().getHost();
				if ("localhost".equals(host)) {
					String path = request.getUrl().getPath();
					if (path != null) {
						String ext = MimeTypeMap.getFileExtensionFromUrl(path);
						String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
						if (mimeType == null) { mimeType = "application/octet-stream"; }
						try {
							InputStream input = getAssets().open(path.substring(1));
							Map<String, String> headers = new HashMap<>();
							headers.put("Access-Control-Allow-Origin", "*");
							return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, input);
						} catch (IOException e) {}
					}
				}
				return super.shouldInterceptRequest(view, request);
			}
			@SuppressWarnings("deprecation")
			@Override
			public boolean shouldOverrideUrlLoading(WebView view, String url) {
				Uri uri = Uri.parse(url);
				if (handleUri(view, uri)) return true;
				return super.shouldOverrideUrlLoading(view, url);
			}
			@TargetApi(Build.VERSION_CODES.N)
			@Override
			public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
				final Uri uri = request.getUrl();
				if (handleUri(view, uri)) return true;
				return super.shouldOverrideUrlLoading(view, request);
			}
			private boolean handleUri(WebView view, Uri uri) {
				String scheme = uri.getScheme();
				if (!scheme.equals("http") && !scheme.equals("https") && !scheme.equals("file")) {
					/* custom scheme */
					view.stopLoading();
					Intent intent = new Intent(Intent.ACTION_VIEW, uri);
					view.getContext().startActivity(intent);
					return true;
				}
				String path = uri.getLastPathSegment();
				String ext = null;
				if (path != null) {
					int index = path.lastIndexOf(".");
					if (index != -1) {
						ext = path.substring(index + 1);
					}
				}
				if (ext != null && !ext.equals("html")) {
					Application app = (Application) getObject("app");
					app.command("download", uri.toString());
					return true;
				}
				return false;
			}
		});
		webView.setWebChromeClient(new WebChromeClient() {
			@Override
			public void onPermissionRequest(PermissionRequest request) {
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
					List<String> permissions = new ArrayList<String>();
					for (String r : request.getResources()) {
						if (r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
							permissions.add(Manifest.permission.RECORD_AUDIO);
							permissions.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
						}
						if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
							permissions.add(Manifest.permission.CAMERA);
						}
					}
					if (permissions.size() > 0) {
						webClientRequest = request;
						requestPermissions(permissions.toArray(new String[permissions.size()]), RESULT_WEBCLIENT);
					} else {
						request.grant(request.getResources());
					}
				} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
					request.grant(request.getResources());
				}
			}
			@Override
			public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> _filePathCallback, FileChooserParams fileChooserParams) {
				filePathCallback = _filePathCallback;
				Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
				intent.addCategory(Intent.CATEGORY_OPENABLE);
				intent.setType("*/*");
				intent.putExtra(Intent.EXTRA_MIME_TYPES, fileChooserParams.getAcceptTypes());
				intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
				startActivityForResult(intent, RESULT_INPUT_FILE);
				return true;
			}
		});

		vec.addElement(new Application(this));
		vec.addElement(new MIDIClient(this));
		vec.addElement(new MIDIXClient(this));
		vec.addElement(new BLEMIDIScanner(this));
		vec.addElement(new TGIF(this));
		vec.addElement(new Sequencer(this));
		vec.addElement(new AudioToolbox(this));
		vec.addElement(new AudioPlayer(this));
		vec.addElement(new AudioRecorder(this));
		vec.addElement(new Sampler(this));
		vec.addElement(new RolandWirelessConnect(this));
		vec.addElement(new HTTPConnection(this));
		vec.addElement(new TCPIPClient(this));
		vec.addElement(new LocalNetService(this));
		vec.addElement(new LocalFileSystem(this));
		vec.addElement(new Security(this));
		vec.addElement(new BLECentralManager(this));
		vec.addElement(new Store(this));
		vec.addElement(new Utility(this));
		vec.addElement(new Shell(this));

		for (int i = 0; i < vec.size(); i++) {
			String objname = "$$" + vec.elementAt(i).getInterfaceName();
			webView.addJavascriptInterface(vec.elementAt(i), objname);
		}

		webView.loadUrl(url);
	}

	protected void callJavaScriptFunction(String script) {
		if (webView != null) {
			webView.loadUrl("javascript:" + script);
		}
	}

	private void appLog(String event, String key) {
		long unixtime = System.currentTimeMillis();
		if (event != null) {
			Application app = (Application) getObject("app");
			app.event("log", event, "{\"timestamp\":" + unixtime + "}");
		}
		if (key != null) {
			SharedPreferences pref = getSharedPreferences(getPackageName(), Context.MODE_PRIVATE);
			SharedPreferences.Editor editor = pref.edit();
			editor.putString(key, "" + unixtime);
			editor.apply();
		}
	}

	private Queue<String> queue = new LinkedList<String>();
	private boolean event = false;
	private boolean triggered = false;

	@Override
	public void postEvent(String ev) {
		synchronized(queue){
			queue.offer(ev);
			if (event && !triggered) {
				triggered = true;
				eventTrigger();
			}
		}
	}

	@Override
	public void startEvent(boolean start) {
		synchronized(queue) {
			if ((event = triggered = start) == true) {
				eventTrigger();
			}
		}
	}

	@Override
	public String getEvent() {
		String ev = "";
		synchronized(queue) {
			if ((ev = queue.poll()) == null) {
				triggered = false;
			}
		}
		return ev;
	}

	private void eventTrigger() {
		eval("window.$event.trigger()");
	}

	@Override
	public JavaScriptObject getObject(String interfaceName) {
		for (int i = 0; i < vec.size(); i++) {
			if (interfaceName.equals(vec.elementAt(i).getInterfaceName())) {
				return vec.elementAt(i);
			}
		}
		return null;
	}

	@Override
	public Context getContext() {
		return MainActivity.this;
	}

	@Override
	public Activity getMainActivity() {
		return MainActivity.this;
	}

	@Override
	public MIDIServer getMIDIServer() {
		return midiServer;
	}

	@Override
	public BillingManager getBillingManager() {
		return billingManager;
	}

	@Override
	public String getAudioPlayerClassName() {
		return "quattro.Audio.MediaCodecPlayer";
	}

	@Override
	public String getAudioRecorderClassName() {
		return "quattro.Audio.MediaCodecRecorder";
	}

	@Override
	public boolean isConsumable(String skuId) {
		return false;
	}

	@Override
	public void exit() {
		handler.post(new Runnable() {
			@Override
			public void run() {
				MainActivity.this.finishAffinity();
				System.exit(0);
			}
		});
	}

	@Override
	public void eval(String script) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				callJavaScriptFunction(script);
			}
		});
	}

	@Override
	public void _control(String request) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				control(request);
			}
		});
	}

	@Override
	public void locate(final String url) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				if (webView != null) {
					webView.loadUrl(url);
				}
			}
		});
	}

	@Override
	public void midiPanel() {
		handler.post(new Runnable() {
			@Override
			public void run() {
				if (!FORCE_MIDI_PANEL) {
					if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
						if (checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
							requestPermissions(new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}, RESULT_MIDI_PANEL);
							return;
						}
					} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
						if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
							requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, RESULT_MIDI_PANEL);
							return;
						}
					}
				}
				midiServer.panel(MainActivity.this);
			}
		});
	}

	@Override
	public void openPanel(String filter, String initDir) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(MainActivity.this, OpenPanelActivity.class);
				intent.putExtra("filter", filter);
				intent.putExtra("initDir", initDir);
				startActivityForResult(intent, RESULT_OPEN_PANEL);
			}
		});
	}

	@Override
	public void savePanel(String name, String ext) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(MainActivity.this, SavePanelActivity.class);
				intent.putExtra("chooseFolder", false);
				intent.putExtra("filename", name);
				intent.putExtra("extension", ext);
				startActivityForResult(intent, RESULT_SAVE_PANEL);
			}
		});
	}

	@Override
	public void chooseFolder(String initDir) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(MainActivity.this, SavePanelActivity.class);
				intent.putExtra("chooseFolder", true);
				intent.putExtra("initDir", initDir);
				startActivityForResult(intent, RESULT_CHOOSE_FOLDER);
			}
		});
	}

	@Override
	public void execute(String url) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				if (url.startsWith("http")) {
					Uri uri = Uri.parse(url);
					CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder().build();
					customTabsIntent.launchUrl(MainActivity.this, uri);
				} else if (url.startsWith("app-settings:")) {
					Uri uri = Uri.parse("package:" + getPackageName());
					Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri);
					startActivity(intent);
				} else {
					Uri uri = Uri.parse(url);
					Intent intent = new Intent(Intent.ACTION_VIEW);
					if (url.startsWith("/")) {
						String path = url;
						if (path.startsWith("/android_asset/")) {
							if ((path = copyAssets(path.replaceFirst("/android_asset/", ""))) == null) return;
						}
						uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".provider", new File(path));
						intent.setType(getContentResolver().getType(uri));
					}
					intent.setData(uri);
					intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | intent.FLAG_GRANT_READ_URI_PERMISSION);
					try {
						startActivity(intent);
					} catch (Exception e) {
						Toast.makeText(MainActivity.this, R.string.no_viewer, Toast.LENGTH_LONG).show();
					};
				}
			}
		});
	}

	@Override
	public void importFile(String filter, boolean multiple) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				List<String> mimeTypes = null;
				try {
					JSONObject json = new JSONObject(filter);
					JSONArray mime = json.getJSONArray("mime");
					if ((mime != null) && (mime.length() > 0)) {
						mimeTypes = new ArrayList<String>();
						for (int i = 0; i < mime.length(); i++) {
							mimeTypes.add(mime.getString(i));
						}
					}
				} catch (JSONException e) {}
				Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
				intent.addCategory(Intent.CATEGORY_OPENABLE);
				intent.setType("*/*");
				if (mimeTypes != null) {
					intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toArray(new String[0]));
				}
				int requestCode = RESULT_IMPORT_FILE;
				if (multiple) {
					requestCode = RESULT_IMPORT_FILES;
					intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
				}
				startActivityForResult(intent, requestCode);
			}
		});
	}

	@Override
	public void exportFile(String path) {
	//	exportFile = new ExportFile(path, Intent.ACTION_SEND);
		exportFile = new ExportFile(path, Intent.ACTION_CREATE_DOCUMENT);
		handler.post(exportFile);
	}

	private final ActivityResultLauncher<Intent> authTabLauncher =
			AuthTabIntent.registerActivityResultLauncher(this, new ActivityResultCallback<AuthTabIntent.AuthResult>(){
				@Override
				public void onActivityResult(AuthTabIntent.AuthResult result) {
					if (result.resultCode == AuthTabIntent.RESULT_OK) {
						authTabCanceled = false;
						Application app = (Application) getObject("app");
						app.command("url", result.resultUri.toString());
					}
					authTabIntent = null;
				}
			});

	@Override
	public void webauth(String url, String redirectScheme) {
		handler.post(new Runnable() {
			@Override
			public void run() {
				if (authTabIntent == null) {
					authTabCanceled = true;
					authTabIntent = new AuthTabIntent.Builder().build();
					authTabIntent.launch(authTabLauncher, Uri.parse(url), redirectScheme);
				}
			}
		});
	}

	@Override
	public void barcode() {
		handler.post(new Runnable() {
			@Override
			public void run() {
				GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
						.setBarcodeFormats(Barcode.FORMAT_QR_CODE)
						.enableAutoZoom()
						.build();
				GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(MainActivity.this, options);
				scanner.startScan()
					.addOnSuccessListener(barcode -> {
						Application app = (Application) getObject("app");
						app.command("barcode", barcode.getRawValue());
					})
					.addOnCanceledListener(() -> {
						Application app = (Application) getObject("app");
						app.command("barcode", ""); // canceled
					})
					.addOnFailureListener(e -> {
						Application app = (Application) getObject("app");
						app.command("barcode", ""); // failed with an exception
					});
			}
		});
	}

	public class ExportFile implements Runnable {
		protected String path;
		protected String action;
		protected JSONArray files = null;

		public ExportFile(String path, String action) {
			this.path = path;
			this.action = action;
			if (path.startsWith("[\"")) {
				try {
					files = new JSONArray(path);
				} catch (JSONException e) { }
			}
		}

		@Override
		public void run() {
			if (files != null) {
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
					// open the last removable disk (may be USB drive) first.
					StorageManager storageManager = (StorageManager)getSystemService(Context.STORAGE_SERVICE);
					List<StorageVolume> storageVolumes = storageManager.getStorageVolumes();
					if (storageVolumes.size() > 1) {
						StorageVolume volume = storageVolumes.get(storageVolumes.size() - 1);
						if (!volume.isPrimary() && volume.isRemovable()) {
							Intent intent = volume.createOpenDocumentTreeIntent();
							startActivityForResult(intent, RESULT_EXPORT_FILE);
							return;
						}
					}
				}
				Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
				startActivityForResult(intent, RESULT_EXPORT_FILE);
			} else {
				Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".provider", new File(path));
				if ((action != null) && action.equals(Intent.ACTION_CREATE_DOCUMENT)) {
					Intent intent = new Intent(action);
					intent.addCategory(Intent.CATEGORY_OPENABLE);
					intent.setType(getContentResolver().getType(uri));
					intent.putExtra(Intent.EXTRA_TITLE, (new File(path)).getName());
					startActivityForResult(intent, RESULT_EXPORT_FILE);
				} else {
					Intent intent = new Intent(Intent.ACTION_SEND);
					intent.setType(getContentResolver().getType(uri));
					intent.putExtra(Intent.EXTRA_STREAM, uri);
					intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | intent.FLAG_GRANT_READ_URI_PERMISSION);
					startActivity(Intent.createChooser(intent, getString(R.string.send_to)));
				}
			}
		}

		public void export(Intent data) {
			if (files != null) {
				Uri treeUri = data.getData();
				DocumentFile tree = DocumentFile.fromTreeUri(MainActivity.this, treeUri);
				for (int i = 0; i < files.length(); i++) {
					try {
						String path = files.getString(i);
						File file = new File(path);
						DocumentFile document = tree.findFile(file.getName());
						if (document == null) {
							Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".provider", file);
							document = tree.createFile(getContentResolver().getType(uri), file.getName());
						}
						outputStreamToUri(document.getUri(), path);
					} catch (JSONException e) { }
				}
				Application app = (Application) getObject("app");
				app.command("export", treeUri.toString());
			} else {
				Uri documentUri = data.getData();
				outputStreamToUri(documentUri, path);
				Application app = (Application) getObject("app");
				app.command("export", documentUri.toString());
			}
		}
	}

}
