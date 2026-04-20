//
//  SamplePlayer.cpp
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#include "SamplePlayer.h"

SamplePlayer::SamplePlayer()
#ifdef OLD_MME_SAMPLER
	: m_power(WOUT_BUF_NUM)
#else
	: m_power(1)
#endif
{
	mp_delegate = 0;

	mp_deviceId = 0;
	mp_file = 0;
	mp_reader = 0;
	m_bufpos = 0;

	m_totalTime = 0;
	m_currentTime = 0;
	m_currentFrame = 0;

	m_locateTime = m_beginTime = m_endTime = 0;

	m_trigger = false;
	m_playing = m_paused = false;
	m_fadeOutStartFrame = 0;
	m_immediate = false;
	m_bos = false;
	__gain = 0.0f;

	m_repeat = m_count = 0;

	m_gain = 1.0f;
	m_rate = 1.0f;
	m_cent = 0.0f;
	m_fadeIn = m_fadeOut = 0.0f;

	m_thread = NULL;
	m_tid = 0;

	memset(&m_wfe, 0, sizeof(m_wfe));
#ifdef OLD_MME_SAMPLER
	m_wout = NULL;
	for (int i = 0; i < WOUT_BUF_NUM; i++) {
		mp_wavbuf[i] = 0;
	}
#endif

	mp_audio = new AudioDevice();
	mp_audio->delegate(this);
}

SamplePlayer::~SamplePlayer()
{
	delete mp_audio;
	mp_delegate = 0;

	close();

	delete [] mp_deviceId;
}

static DWORD WINAPI _thread(LPVOID param)
{
	SamplePlayer* _this = (SamplePlayer*)param;
	_this->run();
	return 0;
}

void SamplePlayer::close()
{
	closeOutput();
	closeFile();
	term();

	delete [] mp_file;
	mp_file = 0;
}

void SamplePlayer::closeFile()
{
	if (mp_reader) {
		mp_reader->Release();
		mp_reader = 0;
		m_buffer.resize(0);
	}

	m_currentTime = m_totalTime = 0;
	m_locateTime = m_beginTime = m_endTime = 0;
}

bool SamplePlayer::open(LPCTSTR file)
{
	close();

#ifdef OLD_MME_SAMPLER
	HRESULT hr = file ? S_OK : E_ABORT;
#else
	HRESULT hr = startOutput();
	if (FAILED(hr) && mp_deviceId) {
		delete [] mp_deviceId;
		mp_deviceId = 0;
		hr = startOutput();
	}
#endif

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSourceReaderFromURL(file, NULL, &mp_reader);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_reader->SetStreamSelection((DWORD)MF_SOURCE_READER_ALL_STREAMS, FALSE);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_reader->SetStreamSelection((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, TRUE);
	}
#ifdef OLD_MME_SAMPLER
	if (SUCCEEDED(hr)) {
		CComPtr<IMFMediaType> current_type;
		hr = mp_reader->GetCurrentMediaType(
				(DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, &current_type);
		if (SUCCEEDED(hr)) {
			UINT32 size = 0;
			WAVEFORMATEX* _pwfe = 0;
			hr = ::MFCreateWaveFormatExFromMFMediaType(current_type, &_pwfe, &size);
			if (_pwfe) {
				memset(&m_wfe, 0, sizeof(m_wfe));
				m_wfe.wFormatTag      = WAVE_FORMAT_PCM;
				m_wfe.nSamplesPerSec  = _pwfe->nSamplesPerSec;
				m_wfe.nChannels       = min(_pwfe->nChannels, 2);
				m_wfe.wBitsPerSample  = 16; /* fixed */
				m_wfe.nBlockAlign = (m_wfe.wBitsPerSample / 8) * m_wfe.nChannels;
				m_wfe.nAvgBytesPerSec = m_wfe.nBlockAlign * m_wfe.nSamplesPerSec;
				::CoTaskMemFree(_pwfe);
			}
		}
	}
#endif
	if (SUCCEEDED(hr)) {
		CComPtr<IMFMediaType> media_type;
		HRESULT hr = ::MFCreateMediaType(&media_type);
		if (SUCCEEDED(hr)) hr = media_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
		if (SUCCEEDED(hr)) hr = media_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, m_wfe.nChannels);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, m_wfe.nSamplesPerSec);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, m_wfe.wBitsPerSample);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, m_wfe.nBlockAlign);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, m_wfe.nAvgBytesPerSec);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		if (SUCCEEDED(hr)) hr = mp_reader->SetCurrentMediaType((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, NULL, media_type);
	}
	if (SUCCEEDED(hr)) {
		PROPVARIANT var;
		::PropVariantInit(&var);
		hr = mp_reader->GetPresentationAttribute(
				(DWORD)MF_SOURCE_READER_MEDIASOURCE, MF_PD_DURATION, &var);
		if (SUCCEEDED(hr)) {
			m_totalTime = float((var.hVal.QuadPart / 10000000.0));
		}
		::PropVariantClear(&var);
	}
	if (SUCCEEDED(hr)) {
		mp_file = new TCHAR[MAX_PATH];
		_tcscpy_s(mp_file, MAX_PATH, file);
		init(&m_wfe);
#ifdef OLD_MME_SAMPLER
		hr = startOutput() ? S_OK : E_ABORT;
#endif
	}
	if (FAILED(hr)) {
#ifdef OLD_MME_SAMPLER
		closeFile();
#else
		close();
#endif
	}

	return SUCCEEDED(hr);
}

void SamplePlayer::play()
{
	if (m_playing && m_paused) {
		m_paused = false;
		return;
	}

	m_count = m_repeat;
	m_trigger = true;
}

void SamplePlayer::pause()
{
	if (m_playing && !m_paused) {
		m_paused = true;
		m_trigger = true;
	}
}

void SamplePlayer::stop(bool immediate)
{
	if (!ready() || (m_playing && m_paused)) {
		stopped();
		return;
	}

	if (m_playing) {
		if (m_fadeOutStartFrame) {
			m_immediate = true;
		} else {
			m_fadeOutStartFrame = m_currentFrame;
			m_immediate = immediate;
		}
	}
}

void SamplePlayer::stopped(bool eos)
{
	m_playing = m_paused = false;
	m_currentTime = m_locateTime = m_beginTime; // = 0.0f;

	if (eos && mp_delegate) {
		delegate()->samplePlayerDidEndSong(mp_file);
	}
}

void SamplePlayer::locate(float time)
{
	if (time < m_beginTime) {
		time = m_beginTime;
	}
	if (time > (m_totalTime - m_endTime)) {
		time = (m_totalTime - m_endTime);
	}

	bool playing = (m_playing && !m_paused);
	if (playing) {
		pause();
#ifdef OLD_MME_SAMPLER
		::Sleep(WOUT_RENDER_PERIOD * 2);
#else
		::Sleep(50);
#endif
	}
	if (seek(time)) {
		reset();
	}
	if (playing) {
		play();
	}
}

void SamplePlayer::begin(float time)
{
	if (time > (m_totalTime - m_endTime)) {
		time = (m_totalTime - m_endTime);
	}

	bool playing = (m_playing && !m_paused);
	if (playing) {
		pause();
#ifdef OLD_MME_SAMPLER
		::Sleep(WOUT_RENDER_PERIOD * 2);
#else
		::Sleep(50);
#endif
	}
	if (seek(time)) {
		m_beginTime = time;
		reset();
	}
	if (playing) {
		play();
	}
}

void SamplePlayer::end(float time)
{
	if (time >= 0) {
		m_endTime = time;
		if ((m_totalTime - m_endTime) < m_beginTime) {
			m_endTime = (m_totalTime - m_beginTime);
		}
		if ((m_totalTime - m_endTime) < m_currentTime) {
			begin(m_beginTime);
		}
	}
}

int SamplePlayer::state() const
{
	if (m_playing) {
		return (m_paused ? kSamplePlayerStatePause :
			(m_fadeOutStartFrame ? kSamplePlayerStateStopping : kSamplePlayerStatePlay));
	}
	return kSamplePlayerStateStop;
}

bool SamplePlayer::seek(float time)
{
	HRESULT hr = mp_reader ? S_OK : E_ABORT;
	if (SUCCEEDED(hr)) {
		PROPVARIANT var;
		hr = ::InitPropVariantFromInt64(LONGLONG(time * 10000000), &var);
		if (SUCCEEDED(hr)) {
			hr = mp_reader->SetCurrentPosition(GUID_NULL, var);
			::PropVariantClear(&var);
		}
	}
	if (SUCCEEDED(hr)) {
		m_buffer.resize(0);
		m_currentTime = m_locateTime = time;
	}
	return SUCCEEDED(hr);
}

int SamplePlayer::read(BYTE* buffer, int length)
{
	BYTE* p = buffer;

	while (length > 0) {
		if (m_buffer.size() > 0) {
			int size = (int)m_buffer.size() - m_bufpos;
			if (size > length) { size = length; }
			memcpy(p, m_buffer.data() + m_bufpos, size);
			p += size; length -= size; m_bufpos += size;
			if (m_bufpos == m_buffer.size()) {
				m_buffer.resize(0);
			}
			continue;
		}

		DWORD dwFlags = 0;
		CComPtr<IMFSample> sample;
		CComPtr<IMFMediaBuffer> mediaBuffer;
		HRESULT hr = mp_reader->ReadSample(
				(DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, 0, NULL, &dwFlags, NULL, &sample);
		if (FAILED(hr)) { return -1; }
		if (dwFlags & MF_SOURCE_READERF_CURRENTMEDIATYPECHANGED) { return -1; }
		if (dwFlags & MF_SOURCE_READERF_ENDOFSTREAM) {
			if (m_count == 0) {
				break;
			}
			if (m_count > 0) m_count--;
			if (!seek(m_beginTime)) { return -1; }
			continue;
		}
		if (sample == 0) { continue; }
		hr = sample->ConvertToContiguousBuffer(&mediaBuffer);
		if (FAILED(hr)) { return -1; }

		BYTE* buf;
		DWORD len;
		hr = mediaBuffer->Lock(&buf, NULL, &len);
		if (FAILED(hr)) { return -1; }
		m_bufpos = 0;
		m_buffer.resize(len);
		memcpy(m_buffer.data(), buf, len);
		hr = mediaBuffer->Unlock();
		if (FAILED(hr)) { return -1; }
	}

	return (int)(p - buffer);
}

int SamplePlayer::process(BYTE* buffer, int length)
{
	int bytes = 0;
	m_bos = false;

	if (m_trigger) {
		m_trigger = false;
		if (m_playing) {
			if (ready()) {
				int len = (length / 2) & ~0x1;
				int n = render(buffer, len);
				if (n <= 0) { stopped(true); return 0; }
				if (m_paused) { return n; }
				envelope(buffer, n, 1.0f, 0.0f);
				buffer += n; length -= n; bytes += n;
			} else if (m_paused) {
				return 0;
			}
		} else if (m_locateTime == 0) {
			m_bos = true;
		}
		m_playing = true;
		m_paused = false;
		m_currentFrame = 0;
		m_fadeOutStartFrame = 0;
		seek(m_locateTime);
		reset();
	} else if (ready() && m_endTime && m_playing && !m_paused) {
		if (m_currentTime >= (m_totalTime - m_endTime)) {
			int len = (length / 2) & ~0x1;
			int n = render(buffer, len);
			if (n <= 0) { stopped(true); return 0; }
			if (m_count == 0) { stopped(true); return n; }
			envelope(buffer, n, 1.0f, 0.0f);
			buffer += n; length -= n; bytes += n;
			if (m_count > 0) m_count--;
			seek(m_beginTime);
			reset();
		}
	}

	if (ready() && m_playing && !m_paused) {
		int n = render(buffer, length);
		if (n <= 0) { stopped(true); return bytes; }
		if (bytes) {
			envelope(buffer, n, 0.0f, 1.0f);
		}
		bytes += n;
	}
	return bytes;
}

float SamplePlayer::fader()
{
	if (!m_playing || m_paused) {
		return 0.0f;
	}

	float gain = m_gain;
	float fadeInFrames = m_fadeIn * m_wfe.nSamplesPerSec;
	if (m_fadeOutStartFrame) {
		float fadeOut = (m_immediate || (m_fadeOut == 0)) ? 0.005f : m_fadeOut;
		float fadeOutFrames = fadeOut * m_wfe.nSamplesPerSec;
		float endFrame = m_fadeOutStartFrame + fadeOutFrames;
		gain = m_gain * ((endFrame - m_currentFrame) / fadeOutFrames);
		if (fadeInFrames && (m_fadeOutStartFrame < fadeInFrames)) {
			gain *= m_fadeOutStartFrame  / fadeInFrames;
		}
		if (m_currentFrame >= endFrame) {
			stopped();
		}
	} else if (fadeInFrames && (m_currentFrame < fadeInFrames)) {
		gain = m_gain * (m_currentFrame / fadeInFrames);
	} else if (m_bos) {
		__gain = AudioVolume::convert(gain);
	}

	return AudioVolume::convert(gain);
}

float SamplePlayer::envelope(BYTE* buffer, int length, float coef0, float coef1)
{
	if (length <= 0) { return coef1; }

	float diff = coef1 - coef0;
	if ((diff == 0.0f) && (coef0 <= 0.0f)) {
		memset(buffer, 0, length);
		return 0.0f;
	}

	int frames = length / m_wfe.nBlockAlign;
	int blocks = m_wfe.nBlockAlign / m_wfe.nChannels;
	float step = diff / frames;

	BYTE* p = (BYTE*)buffer;
#if 0
	switch (m_wfe.wBitsPerSample) {
		case 32:
			while (frames-- > 0) {
				for (int ch = 0; ch < m_wfe.nChannels; ch++, p += blocks) {
					INT32* data = (INT32*)p;
					*data = (INT32)((float)(*data) * coef0);
				}
				coef0 += step;
			}
			break;
		case 24:
			while (frames-- > 0) {
				for (int ch = 0; ch < m_wfe.nChannels; ch++, p += blocks) {
					INT32 data = (INT32)((*p << 8) | (*(p + 1) << 16) | (*(p + 2) << 24));
					data = (INT32)((float)(data) * coef0);
					*(p + 0) = (BYTE)(data >>  8);
					*(p + 1) = (BYTE)(data >> 16);
					*(p + 2) = (BYTE)(data >> 24);
				}
				coef0 += step;
			}
			break;
		case 16:
#endif
			while (frames-- > 0) {
				for (int ch = 0; ch < m_wfe.nChannels; ch++, p += blocks) {
					INT16* data = (INT16*)p;
					*data = (INT16)((float)(*data) * coef0);
					m_power.set(ch, (float)*data);
				}
				coef0 += step;
			}
#if 0
			break;
		case 8:
			while (frames-- > 0) {
				for (int ch = 0; ch < m_wfe.nChannels; ch++, p += blocks) {
					INT16 data = (INT16)*p; data -= 0x80;
					data = (INT16)((float)(data) * coef0);
					*p = (BYTE)(data + 0x80);
				}
				coef0 += step;
			}
			break;
	}
#endif

	return coef1;
}

std::vector<float> SamplePlayer::peakPowerForChannels() const
{
	std::vector<float> vec;
	for (int ch = 0; ch < m_power.channels(); ch++) {
		float peakPower = -120.0;
		float x = m_power.get(ch) / 32768.0f;
		if (x != 0) {
			peakPower = (float)(20 * log10(x));
			if (peakPower < -120.0)
				peakPower = -120.0;
		}
		vec.push_back(peakPower);
	}
	return vec;
}

#ifdef OLD_MME_SAMPLER
void SamplePlayer::run()
{
	MSG msg;
	while (GetMessage(&msg, NULL, 0, 0)) {
		switch (msg.message) {
		case MM_WOM_CLOSE:
			break;
		case MM_WOM_DONE:
			if (msg.lParam) {
				WAVEHDR* pwh = (WAVEHDR*)msg.lParam;
				if (pwh->dwFlags & WHDR_PREPARED) {
					::waveOutUnprepareHeader(m_wout, pwh, sizeof(WAVEHDR));
					int n = process((BYTE *)pwh->lpData, pwh->dwBufferLength);
					int frames = n / m_wfe.nBlockAlign;
					m_currentFrame += frames;
					__gain = envelope((BYTE *)pwh->lpData, n, __gain, fader());
					memset(pwh->lpData + n, 0, pwh->dwBufferLength - n);
					::waveOutPrepareHeader(m_wout, pwh, sizeof(WAVEHDR));
					::waveOutWrite(m_wout, pwh, sizeof(WAVEHDR));
					m_currentTime += ((m_rate * frames) / m_wfe.nSamplesPerSec);
					m_power.update(pwh->dwBufferLength / m_wfe.nBlockAlign);
				}
			}
			break;
		}
	}

	stopped();

	if (m_wout) {
		::waveOutReset(m_wout);
		for (int i = 0; i < WOUT_BUF_NUM; i++) {
			if (m_whdr[i].dwFlags & WHDR_PREPARED) {
				::waveOutUnprepareHeader(m_wout, &m_whdr[i], sizeof(WAVEHDR));
			}
		}
		do {
			::waveOutReset(m_wout);
		} while (::waveOutClose(m_wout) == WAVERR_STILLPLAYING);
		m_wout = NULL;
	}

	for (int i = 0; i < WOUT_BUF_NUM; i++) {
		delete [] mp_wavbuf[i];
		mp_wavbuf[i] = 0;
	}

	m_power.clear();
}

bool SamplePlayer::startOutput()
{
	closeOutput();

	m_thread = ::CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)_thread, (void*)this, 0, &m_tid);
	if (!m_thread) return false;
	::SetThreadPriority(m_thread, THREAD_PRIORITY_TIME_CRITICAL);

	UINT id = AudioDevice::mmioID(AudioDevice::OUTPUT, mp_deviceId);
	MMRESULT result = ::waveOutOpen(&m_wout, id, &m_wfe, (DWORD_PTR)m_tid, NULL, CALLBACK_THREAD);
	if (result != MMSYSERR_NOERROR) {
		closeOutput(); return false;
	}

	m_trigger = false;
	m_power.config((float)m_wfe.nSamplesPerSec);

	const int frames = (m_wfe.nSamplesPerSec * WOUT_RENDER_PERIOD) / 1000;
	const int bufSize = m_wfe.nBlockAlign * frames;
	memset(m_whdr, 0, sizeof(m_whdr));
	for (int i = 0; i < WOUT_BUF_NUM; i++) {
		mp_wavbuf[i] = new BYTE [bufSize];
		memset(mp_wavbuf[i], 0, bufSize);
		m_whdr[i].lpData = (LPSTR)mp_wavbuf[i];
		m_whdr[i].dwBufferLength = bufSize;
		::waveOutPrepareHeader(m_wout, &m_whdr[i], sizeof(WAVEHDR));
		::waveOutWrite(m_wout, &m_whdr[i], sizeof(WAVEHDR));
	}

	return true;
}
#else
void SamplePlayer::run()
{
	HANDLE mmcss = NULL;
	HRESULT hr;

	if (m_runloop) {
		hr = mp_client->GetService(__uuidof(IAudioRenderClient), (void**)&mp_render);
		if (!SUCCEEDED(hr)) {
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
		int dwBufferLength = availableFrames * m_wfe.nBlockAlign;
		int n = process(lpData, dwBufferLength);
		int frames = n / m_wfe.nBlockAlign;
		m_currentFrame += frames;
		__gain = envelope(lpData, n, __gain, fader());
		memset(lpData + n, 0, dwBufferLength - n);
		hr = mp_render->ReleaseBuffer(availableFrames, 0);
		if (!SUCCEEDED(hr)) break;
		m_currentTime += ((m_rate * frames) / m_wfe.nSamplesPerSec);
		m_power.update(availableFrames);
	}

	mp_client->Stop();

	if (mp_render) {
		mp_render->Release();
		mp_render = 0;
		if (mmcss) {
			::AvRevertMmThreadCharacteristics(mmcss);
		}
	}

	stopped();

	releaseOutput();

	m_power.clear();
}

void SamplePlayer::releaseOutput()
{
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

bool SamplePlayer::startOutput()
{
	closeOutput();

	m_thread = ::CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)_thread, (void*)this, CREATE_SUSPENDED, &m_tid);
	if (!m_thread) return false;

	HRESULT hr = S_OK;

	if (SUCCEEDED(hr)) {
		hr = ::CoCreateInstance(
			__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
			__uuidof(IMMDeviceEnumerator), (LPVOID*)&mp_enumerator);
	}
	if (SUCCEEDED(hr)) {
		if (mp_deviceId) {
			hr = mp_enumerator->GetDevice(mp_deviceId, &mp_device);
		}
		else {
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
			memset(&m_wfe, 0, sizeof(m_wfe));
			m_wfe.wFormatTag = WAVE_FORMAT_PCM;
			m_wfe.nSamplesPerSec = _pwfe->nSamplesPerSec;
			m_wfe.nChannels = _pwfe->nChannels;
			m_wfe.wBitsPerSample = 16; /* fixed */
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
		m_trigger = false;
		m_power.config((float)m_wfe.nSamplesPerSec);
		m_runloop = true;
		::ResumeThread(m_thread);
	} else {
		releaseOutput();
		::CloseHandle(m_thread);
		m_thread = NULL;
	}

	return SUCCEEDED(hr);
}
#endif

void SamplePlayer::closeOutput()
{
	if (m_thread) {
#ifdef OLD_MME_SAMPLER
		::PostThreadMessage(m_tid, WM_QUIT, 0, 0);
#else
		m_runloop = false;
		::SetEvent(m_event);
#endif
		if (::GetCurrentThreadId() != m_tid) {
			::WaitForSingleObject(m_thread, INFINITE);
			::CloseHandle(m_thread);
			m_thread = NULL;
		}
	}
}

void SamplePlayer::device(LPCTSTR deviceId)
{
	delete[] mp_deviceId;
	if (deviceId && *deviceId) {
		mp_deviceId = new TCHAR[MAX_DEVICE_UID_LENGTH];
		_tcscpy_s(mp_deviceId, MAX_DEVICE_UID_LENGTH, deviceId);
	} else {
		mp_deviceId = 0;
	}
	if (mp_reader) {
#ifdef OLD_MME_SAMPLER
		if (!startOutput() && mp_deviceId) {
			delete [] mp_deviceId;
			mp_deviceId = 0;
			startOutput();
		}
#else
		open(CString(mp_file));
#endif
	}
}

void SamplePlayer::audioObjectDefaultChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDeviceId)
{
#ifndef OLD_MME_SAMPLER
	if ((flow == EDataFlow::eRender) && (role == ERole::eMultimedia)) {
		if (!mp_deviceId) {
			Thread::runOnMainThread([this]() { device(0); });
		}
	}
#endif
}

void SamplePlayer::audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState)
{
	if (mp_deviceId && (CString(mp_deviceId) == CString(pwstrDeviceId))) {
		if (dwNewState == DEVICE_STATE_NOTPRESENT) {
			Thread::runOnMainThread([this]() { device(0); });
		}
	}
}
