//
//  NativeCall+sampler.cpp
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"sampler";

enum {
	dispid_sampler_create,
	dispid_sampler_device,
	dispid_sampler_open,
	dispid_sampler_close,
	dispid_sampler_start,
	dispid_sampler_play,
	dispid_sampler_pause,
	dispid_sampler_stop,
	dispid_sampler_locate,
	dispid_sampler_begin,
	dispid_sampler_end,
	dispid_sampler_volume,
	dispid_sampler_repeat,
	dispid_sampler_speed,
	dispid_sampler_pitch,
	dispid_sampler_fadein,
	dispid_sampler_fadeout,
	dispid_sampler_control,
	dispid_sampler_file,
	dispid_sampler_totaltime,
	dispid_sampler_status,
};

NativeCall_sampler::NativeCall_sampler(NativeObjects* objs) : NativeCall(objs)
{
	set(L"create",    dispid_sampler_create);
	set(L"device",    dispid_sampler_device);
	set(L"open",      dispid_sampler_open);
	set(L"close",     dispid_sampler_close);
	set(L"start",     dispid_sampler_start);
	set(L"play",      dispid_sampler_play);
	set(L"pause",     dispid_sampler_pause);
	set(L"stop",      dispid_sampler_stop);
	set(L"locate",    dispid_sampler_locate);
	set(L"begin",     dispid_sampler_begin);
	set(L"end",       dispid_sampler_end);
	set(L"volume",    dispid_sampler_volume);
	set(L"repeat",    dispid_sampler_repeat);
	set(L"speed",     dispid_sampler_speed);
	set(L"pitch",     dispid_sampler_pitch);
	set(L"fadein",    dispid_sampler_fadein);
	set(L"fadeout",   dispid_sampler_fadeout);
	set(L"control",   dispid_sampler_control);
	set(L"file",      dispid_sampler_file);
	set(L"totaltime", dispid_sampler_totaltime);
	set(L"status",    dispid_sampler_status);
}

LPCWSTR NativeCall_sampler::InterfaceName() const { return OBJ_NAME; }

void NativeCall_sampler::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_sampler_create:
		{
			if (mp_objs->sampler.size()) break;
			int count = args[0]->GetIntValue();
			for (int i = 0; i < count; i++) {
				ExtSamplePlayer* player = new ExtSamplePlayer();
				_SamplePlayerDelegate* delegate = new _SamplePlayerDelegate(mp_objs->mp_intf, i);
				player->delegate(delegate);
				mp_objs->sampler.push_back(player);
			}
			break;
		}
		case dispid_sampler_device:
		{
			if (mp_objs->sampler.size() == 0) { ret = L""; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->device(CString(args[1]->GetStringValue().c_str()));
			}
			ret = player->device();
			break;
		}
		case dispid_sampler_open:
		{
			if (mp_objs->sampler.size() == 0) { ret = false; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			ret = player->open(CString(args[1]->GetStringValue().c_str()));
			break;
		}
		case dispid_sampler_close:
		{
			if (mp_objs->sampler.size() == 0) { break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			player->close();
			break;
		}
		case dispid_sampler_play:
		{
			if (mp_objs->sampler.size() == 0) { break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			player->play();
			break;
		}
		case dispid_sampler_pause:
		{
			if (mp_objs->sampler.size() == 0) { break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			player->pause();
			break;
		}
		case dispid_sampler_stop:
		{
			if (mp_objs->sampler.size() == 0) { break; }
			if (args.size() > 0) {
				ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
				player->stop((args.size() > 1) ? args[1]->GetBoolValue() : false);
			} else {
				for (std::vector<ExtSamplePlayer*>::iterator iter = mp_objs->sampler.begin();
						iter != mp_objs->sampler.end(); iter++) {
					ExtSamplePlayer* player = *iter;
					player->stop(true);
				}
			}
			break;
		}
		case dispid_sampler_locate:
		{
			if (mp_objs->sampler.size() == 0) { break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			player->locate((float)args[1]->GetDoubleValue());
			break;
		}
		case dispid_sampler_begin:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->begin((float)args[1]->GetDoubleValue());
			}
			ret = player->begin();
			break;
		}
		case dispid_sampler_end:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->end((float)args[1]->GetDoubleValue());
			}
			ret = player->end();
			break;
		}
		case dispid_sampler_volume:
		{
			if (mp_objs->sampler.size() == 0) { ret = 1.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->volume((float)args[1]->GetDoubleValue());
			}
			ret = player->volume();
			break;
		}
		case dispid_sampler_repeat:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->repeat(args[1]->GetIntValue());
			}
			ret = player->repeat();
			break;
		}
		case dispid_sampler_speed:
		{
			if (mp_objs->sampler.size() == 0) { ret = 1.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->speed((float)args[1]->GetDoubleValue());
			}
			ret = player->speed();
			break;
		}
		case dispid_sampler_pitch:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->pitch((float)args[1]->GetDoubleValue());
			}
			ret = player->pitch();
			break;
		}
		case dispid_sampler_fadein:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->fadeIn((float)args[1]->GetDoubleValue());
			}
			ret = player->fadeIn();
			break;
		}
		case dispid_sampler_fadeout:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				player->fadeOut((float)args[1]->GetDoubleValue());
			}
			ret = player->fadeOut();
			break;
		}
		case dispid_sampler_control:
		{
			if (mp_objs->sampler.size() == 0) { ret = L""; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			ret = player->control(args[1]->GetStringValue().c_str());
			break;
		}
		case dispid_sampler_file:
		{
			if (mp_objs->sampler.size() == 0) { ret = L""; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			ret = (player->file() ? CStringW(player->file()) : L"");
			break;
		}
		case dispid_sampler_totaltime:
		{
			if (mp_objs->sampler.size() == 0) { ret = 0.0f; break; }
			ExtSamplePlayer* player = mp_objs->sampler.at(args[0]->GetIntValue());
			ret = player->totalTime();
			break;
		}
		case dispid_sampler_status:
		{
			if (mp_objs->sampler.size() == 0) { ret = L""; break; }
			picojson::array a;
			for (std::vector<ExtSamplePlayer*>::iterator iter = mp_objs->sampler.begin();
					iter != mp_objs->sampler.end(); iter++) {
				ExtSamplePlayer* player = *iter;
				picojson::object o;
				o[L"time"] = (picojson::value)double(player->currentTime());
				o[L"state"] = (picojson::value)double(player->state());
				picojson::array peakpower;
				std::vector<float> vec = player->peakPowerForChannels();
				for (size_t ch = 0; ch < vec.size(); ch++) {
					peakpower.push_back((picojson::value)double(vec[ch]));
				}
				o[L"peakpower"] = picojson::value(peakpower);
				a.push_back(picojson::value(o));
			}
			picojson::value v = picojson::value(a);
			ret = v.serialize().c_str();
			break;
		}

	}
}

void _SamplePlayerDelegate::samplePlayerDidEndSong(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%d\f%s", OBJ_NAME, L"eof", m_id, CStringW(file));
	mp_intf->postEvent(ev);
}
