//
//  NativeCall+util.cpp
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"util";

enum {
	dispid_util_bytes,
	dispid_util_text,
};

NativeCall_util::NativeCall_util(NativeObjects* objs) : NativeCall(objs)
{
	set(L"bytes", dispid_util_bytes);
	set(L"text",  dispid_util_text);
}

LPCWSTR NativeCall_util::InterfaceName() const { return OBJ_NAME; }

void NativeCall_util::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {
		case dispid_util_bytes:
		{
			CStringW str(args[0]->GetStringValue().c_str());
			CStringA text = UTF::UTF16toUTF8(str);
			ret = HEX::text((BYTE*)(LPCSTR(text)), (int)strlen(text));
			break;
		}
		case dispid_util_text:
		{
			CStringW str(args[0]->GetStringValue().c_str());
			std::string data;
			data = HEX::data(str) + '\0';
			ret = UTF::UTF8toUTF16(data.c_str());
			break;
		}
	}
}
