//
//  NativeCall+player.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"player";

enum {
	dispid_player_device,
	dispid_player_open,
	dispid_player_play,
	dispid_player_pause,
	dispid_player_stop,
	dispid_player_locate,
	dispid_player_volume,
	dispid_player_speed,
	dispid_player_pitch,
	dispid_player_file,
	dispid_player_status,
	dispid_player_channels,
	dispid_player_peakpower,
	dispid_player_time,
	dispid_player_totaltime,
	dispid_player_output,
};

NativeCall_player::NativeCall_player(NativeObjects* objs) : NativeCall(objs)
{
	set(L"device",    dispid_player_device);
	set(L"open",      dispid_player_open);
	set(L"play",      dispid_player_play);
	set(L"pause",     dispid_player_pause);
	set(L"stop",      dispid_player_stop);
	set(L"locate",    dispid_player_locate);
	set(L"volume",    dispid_player_volume);
	set(L"speed",     dispid_player_speed);
	set(L"pitch",     dispid_player_pitch);
	set(L"file",      dispid_player_file);
	set(L"status",    dispid_player_status);
	set(L"channels",  dispid_player_channels);
	set(L"peakpower", dispid_player_peakpower);
	set(L"time",      dispid_player_time);
	set(L"totaltime", dispid_player_totaltime);
	set(L"output",    dispid_player_output);
}

LPCWSTR NativeCall_player::InterfaceName() const { return OBJ_NAME; }

void NativeCall_player::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	AudioPlayer* player = mp_objs->player;

	switch (dispid) {

		case dispid_player_device:
		{
			if (args.size() > 0) {
				player->device(CString(args[0]->GetStringValue().c_str()));
			}
			ret = player->device();
			break;
		}
		case dispid_player_open:
		{
			ret = player->open(CString(args[0]->GetStringValue().c_str()));
			break;
		}
		case dispid_player_play:
		{
			player->play();
			break;
		}
		case dispid_player_pause:
		{
			player->pause();
			break;
		}
		case dispid_player_stop:
		{
			player->stop();
			break;
		}
		case dispid_player_locate:
		{
			player->locate((float)args[0]->GetDoubleValue());
			break;
		}
		case dispid_player_volume:
		{
			if (args.size() > 0) {
				player->volume((float)args[0]->GetDoubleValue());
			}
			ret = player->volume();
			break;
		}
		case dispid_player_speed:
		{
			if (args.size() > 0) {
				player->speed((float)args[0]->GetDoubleValue());
			}
			ret = player->speed();
			break;
		}
		case dispid_player_pitch:
		{
			if (args.size() > 0) {
				player->pitch((float)args[0]->GetDoubleValue());
			}
			ret = player->pitch();
			break;
		}
		case dispid_player_file:
		{
			ret = (player->file() ? CStringW(player->file()) : L"");
			break;
		}
		case dispid_player_status:
		{
			ret = player->status();
			break;
		}
		case dispid_player_channels:
		{
			ret = player->numberOfChannels();
			break;
		}
		case dispid_player_peakpower:
		{
			ret = player->peakPowerForChannel(args[0]->GetIntValue());
			break;
		}
		case dispid_player_time:
		{
			ret = player->currentTime();
			break;
		}
		case dispid_player_totaltime:
		{
			ret = player->totalTime();
			break;
		}
		case dispid_player_output:
		{
			if (args[0]->GetBoolValue()) {
				player->output(mp_objs->rwc->outputStream());
			} else {
				player->output(mp_objs->output);
			}
			break;
		}

	}
}

void _AudioPlayerDelegate::audioPlayerDidEndSong(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"eof", CStringW(file));
	mp_intf->postEvent(ev);
}

void _AudioPlayerDelegate::audioPlayerDidFinishPlaying(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"stop", CStringW(file));
	mp_intf->postEvent(ev);
}

void _AudioPlayerDelegate::audioPlayerErrorDidOccur(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"error", CStringW(file));
	mp_intf->postEvent(ev);
}
