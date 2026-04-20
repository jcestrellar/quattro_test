//
//  NativeCall+http.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"http";

enum {
	dispid_http_download,
	dispid_http_upload,
	dispid_http_cancel,
};

NativeCall_http::NativeCall_http(NativeObjects* objs) : NativeCall(objs)
{
	set(L"download", dispid_http_download);
	set(L"upload",   dispid_http_upload);
	set(L"cancel",   dispid_http_cancel);
}

LPCWSTR NativeCall_http::InterfaceName() const { return OBJ_NAME; }

void NativeCall_http::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	HTTPConnection* http = mp_objs->http;

	switch (dispid) {

		case dispid_http_download:
		{
			CString url(args[0]->GetStringValue().c_str());
			if (args.size() > 1) {
				CString dst(args[1]->GetStringValue().c_str());
				ret = http->download(url, dst);
			} else {
				ret = http->download(url, NULL);
			}
			break;
		}
		case dispid_http_upload:
		{
			CString url(args[0]->GetStringValue().c_str());
			CString src(args[1]->GetStringValue().c_str());
			ret = http->upload(url, src);
			break;
		}
		case dispid_http_cancel:
		{
			http->cancel(args[0]->GetUIntValue());
			break;
		}

	}
}

void _HTTPConnectionDelegate::connectionDidFinishLoading(DWORD id, LPCTSTR file)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%u\f%s", OBJ_NAME, L"completed", id, CStringW(file));
	mp_intf->postEvent(ev);
}

void _HTTPConnectionDelegate::connectionDidLoadData(DWORD id, DWORD contentLength, DWORD loaded)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%u\f%ld\f%ld", OBJ_NAME, L"progress", id, (long)contentLength, (long)loaded);
	mp_intf->postEvent(ev);
}

void _HTTPConnectionDelegate::connectionErrorDidOccur(DWORD id, LPCTSTR url)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%u\f%s", OBJ_NAME, L"error", id, CStringW(url));
	mp_intf->postEvent(ev);
}
