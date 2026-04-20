/*
 * @(#)AppWebViewController.cpp
 *
 * Copyright 2024 Roland Corporation, Japan. All rights reserved.
 */

#include "AppWebViewController.h"

AppWebViewController::AppWebViewController()
{
	(new NativeCall_calc(mp_objects))->OnContextCreated(m_objMap);
}

AppWebViewController::~AppWebViewController()
{
}

CString AppWebViewController::startURL(CString bundlePath, WPARAM clickKey) const
{
	return bundlePath + TEXT("html\\index.html");
}

/* native API extensions */

LPCWSTR NativeCall_calc::objName = L"calc";

void AppWebViewController::control(CStringW req)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%s", NativeCall_calc::objName, L"alert", req);
	postEvent(ev);
}

void NativeCall_calc::Dispatch(const std::wstring name, const CefV8ValueList& args, CefRetValue& ret)
{
	if (name == L"multiple") {
		int a = args[0]->GetIntValue();
		int b = args[1]->GetIntValue();
		ret = (a * b);
	}
}
