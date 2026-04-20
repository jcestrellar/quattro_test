//
// @(#)TGIF.cpp
//
// Copyright 2019 Roland Corporation. All rights reserved.
//

#ifdef USE_TGIF

#include "TGIF.h"
#include <security.h>

#pragma comment( lib, "libtg.lib" )

extern "C" {
	bool libtg_initialize(void*, UINT);
	bool libtg_activate(UINT, UINT);
	void libtg_deactivate();
	void libtg_terminate();
	int  libtg_getValue(UINT);
	void libtg_setValue(UINT, int);
	void libtg_flushEvents();
	void libtg_processEvents(const BYTE*, int, long);
	void libtg_processReplacingFloat(float*, long);
	void libtg_processReplacingI16(short*, long);
}

static LONG initCount = 0;

TGIF* TGIF::mp_instance = 0;
bool TGIF::m_thru = false;
ULONGLONG TGIF::m_renderFrames = 0;
DWORD TGIF::m_time0 = 0;
long TGIF::m_currentFrame = 0;
std::list<TGIF::EVENT> TGIF::m_events;
CRITICAL_SECTION TGIF::m_cs;

TGIF::TGIF() : SoundEngine() {}

void TGIF::init()
{
	if (::InterlockedIncrement(&initCount) == 1) {
		::InitializeCriticalSection(&m_cs);
		BYTE context[LIBTG_ACTIVATION_KEY_LEN];
		DESCRUMBLE_KEY(context, LIBTG_ACTIVATION_KEY);
		if (libtg_initialize(context, kSampleRate)) {
			mp_instance = new TGIF();
			mp_instance->start();
		}
	}
}

void TGIF::exit()
{
	if (::InterlockedDecrement(&initCount) == 0) {
		if (mp_instance) {
			delete mp_instance;
			mp_instance = 0;
			m_thru = false;
			libtg_terminate();
		}
		::DeleteCriticalSection(&m_cs);
	}
}

bool TGIF::available()
{
	return (mp_instance != 0);
}

void TGIF::_device(LPCTSTR deviceId)
{
	if (mp_instance) mp_instance->device(deviceId);
}

LPCTSTR TGIF::_device()
{
	return mp_instance ? mp_instance->device(): TEXT("");
}

int TGIF::param(UINT pid)
{
	return mp_instance ? libtg_getValue(pid) : 0;
}

void TGIF::param(UINT pid, int value)
{
	if (mp_instance) libtg_setValue(pid, value);
}

void TGIF::MIDISend(const BYTE* data, int datalen, double timeStamp)
{
	if (mp_instance) {
		EVENT ev;
		ev.frame = long(kSampleRate * timeStamp / 1000000);
		ev.data = std::string((char*)data, datalen);

		::EnterCriticalSection(&m_cs);
		auto iter = m_events.rbegin(), end = m_events.rend();
		for ( ; iter != end; iter++) {
			if (iter->frame <= ev.frame) {
				m_events.insert(iter.base(), ev);
				break;
			}
		}
		if (iter == end) {
			m_events.push_front(ev);
		}
		::LeaveCriticalSection(&m_cs);
	}
}

bool TGIF::activate(UINT sampleRate, UINT maxFrames)
{
	m_renderFrames = m_currentFrame = 0;
	return libtg_activate(sampleRate, maxFrames);
}

void TGIF::deactivate()
{
	libtg_deactivate();
}

bool TGIF::render(void* outputs, long frames)
{
	if ((m_renderFrames * 1000 / kSampleRate) + m_time0 < Timer::currentMSecTimestamp()) {
		m_renderFrames = m_currentFrame = 0;
		::EnterCriticalSection(&m_cs);
		while (!m_events.empty()) {
			EVENT ev = m_events.front();
			libtg_processEvents((const BYTE*)ev.data.c_str(), (int)ev.data.length(), 0);
			m_events.pop_front();
		}
		::LeaveCriticalSection(&m_cs);
		libtg_flushEvents();
	}

	long endFrame = m_currentFrame + frames;
	::EnterCriticalSection(&m_cs);
	for (long lastframe = 0; !m_events.empty(); ) {
		EVENT ev = m_events.front();
		if (!m_currentFrame || (m_currentFrame > ev.frame)) {
			m_currentFrame = ev.frame;
			endFrame = m_currentFrame + frames;
			lastframe = 0;
		}
		if (lastframe == 0) {
			lastframe = m_currentFrame;
		}
		if (ev.frame >= endFrame) break;
		long deltaFrames = ev.frame - lastframe;
		lastframe = ev.frame;
		libtg_processEvents((const BYTE*)ev.data.c_str(), (int)ev.data.length(), deltaFrames);
		m_events.pop_front();
	}
	::LeaveCriticalSection(&m_cs);
	if (m_currentFrame) { m_currentFrame = endFrame; }

#ifdef USE_WAVE_FORMAT_IEEE_FLOAT
	libtg_processReplacingFloat((float*)outputs, frames);
#else
	libtg_processReplacingI16((short*)outputs, frames);
#endif

	if (m_renderFrames == 0) {
		m_time0 = Timer::currentMSecTimestamp() + 1;
	}
	m_renderFrames += frames;

	return true;
}

#endif /* USE_TGIF */
