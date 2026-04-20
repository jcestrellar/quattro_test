//
// @(#)SoundEngine.cpp
//
// Copyright 2019 Roland Corporation. All rights reserved.
//

#include "SoundEngine.h"

DWORD SoundEngine::kSampleRate = 44100;

SoundEngine::SoundEngine()
{
	m_bufferFrames = 256;

	mp_deviceId = 0;

	m_thread = NULL;
	m_tid = 0;
	m_runloop = false;

	memset(&m_wfe, 0, sizeof(m_wfe));

	mp_audio = new AudioDevice();
	mp_audio->delegate(this);
}

SoundEngine::~SoundEngine()
{
	delete mp_audio;

	stop();

	delete[] mp_deviceId;
}

static DWORD WINAPI _thread(LPVOID param)
{
	SoundEngine* _this = (SoundEngine*)param;
	_this->run();
	return 0;
}

void SoundEngine::start()
{
	stop();

	m_thread = ::CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)_thread, (void*)this, CREATE_SUSPENDED, &m_tid);
	if (!m_thread) return;

	HRESULT hr = S_OK;

	if (SUCCEEDED(hr)) {
		hr = ::CoCreateInstance(
			__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
			__uuidof(IMMDeviceEnumerator), (LPVOID*)&mp_enumerator);
	}
	if (SUCCEEDED(hr)) {
		if (mp_deviceId) {
			hr = mp_enumerator->GetDevice(mp_deviceId, &mp_device);
		} else {
			hr = mp_enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &mp_device);
		}
	}
	if (SUCCEEDED(hr)) {
		hr = mp_device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&mp_client);
	}
	if (SUCCEEDED(hr)) {
		WAVEFORMATEX* _pwfe = 0;
		hr = mp_client->GetMixFormat(&_pwfe);
		if (_pwfe) {
			kSampleRate = _pwfe->nSamplesPerSec;
			memset(&m_wfe, 0, sizeof(m_wfe));
#ifdef USE_WAVE_FORMAT_IEEE_FLOAT
			m_wfe.wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
			m_wfe.wBitsPerSample = (sizeof(float) * 8);
#else
			m_wfe.wFormatTag = WAVE_FORMAT_PCM;
			m_wfe.wBitsPerSample = (sizeof(short) * 8);
#endif
			m_wfe.nSamplesPerSec = kSampleRate;
			m_wfe.nChannels = _pwfe->nChannels;
			m_wfe.nBlockAlign = (m_wfe.wBitsPerSample / 8) * m_wfe.nChannels;
			m_wfe.nAvgBytesPerSec = m_wfe.nBlockAlign * m_wfe.nSamplesPerSec;
			::CoTaskMemFree(_pwfe);
		}
	}
	if (SUCCEEDED(hr)) {
		REFERENCE_TIME default_device_period = 0;
		REFERENCE_TIME minimum_device_period = 0;
		hr = mp_client->GetDevicePeriod(&default_device_period, &minimum_device_period);
		if (SUCCEEDED(hr)) {
			hr = mp_client->Initialize(
				AUDCLNT_SHAREMODE_SHARED,
				AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
				default_device_period, 0, &m_wfe, NULL);
		}
	}
	if (SUCCEEDED(hr)) {
		hr = mp_client->GetBufferSize(&m_bufferFrames);
	}
	if (SUCCEEDED(hr)) {
		m_event = ::CreateEvent(NULL, FALSE, FALSE, NULL);
		hr = mp_client->SetEventHandle(m_event);
	}
	if (SUCCEEDED(hr)) {
		m_runloop = true;
	}

	::ResumeThread(m_thread);
}

void SoundEngine::stop()
{
	if (m_thread) {
		m_runloop = false;
		::SetEvent(m_event);
		::WaitForSingleObject(m_thread, INFINITE);
		::CloseHandle(m_thread);
		m_thread = NULL;
	}
}

void SoundEngine::run()
{
	HANDLE mmcss = NULL;
	HRESULT hr;

	if (m_runloop) {
		hr = mp_client->GetService(__uuidof(IAudioRenderClient), (void**)&mp_render);
		if (!SUCCEEDED(hr) || !activate(m_wfe.nSamplesPerSec, m_bufferFrames)) {
			m_runloop = false;
		}
	}
	if (m_runloop) {
		DWORD taskid = 0;
		mmcss = ::AvSetMmThreadCharacteristics(TEXT("Pro Audio"), &taskid);
		mp_client->Start();
	}

	while ((::WaitForSingleObject(m_event, 3000) == WAIT_OBJECT_0) && m_runloop) {
		UINT32 paddingFrames, availableFrames;
		hr = mp_client->GetCurrentPadding(&paddingFrames);
		if (!SUCCEEDED(hr)) break;
		availableFrames = m_bufferFrames - paddingFrames;
		if (availableFrames == 0) continue;
		LPBYTE lpData;
		hr = mp_render->GetBuffer(availableFrames, &lpData);
		if (!SUCCEEDED(hr)) break;
		if (!render(lpData, availableFrames)) {
			memset(lpData, 0, (availableFrames * m_wfe.nBlockAlign));
		}
		hr = mp_render->ReleaseBuffer(availableFrames, 0);
		if (!SUCCEEDED(hr)) break;
	}

	if (mp_client) {
		mp_client->Stop();
	}
	if (mp_render) {
		mp_render->Release();
		mp_render = 0;
		if (mmcss) {
			::AvRevertMmThreadCharacteristics(mmcss);
		}
		deactivate();
	}

	if (mp_enumerator) {
		mp_enumerator->Release();
		mp_enumerator = 0;
	}
	if (mp_device) {
		mp_device->Release();
		mp_device = 0;
	}
	if (mp_client) {
		mp_client->Release();
		mp_client = 0;
	}
	if (m_event) {
		::CloseHandle(m_event);
		m_event = NULL;
	}
}

void SoundEngine::device(LPCTSTR deviceId)
{
	delete [] mp_deviceId;
	if (deviceId && *deviceId) {
		mp_deviceId = new TCHAR[MAX_DEVICE_UID_LENGTH];
		_tcscpy_s(mp_deviceId, MAX_DEVICE_UID_LENGTH, deviceId);
	} else {
		mp_deviceId = 0;
	}
	start();
}

void SoundEngine::audioObjectDefaultChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDeviceId)
{
	if ((flow == EDataFlow::eRender) && (role == ERole::eMultimedia)) {
		if (!mp_deviceId) {
			Thread::runOnMainThread([this]() { device(0); });
		}
	}
}

void SoundEngine::audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState)
{
	if (mp_deviceId && (CString(mp_deviceId) == CString(pwstrDeviceId))) {
		if (dwNewState == DEVICE_STATE_NOTPRESENT) {
			Thread::runOnMainThread([this]() { device(0); });
		}
	}
}

bool SoundEngine::activate(UINT sampleRate, UINT maxFrames) { return false; }
void SoundEngine::deactivate() {}
bool SoundEngine::render(void* outputs, long frames) { return false; }
