//
//  NativeCall+rwc.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"rwc";

enum {
	dispid_rwc_discovery,
	dispid_rwc_connect,
	dispid_rwc_disconnect,
	dispid_rwc_device,
	dispid_rwc_send,
	dispid_rwc_inputmode,
	dispid_rwc_timeout,
	dispid_rwc_keepalive,
};

NativeCall_rwc::NativeCall_rwc(NativeObjects* objs) : NativeCall(objs)
{
	set(L"discovery",  dispid_rwc_discovery);
	set(L"connect",    dispid_rwc_connect);
	set(L"disconnect", dispid_rwc_disconnect);
	set(L"device",     dispid_rwc_device);
	set(L"send",       dispid_rwc_send);
	set(L"inputmode",  dispid_rwc_inputmode);
	set(L"timeout",    dispid_rwc_timeout);
	set(L"keepalive",  dispid_rwc_keepalive);
}

LPCWSTR NativeCall_rwc::InterfaceName() const { return OBJ_NAME; }

void NativeCall_rwc::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	RWCConnection* rwc = mp_objs->rwc;

	switch (dispid) {

		case dispid_rwc_discovery:
		{
			mp_objs->discovery->search();
			break;
		}
		case dispid_rwc_connect:
		{
			RWC_DEV_INFO dev = JSON::device(args[0]->GetStringValue().c_str());
			rwc->connect(&dev);
			break;
		}
		case dispid_rwc_disconnect:
		{
			rwc->disconnect();
			break;
		}
		case dispid_rwc_device:
		{
			ret = (rwc->device() ? JSON::stringify(rwc->device()) : L"");
			break;
		}
		case dispid_rwc_send:
		{
			std::string data = HEX::data(args[0]->GetStringValue().c_str());
			rwc->midiService()->send((BYTE*)data.c_str(), (int)data.length());
			break;
		}
		case dispid_rwc_inputmode:
		{
			rwc->inputStream()->inputMode(args[0]->GetIntValue());
			break;
		}
		case dispid_rwc_timeout:
		{
			if (args.size() > 0) {
				rwc->connectTimeout(args[0]->GetIntValue());
			}
			ret = rwc->connectTimeout();
			break;
		}
		case dispid_rwc_keepalive:
		{
			if (args.size() > 0) {
				rwc->keepAliveTimeout(args[0]->GetIntValue());
			}
			ret = rwc->keepAliveTimeout();
			break;
		}

	}
}

void _RWCDiscoveryDelegate::discoveryDeviceDidFound(const RWC_DEV_INFO* device)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"found", JSON::stringify(device));
	mp_intf->postEvent(ev);
}

void _RWCConnectionDelegate::connectionFailed(const RWC_DEV_INFO* device)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"connectfailed", JSON::stringify(device));
	mp_intf->postEvent(ev);
}

void _RWCConnectionDelegate::connectionDidEstablished(const RWC_DEV_INFO* device)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"connected", JSON::stringify(device));
	mp_intf->postEvent(ev);
}

void _RWCConnectionDelegate::connectionDidClosed(const RWC_DEV_INFO* device)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"closed", JSON::stringify(device));
	mp_intf->postEvent(ev);
}

void _RWCConnectionDelegate::connectionErrorDidOccur(const RWC_DEV_INFO* device)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"error", JSON::stringify(device));
	mp_intf->postEvent(ev);
}

void _RWCConnectionDelegate::midiInputMessage(const BYTE* msg, int bytes, DWORD msec, int cable)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s\f%u", OBJ_NAME, L"message", HEX::text(msg, bytes), msec);
	mp_intf->postEvent(ev);
}
