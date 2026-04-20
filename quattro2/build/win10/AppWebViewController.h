/*
 * @(#)AppWebViewController.h
 *
 * Copyright 2024 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __APP_WEBVIEW_CONTROLLER_H__
#define __APP_WEBVIEW_CONTROLLER_H__

#include "win10/WebView2Controller.h"

class AppWebViewController : public WebView2Controller
{
  public:
	AppWebViewController();
	virtual ~AppWebViewController();

	CString startURL(CString bundlePath, WPARAM clickKey) const;
	void control(CStringW req);

  private:
};

class NativeCall_calc : public NativeCall_extention
{
  public:
	static LPCWSTR objName;
	NativeCall_calc(NativeObjects* objs) : NativeCall_extention(objs) {};
	LPCWSTR InterfaceName() const override { return objName; };
	void Dispatch(const std::wstring name, const CefV8ValueList& arguments, CefRetValue& ret) override;
};

#endif /* __APP_WEBVIEW_CONTROLLER_H__ */
