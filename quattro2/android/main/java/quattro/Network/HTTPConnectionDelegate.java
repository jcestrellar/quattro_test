//
//	HTTPConnectionDelegate.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Network;

import java.io.File;
import java.net.URL;

public interface HTTPConnectionDelegate {

	public abstract void connectionDidLoadData(int id, int contentLength, int amount);
	public abstract void connectionDidFinishLoading(int id, File file);
	public abstract void connectionErrorDidOccur(int id, URL url);

}
