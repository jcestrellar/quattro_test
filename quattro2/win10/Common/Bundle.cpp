/*
 * @(#)Bundle.cpp
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#include "Bundle.h"

#include <shlwapi.h>
#include <shlobj.h>
#include <assert.h>
#include <string>
#include <regex>
#include <appmodel.h>

CString Bundle::getBundlePath() const
{
	UINT32 length = 0;
	LONG ret = ::GetCurrentPackagePath(&length, NULL);
	if (ret == ERROR_INSUFFICIENT_BUFFER) {
		TCHAR path[MAX_PATH];
		ret = ::GetCurrentPackagePath(&length, path);
		if (ret == ERROR_SUCCESS) {
			return (CString(path) + TEXT("\\"));
		}
	}

	return getLocalPath();
}

CString Bundle::getLocalPath(LPCTSTR folder) const
{
	TCHAR path[MAX_PATH];

	HRESULT hr = ::SHGetFolderPath(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, path);
	if (!SUCCEEDED(hr)) {
		::SHGetFolderPath(NULL, CSIDL_COMMON_APPDATA, NULL, 0, path);
	}

	::PathAppend(path, TEXT("Roland"));
	if (!::PathFileExists(path)) ::CreateDirectory(path, NULL);
	::PathAppend(path, m_appName);
	if (!::PathFileExists(path)) ::CreateDirectory(path, NULL);

	if (folder != NULL) {
		::PathAppend(path, folder);
		if (!::PathFileExists(path)) ::CreateDirectory(path, NULL);
	}

	assert(::PathFileExists(path));

	return (CString(path) + TEXT("\\"));
}

void Bundle::run()
{
	HINSTANCE hInstance = (HINSTANCE)::GetWindowLongPtr(m_wnd, GWLP_HINSTANCE);
	WPARAM exitcode = copyResource(hInstance, m_bundleIdentifier) ? 0 : 1;
	::PostMessage(m_wnd, WM_CLOSE, exitcode, 0);
}

static LRESULT CALLBACK wndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	static Bundle* _this;
	static WPARAM exitcode;

	switch (message) {
		case WM_CREATE:
			_this = (Bundle*)((LPCREATESTRUCT)lParam)->lpCreateParams;
			exitcode = 0;
			break;
		case WM_CLOSE:
			exitcode = wParam;
			break;
		case WM_DESTROY:
			::PostQuitMessage((int)exitcode);
			break;
		case WM_PAINT: {
			PAINTSTRUCT ps;
			HDC hdc = ::BeginPaint(hWnd, &ps);
			if (_this) {
				HDC mem = ::CreateCompatibleDC(hdc);
				HBITMAP bitmap = _this->getBitmap();
				::SelectObject(mem, bitmap);
				RECT rc;
				::GetWindowRect(hWnd, &rc);
				BITMAP bmp;
				::GetObject(bitmap, sizeof(BITMAP), &bmp);
				if ((rc.right - rc.left) == bmp.bmWidth) {
					::BitBlt(hdc, 0, 0, bmp.bmWidth, bmp.bmHeight, mem, 0, 0, SRCCOPY);
				} else {
					::StretchBlt(hdc, 0, 0, rc.right - rc.left, rc.bottom - rc.top,
						mem, 0, 0, bmp.bmWidth, bmp.bmHeight, SRCCOPY);
				}
				::DeleteDC(mem);
			}
			::EndPaint(hWnd, &ps);
			return 0;
		}
		case WM_LBUTTONDOWN:
			if (_this) {
				_this->setClickKey(wParam);
			}
			break;
	}
	return ::DefWindowProc(hWnd, message, wParam, lParam);
}

bool Bundle::copyResource(HINSTANCE hInstance, UINT bundleIdentifier, UINT bmpIdentifier)
{
	CString className = TEXT("jp.co.roland.") + m_appName + TEXT(".splash.wndclass");

	WNDCLASS wndclass;
	memset(&wndclass, 0, sizeof(wndclass));
	wndclass.style = CS_HREDRAW | CS_VREDRAW;
	wndclass.lpfnWndProc = wndProc;
	wndclass.hInstance = hInstance;
	wndclass.hIcon = NULL;
	wndclass.hCursor = ::LoadCursor(NULL, IDC_ARROW);
	wndclass.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
	wndclass.lpszClassName = className;
	::RegisterClass(&wndclass);

	m_wnd = ::CreateWindow(className, TEXT(""), WS_POPUP,
					CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
					NULL, NULL, hInstance, (LPVOID)this);

	BITMAP bmp;
	memset(&bmp, 0, sizeof(bmp));
	m_bitmap = ::LoadBitmap(hInstance, MAKEINTRESOURCE(bmpIdentifier));
	::GetObject(m_bitmap, sizeof(BITMAP), &bmp);

	RECT rc;
	::GetWindowRect(m_wnd, &rc);

	POINT pt = { rc.left, rc.top };
	HMONITOR mon = ::MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
	MONITORINFOEX mi;
	mi.cbSize = sizeof(MONITORINFOEX);
	::GetMonitorInfo(mon, &mi);

	LONG width, height;
	if ((mi.rcWork.right - mi.rcWork.left) > bmp.bmWidth) {
		width  = bmp.bmWidth;
		height = bmp.bmHeight;
	} else {
		double ratio = bmp.bmWidth ? double(bmp.bmHeight) / bmp.bmWidth : 0.5;
		width = (mi.rcWork.right - mi.rcWork.left) / 2;
		height = LONG(width * ratio);
	}
	LONG x = mi.rcWork.left + ((mi.rcWork.right - mi.rcWork.left - width) / 2);
	LONG y = mi.rcWork.top + ((mi.rcWork.bottom - mi.rcWork.top - height) / 2);
	::SetWindowPos(m_wnd, HWND_TOP, x, y, width, height, SWP_SHOWWINDOW);

	m_bundleIdentifier = bundleIdentifier;
	_threadStart();

	MSG msg;
	BOOL isValidMessage;
	while ((isValidMessage = ::GetMessage(&msg, NULL, 0, 0)) != 0 && isValidMessage != -1) {
		::TranslateMessage(&msg);
		::DispatchMessage(&msg);
	}

	wait();

	::DeleteObject(m_bitmap);
	::UnregisterClass(className, hInstance);

	return !msg.wParam;
}

bool Bundle::copyResource(HINSTANCE hInstance, UINT bundleIdentifier)
{
	CString path = getLocalPath();
	if ((path != getBundlePath()) && (m_bundleIdentifier == 0)) {
		return true;
	}

	TCHAR identifier[64];
	if (LoadString(hInstance, bundleIdentifier, identifier, sizeof(identifier)) == 0) {
		_tcscpy_s(identifier, 64, TEXT("tmp"));
	}
	path += identifier;
	path += TEXT(".zip");

	bool success = false;
	if (_tcscmp(identifier, TEXT("tmp")) && ::PathFileExists(path)) {
		success = true;
	} else {
		HRSRC  rsrc = ::FindResource(hInstance, TEXT("BUNDLE"), TEXT("ZHTML"));
		DWORD  size = ::SizeofResource(hInstance, rsrc);
		LPVOID data = ::LockResource(LoadResource(hInstance, rsrc));
		if (data) {
			HANDLE file = ::CreateFile(path, GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
			if (file != INVALID_HANDLE_VALUE) {
				DWORD bytes;
				::WriteFile(file, data, size, &bytes, NULL);
				::CloseHandle(file);
#ifdef EXTRACT_POWER_SHELL
				if (unzip(CStringW(path), CStringW(getLocalPath()))) {
#else
				if (extract(path)) {
#endif
					success = true;
				} else {
					::DeleteFile(path);
				}
			}
		}
	}

	return success;
}

bool Bundle::extract(CString zipFile)
{
	bool success = false;

	::CoInitialize(NULL);
	{
		CComBSTR source(zipFile);
		CComBSTR dest(getLocalPath());

		CComPtr<IShellDispatch> pISD;
		HRESULT hr = ::CoCreateInstance(CLSID_Shell, NULL, CLSCTX_INPROC_SERVER, IID_IShellDispatch, (void**)&pISD);
		if (SUCCEEDED(hr)) {

			CComPtr<Folder> pToFolder = NULL;

			VARIANT vdir;
			VariantInit(&vdir);
			vdir.vt = VT_BSTR;
			vdir.bstrVal = dest;
			hr = pISD->NameSpace(vdir, &pToFolder);
			if (SUCCEEDED(hr)) {

				CComPtr<Folder> pFromFolder = NULL;

				VARIANT vfile;
				VariantInit(&vfile);
				vfile.vt = VT_BSTR;
				vfile.bstrVal = source;
				hr = pISD->NameSpace(vfile, &pFromFolder);
				if (SUCCEEDED(hr)) {

					FolderItems* fi = NULL;
					pFromFolder->Items(&fi);

					VARIANT vopt;
					VariantInit(&vopt);
					vopt.vt = VT_I4;
					vopt.lVal = FOF_NO_UI;//4; // Do not display a progress dialog box

					VARIANT newV;
					VariantInit(&newV);
					newV.vt = VT_DISPATCH;
					newV.pdispVal = fi;
					pToFolder->CopyHere(newV, vopt);

					success = true;
				}
			}
		}
	}
	::CoUninitialize();

	return success;
}

bool Bundle::unzip(LPCWSTR zipFile, LPCWSTR unzipPath)
{
	CStringW _zipFile;
	std::wstring wstr = zipFile;
	std::wregex re(L"\\.[zZ][iI][pP]$");
	if (!std::regex_search(wstr, re)) {
		UUID uuid;
		if (::UuidCreate(&uuid) == RPC_S_OK) {
			RPC_WSTR lpszUuid = NULL;
			if (::UuidToString(&uuid, &lpszUuid) == RPC_S_OK) {
				TCHAR path[MAX_PATH];
				::GetTempPath(MAX_PATH, path);
				_zipFile = CStringW(path) + L"jp.co.roland.tmp." + LPCWSTR(lpszUuid) + L".zip";
				::RpcStringFree(&lpszUuid);
				if (::CopyFile(zipFile, _zipFile, FALSE)) {
					zipFile = _zipFile;
				}
			}
		}
	}

	CString commandLine;
	commandLine.Format(
		TEXT("powershell.exe -Command \"& { Expand-Archive -Force -Path '%s' -DestinationPath '%s'; If($? -eq $false){ exit 1 } } \""),
		LPCTSTR(CString(zipFile)), LPCTSTR(CString(unzipPath)));

	STARTUPINFO si;
	memset(&si, 0, sizeof(si));
	si.cb = sizeof(STARTUPINFO);
	si.dwFlags = STARTF_USESHOWWINDOW;
	si.wShowWindow = SW_HIDE;

	PROCESS_INFORMATION pi;
	memset(&pi, 0, sizeof(pi));
	DWORD exit_code = 2;
	if (::CreateProcess(NULL, commandLine.GetBuffer(), NULL, NULL, FALSE,
		0, NULL, NULL, &si, &pi)) {
		::WaitForSingleObject(pi.hProcess, INFINITE);
		::GetExitCodeProcess(pi.hProcess, &exit_code);
		::CloseHandle(pi.hProcess);
		::CloseHandle(pi.hThread);
	}

	commandLine.ReleaseBuffer();

	if (!_zipFile.IsEmpty()) {
		::DeleteFile(_zipFile);
	}

	return (exit_code == 0);
}
