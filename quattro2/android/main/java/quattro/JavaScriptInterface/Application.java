//
//	Application.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.icu.text.SimpleDateFormat;
import android.icu.util.Calendar;
import android.icu.util.TimeZone;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

public class Application extends JavaScriptObject {

	private final String interfaceName = "app";

	public String getInterfaceName() {
		return interfaceName;
	}

	private String clipboard = new String();

	public Application(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
		clipboard = null;
	}

	@JavascriptInterface
	public void startevent(boolean start) {
		handler.startEvent(start);
	}

	@JavascriptInterface
	public String getevent() {
		return handler.getEvent();
	}

	@JavascriptInterface
	public String device() throws JSONException {
		UUID uuid = UUID.fromString("00000000-0000-0000-0000-000000000000");
		try {
			MessageDigest md5 = MessageDigest.getInstance("MD5");
			String ANDROID_ID = Settings.Secure.getString(getApplicationContext().getContentResolver(), Settings.Secure.ANDROID_ID);
			byte[] bytes = md5.digest(ANDROID_ID.getBytes());
			ByteBuffer bb = ByteBuffer.wrap(bytes);
			uuid = new UUID(bb.getLong(), bb.getLong());
        } catch (NoSuchAlgorithmException e) {}
		JSONObject obj = new JSONObject();
		obj.put("model", Build.MODEL);
		obj.put("os", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
		obj.put("id", uuid.toString());
		return obj.toString();
	}

	@JavascriptInterface
	public String version() throws JSONException {
		String packageName = getApplicationContext().getPackageName();
		PackageManager packageManager = getApplicationContext().getPackageManager();
        try {
            PackageInfo info = packageManager.getPackageInfo(packageName, 0);
			SimpleDateFormat sf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
			sf.setTimeZone(Calendar.getInstance(TimeZone.getTimeZone("UTC")).getTimeZone());
			JSONObject obj = new JSONObject();
			obj.put("name", info.versionName);
			obj.put("code", info.versionCode);
			obj.put("ctime", sf.format(new Date(info.firstInstallTime)));
			obj.put("mtime", sf.format(new Date(info.lastUpdateTime)));
			return obj.toString();
        } catch (PackageManager.NameNotFoundException e) {}
		return "{\"name\":\"?\",\"code\":0,\"ctime\":\"\",\"mtime\":\"\"}";
	}

	@JavascriptInterface
	public String locale() {
		return Locale.getDefault().toLanguageTag();
	}

	private void _pref(String key, String data) {
		if (key != null && key.length() > 0) {
			if (data == null) data = "";
			String name = getApplicationContext().getPackageName();
			SharedPreferences pref = getApplicationContext().getSharedPreferences(name, Context.MODE_PRIVATE);
			Editor editor = pref.edit();
			editor.putString(key, data);
			editor.commit();
		}
	}

	private String _pref(String key) {
		if (key == null || key.length() == 0) return "";
		String name = getApplicationContext().getPackageName();
		SharedPreferences pref = getApplicationContext().getSharedPreferences(name, Context.MODE_PRIVATE);
		return pref.getString(key, "");
	}

	@JavascriptInterface
	public void storage(String data) { _pref("pref", data); }
	@JavascriptInterface
	public String storage() { return _pref("pref"); }

	@JavascriptInterface
	public void storage2(String key, String data) { _pref(key, data); }
	@JavascriptInterface
	public String storage2(String key) { return _pref(key); }

	@JavascriptInterface
	public void clipboard(String data) {
		clipboard = data;
	}
	@JavascriptInterface
	public String clipboard() {
		return clipboard;
	}

	@JavascriptInterface
	public void control(String request) {
		handler._control(request);
	}

	@JavascriptInterface
	public void locate(String url) {
		handler.locate(url);
	}

	@JavascriptInterface
	public void importfile(String filter) {
		handler.importFile(filter, false);
	}
	@JavascriptInterface
	public void importfile(String filter, boolean multiple) {
		handler.importFile(filter, multiple);
	}

	@JavascriptInterface
	public void exportfile(String file) {
		handler.exportFile(file);
	}

	@JavascriptInterface
	public void webauth(String url) {
		webauth(url, "empty");
	}
	@JavascriptInterface
	public void webauth(String url, String redirectScheme) {
		handler.webauth(url, redirectScheme);
	}

	@JavascriptInterface
	public void barcode() {
		handler.barcode();
	}

	@JavascriptInterface
	public void exit()
	{
		handler.exit();
	}

	@JavascriptInterface
	public void dragdrop(boolean enable) {
		/* Not supported */
	}

	@JavascriptInterface
	public String dropfiles() {
		return "[]"; /* Not supported */
	}

	public void command(String param1, String param2) {
		event("command", param1, param2);
	}

	public void event(String name, String param1, String param2) {
		postEvent(getInterfaceName() + "\f" + name + "\f" + param1 + "\f" + param2);
	}
}
