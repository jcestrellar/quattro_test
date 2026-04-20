//
//	TGIF.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Sound.SoundDriver;

import android.webkit.JavascriptInterface;

public class TGIF extends JavaScriptObject {

	private final String interfaceName = "tgif";

	public String getInterfaceName() {
		return interfaceName;
	}

	public TGIF(JavaScriptHandler h) { super(h); }

	@Override
	public void onDestroy() { }

	@JavascriptInterface
	public String device(String uid) {
		return ""; /* Not supported */
	}
	@JavascriptInterface
	public String device() {
		return ""; /* Not supported */
	}

	@JavascriptInterface
	public int buffer() {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			return SoundDriver.getBufferSizeInBursts();
		}
		return -1;
	}

	@JavascriptInterface
	public void buffer(int num) {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			SoundDriver.setBufferSizeInBursts(num);
		}
	}

	@JavascriptInterface
	public int param(int pid) {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			return SoundDriver.getValue(pid);
		}
		return 0;
	}

	@JavascriptInterface
	public void param(int pid, int val) {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			SoundDriver.setValue(pid, val);
		}
	}

	@JavascriptInterface
	public void send(String msg) {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			SoundDriver.MIDISend(toByteArray(msg), System.nanoTime());
		}
	}

	@JavascriptInterface
	public void thru(boolean enable) {
		if (handler.getMIDIServer().isSoundDriverConnected()) {
			SoundDriver.thru(enable);
		}
	}

}
