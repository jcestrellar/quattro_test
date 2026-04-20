//
//	HTTPTask.java
//
//	Copyright 2018 Roland Corporation. All rights reserved.
//

package quattro.Network;

import android.os.AsyncTask;

import java.io.File;
import java.lang.ref.WeakReference;
import java.net.URL;

public class HTTPTask extends AsyncTask<Void, Void, Boolean> {

	private WeakReference<HTTPConnection> http = null;

	public int id = -1;
	public URL url = null;
	public File file = null;

	protected final int BUFFER_SIZE = 0x10000;
	protected byte[] buffer = new byte[BUFFER_SIZE];

	protected int contentLength = 0;
	protected int amount = 0;

	protected HTTPTask(HTTPConnection http) {
		this.http = new WeakReference<HTTPConnection>(http);
	}

	@Override
	protected Boolean doInBackground(Void... background) {
		return new Boolean(false);
	}

	@Override
	protected void onProgressUpdate(Void... progress) {
		http.get().progress(this, contentLength, amount);
	}

	@Override
	protected void onPostExecute(Boolean complete) {
		if (isCancelled()) {
			/* nothing to do */
		} else if (complete) {
			http.get().finish(this, file);
		} else {
			http.get().error(this, url);
		}
	}

}
