//
// @(#)SoundEngine.h
//
// Copyright 2019 Roland Corporation. All rights reserved.
//

#ifndef __SOUND_ENGINE_H__
#define __SOUND_ENGINE_H__

#define USE_WAVE_FORMAT_IEEE_FLOAT

#include <windows.h>
#include <avrt.h>
#include <mmsystem.h>
#include "../Audio/AudioDevice.h"
#include "../Common/Thread.h"

class SoundEngine : public AudioDeviceDelegate
{
  public:
	static DWORD kSampleRate;

	SoundEngine();
	virtual ~SoundEngine();

	void device(LPCTSTR deviceId);
	LPCTSTR device() const { return mp_deviceId ? mp_deviceId : TEXT(""); }

	void start();
	void stop();

	void run();

  protected:
	virtual bool activate(UINT sampleRate, UINT maxFrames);
	virtual void deactivate();
	virtual bool render(void* outputs, long frames);

  private:
	IMMDeviceEnumerator* mp_enumerator = 0;
	IMMDevice* mp_device = 0;
	IAudioClient* mp_client = 0;
	IAudioRenderClient* mp_render = 0;
	HANDLE m_event = NULL;

	UINT32 m_bufferFrames;
	WAVEFORMATEX m_wfe;

	LPTSTR mp_deviceId;
	AudioDevice* mp_audio;

	HANDLE m_thread;
	DWORD m_tid;
	bool m_runloop;

	/* AudioDeviceDelegate */
	void audioObjectDefaultChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDeviceId);
	void audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState);
};

#endif /* __SOUND_ENGINE_H__ */
