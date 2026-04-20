/*
 * @(#)MIDIOutputEndpoint.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __MIDI_OUTPUT_ENDPOINT_H__
#define __MIDI_OUTPUT_ENDPOINT_H__

#include <windows.h>
#include <mmsystem.h>

class MIDIOutputEndpoint
{
  public:
	MIDIOutputEndpoint();
	virtual ~MIDIOutputEndpoint();

	virtual bool open(UINT id);
	virtual void close();
	virtual MMRESULT send(const BYTE* data, int datalen);
	virtual MMRESULT sendSysex(const BYTE* data, int datalen);

  private:
	HMIDIOUT m_mout;
};

inline MIDIOutputEndpoint::MIDIOutputEndpoint() : m_mout(NULL)
	{ }

inline MIDIOutputEndpoint::~MIDIOutputEndpoint()
	{ close(); }

inline bool MIDIOutputEndpoint::open(UINT id)
{
	close();

	MMRESULT result = ::midiOutOpen(&m_mout, id, 0, NULL, CALLBACK_NULL);
	if (result != MMSYSERR_NOERROR) {
		m_mout = NULL;
		return false;
	}
	return true;
}

inline void MIDIOutputEndpoint::close()
{
	if (m_mout) {
		::midiOutReset(m_mout);
		::midiOutClose(m_mout);
		m_mout = NULL;
	}
}

inline MMRESULT MIDIOutputEndpoint::send(const BYTE* data, int datalen)
{
	if (m_mout == NULL)
		return MMSYSERR_NOERROR;

	DWORD msg = (DWORD)MAKELPARAM(
					MAKEWORD(data[0], (datalen > 1) ? data[1] : 0),
					MAKEWORD((datalen == 3) ? data[2] : 0, 0)
				);

	return ::midiOutShortMsg(m_mout, msg);
}

inline MMRESULT MIDIOutputEndpoint::sendSysex(const BYTE* data, int datalen)
{
	if (m_mout == NULL)
		return MMSYSERR_NOERROR;

	MIDIHDR mhdr;
	memset(&mhdr, 0, sizeof(MIDIHDR));
	mhdr.lpData = (LPSTR)data;
	mhdr.dwBufferLength = datalen;
	mhdr.dwBytesRecorded = datalen;

	::midiOutPrepareHeader(m_mout, &mhdr, sizeof(MIDIHDR));

	MMRESULT error = ::midiOutLongMsg(m_mout, &mhdr, sizeof(MIDIHDR));
	if (error == MMSYSERR_NOERROR) {
		while ((mhdr.dwFlags & MHDR_DONE) == 0) ;
	}

	::midiOutUnprepareHeader(m_mout, &mhdr, sizeof(MIDIHDR));

	return error;
}

#endif /* __MIDI_OUTPUT_ENDPOINT_H__ */
