//
//	HTTPDownload.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Network;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

public class HTTPDownload extends HTTPTask {

	public HTTPDownload(HTTPConnection http) { super(http); }

	@Override
	protected Boolean doInBackground(Void... background) {

		URLConnection connection = null;
		InputStream in = null;
		FileOutputStream out = null;

		boolean complete = true;

		try {
			connection = url.openConnection();
			in = connection.getInputStream();
			out = new FileOutputStream(file);
			contentLength = connection.getContentLength();

			int len = 0;
			int progress =  buffer.length;
			while (!isCancelled() && (len = in.read(buffer)) != -1) {
				out.write(buffer, 0, len);
				out.flush();
				amount += len;
				if (amount >= progress) {
					progress +=  buffer.length;
					publishProgress();
				}
			}
		} catch (IOException e) {
			complete = false;
		} finally {
			try {
				if (in != null) {
					in.close();
				}
				if (out != null) {
					out.close();
				}
			} catch (IOException e) {}

			if (!complete) { file.delete(); }
		}

		return new Boolean(complete);
	}

	@Override
	protected void onCancelled() {
		file.delete();
	}
}
