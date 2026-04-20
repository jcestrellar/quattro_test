/*
 * @(#)MIDIInputPort.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __MIDI_INPUT_PORT_H__
#define __MIDI_INPUT_PORT_H__

#include "MIDIInputEndpoint.h"
#include <vector>
#include <map>

class MIDIClient;

class MIDIInputDelegate
{
  public:
	virtual ~MIDIInputDelegate() { }

	/* @optional */
	virtual void midiInputMessage(const BYTE* msg, int bytes, DWORD msec) { }
};

class MIDIInputPort
{
  public:
	MIDIInputPort(MIDIClient *client);
	virtual ~MIDIInputPort();

	void delegate(MIDIInputDelegate* obj);
	MIDIInputDelegate* delegate() const;

	const std::vector<MIDI_ENDPOINT_INFO>& endpoints();

	virtual void connectEndpoint(const MIDI_ENDPOINT_INFO* ep);
	virtual void disconnectEndpoint(const MIDI_ENDPOINT_INFO* ep);
	virtual void connectAllEndpoints();
	virtual void disconnectAllEndpoints();

  protected:
	MIDIClient* mp_client;
	MIDIInputDelegate* mp_delegate;
	std::vector<MIDI_ENDPOINT_INFO> m_devs;

  private:
	std::map<CString, MIDIInputEndpoint*> m_endpoints;

	virtual void getDevices(std::vector<MIDI_ENDPOINT_INFO>& devs);
	CString getInterface(UINT id);
};

inline MIDIInputPort::MIDIInputPort(MIDIClient* client)
{
	mp_client = client;
	mp_delegate = 0;
}

inline MIDIInputPort::~MIDIInputPort()
	{ disconnectAllEndpoints(); }

inline void MIDIInputPort::delegate(MIDIInputDelegate* obj)
	{ mp_delegate = obj; }
inline MIDIInputDelegate* MIDIInputPort::delegate() const
	{ return mp_delegate; }

#endif /* __MIDI_INPUT_PORT_H__ */
