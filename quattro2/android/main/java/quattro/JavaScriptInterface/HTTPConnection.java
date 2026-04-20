//
//	HTTPConnection.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Network.*;

import android.webkit.JavascriptInterface;
import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;

public class HTTPConnection extends JavaScriptObject {

	private final String interfaceName = "http";

	public String getInterfaceName() {
		return interfaceName;
	}

	private class _HTTPConnectionDelegate implements HTTPConnectionDelegate {
		public void connectionDidLoadData(int id, int contentLength, int amount) {
			postEvent(getInterfaceName() + "\f" + "progress" + "\f" +
					String.valueOf(id) + "\f" + String.valueOf(contentLength) + "\f" + String.valueOf(amount));
		}
		public void connectionDidFinishLoading(int id, File file) {
			postEvent(getInterfaceName() + "\f" + "completed" + "\f" +
					String.valueOf(id) + "\f" + file.getAbsolutePath());
		}
		public void connectionErrorDidOccur(int id, URL url) {
			postEvent(getInterfaceName() + "\f" + "error" + "\f" +
					String.valueOf(id) + "\f" + url.toString());
		}
	}

	private quattro.Network.HTTPConnection http = null;
	
	public HTTPConnection(JavaScriptHandler h) {
		super(h);
		http = new quattro.Network.HTTPConnection(getApplicationContext());
		http.delegate = new _HTTPConnectionDelegate();
	}

	@Override
	public void onDestroy() {
		http.delegate = null;
		http.destroy();
		http = null;
	}
	
	@JavascriptInterface
	public int download(String url) throws MalformedURLException {
		return http.download(new URL(url), null);
	}

	@JavascriptInterface
	public int download(String url, String dst) throws MalformedURLException {
		return http.download(new URL(url), (dst != null) ? new File(dst) : null);
	}

	@JavascriptInterface
	public int upload(String url, String src) throws MalformedURLException {
		return http.upload(new URL(url), new File(src));
	}

	@JavascriptInterface
	public void cancel(int id) {
		http.cancel(id);
	}

}
