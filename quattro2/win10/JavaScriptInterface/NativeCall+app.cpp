//
//  NativeCall+app.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"
#include "../Common/Bundle.h"
#include "../Common/Registry.h"
#include "../Common/Crypto.h"
#include <appmodel.h>

static LPCWSTR OBJ_NAME = L"app";

enum {
	dispid_app_startevent,
	dispid_app_getevent,
	dispid_app_device,
	dispid_app_version,
	dispid_app_locale,
	dispid_app_storage,
	dispid_app_storage2,
	dispid_app_clipboard,
	dispid_app_importfile,
	dispid_app_exportfile,
	dispid_app_barcode,
	dispid_app_webauth,
	dispid_app_control,
	dispid_app_locate,
	dispid_app_dragdrop,
	dispid_app_dropfiles,
	dispid_app_exit,
};

NativeCall_app::NativeCall_app(NativeObjects* objs) : NativeCall(objs)
{
	set(L"startevent", dispid_app_startevent);
	set(L"getevent",   dispid_app_getevent);
	set(L"device",     dispid_app_device);
	set(L"version",    dispid_app_version);
	set(L"locale",     dispid_app_locale);
	set(L"storage",    dispid_app_storage);
	set(L"storage2",   dispid_app_storage2);
	set(L"clipboard",  dispid_app_clipboard);
	set(L"importfile", dispid_app_importfile);
	set(L"exportfile", dispid_app_exportfile);
	set(L"barcode",    dispid_app_barcode);
	set(L"webauth",    dispid_app_webauth);
	set(L"control",    dispid_app_control);
	set(L"locate",     dispid_app_locate);
	set(L"dragdrop",   dispid_app_dragdrop);
	set(L"dropfiles",  dispid_app_dropfiles);
	set(L"exit",       dispid_app_exit);
}

LPCWSTR NativeCall_app::InterfaceName() const { return OBJ_NAME; }

void NativeCall_app::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_app_startevent:
		{
			if (args.size() > 0) {
				mp_objs->mp_intf->startEvent(args[0]->GetBoolValue());
			}
			ret = true;
		}
		break;
		case dispid_app_getevent:
		{
			std::wstring ev = mp_objs->mp_intf->getEvent();
			ret = ev.c_str();
		}
		break;
		case dispid_app_device:
		{
			CStringW model = L"(Windows PC)";
			CStringW buildNumber = L"Win10+ 0.0";
			CStringW deviceId;
			{
				Registry reg(HKEY_LOCAL_MACHINE, TEXT("SYSTEM\\CurrentControlSet\\Control\\SystemInformation"));
				LPTSTR productName = reg.loadString(TEXT("SystemProductName"));
				if (productName) {
					model = productName;
					delete [] productName;
				}
			}
			{
				Registry reg(HKEY_LOCAL_MACHINE, TEXT("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"));
				LPTSTR currentBuild = reg.loadString(TEXT("CurrentBuild"));
				if (currentBuild) {
					CStringW build(currentBuild);
					LONG revision = 0;
					reg.getValue(TEXT("UBR"), &revision);
					buildNumber.Format(L"Win10+ %s.%lu", LPCWSTR(build), revision);
					delete [] currentBuild;
				}
			}
			{
				Registry reg(TEXT("Software\\Roland"));
				LPTSTR p = reg.loadString(TEXT("deviceId"));
				if (p) {
					deviceId = CStringW(p);
					delete [] p;
				} else {
					deviceId = Crypto::uuidgen().MakeLower();
					reg.setString(TEXT("deviceId"), CString(deviceId));
				}
			}
			picojson::object o;
			o[L"model"] = (picojson::value)std::wstring(model);
			o[L"os"] = (picojson::value)std::wstring(buildNumber);
			o[L"id"] = (picojson::value)std::wstring(deviceId);
			picojson::value v = picojson::value(o);
			ret = v.serialize().c_str();
		}
		break;
		case dispid_app_version:
		{
			HRSRC rsrc = ::FindResource(NULL, (LPCTSTR)VS_VERSION_INFO, RT_VERSION);
			DWORD size = ::SizeofResource(NULL, rsrc);
			BYTE* version = new BYTE[size];
			HGLOBAL global = ::LoadResource(NULL, rsrc);
			memcpy(version, ::LockResource(global), size);
			::FreeResource(global);

			UINT queryLen;
			VS_FIXEDFILEINFO* pFileInfo;
			::VerQueryValue(version, TEXT("\\"), (LPVOID*)&pFileInfo, &queryLen);
			WORD* pLangCode;
			::VerQueryValue(version, TEXT("\\VarFileInfo\\Translation"), (LPVOID*)&pLangCode, &queryLen);
			CStringW subBlock;
			subBlock.Format(TEXT("\\StringFileInfo\\%04X%04X\\FileVersion"), pLangCode[0], pLangCode[1]);
			wchar_t* pVerStr;
			::VerQueryValueW(version, subBlock, (LPVOID*)&pVerStr, &queryLen);

			CStringW ctime;
			CStringW mtime;
			{
				TCHAR path[MAX_PATH];
				::GetModuleFileName(NULL, path, MAX_PATH);
				WIN32_FIND_DATA wfd;
				HANDLE find = ::FindFirstFile(path, &wfd);
				if (find != INVALID_HANDLE_VALUE) {
					SYSTEMTIME utcCreate, utcWrite;
					::FileTimeToSystemTime(&wfd.ftCreationTime, &utcCreate);
					::FileTimeToSystemTime(&wfd.ftLastWriteTime, &utcWrite);
					ctime.Format(L"%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
						utcCreate.wYear, utcCreate.wMonth, utcCreate.wDay,
						utcCreate.wHour, utcCreate.wMinute, utcCreate.wSecond, utcCreate.wMilliseconds);
					mtime.Format(L"%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
						utcWrite.wYear, utcWrite.wMonth, utcWrite.wDay,
						utcWrite.wHour, utcWrite.wMinute, utcWrite.wSecond, utcWrite.wMilliseconds);
					::FindClose(find);
				}
				// for MSIX package
				HRESULT hr = ::SHGetFolderPath(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, path);
				if (SUCCEEDED(hr)) {
					UINT32 length = 0;
					LONG ret = ::GetCurrentPackageFamilyName(&length, NULL);
					if (ret == ERROR_INSUFFICIENT_BUFFER) {
						TCHAR name[MAX_PATH];
						ret = ::GetCurrentPackageFamilyName(&length, name);
						if (ret == ERROR_SUCCESS) {
							WIN32_FIND_DATA wfd;
							HANDLE find = ::FindFirstFile((CString(path) + TEXT("\\Packages\\") + name), &wfd);
							if (find != INVALID_HANDLE_VALUE) {
								SYSTEMTIME utcCreate;
								::FileTimeToSystemTime(&wfd.ftCreationTime, &utcCreate);
								ctime.Format(L"%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
									utcCreate.wYear, utcCreate.wMonth, utcCreate.wDay,
									utcCreate.wHour, utcCreate.wMinute, utcCreate.wSecond, utcCreate.wMilliseconds);
								::FindClose(find);
							}
						}
					}
				}
			}

			picojson::object o;
			o[L"name"] = (picojson::value)std::wstring(pVerStr);
			o[L"code"] = (picojson::value)double(LOWORD(pFileInfo->dwFileVersionLS));
			o[L"ctime"] = (picojson::value)std::wstring(ctime);
			o[L"mtime"] = (picojson::value)std::wstring(mtime);
			picojson::value v = picojson::value(o);
			ret = v.serialize().c_str();

			delete[] version;
		}
		break;
		case dispid_app_locale:
		{
			wchar_t locale[LOCALE_NAME_MAX_LENGTH]; locale[0] = L'0';
			::GetLocaleInfoW(::GetUserDefaultUILanguage(), LOCALE_SNAME, locale, LOCALE_NAME_MAX_LENGTH);
			ret = locale;
		}
		break;
		case dispid_app_storage:
		{
			CString appName = mp_objs->mp_intf->getAppName();
			Registry reg(TEXT("Software\\Roland\\") + appName);
			if (args.size() > 0) {
				CString pref(args[0]->GetStringValue().c_str());
				reg.setString(TEXT("pref"), pref);
			} else {
				ret = L"";
				LPTSTR p = reg.loadString(TEXT("pref"));
				if (p) {
					ret = CStringW(p);
					delete [] p;
				}
			}
		}
		break;
		case dispid_app_storage2:
		{
			ret = L""; if (args.size() == 0) break;

			Bundle bundle(mp_objs->mp_intf->getAppName());
			CString key(args[0]->GetStringValue().c_str());
			CString path = bundle.getLocalPath(TEXT("pref")) + key;
			if (args.size() > 1) {
				CStringW data(args[1]->GetStringValue().c_str());
				HANDLE hFile = ::CreateFile(path, GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
				if (hFile != INVALID_HANDLE_VALUE) {
					CStringA text = UTF::UTF16toUTF8(data);
					LPCSTR buf = text;
					int buflen = (int)strlen(buf);
					DWORD bytes;
					::WriteFile(hFile, buf, buflen, &bytes, NULL);
					::CloseHandle(hFile);
				}
			} else {
				HANDLE hFile = ::CreateFile(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
				if (hFile != INVALID_HANDLE_VALUE) {
					DWORD datalen = ::GetFileSize(hFile, NULL);
					BYTE* data = new BYTE[datalen + 1];
					DWORD bytes;
					if (data && ::ReadFile(hFile, data, datalen, &bytes, NULL)) {
						data[bytes] = '\0';
						ret = UTF::UTF8toUTF16(CStringA(data));
					}
					::CloseHandle(hFile);
					delete [] data;
				}
			}
		}
		break;
		case dispid_app_clipboard:
		{
			if (args.size() > 0) {
				mp_objs->m_clipboard = args[0]->GetStringValue().c_str();
			} else {
				ret = mp_objs->m_clipboard;
			}
		}
		break;
		case dispid_app_importfile:
		case dispid_app_exportfile:
		case dispid_app_barcode:
		{
			/* not supported */
			break;
		}
		case dispid_app_webauth:
		{
			CString url = (args.size() > 0) ? args[0]->GetStringValue().c_str() : TEXT("");
			CString scheme = (args.size() > 1) ? args[1]->GetStringValue().c_str() : TEXT("");
			mp_objs->mp_intf->webauth(url, scheme);
		}
		break;
		case dispid_app_control:
		{
			mp_objs->mp_intf->control(CString(args[0]->GetStringValue().c_str()));
		}
		break;
		case dispid_app_locate:
		{
			mp_objs->mp_intf->locate(CString(args[0]->GetStringValue().c_str()));
		}
		break;
		case dispid_app_dragdrop:
		{
			mp_objs->mp_intf->dragdrop(args[0]->GetBoolValue());
		}
		break;
		case dispid_app_dropfiles:
		{
			picojson::array a;
			for (size_t i = 0; i < mp_objs->m_dropfiles.size(); i++) {
				a.push_back((picojson::value)mp_objs->m_dropfiles[i]);
			}
			picojson::value v = picojson::value(a);
			ret = v.serialize().c_str();
		}
		break;
		case dispid_app_exit:
		{
			mp_objs->mp_intf->exit();
		}
		break;

	}
}
