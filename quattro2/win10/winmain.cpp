/*
 * @(#)WinMain.cpp
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#include <AppWebViewController.h>
#include "Common/Bundle.h"
#include "Common/Thread.h"
#include "Common/Registry.h"
#include <Resources/resource.h>
#include <Resources/version.h>

static CString APP_NAME;
static TCHAR URL[MAX_PATH];
static float scale = 1.0f;

static AppWebViewController* gp_controller = 0;

#define DPI_SCALING(x)	((LONG)ceil(x * scale))

static void openFile(HWND wnd, LPTSTR lpCmdLine)
{
	static LPTSTR _lpCmdLine = NULL;

	if (_lpCmdLine == NULL) { _lpCmdLine = lpCmdLine; }

	COPYDATASTRUCT cds;
	ZeroMemory(&cds, sizeof(cds));
	cds.cbData = (DWORD)((_tcslen(_lpCmdLine) + 1) * sizeof(TCHAR));
	cds.lpData = _lpCmdLine;
	::SendMessage(wnd, WM_COPYDATA, NULL, (LPARAM)&cds);
}

static void restorWindowPlacement(HWND wnd)
{
	RECT rc;
	::GetWindowRect(wnd, &rc);

	LONG x = rc.left;
	LONG y = rc.top;
	LONG width  = rc.right - rc.left;
	LONG height = rc.bottom - rc.top;

#if defined(INIT_CLIENT_WIDTH) && defined(INIT_CLIENT_HEIGHT)
	POINT pt = { x, y };
	HMONITOR mon = ::MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
	MONITORINFOEX mi;
	mi.cbSize = sizeof(MONITORINFOEX);
	::GetMonitorInfo(mon, &mi);
	LONG areaX = mi.rcWork.right - mi.rcWork.left;
	LONG areaY = mi.rcWork.bottom - mi.rcWork.top;

	if (INIT_CLIENT_WIDTH < 0) {
		x = mi.rcWork.left + 8;
		y = mi.rcWork.top  + 8;
		width  = areaX - 16;
		height = areaY - 16;
	} else {
		RECT _init = { 0, 0, DPI_SCALING(INIT_CLIENT_WIDTH), DPI_SCALING(INIT_CLIENT_HEIGHT) };
		::AdjustWindowRect(&_init, ::GetWindowLong(wnd, GWL_STYLE), 0);
		width  = min(areaX, _init.right - _init.left);
		height = min(areaY, _init.bottom - _init.top);
	}
#endif

	Registry reg(TEXT("Software\\Roland\\") + APP_NAME);
	LONG value;
	if (reg.getValue(TEXT("x"), &value)) { x = value; }
	if (reg.getValue(TEXT("y"), &value)) { y = value; }
	if (reg.getValue(TEXT("width"),  &value)) { width  = value; }
	if (reg.getValue(TEXT("height"), &value)) { height = value; }

	::SetWindowPos(wnd, NULL, x, y, 0, 0, SWP_NOZORDER | SWP_NOSIZE);
	::SetWindowPos(wnd, NULL, 0, 0, width, height, SWP_NOZORDER | SWP_NOMOVE);

	if ((reg.getValue(TEXT("maximized"), &value) ? value : 0)) {
		::PostMessage(wnd, WM_SYSCOMMAND, SC_MAXIMIZE, 0);
	}
}

static LRESULT CALLBACK wndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	switch (message) {
		case WM_CREATE:
			if (gp_controller->createWebView(hWnd, APP_NAME, URL)) {
				restorWindowPlacement(hWnd);
			} else {
				::DestroyWindow(hWnd);
			}
			return 0;

		case WM_DESTROY:
			::PostQuitMessage(0);
			return 0;

		case WM_CLOSE:
			gp_controller->closeWebView();
			{
				WINDOWPLACEMENT placement;
				placement.length = sizeof(WINDOWPLACEMENT);
				::GetWindowPlacement(hWnd, &placement);

				Registry reg(TEXT("Software\\Roland\\") + APP_NAME);
				reg.setValue(TEXT("x"), placement.rcNormalPosition.left);
				reg.setValue(TEXT("y"), placement.rcNormalPosition.top);
				reg.setValue(TEXT("width"), placement.rcNormalPosition.right - placement.rcNormalPosition.left);
				reg.setValue(TEXT("height"), placement.rcNormalPosition.bottom - placement.rcNormalPosition.top);
				reg.setValue(TEXT("maximized"), (placement.showCmd == SW_SHOWMAXIMIZED) ? 1 : 0);
			}
			break;

		case WM_COPYDATA:
			COPYDATASTRUCT* pcds;
			pcds = (COPYDATASTRUCT*)lParam;
			if (pcds->cbData > 0) {
				int nArgs = 0;
				LPWSTR* lplpszArgs = ::CommandLineToArgvW(CStringW((LPCTSTR)pcds->lpData), &nArgs);
				LPCWSTR param1 = L"open";
				for (int i = 0; i < nArgs; i++) {
					if (wcscmp(lplpszArgs[i], L"-url") == 0) {
						param1 = L"url";
					} else {
						CStringW ev;
						ev.Format(L"%s\f%s\f%s\f%s", L"app", L"command", param1, lplpszArgs[i]);
						gp_controller->postEvent(ev);
					}
				}
				::LocalFree(lplpszArgs);
			}
			return 0;

		case WM_SYSCOMMAND:
#ifdef ENABLE_APP_EXIT
			if (wParam == SC_CLOSE) {
				CStringW ev;
				ev.Format(L"%s\f%s\f%s\f%s", L"app", L"command", L"exit", "");
				gp_controller->postEvent(ev);
				return 0;
			}
#endif
			break;

		case WM_GETMINMAXINFO:
			{
				HMONITOR mon = ::MonitorFromWindow(hWnd, MONITOR_DEFAULTTONEAREST);
				MONITORINFOEX mi;
				mi.cbSize = sizeof(MONITORINFOEX);
				::GetMonitorInfo(mon, &mi);
				LONG areaX = mi.rcWork.right - mi.rcWork.left;
				LONG areaY = mi.rcWork.bottom - mi.rcWork.top;

				LPMINMAXINFO lpMMI = (LPMINMAXINFO)lParam;
#if defined(MIN_CLIENT_WIDTH) && defined(MIN_CLIENT_HEIGHT)
				RECT _min = { 0, 0, DPI_SCALING(MIN_CLIENT_WIDTH), DPI_SCALING(MIN_CLIENT_HEIGHT) };
				::AdjustWindowRect(&_min, ::GetWindowLong(hWnd, GWL_STYLE), 0);
				lpMMI->ptMinTrackSize.x = min(areaX, _min.right - _min.left);
				lpMMI->ptMinTrackSize.y = min(areaY, _min.bottom - _min.top);
#endif
#if defined(MAX_CLIENT_WIDTH) && defined(MAX_CLIENT_HEIGHT)
				RECT _max = { 0, 0, DPI_SCALING(MAX_CLIENT_WIDTH), DPI_SCALING(MAX_CLIENT_HEIGHT) };
				::AdjustWindowRect(&_max, ::GetWindowLong(hWnd, GWL_STYLE), 0);
				lpMMI->ptMaxTrackSize.x = min(areaX, _max.right - _max.left);
				lpMMI->ptMaxTrackSize.y = min(areaY, _max.bottom - _max.top);
#endif
			}
			break;

		case WM_POWERBROADCAST:
			if (wParam == PBT_APMRESUMESUSPEND) {
				CStringW ev;
				ev.Format(L"%s\f%s\f%s\f%s", L"app", L"command", L"wakeup", L"PBT_APMRESUMESUSPEND");
				gp_controller->postEvent(ev);
			}
			break;

		case WM_TRIGGER_EVENT:
			gp_controller->processEvent();
			return 0;

		case WM_NATIVE_CONTROL:
			if (wParam) {
				auto* req = reinterpret_cast<CStringW*>(wParam);
				gp_controller->control(*req);
				delete req;
			}
			return 0;

		case WM_FILE_DIALOG:
			if (wParam) {
				auto* dlg = reinterpret_cast<FileDialog*>(wParam);
				dlg->open(hWnd);
				delete dlg;
			}
			return 0;

		case WM_RUN_ASYNC:
			if (wParam) {
				auto* task = reinterpret_cast<std::function<void()>*>(wParam);
				(*task)();
				delete task;
			}
			return 0;
	}

	if (gp_controller->handleWindowMessage(hWnd, message, wParam, lParam)) {
		return 0;
	}

	return ::DefWindowProc(hWnd, message, wParam, lParam);
}

int WINAPI _tWinMain(
	HINSTANCE hInstance,
	HINSTANCE hPrevInstance,
	LPTSTR lpCmdLine,
	int nCmdShow)
{
	TCHAR buf[MAX_PATH];
	::GetModuleFileName(hInstance, buf, MAX_PATH);
	LPTSTR filename = ::PathFindFileName(buf);
	::PathRemoveExtension(filename);
	APP_NAME = filename;

	CString className = TEXT("jp.co.roland.") + APP_NAME + TEXT(".wndclass");

	HANDLE mutex = ::CreateMutex(NULL, FALSE, className);
	if (GetLastError() == ERROR_ALREADY_EXISTS) {
#ifndef ALLOW_MULTIPLE_INSTANCES
		HWND wnd = ::FindWindow(className, NULL);
		if (wnd) {
			if (::IsIconic(wnd)) {
				::OpenIcon(wnd);
			} else {
				::SetForegroundWindow(wnd);
			}
			if (lpCmdLine != NULL && lpCmdLine[0]) {
				openFile(wnd, lpCmdLine);
			}
		}
		::CloseHandle(mutex);
		return 0;
#endif
	}

	::SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

	AppEventLog log(APP_NAME);

	gp_controller = new AppWebViewController();

#ifdef _DEBUG
	LPTSTR lpFilePart;
	::GetFullPathName(TEXT("..\\"), MAX_PATH, URL, &lpFilePart);
	wsprintf(URL, TEXT("%s"), LPCTSTR(gp_controller->startURL(URL, 0)));
#else
	Bundle bundle(APP_NAME);
#ifdef IDB_SPLASH
	if (bundle.copyResource(hInstance, BUNDLE_IDENTIFIER, IDB_SPLASH)) {
#else
	if (bundle.copyResource(hInstance, BUNDLE_IDENTIFIER)) {
#endif
		wsprintf(URL, TEXT("%s"), LPCTSTR(gp_controller->startURL(bundle.getBundlePath(), bundle.getClickKey())));
	}
#endif
	if (!URL[0]) {
		_tcscpy_s(URL, MAX_PATH, TEXT("about:blank"));
	}

	HDC screen = ::GetDC(NULL);
	scale = ::GetDeviceCaps(screen, LOGPIXELSX) / 96.0f;
	::ReleaseDC(0, screen);

	WNDCLASS wndclass;
	memset(&wndclass, 0, sizeof(wndclass));
	wndclass.lpfnWndProc   = wndProc;
	wndclass.hInstance     = hInstance;
	wndclass.hIcon         = ::LoadIcon(hInstance, MAKEINTRESOURCE(APPICON));
	wndclass.hCursor       = ::LoadCursor(NULL, IDC_ARROW);
	wndclass.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
	wndclass.lpszClassName = className;
	::RegisterClass(&wndclass);

	DWORD style = (WS_OVERLAPPEDWINDOW | WS_VISIBLE);
#if defined(MAX_CLIENT_WIDTH) && defined(MAX_CLIENT_HEIGHT)
	style &= (~ WS_MAXIMIZEBOX);
#endif

	HWND wnd = ::CreateWindow(className, TEXT(""), style,
						CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
						NULL, NULL, hInstance, NULL);

	Thread::m_mainWindow = wnd;

	WINDOWPLACEMENT placement;
	placement.length = sizeof(WINDOWPLACEMENT);
	::GetWindowPlacement(wnd, &placement);
	::SetWindowPlacement(wnd, &placement); /* SW_SHOWNORMAL */

	if (lpCmdLine != NULL && lpCmdLine[0]) {
		openFile(wnd, lpCmdLine);
	}

	HACCEL accel = ::LoadAccelerators(hInstance, TEXT("ACCEL"));

	MSG msg;
	BOOL isValidMessage;
	while ((isValidMessage = ::GetMessage(&msg, NULL, 0, 0)) != 0 && isValidMessage != -1) {
		if (!accel || !::TranslateAccelerator(wnd, accel, &msg)) {
			::TranslateMessage(&msg);
			::DispatchMessage(&msg);
		}
	}

	delete gp_controller;

	::CloseHandle(mutex);

	return 0;
}
