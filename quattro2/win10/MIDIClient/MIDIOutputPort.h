/*
 * @(#)MIDIOutputPort.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __MIDI_OUTPUT_PORT_H__
#define __MIDI_OUTPUT_PORT_H__

#include "MIDIOutputEndpoint.h"
#include "../Common/Thread.h"
#include <vector>
#include <map>

class MIDIClient;

class MIDIOutputPort
{
  public:
	MIDIOutputPort(MIDIClient *client);
	virtual ~MIDIOutputPort();

	const std::vector<MIDI_ENDPOINT_INFO>& endpoints();

	virtual void connectEndpoint(const MIDI_ENDPOINT_INFO* ep);
	virtual void disconnectEndpoint(const MIDI_ENDPOINT_INFO* ep);
	virtual void connectAllEndpoints();
	virtual void disconnectAllEndpoints();

	void send(const BYTE* data, int datalen);

  protected:
	enum { kSysexBufSize = 512 };

	MIDIClient* mp_client;
	std::vector<MIDI_ENDPOINT_INFO> m_devs;
	Mutex mtx_endpoints;

  private:
	std::map<CString, MIDIOutputEndpoint*> m_endpoints;

	BYTE m_running;
	int m_buflen;
	BYTE* m_buf;

	virtual void getDevices(std::vector<MIDI_ENDPOINT_INFO>& devs);
	virtual void send(const BYTE* data, int datalen, bool sysex);
	CString getInterface(UINT id);
};

inline MIDIOutputPort::MIDIOutputPort(MIDIClient* client)
{
	mp_client = client;
	m_running = 0;
	m_buflen = 0;
	m_buf = new BYTE[kSysexBufSize];
}

inline MIDIOutputPort::~MIDIOutputPort()
{
	disconnectAllEndpoints();
	delete [] m_buf;
}

#endif /* __MIDI_OUTPUT_PORT_H__ */
