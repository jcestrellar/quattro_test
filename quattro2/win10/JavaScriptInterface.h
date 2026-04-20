/*
 * @(#)JavaScriptInterface.h
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __JAVASCRIPT_INTERFACE_H__
#define __JAVASCRIPT_INTERFACE_H__

#include <windows.h>
#include <shlobj.h> 
#include <atlstr.h>
#include <tchar.h>
#include <string>
#include <codecvt>
#include <regex>
#include <map>
#include <queue>

#include "Common/Thread.h"

#define WM_TRIGGER_EVENT  (WM_APP + 1)
#define WM_NATIVE_CONTROL (WM_APP + 2)
#define WM_FILE_DIALOG    (WM_APP + 3)

class JavaScriptInterface
{
  public:
	JavaScriptInterface();
	virtual ~JavaScriptInterface();

	CString getAppName() const;

	void startEvent(bool start);
	void postEvent(LPCWSTR event);
	std::wstring getEvent();

	void exit();
	void dragdrop(bool enable);
	void control(CString req);
	void openPanel(CString filter, CString initDir);
	void savePanel(CString name, CString ext);
	void chooseFolder(CString initDir);

	virtual void webauth(CString url, CString scheme) = 0;
	virtual void locate(CString url) = 0;
	virtual void processEvent() = 0;

  protected:
	HWND m_wnd;
	CString m_appName;
	CString m_URL;

	bool m_dragdrop;
	bool m_event;
	bool m_triggered;

	Mutex mtx_queue;
	std::queue<std::wstring> m_queue;
};

/* Inline function declarations */

inline JavaScriptInterface::~JavaScriptInterface()
	{ }

inline CString JavaScriptInterface::getAppName() const
	{ return m_appName; }

inline void JavaScriptInterface::exit()
	{ ::PostMessage(m_wnd, WM_CLOSE, 0, 0); }

inline void JavaScriptInterface::dragdrop(bool enable)
	{ m_dragdrop = enable; }

inline void JavaScriptInterface::control(CString req)
	{ ::PostMessage(m_wnd, WM_NATIVE_CONTROL, (WPARAM)(new CStringW(req)), 0); }

/* dialog wrapper of GetOpenFileName() and GetSaveFileName() */

class FileDialog
{
public:
	virtual ~FileDialog() {}
	virtual void open(HWND wnd) = 0;
};

class OpenPanel : FileDialog
{
  public:
	OpenPanel(JavaScriptInterface* intf, const CString filter, const CString initDir)
		: m_intf(intf), m_filter(filter), m_initDir(initDir) {}
	virtual void open(HWND wnd);

  private:
	JavaScriptInterface* m_intf;
	CString m_filter;
	CString m_initDir;
};

class SavePanel : FileDialog
{
  public:
	SavePanel(JavaScriptInterface* intf, const CString name, const CString ext)
		: m_intf(intf), m_name(name), m_ext(ext) {}
	virtual void open(HWND wnd);

  private:
	JavaScriptInterface* m_intf;
	CString m_name;
	CString m_ext;
};

class ChooseFolder : FileDialog
{
  public:
	ChooseFolder(JavaScriptInterface* intf, const CString initDir)
		: m_intf(intf), m_initDir(initDir) {}
	virtual void open(HWND wnd);

  private:
	JavaScriptInterface* m_intf;
	CString m_initDir;
};

/* helper function for logging app_open/close time */

class AppEventLog
{
  public:
	AppEventLog(LPCTSTR appName) : m_appName(appName) { log(TEXT("__app_open")); }
	~AppEventLog() { log(TEXT("__app_close")); }

  private:
	CString m_appName;
	void log(LPCTSTR event);
};

#endif /* __JAVASCRIPT_INTERFACE_H__ */
