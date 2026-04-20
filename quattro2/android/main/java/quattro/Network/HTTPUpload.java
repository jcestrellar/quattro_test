//
//	HTTPUpload.java
//
//	Copyright 2018 Roland Corporation. All rights reserved.
//

package quattro.Network;

import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;

public class HTTPUpload extends HTTPTask {

	public HTTPUpload(HTTPConnection http) { super(http); }

	@Override
	protected Boolean doInBackground(Void... background) {

		HttpURLConnection connection = null;
		BufferedInputStream in = null;
		OutputStream out = null;

		boolean complete = true;

		try {
			contentLength = (int)file.length();

			connection = (HttpURLConnection) url.openConnection();
			connection.setConnectTimeout(10000);
			connection.setReadTimeout(10000);
			connection.setInstanceFollowRedirects(false);
			connection.setDoOutput(true);
			connection.setFixedLengthStreamingMode(contentLength);
			connection.setRequestMethod("PUT");
			connection.setRequestProperty("User-Agent", "Roland");
			connection.setRequestProperty("Content-Type", "application/octet-stream");

			in = new BufferedInputStream(new FileInputStream(file));
			out = connection.getOutputStream();

			int len = 0;
			while (!isCancelled() && (len = in.read(buffer)) != -1) {
				out.write(buffer, 0, len);
				out.flush();
				amount += len;
				publishProgress();
			}

			if (!isCancelled()) {
				int responseCode = connection.getResponseCode();
				if (responseCode != 200 && responseCode != 201) {
					throw new IOException("HTTP Response: " + Integer.toString(responseCode));
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
				if (connection != null) {
					connection.disconnect();
				}
			} catch (IOException e) {}
		}

		return new Boolean(complete);
	}

}
