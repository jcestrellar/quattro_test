//
//  NativeCall+midi.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"midi";

enum {
	dispid_midi_in_endpoints,
	dispid_midi_in_connect,
	dispid_midi_in_disconnect,
	dispid_midi_out_endpoints,
	dispid_midi_out_connect,
	dispid_midi_out_disconnect,
	dispid_midi_send,
	dispid_midi_panel,
};

NativeCall_midi::NativeCall_midi(NativeObjects* objs) : NativeCall(objs)
{
	set(L"inendpoints",   dispid_midi_in_endpoints);
	set(L"inconnect",     dispid_midi_in_connect);
	set(L"indisconnect",  dispid_midi_in_disconnect);
	set(L"outendpoints",  dispid_midi_out_endpoints);
	set(L"outconnect",    dispid_midi_out_connect);
	set(L"outdisconnect", dispid_midi_out_disconnect);
	set(L"send",          dispid_midi_send);
	set(L"panel",         dispid_midi_panel);
}

LPCWSTR NativeCall_midi::InterfaceName() const { return OBJ_NAME; }

void NativeCall_midi::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	MIDIClient* midi = mp_objs->midi;

	switch (dispid) {

		case dispid_midi_in_endpoints:
		{
			ret = JSON::stringify(midi->inputPort()->endpoints());
			break;
		}
		case dispid_midi_in_connect:
		{
			if (args.size() > 0) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[0]->GetStringValue().c_str());
				midi->inputPort()->connectEndpoint(&ep);
			} else {
				midi->inputPort()->connectAllEndpoints();
			}
			break;
		}
		case dispid_midi_in_disconnect:
		{
			if (args.size() > 0) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[0]->GetStringValue().c_str());
				midi->inputPort()->disconnectEndpoint(&ep);
			} else {
				midi->inputPort()->disconnectAllEndpoints();
			}
			break;
		}
		case dispid_midi_out_endpoints:
		{
			ret = JSON::stringify(midi->outputPort()->endpoints());
			break;
		}
		case dispid_midi_out_connect:
		{
			if (args.size() > 0) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[0]->GetStringValue().c_str());
				midi->outputPort()->connectEndpoint(&ep);
			} else {
				midi->outputPort()->connectAllEndpoints();
			}
			break;
		}
		case dispid_midi_out_disconnect:
		{
			if (args.size() > 0) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[0]->GetStringValue().c_str());
				midi->outputPort()->disconnectEndpoint(&ep);
			} else {
				midi->outputPort()->disconnectAllEndpoints();
			}
			break;
		}
		case dispid_midi_send:
		{
			std::string data = HEX::data(args[0]->GetStringValue().c_str());
			midi->outputPort()->send((BYTE*)data.c_str(), (int)data.length());
			break;
		}
		case dispid_midi_panel:
		{
			::ShellExecute(NULL, NULL, TEXT("ms-settings:bluetooth"), NULL, NULL, SW_SHOWNORMAL);
			break;
		}

	}
}

void _MIDIClientDelegate::midiInputPortConnectFailed(const MIDI_ENDPOINT_INFO* endpoint)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"connectfailed", JSON::stringify(endpoint));
	mp_intf->postEvent(ev);
}

void _MIDIClientDelegate::midiOutputPortConnectFailed(const MIDI_ENDPOINT_INFO* endpoint)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"connectfailed", JSON::stringify(endpoint));
	mp_intf->postEvent(ev);
}

void _MIDIClientDelegate::midiObjectAddedRemoved()
{
	CStringW ev;
	ev.Format(L"%s\f%s", OBJ_NAME, L"changed");
	mp_intf->postEvent(ev);
}

void _MIDIClientDelegate::midiErrorDidOccur(MMRESULT error)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%ld", OBJ_NAME, L"error", error);
	mp_intf->postEvent(ev);
}

void _MIDIClientDelegate::midiInputMessage(const BYTE* msg, int bytes, DWORD msec)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s\f%u", OBJ_NAME, L"message", HEX::text(msg, bytes), msec);
	mp_intf->postEvent(ev);
}
