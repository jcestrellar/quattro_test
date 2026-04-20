//
//	JavaScriptHandler.java
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.app.Activity;
import android.content.Context;

import quattro.Billing.BillingManager;
import quattro.MIDIClient.MIDIServer;

public interface JavaScriptHandler {

	public abstract void postEvent(String ev);
	public abstract void startEvent(boolean start);
	public abstract String getEvent();

	public abstract JavaScriptObject getObject(String interfaceName);

	public abstract Context getContext();
	public abstract Activity getMainActivity();
	public abstract MIDIServer getMIDIServer();
	public abstract BillingManager getBillingManager();

	public abstract String getAudioPlayerClassName();
	public abstract String getAudioRecorderClassName();

	public abstract boolean isConsumable(String skuId);

	public abstract void exit();
	public abstract void eval(String script);
	public abstract void _control(String request);
	public abstract void locate(String url);
	public abstract void midiPanel();
	public abstract void openPanel(String filter, String initDir);
	public abstract void savePanel(String name, String ext);
	public abstract void chooseFolder(String initDir);
	public abstract void execute(String path);
	public abstract void importFile(String filter, boolean multiple);
	public abstract void exportFile(String file);
	public abstract void webauth(String url, String redirectScheme);
	public abstract void barcode();

}
