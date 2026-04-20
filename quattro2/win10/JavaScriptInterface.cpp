/*
 * @(#)JavaScriptInterface.cpp
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#include "JavaScriptInterface.h"
#include "JavascriptInterface/NativeConverters.h"
#include "Common/Bundle.h"

JavaScriptInterface::JavaScriptInterface()
{
	m_wnd = NULL;
	m_appName = TEXT("unknown");
	m_URL = TEXT("about:blank");

	m_dragdrop = m_event = m_triggered = false;
}

void JavaScriptInterface::startEvent(bool start)
{
	mutex_lock obj(mtx_queue);
	if (m_event = m_triggered = start) {
		::PostMessage(m_wnd, WM_TRIGGER_EVENT, 0, 0);
	}
}

void JavaScriptInterface::postEvent(LPCWSTR event)
{
	std::wstring ev = event;
	mutex_lock obj(mtx_queue);
	m_queue.push(ev);
	if (m_event && !m_triggered) {
		m_triggered = true;
		::PostMessage(m_wnd, WM_TRIGGER_EVENT, 0, 0);
	}
}

std::wstring JavaScriptInterface::getEvent()
{
	std::wstring ev = L"";
	mutex_lock obj(mtx_queue);
	if (!m_queue.empty()) {
		ev = m_queue.front();
		m_queue.pop();
	}
	return ev;
}

void JavaScriptInterface::openPanel(const CString filter, const CString initDir)
{
	OpenPanel* dlg = new OpenPanel(this, filter, initDir);
	::PostMessage(m_wnd, WM_FILE_DIALOG, reinterpret_cast<WPARAM>(dlg), 0);
}

void OpenPanel::open(HWND wnd)
{
	m_filter.Replace(TEXT('\f'), TEXT('\0'));

	TCHAR file[MAX_PATH];
	file[0] = TEXT('\0');

	TCHAR path[MAX_PATH];
	_tcscpy_s(path, MAX_PATH, m_initDir);

	OPENFILENAME ofn;
	memset(&ofn, 0, sizeof(ofn));
	ofn.lStructSize = sizeof(ofn);
	ofn.hwndOwner = wnd;
	ofn.lpstrInitialDir = path;
	ofn.lpstrFile = file;
	ofn.nMaxFile = MAX_PATH;
	ofn.Flags = OFN_FILEMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR;
	ofn.lpstrFilter = m_filter;
	BOOL ok = ::GetOpenFileName(&ofn);

	CStringW ev;
	ev.Format(L"%s\f%s\f%s", L"fs", L"openfilename", ok ? LPCWSTR(CStringW(file)) : L"");
	m_intf->postEvent(ev);
}

void JavaScriptInterface::savePanel(const CString name, const CString ext)
{
	SavePanel* dlg = new SavePanel(this, name, ext);
	::PostMessage(m_wnd, WM_FILE_DIALOG, reinterpret_cast<WPARAM>(dlg), 0);
}

void SavePanel::open(HWND wnd)
{
	TCHAR file[MAX_PATH];
	_tcscpy_s(file, MAX_PATH, m_name);

	TCHAR path[MAX_PATH];
	::SHGetFolderPath(NULL, CSIDL_MYDOCUMENTS, NULL, 0, path);

	CString filter;
	if (m_ext.IsEmpty()) {
		filter = TEXT("*\f*\f\f");
	}
	else {
		filter.Format(TEXT("%s\f*.%s\f*\f*\f\f"), LPCTSTR(m_ext), LPCTSTR(m_ext));
	}
	filter.Replace(TEXT('\f'), TEXT('\0'));

	OPENFILENAME ofn;
	memset(&ofn, 0, sizeof(ofn));
	ofn.lStructSize = sizeof(ofn);
	ofn.hwndOwner = wnd;
	ofn.lpstrInitialDir = path;
	ofn.lpstrFile = file;
	ofn.nMaxFile = MAX_PATH;
	ofn.lpstrDefExt = m_ext;
	ofn.lpstrFilter = filter;
	ofn.Flags = OFN_OVERWRITEPROMPT | OFN_NOCHANGEDIR;
	BOOL ok = ::GetSaveFileName(&ofn);

	CStringW ev;
	ev.Format(L"%s\f%s\f%s", L"fs", L"savefilename", ok ? LPCWSTR(CStringW(file)) : L"");
	m_intf->postEvent(ev);
}

void JavaScriptInterface::chooseFolder(const CString initDir)
{
	ChooseFolder* dlg = new ChooseFolder(this, initDir);
	::PostMessage(m_wnd, WM_FILE_DIALOG, reinterpret_cast<WPARAM>(dlg), 0);
}

static int CALLBACK browseCallbackProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	if (message == BFFM_INITIALIZED) {
		::SendMessage(hWnd, BFFM_SETSELECTION, TRUE, lParam);
	}
	return 0;
}

void ChooseFolder::open(HWND wnd)
{
	TCHAR path[MAX_PATH];
	_tcscpy_s(path, MAX_PATH, m_initDir);

	BROWSEINFO bi;
	memset(&bi, 0, sizeof(bi));
	bi.hwndOwner = wnd;
	bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE;
	bi.lpfn = (BFFCALLBACK)browseCallbackProc;
	bi.lParam = (LPARAM)path;

	BOOL ok = FALSE;
	LPITEMIDLIST pidl = ::SHBrowseForFolder(&bi);
	if (pidl) {
		ok = ::SHGetPathFromIDList(pidl, path);
		::CoTaskMemFree(pidl);
		if (ok) {
			if (path[_tcslen(path) - 1] != TEXT('\\')) {
				_tcscat_s(path, MAX_PATH, TEXT("\\"));
			}
		}
	}

	CStringW ev;
	ev.Format(L"%s\f%s\f%s", L"fs", L"choosefolder", ok ? LPCWSTR(CStringW(path)) : L"");
	m_intf->postEvent(ev);
}

void AppEventLog::log(LPCTSTR event)
{
	Bundle bundle(m_appName);
	CString path = bundle.getLocalPath(TEXT("pref")) + event;
	HANDLE hFile = ::CreateFile(path, GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile != INVALID_HANDLE_VALUE) {
		DWORD bytes;
		std::string str = std::to_string(POSIX::unixtime());
		::WriteFile(hFile, str.c_str(), (DWORD)str.length(), &bytes, NULL);
		::CloseHandle(hFile);
	}
}