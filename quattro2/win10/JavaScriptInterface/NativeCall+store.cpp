//
//  NativeCall+store.cpp
//
//  Copyright 2021 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"store";

enum {
	dispid_store_query,
	dispid_store_launchflow,
	dispid_store_accept,
	dispid_store_recover,
};

NativeCall_store::NativeCall_store(NativeObjects* objs) : NativeCall(objs)
{
	set(L"query",       dispid_store_query);
	set(L"launchflow",  dispid_store_launchflow);
	set(L"accept",      dispid_store_accept);
	set(L"recover",     dispid_store_recover);
}

LPCWSTR NativeCall_store::InterfaceName() const { return OBJ_NAME; }

void NativeCall_store::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {
		case dispid_store_query:
		case dispid_store_launchflow:
		case dispid_store_accept:
		case dispid_store_recover:
		{
			/* not supported */
			break;
		}
	}
}
