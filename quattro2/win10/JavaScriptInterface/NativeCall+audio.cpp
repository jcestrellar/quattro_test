//
//  NativeCall+audio.cpp
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"audio";

static LPCWSTR AudioConverterOutputFileKey = L"file";
static LPCWSTR AudioConverterFormatKey     = L"format";
static LPCWSTR AudioConverterChannelsKey   = L"channels";
static LPCWSTR AudioConverterSampleRateKey = L"samplerate";
static LPCWSTR AudioConverterBitDepthKey   = L"bitdepth";
static LPCWSTR AudioConverterBitRateKey    = L"bitrate";
static LPCWSTR AudioConverterDurationKey   = L"duration";

class AudioConvertThread : public Thread {
  private:
	JavaScriptInterface* intf;
	CStringW in;
	CStringW out;
	WAVEFORMATEX wfe;
  public:
	AudioConvertThread(JavaScriptInterface* _intf, LPCWSTR _in, LPCWSTR _out, LPWAVEFORMATEX pwfe)
		: intf(_intf), in(_in), out(_out), wfe(*pwfe) {}
	void run() {
		CStringW ev;
		if (wfe.wFormatTag && AudioConverter::convert(in, out, &wfe)) {
			picojson::array a;
			a.push_back((picojson::value)std::wstring(out));
			picojson::value v = picojson::value(a);
			ev.Format(L"%s\f%s\f%s\f%s", OBJ_NAME, L"converted", in, v.serialize().c_str());
		} else {
			ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"convertfailed", in);
		}
		intf->postEvent(ev);
	}
};

class AudioSplitThread : public Thread {
  private:
	JavaScriptInterface* intf;
	CStringW file;
	CStringW wavs;
  public:
	AudioSplitThread(JavaScriptInterface* _intf, LPCWSTR _file, LPCWSTR _wavs)
		: intf(_intf), file(_file), wavs(_wavs) {}
	void run() {
		std::vector<CString> outs;
		picojson::value v;
		picojson::parse(v, LPCWSTR(wavs));
		picojson::array& a = v.get<picojson::array>();
		for (picojson::array::iterator it = a.begin(); it != a.end(); it++) {
			std::wstring wav = it->get<std::wstring>();
			outs.push_back(CString(wav.c_str()));
		}
		CStringW ev;
		if (AudioConverter::split(file, outs)) {
			ev.Format(L"%s\f%s\f%s\f%s", OBJ_NAME, L"converted", file, wavs);
		} else {
			ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"convertfailed", file);
		}
		intf->postEvent(ev);
	}
};

class AudioReverseThread : public Thread {
  private:
	JavaScriptInterface* intf;
	CStringW file;
	CStringW wav;
  public:
	AudioReverseThread(JavaScriptInterface* _intf, LPCWSTR _file, LPCWSTR _wav)
		: intf(_intf), file(_file), wav(_wav) {}
	void run() {
		CStringW ev;
		if (AudioConverter::reverse(file, wav)) {
			picojson::array a;
			a.push_back((picojson::value)std::wstring(wav));
			picojson::value v = picojson::value(a);
			ev.Format(L"%s\f%s\f%s\f%s", OBJ_NAME, L"converted", file, v.serialize().c_str());
		} else {
			ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"convertfailed", file);
		}
		intf->postEvent(ev);
	}
};

enum {
	dispid_audio_inputs,
	dispid_audio_outputs,
	dispid_audio_format,
	dispid_audio_convert,
	dispid_audio_split,
	dispid_audio_reverse,
};

NativeCall_audio::NativeCall_audio(NativeObjects* objs) : NativeCall(objs)
{
	set(L"inputs",   dispid_audio_inputs);
	set(L"outputs",  dispid_audio_outputs);
	set(L"format",   dispid_audio_format);
	set(L"convert",  dispid_audio_convert);
	set(L"split",    dispid_audio_split);
	set(L"reverse",  dispid_audio_reverse);
}

LPCWSTR NativeCall_audio::InterfaceName() const { return OBJ_NAME; }

void NativeCall_audio::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_audio_inputs:
		{
			ret = JSON::stringify(mp_objs->audio->devices(AudioDevice::INPUT));
			break;
		}

		case dispid_audio_outputs:
		{
			ret = JSON::stringify(mp_objs->audio->devices(AudioDevice::OUTPUT));
			break;
		}

		case dispid_audio_format:
		{
			CString in(args[0]->GetStringValue().c_str());

			CStringW format;
			WAVEFORMATEX wfe;
			float duration;
			if (!AudioConverter::format(in, &wfe, &duration)) {
				format = L"error";
				memset(&wfe, 0, sizeof(WAVEFORMATEX));
				duration = 0;
			} else {
				switch (wfe.wFormatTag) {
					case WAVE_FORMAT_IEEE_FLOAT:
						wfe.wBitsPerSample = 0;
					case WAVE_FORMAT_PCM:
						format = L"PCM";
						break;
					case WAVE_FORMAT_MPEG_HEAAC:
						format = L"AAC";
						break;
					case WAVE_FORMAT_MPEGLAYER3:
						format = L"MP3";
						break;
					default:
						format.Format(L"0x%04X", wfe.wFormatTag);
						break;
				}
			}
			picojson::object o;
			o[AudioConverterFormatKey]     = (picojson::value)std::wstring(format);
			o[AudioConverterChannelsKey]   = (picojson::value)double(wfe.nChannels);
			o[AudioConverterSampleRateKey] = (picojson::value)double(wfe.nSamplesPerSec);
			o[AudioConverterBitDepthKey]   = (picojson::value)double(wfe.wBitsPerSample);
			o[AudioConverterBitRateKey]    = (picojson::value)double(wfe.nAvgBytesPerSec * 8);
			o[AudioConverterDurationKey]   = (picojson::value)double(duration);
			picojson::value v = picojson::value(o);
			ret = v.serialize().c_str();
			break;
		}

		case dispid_audio_convert:
		{
			CStringW in(args[0]->GetStringValue().c_str());
			picojson::value v;
			picojson::parse(v, LPCWSTR(args[1]->GetStringValue().c_str()));
			picojson::object& o = v.get<picojson::object>();

			CStringW out = (o[AudioConverterOutputFileKey].get<std::wstring>()).c_str();
			CStringW format = (o[AudioConverterFormatKey].get<std::wstring>()).c_str();

			WAVEFORMATEX wfe;
			memset(&wfe, 0, sizeof(WAVEFORMATEX));
			wfe.nChannels = WORD (o[AudioConverterChannelsKey].get<double>());
			wfe.nSamplesPerSec = DWORD(o[AudioConverterSampleRateKey].get<double>());
			wfe.wBitsPerSample = WORD(o[AudioConverterBitDepthKey].get<double>());
			wfe.nAvgBytesPerSec = DWORD(o[AudioConverterBitRateKey].get<double>()) / 8;
			if (format == L"wav") {
				if (wfe.wBitsPerSample == 0) {
					wfe.wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
					wfe.wBitsPerSample = sizeof(float) * 8;
				} else {
					wfe.wFormatTag = WAVE_FORMAT_PCM;
					wfe.wBitsPerSample = WORD(o[AudioConverterBitDepthKey].get<double>());
				}
				wfe.nBlockAlign = (wfe.wBitsPerSample / 8) * wfe.nChannels;
				wfe.nAvgBytesPerSec = wfe.nBlockAlign * wfe.nSamplesPerSec;
			} else if (format == L"m4a") {
				wfe.wFormatTag = WAVE_FORMAT_MPEG_HEAAC;
			} else if (format == L"mp3") {
				wfe.wFormatTag = WAVE_FORMAT_MPEGLAYER3;
			}

			Thread* thread = new AudioConvertThread(mp_objs->mp_intf, in, out, &wfe);
			mp_objs->converting.push_back(thread);
			thread->_threadStart();
			break;
		}

		case dispid_audio_split:
		{
			CStringW file(args[0]->GetStringValue().c_str());
			CStringW wavs(args[1]->GetStringValue().c_str());
			Thread* thread = new AudioSplitThread(mp_objs->mp_intf, file, wavs);
			mp_objs->converting.push_back(thread);
			thread->_threadStart();
			break;
		}

		case dispid_audio_reverse:
		{
			CStringW file(args[0]->GetStringValue().c_str());
			CStringW wav(args[1]->GetStringValue().c_str());
			Thread* thread = new AudioReverseThread(mp_objs->mp_intf, file, wav);
			mp_objs->converting.push_back(thread);
			thread->_threadStart();
			break;
		}

	}
}

void _AudioDeviceDelegate::audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState)
{
	CStringW ev;
	ev.Format(L"%s\f%s", OBJ_NAME, L"changed");
	mp_intf->postEvent(ev);
}
