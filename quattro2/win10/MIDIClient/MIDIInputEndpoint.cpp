/*
 * @(#)MIDIInputEndpoint.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "MIDIClient.h"

static void CALLBACK MIDIInProc(
	HMIDIIN hMidiIn,
	UINT wMsg,
	DWORD_PTR dwInstance,
	DWORD_PTR dwParam1,
	DWORD_PTR dwParam2)
{
	MIDIInputEndpoint* _this = (MIDIInputEndpoint*)dwInstance;

	switch (wMsg) {
		case MIM_DATA: {
			double timeStamp = Timer::currentUSecTimestamp();

			BYTE data[3];
			data[0] = LOBYTE(LOWORD(dwParam1));
			data[1] = HIBYTE(LOWORD(dwParam1));
			data[2] = LOBYTE(HIWORD(dwParam1));

			int datalen = 0;
			switch (data[0] & 0xf0) {
				case 0x80: datalen = 3; break;
				case 0x90: datalen = 3; break;
				case 0xa0: datalen = 3; break;
				case 0xb0: datalen = 3; break;
				case 0xc0: datalen = 2; break;
				case 0xd0: datalen = 2; break;
				case 0xe0: datalen = 3; break;
				case 0xf0:
					switch (data[0]) {
						case 0xf1: datalen = 2; break;
						case 0xf2: datalen = 3; break;
						case 0xf3: datalen = 2; break;

						case 0xf6:
					//	case 0xf8:
						case 0xfa:
						case 0xfb:
						case 0xfc:
					//	case 0xfe:
						case 0xff: datalen = 1; break;
					}
					break;
			}
			if (datalen) {
				_this->read(data, datalen, timeStamp);
			}
			break;
		}

		case MIM_LONGDATA:
			_this->readSysex((MIDIHDR*)dwParam1, Timer::currentUSecTimestamp());
			break;

		case MIM_OPEN:
			break;
		case MIM_CLOSE:
			break;

		case MIM_ERROR:
		case MIM_LONGERROR:
		case MIM_MOREDATA:
		default:
			break;
	}
}

bool MIDIInputEndpoint::open(UINT id)
{
	close();

	MMRESULT result = ::midiInOpen(&m_min, id, (DWORD_PTR)MIDIInProc, (DWORD_PTR)this, CALLBACK_FUNCTION);
	if (result != MMSYSERR_NOERROR) {
		m_min = NULL;
		return false;
	}

	::midiInPrepareHeader(m_min, m_pmh, sizeof(MIDIHDR));
	::midiInAddBuffer(m_min, m_pmh, sizeof(MIDIHDR));
	::midiInStart(m_min);
	return true;
}

void MIDIInputEndpoint::close()
{
	if (m_min) {
		_onClosing = true;
		::midiInStop(m_min);
		::midiInReset(m_min);
		::midiInUnprepareHeader(m_min, m_pmh, sizeof(MIDIHDR));
		::midiInClose(m_min);
		m_min = NULL;
		_onClosing = false;
	}
}

inline void MIDIInputEndpoint::read(const BYTE* msg, int bytes, double usec)
{
#ifdef USE_TGIF
	if (TGIF::thru()) {
		TGIF::MIDISend(msg, bytes, usec);
	}
#endif

	if (mp_inputPort->delegate())
		mp_inputPort->delegate()->midiInputMessage(msg, bytes, DWORD(usec / 1000));
}

inline void MIDIInputEndpoint::readSysex(MIDIHDR* pmh, double usec)
{
	if (_onClosing)
		return;

#ifdef USE_TGIF
	if (TGIF::thru()) {
		TGIF::MIDISend((const BYTE *)pmh->lpData, pmh->dwBytesRecorded, usec);
	}
#endif

	if (mp_inputPort->delegate())
		mp_inputPort->delegate()->midiInputMessage(
			(const BYTE *)pmh->lpData, pmh->dwBytesRecorded, DWORD(usec / 1000));

	::midiInPrepareHeader(m_min, m_pmh, sizeof(MIDIHDR));
	::midiInAddBuffer(m_min, m_pmh, sizeof(MIDIHDR));
}
