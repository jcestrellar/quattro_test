//
//	HTTPConnection.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Network;

import android.content.Context;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.HashMap;

public class HTTPConnection {

	public HTTPConnectionDelegate delegate = null;

	private Context applicationContext;
	private int taskId = 0;
	private HashMap<String, HTTPTask> tasks = new HashMap<String, HTTPTask>();

	public HTTPConnection(Context c) {
		applicationContext = c;
	}

	public int download(URL url, File file) {
		if (url == null)
			return -1;
		if (file == null) {
			try {
				file = File.createTempFile("___", null, applicationContext.getExternalCacheDir());
			} catch (IOException e) { return -1; }
		}

		HTTPTask task = new HTTPDownload(this);
		synchronized (tasks) {
			task.id = taskId++;
			tasks.put(String.valueOf(task.id), task);
		}
		task.url = url;
		task.file = file;
		task.execute();
		return task.id;
	}

	public int upload(URL url, File file) {
		if (url == null || file == null)
			return -1;

		HTTPTask task = new HTTPUpload(this);
		synchronized (tasks) {
			task.id = taskId++;
			tasks.put(String.valueOf(task.id), task);
		}
		task.url = url;
		task.file = file;
		task.execute();
		return task.id;
	}

	public void cancel(int id) {
		synchronized (tasks) {
			HTTPTask task = tasks.get(String.valueOf(id));
			if (task != null) {
				task.cancel(true);
				tasks.remove(String.valueOf(id));
			}
		}
	}

	protected void progress(HTTPTask obj, int contentLength, int amount) {
		if (delegate != null) {
			delegate.connectionDidLoadData(obj.id, contentLength, amount);
		}
	}

	protected void finish(HTTPTask obj, File file) {
		if (delegate != null) {
			delegate.connectionDidFinishLoading(obj.id, obj.file);
		}
		synchronized (tasks) {
			tasks.remove(String.valueOf(obj.id));
		}
	}

	protected void error(HTTPTask obj, URL url) {
		if (delegate != null) {
			delegate.connectionErrorDidOccur(obj.id, obj.url);
		}
		synchronized (tasks) {
			tasks.remove(String.valueOf(obj.id));
		}
	}

	public void destroy() {
		synchronized (tasks) {
			for (HTTPTask task : tasks.values()) {
				task.cancel(true);
			}
		}
		delegate = null;
		applicationContext = null;
	}

}
