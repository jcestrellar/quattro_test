/*
 * @(#)AudioDevice.h
 *
 * Copyright 2022 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __AUDIO_DEVICE_H__
#define __AUDIO_DEVICE_H__

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <mmsystem.h>
#include <mmddk.h>
#include <atlstr.h>
#include <vector>

#define MAX_DEVICE_UID_LENGTH (128)

extern const TCHAR* const AudioDeviceNameKey;
extern const TCHAR* const AudioDeviceUIDKey;
extern const TCHAR* const AudioDeviceIDKey;
extern const TCHAR* const AudioDeviceChannelsKey;
extern const TCHAR* const AudioDeviceSampleRateKey;
extern const TCHAR* const AudioDeviceBitDepthKey;
extern const TCHAR* const AudioDeviceCurrentKey;

typedef struct AUDIO_DEVICE_INFO
{
	CString	name;
	CString	uid;
	int sampleRate;
	int channels;
	int bitsPerSample;
	bool current;

} AUDIO_DEVICE_INFO;

class AudioDeviceDelegate
{
  public:
	virtual ~AudioDeviceDelegate() { }

	/* @optional */
	virtual void audioObjectDefaultChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDeviceId) { }
	virtual void audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState) { }
};

class AudioDevice : IMMNotificationClient
{
  public:
	enum { OUTPUT = 0, INPUT = 1 };

	AudioDevice();
	virtual ~AudioDevice();

	void delegate(AudioDeviceDelegate* obj);
	AudioDeviceDelegate* delegate() const;

	static std::vector<AUDIO_DEVICE_INFO> devices(int io);
	static UINT mmioID(int io, LPCTSTR deviceId);

private:
	AudioDeviceDelegate* mp_delegate;
	CComPtr<IMMDeviceEnumerator> mp_enumerator;

	LONG m_ref;
	HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, VOID** ppvInterface);
	ULONG STDMETHODCALLTYPE AddRef();
	ULONG STDMETHODCALLTYPE Release();

	HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDefaultDeviceId);
	HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR pwstrDeviceId) { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR pwstrDeviceId) { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR pwstrDeviceId, DWORD dwNewState);
	HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR pwstrDeviceId, const PROPERTYKEY key) { return S_OK; }

	static void enumerateDevices(EDataFlow dataFlow, std::vector<AUDIO_DEVICE_INFO>& devs);
};

/* Inline function declarations */

inline void AudioDevice::delegate(AudioDeviceDelegate* obj)
	{ mp_delegate = obj; }
inline AudioDeviceDelegate* AudioDevice::delegate() const
	{ return mp_delegate; }

inline HRESULT STDMETHODCALLTYPE AudioDevice::QueryInterface(REFIID riid, VOID** ppvInterface)
{
	if (riid == IID_IUnknown) {
		AddRef();
		*ppvInterface = (IUnknown*)this;
	} else if (__uuidof(IMMNotificationClient) == riid) {
		AddRef();
		*ppvInterface = (IMMNotificationClient*)this;
	} else {
		*ppvInterface = NULL;
		return E_NOINTERFACE;
	}
	return S_OK;
}
inline ULONG STDMETHODCALLTYPE AudioDevice::AddRef()
	{ return ::InterlockedIncrement(&m_ref); }
inline ULONG STDMETHODCALLTYPE AudioDevice::Release()
{
	ULONG ref = ::InterlockedDecrement(&m_ref);
	if (ref == 0) {
		delete this;
	}
	return ref;
}

#endif /* __AUDIO_DEVICE_H__ */
