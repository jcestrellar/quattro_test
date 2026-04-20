//
// @(#)TGIF.h
//
// Copyright 2019 Roland Corporation. All rights reserved.
//

#ifdef USE_TGIF

#ifndef __TGIF_H__
#define __TGIF_H__

#include "SoundEngine.h"
#include "../MIDIClient/MIDIOutputEndpoint.h"
#include "../Common/Timer.h"
#include <string>
#include <list>

#define DEVID_TGIF	0x1001

class TGIF : public SoundEngine
{
  public:
	static void init();
	static void exit();

	static bool available();
	static CString getDevName() { return TEXT("TGIF"); }

	static void _device(LPCTSTR deviceId);
	static LPCTSTR _device();

	static int  param(UINT pid);
	static void param(UINT pid, int value);
	static void MIDISend(const BYTE* data, int datalen, double timeStamp);

	static bool thru() { return m_thru; }
	static void thru(bool enable) { m_thru = enable; }

  private:
	static TGIF* mp_instance;
	static bool m_thru;
	static ULONGLONG m_renderFrames;
	static DWORD m_time0;

	typedef struct EVENT {
		long frame;
		std::string data;
	} EVENT;
	static std::list<EVENT> m_events;
	static long m_currentFrame;

	static CRITICAL_SECTION m_cs;

	TGIF();

	virtual bool activate(UINT sampleRate, UINT maxFrames);
	virtual void deactivate();
	virtual bool render(void* outputs, long frames);
};

class TGIFOutputEndpoint : public MIDIOutputEndpoint
{
  public:
	TGIFOutputEndpoint() {}
	virtual ~TGIFOutputEndpoint() {}

	bool open(UINT id) { return true; }
	void close() {}
	MMRESULT send(const BYTE* data, int datalen) {
		TGIF::MIDISend(data, datalen, Timer::currentUSecTimestamp());
		return MMSYSERR_NOERROR;
	}
	MMRESULT sendSysex(const BYTE* data, int datalen) {
		return send(data, datalen);
	}
};

#endif /* __TGIF_H__ */

#endif /* USE_TGIF */
