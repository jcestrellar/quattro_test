//
//  NativeCall+midix.cpp
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"midix";

enum {
	dispid_midix_client,
	dispid_midix_in_endpoints,
	dispid_midix_in_connect,
	dispid_midix_in_disconnect,
	dispid_midix_out_endpoints,
	dispid_midix_out_connect,
	dispid_midix_out_disconnect,
	dispid_midix_send,
	dispid_midix_thru,
	dispid_midix_panel,
};

NativeCall_midix::NativeCall_midix(NativeObjects* objs) : NativeCall(objs)
{
	set(L"client",        dispid_midix_client);
	set(L"inendpoints",   dispid_midix_in_endpoints);
	set(L"inconnect",     dispid_midix_in_connect);
	set(L"indisconnect",  dispid_midix_in_disconnect);
	set(L"outendpoints",  dispid_midix_out_endpoints);
	set(L"outconnect",    dispid_midix_out_connect);
	set(L"outdisconnect", dispid_midix_out_disconnect);
	set(L"send",          dispid_midix_send);
	set(L"thru",          dispid_midix_thru);
	set(L"panel",         dispid_midix_panel);
}

LPCWSTR NativeCall_midix::InterfaceName() const { return OBJ_NAME; }

void NativeCall_midix::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_midix_client:
		{
			if (mp_objs->clients.size()) break;
			int count = args[0]->GetIntValue();
			for (int i = 0; i < count; i++) {
				MIDIClient* client = new MIDIClient();
				_MIDIXClientDelegate* delegate = new _MIDIXClientDelegate(mp_objs->mp_intf, client, i);
				client->delegate(delegate);
				client->inputPort()->delegate(delegate);
				mp_objs->clients.push_back(client);
			}
			break;
		}
		case dispid_midix_in_endpoints:
		{
			ret = JSON::stringify(mp_objs->midi->inputPort()->endpoints());
			break;
		}
		case dispid_midix_in_connect:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[1]->GetStringValue().c_str());
				client->inputPort()->connectEndpoint(&ep);
			} else {
				client->inputPort()->connectAllEndpoints();
			}
			break;
		}
		case dispid_midix_in_disconnect:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[1]->GetStringValue().c_str());
				client->inputPort()->disconnectEndpoint(&ep);
			} else {
				client->inputPort()->disconnectAllEndpoints();
			}
			break;
		}
		case dispid_midix_out_endpoints:
		{
			ret = JSON::stringify(mp_objs->midi->outputPort()->endpoints());
			break;
		}
		case dispid_midix_out_connect:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[1]->GetStringValue().c_str());
				client->outputPort()->connectEndpoint(&ep);
			} else {
				client->outputPort()->connectAllEndpoints();
			}
			break;
		}
		case dispid_midix_out_disconnect:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			if (args.size() > 1) {
				MIDI_ENDPOINT_INFO ep = JSON::endpoint(args[1]->GetStringValue().c_str());
				client->outputPort()->disconnectEndpoint(&ep);
			} else {
				client->outputPort()->disconnectAllEndpoints();
			}
			break;
		}
		case dispid_midix_send:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			std::string data = HEX::data(args[1]->GetStringValue().c_str());
			client->outputPort()->send((BYTE*)data.c_str(), (int)data.length());
			break;
		}
		case dispid_midix_thru:
		{
			MIDIClient* client = mp_objs->clients.at(args[0]->GetIntValue());
			((_MIDIXClientDelegate*)client->delegate())->thru(args[1]->GetBoolValue());
			break;
		}
		case dispid_midix_panel:
		{
			::ShellExecute(NULL, NULL, TEXT("ms-settings:bluetooth"), NULL, NULL, SW_SHOWNORMAL);
			break;
		}

	}
}

void _MIDIXClientDelegate::midiInputPortConnectFailed(const MIDI_ENDPOINT_INFO* endpoint)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%d\f%s", OBJ_NAME, L"connectfailed", m_cid, JSON::stringify(endpoint));
	mp_intf->postEvent(ev);
}

void _MIDIXClientDelegate::midiOutputPortConnectFailed(const MIDI_ENDPOINT_INFO* endpoint)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%d\f%s", OBJ_NAME, L"connectfailed", m_cid, JSON::stringify(endpoint));
	mp_intf->postEvent(ev);
}

void _MIDIXClientDelegate::midiObjectAddedRemoved()
{
	if (m_cid != 0) return;

	CStringW ev;
	ev.Format(L"%s\f%s", OBJ_NAME, L"changed");
	mp_intf->postEvent(ev);
}

void _MIDIXClientDelegate::midiErrorDidOccur(MMRESULT error)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%d\f%ld", OBJ_NAME, L"error", m_cid, error);
	mp_intf->postEvent(ev);
}

void _MIDIXClientDelegate::midiInputMessage(const BYTE* msg, int bytes, DWORD msec)
{
	if (m_thru) {
		mp_client->outputPort()->send(msg, bytes);
	}

	CStringW ev;
	ev.Format(L"%s\f%s\f%d\f%s\f%u", OBJ_NAME, L"message", m_cid, HEX::text(msg, bytes), msec);
	mp_intf->postEvent(ev);
}
