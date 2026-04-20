//
//  NativeCall+ble.cpp
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"ble";

enum {
	dispid_ble_scanstart,
	dispid_ble_scanstop,
	dispid_ble_connect,
	dispid_ble_disconnect,
	dispid_ble_discover,
	dispid_ble_properties,
	dispid_ble_notify,
	dispid_ble_read,
	dispid_ble_write,
	dispid_ble_writewithoutresponse,
};

NativeCall_ble::NativeCall_ble(NativeObjects* objs) : NativeCall(objs)
{
	set(L"scanstart",            dispid_ble_scanstart);
	set(L"scanstop",             dispid_ble_scanstop);
	set(L"connect",              dispid_ble_connect);
	set(L"disconnect",           dispid_ble_disconnect);
	set(L"discover",             dispid_ble_discover);
	set(L"properties",           dispid_ble_properties);
	set(L"notify",               dispid_ble_notify);
	set(L"read",                 dispid_ble_read);
	set(L"write",                dispid_ble_write);
	set(L"writewithoutresponse", dispid_ble_writewithoutresponse);
}

LPCWSTR NativeCall_ble::InterfaceName() const { return OBJ_NAME; }

void NativeCall_ble::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {
		case dispid_ble_connect:
		{
			/* not supported */
			CStringW ev;
			ev.Format(L"%s\f%s\f%s\f%s", OBJ_NAME, L"connectfailed", CStringW(args[0]->GetStringValue().c_str()), L"");
			mp_objs->mp_intf->postEvent(ev);
			break;
		}
		case dispid_ble_properties:
		{
			/* not supported */
			ret = L"{}";
			break;
		}
		case dispid_ble_scanstart:
		case dispid_ble_scanstop:
		case dispid_ble_disconnect:
		case dispid_ble_discover:
		case dispid_ble_notify:
		case dispid_ble_read:
		case dispid_ble_write:
		case dispid_ble_writewithoutresponse:
		{
			/* not supported */
			break;
		}
	}
}
