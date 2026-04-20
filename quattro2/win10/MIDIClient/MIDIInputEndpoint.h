/*
 * @(#)MIDIInputEndpoint.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __MIDI_INPUT_ENDPOINT_H__
#define __MIDI_INPUT_ENDPOINT_H__

class MIDIInputPort;

class MIDIInputEndpoint
{
  public:
	MIDIInputEndpoint(MIDIInputPort* inputPort);
	~MIDIInputEndpoint();

	bool open(UINT id);
	void close();
	void read(const BYTE* msg, int bytes, double usec);
	void readSysex(MIDIHDR* pmh, double usec);

  private:
	enum { kSysexBufSize = 512 };

	MIDIInputPort* mp_inputPort;
	HMIDIIN m_min;
	MIDIHDR* m_pmh;

	bool _onClosing;
};

inline MIDIInputEndpoint::MIDIInputEndpoint(MIDIInputPort* inputPort)
	: mp_inputPort(inputPort), m_min(NULL)
{
	m_pmh = (MIDIHDR*)::HeapAlloc(
		::GetProcessHeap(), HEAP_ZERO_MEMORY, sizeof(MIDIHDR));
	m_pmh->lpData = (LPSTR)::HeapAlloc(
		::GetProcessHeap(), HEAP_ZERO_MEMORY, kSysexBufSize);
	m_pmh->dwBufferLength = kSysexBufSize;

	_onClosing = false;
}

inline MIDIInputEndpoint::~MIDIInputEndpoint()
{
	close();

	::HeapFree(::GetProcessHeap(), 0, m_pmh->lpData);
	::HeapFree(::GetProcessHeap(), 0, m_pmh);
}

#endif /* __MIDI_INPUT_ENDPOINT_H__ */
