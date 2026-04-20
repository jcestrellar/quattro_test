//
//	LocalFileSystem.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.content.res.AssetManager;
import android.content.res.Resources;
import android.os.Environment;
import android.webkit.JavascriptInterface;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.nio.channels.FileChannel;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class LocalFileSystem extends JavaScriptObject {

	private final String interfaceName = "fs";

	public String getInterfaceName() {
		return interfaceName;
	}

	public static final String LocalFSVolumeKey		= "volume";
	public static final String LocalFSMountKey		= "mount";

	public static final String LocalFSNameKey		= "name";
	public static final String LocalFSSizeKey		= "size";
	public static final String LocalFSDirectoryKey	= "directory";
	public static final String LocalFSReadableKey	= "readable";
	public static final String LocalFSWritableKey	= "writable";
	public static final String LocalFSDeletableKey	= "deletable";

	public static final String LocalFSOffsetKey		= "offset";
	public static final String LocalFSLengthKey		= "length";

	public LocalFileSystem(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
	}

	@JavascriptInterface
	public String separator() {
		return "/";
	}

	@JavascriptInterface
	public String path() {
		return path(null);
	}

	@JavascriptInterface
	public String path(String where) {
		//File path = getContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
		File path = getApplicationContext().getExternalFilesDir(null);

		if (where == null) {
			/* DIRECTORY_DOCUMENTS */
		} else if (where.equalsIgnoreCase("home")) {
			path = getApplicationContext().getExternalFilesDir(null);
		} else if (where.equalsIgnoreCase("music")) {
			path = getApplicationContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC);
			//path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC);
		} else if (where.equalsIgnoreCase("movies")) {
			path = getApplicationContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES);
			//path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
		} else if (where.equalsIgnoreCase("pictures")) {
			path = getApplicationContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
			//path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
		} else if (where.equalsIgnoreCase("downloads")) {
			path = getApplicationContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
			//path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
		} else if (where.equalsIgnoreCase("library")) {
			path = getApplicationContext().getFilesDir();
		} else if (where.equalsIgnoreCase("temporary")) {
			path = getApplicationContext().getExternalCacheDir();
			if (path == null) {
				path = getApplicationContext().getCacheDir();
			}
		} else if (where.equalsIgnoreCase("bundle")) {
			//return "android.resource://" + getApplicationContext().getPackageName() + "/raw/";
			return "/android_asset/";
		}
		if (path == null) {
			path = getApplicationContext().getFilesDir();
		}

		return path.getAbsolutePath() + "/";
	}

	@JavascriptInterface
	public String volumes() {
		return "[]"; /* android does not support, return empty array. */
	}

	@JavascriptInterface
	public String contents(String path) throws Exception {
		return contents(path, "");
	}

	@JavascriptInterface
	public String contents(String path, String ext) throws Exception {
		if (path.startsWith("/android_asset/")) {
			return contentsOfAssets(
					path.replaceFirst("/android_asset/", "")
						.replaceAll("/$", ""), ext);
		}
		File file = new File(path);
		if (!file.exists())
			throw new Exception(path + " not found.");
		File[] files = file.listFiles();
		JSONArray array = new JSONArray();
		for (File f : files) {
			if (ext.length() > 0 && f.getName().endsWith("." + ext))
				continue;
			array.put(attributes(f));
		}
		return array.toString();
	}

	@JavascriptInterface
	public String stat(String path) throws Exception {
		if (path.startsWith("/android_asset/")) {
			return statOfAssets(
					path.replaceFirst("/android_asset/", "")
						.replaceAll("/$", ""));
		}
		File file = new File(path);
		if (!file.exists())
			throw new Exception(path + " not found.");
		JSONObject obj = attributes(file);
		return obj.toString();
	}

	@JavascriptInterface
	public void exec(String path) {
		handler.execute(path);
	}

	@JavascriptInterface
	public void mkdir(String path) throws Exception {
		File file = new File(path);
		if (!file.mkdirs()) {
			if (!file.isDirectory()) {
				throw new Exception("File.mkdirs() failed.");
			}
		}
	}

	@JavascriptInterface
	public void unlink(String path) throws Exception {
/*
		if (!(new File(path)).delete()) {
			throw new Exception("File.delete() failed.");
		}
*/
		/* recursively */
		File file = new File(path);
		if (file.isDirectory()) {
			for (File child : file.listFiles()) {
				unlink(child.getAbsolutePath());
			}
		}
		if (!file.delete()) {
			throw new Exception("File.delete() failed.");
		}
	}

	@JavascriptInterface
	public void move(String src, String dst) throws Exception {
		if (!(new File(src)).renameTo(new File(dst))) {
			throw new Exception("File.renameTo() failed.");
		}
	}

	@JavascriptInterface
	public void copy(String src, String dst) throws Exception {
		if (src.equals(dst)) {
			throw new Exception("File.copy() failed.");
		}

		if (src.startsWith("/android_asset/")) {
			copyOfAssets(src.replaceFirst("/android_asset/", ""), dst);
			return;
		}

		String error = null;
		FileChannel in = null;
		FileChannel out = null;
		try {
			in = new FileInputStream(new File(src)).getChannel();
			out = new FileOutputStream(new File(dst)).getChannel();
			in.transferTo(0, in.size(), out);
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		} finally {
			try { if (in  != null) { in.close();  } } catch (IOException e) {}
			try { if (out != null) { out.close(); } } catch (IOException e) {}
		}
		if (error != null) {
			throw new Exception(error);
		}
	}

	@JavascriptInterface
	public void unzip(String zip, String folder) throws Exception {
		unzip(new File(zip), new File(folder));
	}

	@JavascriptInterface
	public String readString(String path) throws Exception {
		return read(path, 0, Long.MAX_VALUE, true);
	}

	@JavascriptInterface
	public String readData(String path) throws Exception {
		return read(path, 0, Long.MAX_VALUE, false);
	}

	@JavascriptInterface
	public String readData(String path, String json) throws Exception {
		JSONObject root = new JSONObject(json);
		long offset = root.getLong(LocalFSOffsetKey);
		long length = root.getLong(LocalFSLengthKey);
		return read(path, offset, length, false);
	}

	@JavascriptInterface
	public void writeString(String path, String str) throws Exception {
		try {
			write(path, str.getBytes("UTF-8"), false);
		} catch (UnsupportedEncodingException e) {
			throw new Exception(e.getLocalizedMessage());
		}
  	}

	@JavascriptInterface
	public void writeData(String path, String hex) throws Exception {
		write(path, toByteArray(hex), false);
	}

	@JavascriptInterface
	public void appendString(String path, String str) throws Exception {
		try {
			write(path, str.getBytes("UTF-8"), true);
		} catch (UnsupportedEncodingException e) {
			throw new Exception(e.getLocalizedMessage());
		}
	}

	@JavascriptInterface
	public void appendData(String path, String hex) throws Exception {
		write(path, toByteArray(hex), true);
	}

	@JavascriptInterface
	public void openfilename() {
		handler.openPanel(null, null);
	}
	@JavascriptInterface
	public void openfilename(String filter) {
		handler.openPanel(filter, null);
	}
	@JavascriptInterface
	public void openfilename(String filter, String initDir) {
		handler.openPanel(filter, initDir);
	}
	public void openPanel(String path) {
		postEvent(getInterfaceName() + "\f" + "openfilename" + "\f" + path);
	}

	@JavascriptInterface
	public void savefilename() {
		handler.savePanel(null, null);
	}
	@JavascriptInterface
	public void savefilename(String name) {
		handler.savePanel(name, null);
	}
	@JavascriptInterface
	public void savefilename(String name, String ext) {
		handler.savePanel(name, ext);
	}
	public void savePanel(String path) {
		postEvent(getInterfaceName() + "\f" + "savefilename" + "\f" + path);
	}

	@JavascriptInterface
	public void choosefolder() {
		handler.chooseFolder(null);
	}
	@JavascriptInterface
	public void choosefolder(String initDir) {
		handler.chooseFolder(initDir);
	}
	public void chooseFolder(String path) {
		postEvent(getInterfaceName() + "\f" + "choosefolder" + "\f" + path);
	}

	@JavascriptInterface
	public void unmount(String drive) {
		/* android does not support */
		postEvent(getInterfaceName() + "\f" + "unmountfailed" + "\f" + drive + "Not supported");
	}

	@JavascriptInterface
	public void watch(String path) {
		/* android does not support */
	}

	private JSONObject attributes(File f) throws JSONException {
		File p = f.getParentFile();
		JSONObject obj = new JSONObject();

		obj.put(LocalFSNameKey,			f.getName());
		obj.put(LocalFSSizeKey,			Long.valueOf(f.length()));
		obj.put(LocalFSDirectoryKey,	Boolean.valueOf(f.isDirectory()));
		obj.put(LocalFSReadableKey, 	Boolean.valueOf(f.canRead()));
		obj.put(LocalFSWritableKey, 	Boolean.valueOf(f.canWrite()));
		obj.put(LocalFSDeletableKey,	Boolean.valueOf((p != null) ? p.canWrite() : false));

		return obj;
	}

	private String read(String path, long offset, long length, Boolean isString) throws Exception {
		String error = null;
		String data = null;
		FileInputStream fin = null;
		BufferedInputStream bin = null;
		ByteArrayOutputStream out = null;
		try {
			if (path.startsWith("android.resource://")) {
				Resources res = getApplicationContext().getResources();
				int id = res.getIdentifier(path.substring(path.lastIndexOf("/") + 1), "raw", getApplicationContext().getPackageName());
				bin = new BufferedInputStream(res.openRawResource(id));
				while ((offset-- > 0) && (bin.read() != -1)) ; /* skip */
			} else if (path.startsWith("/android_asset/")) {
				AssetManager assetManager = getApplicationContext().getResources().getAssets();
				bin = new BufferedInputStream(assetManager.open(path.replaceFirst("/android_asset/", "")));
				while ((offset-- > 0) && (bin.read() != -1)) ; /* skip */
			} else {
				fin = new FileInputStream(path);
				if (offset != 0) fin.getChannel().position(offset);
				bin = new BufferedInputStream(fin);
			}
			byte[] b = new byte[1];
			out = new ByteArrayOutputStream();
			while ((length-- > 0) && (bin.read(b) > 0)) {
				out.write(b);
			}
			b = out.toByteArray();
			data = (isString ? new String(b, "UTF-8") : toHexString(b));
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		} finally {
			try { if (bin != null) { bin.close(); } } catch (IOException e) {}
			try { if (fin != null) { fin.close(); } } catch (IOException e) {}
			try { if (out != null) { out.close(); } } catch (IOException e) {}
		}
		if (error != null) {
			throw new Exception(error);
		}
		return data;
	}

	private void write(String path, byte[] b, Boolean append) throws Exception {
		String error = null;
		BufferedOutputStream out = null;
		try {
			out = new BufferedOutputStream(new FileOutputStream(path, append));
			out.write(b, 0, b.length);
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		} finally {
			try { if (out != null) { out.close(); } } catch (IOException e) {}
		}
		if (error != null) {
			throw new Exception(error);
		}
	}

	public static void unzip(File zip, File folder) throws Exception {
		String error = null;
		ZipFile zipfile = null;
		ZipInputStream zis = null;
		try {
			zipfile = new ZipFile(zip);
			zis = new ZipInputStream(new BufferedInputStream(new FileInputStream(zip)));
			ZipEntry ze;
			byte[] buffer = new byte[8192];
			while ((error == null) && ((ze = zis.getNextEntry()) != null)) {
				ze.getCrc();
				ze.getCompressedSize();
				File file = new File(folder, ze.getName());
				if (!file.getCanonicalPath().startsWith(folder.getCanonicalPath())) {
					throw new IOException("unzip: zip content path is invalid.");
				}
				File dir = ze.isDirectory() ? file : file.getParentFile();
				if (!dir.isDirectory() && !dir.mkdirs())
					throw new IOException("unzip: directory error.");
				if (!ze.isDirectory()) {
					FileOutputStream fout = new FileOutputStream(file);
					try {
						int count;
						while ((count = zis.read(buffer)) != -1) {
							fout.write(buffer, 0, count);
						}
					} catch (IOException e) {
						error = e.getLocalizedMessage();
					} finally {
						fout.flush();
						fout.close();
					}
				}
				zis.closeEntry();
			}
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		} finally {
			if (zipfile != null) zipfile.close();
			if (zis != null) zis.close();
		}
		if (error != null) {
			throw new Exception(error);
		}
	}

	private JSONObject attributesOfAssets(AssetManager assetManager, String path) throws IOException, JSONException {
		boolean isDirectory = false;
		if (assetManager.list(path).length > 0) {
			isDirectory = true;
		} else {
			try {
				assetManager.open(path).close(); /* check for empty directory */
			} catch (FileNotFoundException e) {
				isDirectory = true;
			}
		}

		JSONObject obj = new JSONObject();
		obj.put(LocalFSNameKey,			path.substring(path.lastIndexOf("/") + 1));
		obj.put(LocalFSSizeKey,			Long.valueOf(isDirectory ? 0 : -1)); /* file size (-1) is unknown. */
		obj.put(LocalFSDirectoryKey,	Boolean.valueOf(isDirectory));
		obj.put(LocalFSReadableKey, 	Boolean.valueOf(true));
		obj.put(LocalFSWritableKey, 	Boolean.valueOf(false));
		obj.put(LocalFSDeletableKey,	Boolean.valueOf(false));
		return obj;
	}

	private String contentsOfAssets(String path, String ext) throws Exception {
		try {
			AssetManager assetManager = getApplicationContext().getResources().getAssets();
			String[] files = assetManager.list(path);
			JSONArray array = new JSONArray();
			for (String f : files) {
				if (ext.length() > 0 && f.endsWith("." + ext))
					continue;
				if (path.length() > 0) { f = (path + "/" + f); }
				array.put(attributesOfAssets(assetManager, f));
			}
			return array.toString();
		} catch (IOException e) {
			throw new Exception(path + " not found.");
		}
	}

	public String statOfAssets(String path) throws Exception {
		try {
			AssetManager assetManager = getApplicationContext().getResources().getAssets();
			JSONObject obj = attributesOfAssets(assetManager, path);
			return obj.toString();
		} catch (IOException e) {
			throw new Exception(path + " not found.");
		}
	}

	private void copyOfAssets(String src, String dst) throws Exception {
		String error = null;
		InputStream in = null;
		FileOutputStream out = null;
		try {
			AssetManager assetManager = getApplicationContext().getResources().getAssets();
			in = assetManager.open(src);
			out = new FileOutputStream(new File(dst));
			byte[] buffer = new byte[4096];
			for (int len; (len = in.read(buffer)) != -1; ) {
				out.write(buffer, 0, len);
			}
			out.flush();
		} catch (Exception e) {
			error = e.getLocalizedMessage();
		} finally {
			try { if (in  != null) { in.close();  } } catch (IOException e) {}
			try { if (out != null) { out.close(); } } catch (IOException e) {}
		}
		if (error != null) {
			throw new Exception(error);
		}
	}

}
