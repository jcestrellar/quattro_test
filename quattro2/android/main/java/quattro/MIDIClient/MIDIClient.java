//
//	MIDIClient.java
//
//	Copyright 2014 Roland Corporation. All rights reserved.
//

package quattro.MIDIClient;

public class MIDIClient
{
	public static final String deviceNameKey		= "MIDIDeviceNameKey";
	public static final String entityNameKey		= "MIDIEntityNameKey";
	public static final String endpointUIDKey		= "MIDIEndpointUIDKey";
	public static final String endpointIndexKey		= "MIDIEndpointIndexKey";

	public MIDIClientDelegate delegate = null;

	public MIDIInputPort inputPort = null;
	public MIDIOutputPort outputPort = null;

	protected MIDIServer server = null;;

	public MIDIClient(MIDIServer server) {

		this.server = server;
		server.addClient(this);

		inputPort = new MIDIInputPort(this);
		outputPort = new MIDIOutputPort(this);
	}

	public void destroy() {

		server.removeClient(this);

		inputPort.delegate = null;
		inputPort.disconnectAllEndpoints();
		outputPort.disconnectAllEndpoints();
		inputPort = null;
		outputPort = null;

		delegate = null;
	}

	public void deviceAddNotification() {
		if (delegate != null) {
			delegate.midiObjectAddedRemoved();
		}
	}

	public void deviceRemoveNotification() {
		if (delegate != null) {
			delegate.midiObjectAddedRemoved();
		}
	}

}
