//
//  NativeCall+netservice.cpp
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"netservice";

class _NetServiceDiscoveryDelegate : public NetServiceDiscoveryDelegate
{
private:
	JavaScriptInterface* mp_intf;
public:
	_NetServiceDiscoveryDelegate(JavaScriptInterface* intf) : mp_intf(intf) {}

	void netServiceDidResolve(CString name, CString addr, int port) {
		picojson::object o;
		o[L"name"] = (picojson::value)std::wstring(name);
		o[L"address"] = (picojson::value)std::wstring(addr);
		o[L"port"] = (picojson::value)double(port);
		picojson::value v = picojson::value(o);
		CStringW ev;
		ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"resolved", v.serialize().c_str());
		mp_intf->postEvent(ev);
	}

	void netServiceDidStopSearch(DWORD errorCode) {
		CStringW error;
		if (errorCode) { error.Format(L"%ld", errorCode); }
		CStringW ev;
		ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"stopped", LPCWSTR(error));
		mp_intf->postEvent(ev);
	}
};

enum {
	dispid_netservice_search,
	dispid_netservice_stop,
};

NativeCall_netservice::NativeCall_netservice(NativeObjects* objs) : NativeCall(objs)
{
	set(L"search", dispid_netservice_search);
	set(L"stop",   dispid_netservice_stop);
}

LPCWSTR NativeCall_netservice::InterfaceName() const { return OBJ_NAME; }

void NativeCall_netservice::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {
		case dispid_netservice_search:
		{
			CString queryName(args[0]->GetStringValue().c_str());
			if (!mp_objs->netservice) {
				mp_objs->netservice = new NetServiceDiscovery();
				mp_objs->netservice->delegate(new _NetServiceDiscoveryDelegate(mp_objs->mp_intf));
			}
			ret = mp_objs->netservice->search(queryName);
			break;
		}
		case dispid_netservice_stop:
		{
			if (mp_objs->netservice) {
				mp_objs->netservice->stop();
			}
			break;
		}
	}
}
