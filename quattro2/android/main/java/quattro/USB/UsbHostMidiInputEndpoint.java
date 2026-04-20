//
//	UsbHostMidiInputEndpoint.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.USB;

import quattro.MIDIClient.*;

import java.util.HashMap;

public final class UsbHostMidiInputEndpoint implements MIDIServer.Endpoint {

	private final UsbHostMidiInputThread thread;
	private final String device;
	private final String entity;
	private final String uid;

	public UsbHostMidiInputEndpoint(UsbHostMidiInputThread thread, String device, String entity, String uid) {

		this.thread = thread;
		this.device = device;
		this.entity = entity;
		this.uid = uid;

		thread.addCable(this);
	}

	public void kill() {
		thread.kill();
	}

	@Override
	public void open() {}
	@Override
	public void close() {}

	@Override
	public HashMap<String,Object> getMap() {
		HashMap<String,Object> map = new HashMap<String,Object>();
		map.put(MIDIClient.deviceNameKey,		device);
		map.put(MIDIClient.entityNameKey,		entity);
		map.put(MIDIClient.endpointUIDKey,		uid);
		map.put(MIDIClient.endpointIndexKey,	entity);
		return map;
	}

	@Override
	public void send(byte[] msg) {}

}
