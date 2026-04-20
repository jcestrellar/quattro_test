//
//	Shell.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.webkit.JavascriptInterface;

public class Shell extends JavaScriptObject {

	private final String interfaceName = "sh";

	public String getInterfaceName() {
		return interfaceName;
	}

	public Shell(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
	}

	@JavascriptInterface
	public int exec(String argv) {
		return 0; /* not supported, always return pid '0' */
	}

	@JavascriptInterface
	public void kill(int pid) {
		/* not supported */
	}

}
