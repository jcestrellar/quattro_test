//
//  NativeCall+recorder.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"recorder";

enum {
	dispid_recorder_device,
	dispid_recorder_create,
	dispid_recorder_record,
	dispid_recorder_pause,
	dispid_recorder_stop,
	dispid_recorder_volume,
	dispid_recorder_file,
	dispid_recorder_status,
	dispid_recorder_channels,
	dispid_recorder_peakpower,
	dispid_recorder_time,
	dispid_recorder_input,
};

NativeCall_recorder::NativeCall_recorder(NativeObjects* objs) : NativeCall(objs)
{
	set(L"device",    dispid_recorder_device);
	set(L"create",    dispid_recorder_create);
	set(L"record",    dispid_recorder_record);
	set(L"pause",     dispid_recorder_pause);
	set(L"stop",      dispid_recorder_stop);
	set(L"volume",    dispid_recorder_volume);
	set(L"file",      dispid_recorder_file);
	set(L"status",    dispid_recorder_status);
	set(L"channels",  dispid_recorder_channels);
	set(L"peakpower", dispid_recorder_peakpower);
	set(L"time",      dispid_recorder_time);
	set(L"input",     dispid_recorder_input);
}

LPCWSTR NativeCall_recorder::InterfaceName() const { return OBJ_NAME; }

void NativeCall_recorder::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	AudioRecorder* recorder = mp_objs->recorder;

	switch (dispid) {

		case dispid_recorder_device:
		{
			if (args.size() > 0) {
				recorder->device(CString(args[0]->GetStringValue().c_str()));
			}
			ret = recorder->device();
			break;
		}
		case dispid_recorder_create:
		{
			ret = recorder->create(CString(args[0]->GetStringValue().c_str()), (RecordingFormat)args[1]->GetIntValue());
			break;
		}
		case dispid_recorder_record:
		{
			recorder->record();
			break;
		}
		case dispid_recorder_pause:
		{
			recorder->pause();
			break;
		}
		case dispid_recorder_stop:
		{
			recorder->stop(false);
			break;
		}
		case dispid_recorder_volume:
		{
			if (args.size() > 0) {
				recorder->volume((float)args[0]->GetDoubleValue());
			}
			ret = recorder->volume();
			break;
		}
		case dispid_recorder_file:
		{
			ret = (recorder->file() ? CStringW(recorder->file()) : L"");
			break;
		}
		case dispid_recorder_status:
		{
			ret = recorder->status();
			break;
		}
		case dispid_recorder_channels:
		{
			ret = recorder->numberOfChannels();
			break;
		}
		case dispid_recorder_peakpower:
		{
			ret = recorder->peakPowerForChannel(args[0]->GetIntValue());
			break;
		}
		case dispid_recorder_time:
		{
			ret = recorder->currentTime();
			break;
		}
		case dispid_recorder_input:
		{
			if (args[0]->GetBoolValue()) {
				recorder->input(mp_objs->rwc->inputStream());
			} else {
				recorder->input(mp_objs->input);
			}
			break;
		}

	}
}

void _AudioRecorderDelegate::audioRecorderDidFinishRecording(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"stop", CStringW(file));
	mp_intf->postEvent(ev);
}

void _AudioRecorderDelegate::audioRecorderErrorDidOccur(LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"error", CStringW(file));
	mp_intf->postEvent(ev);
}
