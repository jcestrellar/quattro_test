/*
 * @(#)AudioDevice.cpp
 *
 * Copyright 2022 Roland Corporation, Japan. All rights reserved.
 */

#include "AudioDevice.h"
#include <functiondiscoverykeys_devpkey.h>

const TCHAR* const AudioDeviceNameKey       = TEXT("AudioDeviceNameKey");
const TCHAR* const AudioDeviceUIDKey        = TEXT("AudioDeviceUIDKey");
const TCHAR* const AudioDeviceChannelsKey   = TEXT("AudioDeviceChannelsKey");
const TCHAR* const AudioDeviceSampleRateKey = TEXT("AudioDeviceSampleRateKey");
const TCHAR* const AudioDeviceBitDepthKey   = TEXT("AudioDeviceBitDepthKey");
const TCHAR* const AudioDeviceCurrentKey    = TEXT("AudioDeviceCurrentKey");

AudioDevice::AudioDevice()
{
	m_ref = 0;
	mp_delegate = 0;

	HRESULT hr = S_OK;
	if (SUCCEEDED(hr)) {
		hr = ::CoCreateInstance(
			__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_INPROC_SERVER,
			__uuidof(IMMDeviceEnumerator), (LPVOID *)&mp_enumerator);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_enumerator->RegisterEndpointNotificationCallback(this);
	}
}

AudioDevice::~AudioDevice()
{
	mp_delegate = 0;

	if (mp_enumerator) {
		mp_enumerator->UnregisterEndpointNotificationCallback(this);
	}
}

HRESULT STDMETHODCALLTYPE AudioDevice::OnDefaultDeviceChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDefaultDeviceId)
{
	if (mp_delegate) {
		mp_delegate->audioObjectDefaultChanged(flow, role, pwstrDefaultDeviceId);
	}
	return S_OK;
}

HRESULT STDMETHODCALLTYPE AudioDevice::OnDeviceStateChanged(LPCWSTR pwstrDeviceId, DWORD dwNewState)
{
	if (mp_delegate) {
		mp_delegate->audioObjectAddedRemoved(pwstrDeviceId, dwNewState);
	}
	return S_OK;
}

std::vector<AUDIO_DEVICE_INFO> AudioDevice::devices(int io)
{
	std::vector<AUDIO_DEVICE_INFO> devs;
	enumerateDevices((io == INPUT) ? EDataFlow::eCapture : EDataFlow::eRender, devs);
	return devs;
}

void AudioDevice::enumerateDevices(EDataFlow dataFlow, std::vector<AUDIO_DEVICE_INFO>& devs)
{
	devs.clear();

	CString defaultId;
	CComPtr<IMMDeviceEnumerator> enumerator;
	CComPtr<IMMDeviceCollection> collection;
	UINT count;

	HRESULT hr = S_OK;
	if (SUCCEEDED(hr)) {
		hr = ::CoCreateInstance(
			__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_INPROC_SERVER,
			__uuidof(IMMDeviceEnumerator), (LPVOID *)&enumerator);
	}
	if (SUCCEEDED(hr)) {
		CComPtr<IMMDevice> device;
		hr = enumerator->GetDefaultAudioEndpoint(dataFlow, ERole::eMultimedia, &device);
		if (SUCCEEDED(hr)) {
			LPWSTR deviceId;
			hr = device->GetId(&deviceId);
			if (SUCCEEDED(hr)) {
				defaultId = deviceId;
			}
			::CoTaskMemFree(deviceId);
		}
	}
	if (SUCCEEDED(hr)) {
		hr = enumerator->EnumAudioEndpoints(dataFlow, ERole::eMultimedia, &collection);
	}
	if (SUCCEEDED(hr)) {
		hr = collection->GetCount(&count);
	}
	if (SUCCEEDED(hr)) {
		for (UINT i = 0; i < count; i++) {
			AUDIO_DEVICE_INFO dev;
			CComPtr<IMMDevice> device;
			CComPtr<IPropertyStore> store;
			hr = collection->Item(i, &device);
			if (SUCCEEDED(hr)) {
				LPWSTR deviceId;
				hr = device->GetId(&deviceId);
				if (SUCCEEDED(hr)) {
					dev.uid = deviceId;
				}
				::CoTaskMemFree(deviceId);
				dev.current = (dev.uid == defaultId);
			}
			if (SUCCEEDED(hr)) {
				hr = device->OpenPropertyStore(STGM_READ, &store);
			}
			if (SUCCEEDED(hr)) {
				PROPVARIANT var;
				::PropVariantInit(&var);
				hr = store->GetValue(PKEY_Device_FriendlyName, &var);
				if (SUCCEEDED(hr)) {
					dev.name = var.pwszVal;
				}
				::PropVariantClear(&var);
			}
			if (SUCCEEDED(hr)) {
				PROPVARIANT var;
				::PropVariantInit(&var);
				hr = store->GetValue(PKEY_AudioEngine_DeviceFormat, &var);
				PWAVEFORMATEX pwfe = (PWAVEFORMATEX)var.blob.pBlobData;
				dev.sampleRate = pwfe->nSamplesPerSec;
				dev.channels = pwfe->nChannels;
				dev.bitsPerSample = pwfe->wBitsPerSample;
				::PropVariantClear(&var);
			}
			if (SUCCEEDED(hr)) {
				devs.push_back(dev);
			}
		}
	}
}

UINT AudioDevice::mmioID(int io, LPCTSTR deviceId)
{
	UINT uDeviceID = WAVE_MAPPER;

	if (deviceId && *deviceId) {
		CStringW _deviceId(deviceId);
		UINT id, numDevs = io ? ::waveInGetNumDevs() : ::waveOutGetNumDevs();
		for (id = 0; id < numDevs; id++) {
			DWORD size;
			MMRESULT error = io ?
				::waveInMessage((HWAVEIN)(size_t)id, DRV_QUERYFUNCTIONINSTANCEIDSIZE, (DWORD_PTR)&size, NULL) :
				::waveOutMessage((HWAVEOUT)(size_t)id, DRV_QUERYFUNCTIONINSTANCEIDSIZE, (DWORD_PTR)&size, NULL);
			if (error != MMSYSERR_NOERROR) continue;
			WCHAR *data = new WCHAR[(size / sizeof(WCHAR)) + 1];
			error = io ?
				::waveInMessage((HWAVEIN)(size_t)id, DRV_QUERYFUNCTIONINSTANCEID, (DWORD_PTR)data, size) :
				::waveOutMessage((HWAVEOUT)(size_t)id, DRV_QUERYFUNCTIONINSTANCEID, (DWORD_PTR)data, size);
			if (error == MMSYSERR_NOERROR) {
				if (_deviceId == data) {
					uDeviceID = id;
					id = numDevs;
				}
			}
			delete [] data;
		}
	}

	return uDeviceID;
}
