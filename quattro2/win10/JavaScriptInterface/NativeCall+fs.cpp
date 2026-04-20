//
//  NativeCall+fs.cpp
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"
#include "../Common/Bundle.h"
#include "../Common/VolumeEject.h"

static LPCWSTR OBJ_NAME = L"fs";

static LPCWSTR LocalFSVolumeKey    = L"volume";
static LPCWSTR LocalFSMountKey     = L"mount";

static LPCWSTR LocalFSNameKey      = L"name";
static LPCWSTR LocalFSSizeKey      = L"size";
static LPCWSTR LocalFSDirectoryKey = L"directory";
static LPCWSTR LocalFSReadableKey  = L"readable";
static LPCWSTR LocalFSWritableKey  = L"writable";
static LPCWSTR LocalFSDeletableKey = L"deletable";

static LPCWSTR LocalFSOffsetKey    = L"offset";
static LPCWSTR LocalFSLengthKey    = L"length";

static void attributes(picojson::object& o, WIN32_FIND_DATA& wfd);
static void deleteFiles(LPCTSTR folderName);
static bool read(LPCTSTR path, LONG offset, LONG length, bool isString, CStringW& result);
static bool write(LPCTSTR path, const CStringW& str, bool isString, bool append);

enum {
	dispid_fs_separator,
	dispid_fs_path,
	dispid_fs_volumes,
	dispid_fs_contents,
	dispid_fs_stat,
	dispid_fs_exec,
	dispid_fs_mkdir,
	dispid_fs_unlink,
	dispid_fs_copy,
	dispid_fs_move,
	dispid_fs_unzip,
	dispid_fs_readString,
	dispid_fs_readData,
	dispid_fs_writeString,
	dispid_fs_writeData,
	dispid_fs_appendString,
	dispid_fs_appendData,
	dispid_fs_openfilename,
	dispid_fs_savefilename,
	dispid_fs_choosefolder,
	dispid_fs_unmount,
	dispid_fs_watch,
};

NativeCall_fs::NativeCall_fs(NativeObjects* objs) : NativeCall(objs)
{
	set(L"separator",    dispid_fs_separator);
	set(L"path",         dispid_fs_path);
	set(L"volumes",      dispid_fs_volumes);
	set(L"contents",     dispid_fs_contents);
	set(L"stat",         dispid_fs_stat);
	set(L"exec",         dispid_fs_exec);
	set(L"mkdir",        dispid_fs_mkdir);
	set(L"unlink",       dispid_fs_unlink);
	set(L"copy",         dispid_fs_copy);
	set(L"move",         dispid_fs_move);
	set(L"unzip",        dispid_fs_unzip);
	set(L"readString",   dispid_fs_readString);
	set(L"readData",     dispid_fs_readData);
	set(L"writeString",  dispid_fs_writeString);
	set(L"writeData",    dispid_fs_writeData);
	set(L"appendString", dispid_fs_appendString);
	set(L"appendData",   dispid_fs_appendData);
	set(L"openfilename", dispid_fs_openfilename);
	set(L"savefilename", dispid_fs_savefilename);
	set(L"choosefolder", dispid_fs_choosefolder);
	set(L"unmount",      dispid_fs_unmount);
	set(L"watch",        dispid_fs_watch);
}

LPCWSTR NativeCall_fs::InterfaceName() const { return OBJ_NAME; }

void NativeCall_fs::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	TCHAR buf[MAX_PATH];

	switch (dispid) {

		case dispid_fs_separator:
		{
			ret = L"\\";
			break;
		}
		case dispid_fs_path:
		{
			CString where(args[0]->GetStringValue().c_str());

			int folder = CSIDL_MYDOCUMENTS;

			if (where.CompareNoCase(TEXT("home")) == 0) {
				folder = CSIDL_PROFILE;
			} else if (where.CompareNoCase(TEXT("music")) == 0) {
				folder = CSIDL_MYMUSIC;
			} else if (where.CompareNoCase(TEXT("movies")) == 0) {
				folder = CSIDL_MYVIDEO;
			} else if (where.CompareNoCase(TEXT("pictures")) == 0) {
				folder = CSIDL_MYPICTURES;
			} else if (where.CompareNoCase(TEXT("downloads")) == 0) {
				LPWSTR pwstr;
				if (::SHGetKnownFolderPath(FOLDERID_Downloads, 0, NULL, &pwstr) == S_OK) {
					ret = CStringW(pwstr) + L"\\";
					break;
				}
			} else if (where.CompareNoCase(TEXT("library")) == 0) {
				Bundle bundle(mp_objs->mp_intf->getAppName());
				ret = CStringW(bundle.getLocalPath(TEXT("data")));
				break;
			} else if (where.CompareNoCase(TEXT("temporary")) == 0) {
				::GetTempPath(MAX_PATH, buf);
				ret = CStringW(buf);
				break;
			} else if (where.CompareNoCase(TEXT("bundle")) == 0) {
				Bundle bundle(mp_objs->mp_intf->getAppName());
				ret = CStringW(bundle.getBundlePath());
				break;
			}

			if (::SHGetFolderPath(NULL, folder, NULL, 0, buf) != S_OK) {
				::SHGetFolderPath(NULL, CSIDL_MYDOCUMENTS, NULL, 0, buf);
			}
			ret = (CStringW(buf) + "\\");
			break;
		}
		case dispid_fs_volumes:
		{
			if (!::GetLogicalDriveStrings(MAX_PATH, buf))
				throw new NativeException;

			picojson::array a;

			for (LPCTSTR p = buf; *p != TEXT('\0'); p++) {
				CString drive;
				do drive += *p;
				while (*(++p) != TEXT('\0')) ;

				TCHAR volume[MAX_PATH];
				DWORD dwLength, dwFlags;
				if (!::GetVolumeInformation(drive, volume, MAX_PATH, NULL, &dwLength, &dwFlags, NULL, 0)) {
					volume[0] = TEXT('\0');
				}
				picojson::object o;
				o[LocalFSMountKey]  = (picojson::value)std::wstring(CStringW(drive));
				o[LocalFSVolumeKey] = (picojson::value)std::wstring(CStringW(volume));
				a.push_back(picojson::value(o));
			}

			picojson::value v = picojson::value(a);
			ret = v.serialize().c_str();
			break;
		}
		case dispid_fs_contents:
		{
			CString path(args[0]->GetStringValue().c_str());
			path.TrimRight(TEXT('\\'));

			if (args.size() > 1) {
				path += L"\\*."; path += CString(args[1]->GetStringValue().c_str());
			} else {
				path += L"\\*";
			}

			picojson::array a;

			WIN32_FIND_DATA wfd;
			HANDLE find = ::FindFirstFile(path, &wfd);
			if (find == INVALID_HANDLE_VALUE) throw new NativeException;
			do {
				if (wfd.dwFileAttributes &(FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM))
					continue;
				if (!_tcscmp(wfd.cFileName, TEXT(".")) || !_tcscmp(wfd.cFileName, TEXT("..")))
					continue;
				picojson::object o;
				attributes(o, wfd);
				a.push_back(picojson::value(o));
			} while (::FindNextFile(find, &wfd));
			::FindClose(find);

			picojson::value v = picojson::value(a);
			ret = v.serialize().c_str();
			break;
		}
		case dispid_fs_stat:
		{
			CString path(args[0]->GetStringValue().c_str());
			path.TrimRight(TEXT('\\'));

			WIN32_FIND_DATA wfd;
			HANDLE find = ::FindFirstFile(path, &wfd);
			if (find == INVALID_HANDLE_VALUE) throw new NativeException;
			::FindClose(find);

			picojson::object o;
			attributes(o, wfd);
			picojson::value v = picojson::value(o);
			ret = v.serialize().c_str();
			break;
		}
		case dispid_fs_exec:
		{
			::ShellExecute(NULL, TEXT("open"), CString(args[0]->GetStringValue().c_str()), NULL, NULL, SW_SHOWNORMAL);
			break;
		}
		case dispid_fs_mkdir:
		{
			int err = ::SHCreateDirectory(NULL, CStringW(args[0]->GetStringValue().c_str()));
			if ((err != ERROR_SUCCESS) && (err != ERROR_ALREADY_EXISTS))
				throw new NativeException;
			break;
		}
		case dispid_fs_unlink:
		{
			CString path(args[0]->GetStringValue().c_str());
			if (::PathIsDirectory(path)) {
				deleteFiles(path); /* recursively */
				if (!::RemoveDirectory(path))
					throw new NativeException;
			} else {
				if (!::DeleteFile(path))
					throw new NativeException;
			}
			break;
		}
		case dispid_fs_copy:
		{
			CString src(args[0]->GetStringValue().c_str());
			CString dst(args[1]->GetStringValue().c_str());
			if (!::CopyFile(src, dst, TRUE))
				throw new NativeException;
			break;
		}
		case dispid_fs_move:
		{
			CString src(args[0]->GetStringValue().c_str());
			CString dst(args[1]->GetStringValue().c_str());
			if (!::MoveFile(src, dst))
				throw new NativeException;
			break;
		}
		case dispid_fs_unzip:
		{
			CStringW src(args[0]->GetStringValue().c_str());
			CStringW dst(args[1]->GetStringValue().c_str());
			if (!Bundle::unzip(src, dst))
				throw new NativeException;
			break;
		}
		case dispid_fs_readString:
		{
			CStringW text;
			if (!read(CString(args[0]->GetStringValue().c_str()), 0, -1, true, text))
				throw new NativeException;
			ret = text;
			break;
		}
		case dispid_fs_readData:
		{
			LONG offset = 0, length = -1;
			if (args.size() > 1) {
				picojson::value v;
				picojson::parse(v, LPCWSTR(args[1]->GetStringValue().c_str()));
				picojson::object& o = v.get<picojson::object>();
				offset = int(o[LocalFSOffsetKey].get<double>());
				length = int(o[LocalFSLengthKey].get<double>());
			}

			CStringW data;
			if (!read(CString(args[0]->GetStringValue().c_str()), offset, length, false, data))
				throw new NativeException;
			ret = data;
			break;
		}
		case dispid_fs_writeString:
		{
			if (!write(CString(args[0]->GetStringValue().c_str()), CStringW(args[1]->GetStringValue().c_str()), true, false))
				throw new NativeException;
			break;
		}
		case dispid_fs_writeData:
		{
			if (!write(CString(args[0]->GetStringValue().c_str()), CStringW(args[1]->GetStringValue().c_str()), false, false))
				throw new NativeException;
			break;
		}
		case dispid_fs_appendString:
		{
			if (!write(CString(args[0]->GetStringValue().c_str()), CStringW(args[1]->GetStringValue().c_str()), true, true))
				throw new NativeException;
			break;
		}
		case dispid_fs_appendData:
		{
			if (!write(CString(args[0]->GetStringValue().c_str()), CStringW(args[1]->GetStringValue().c_str()), false, true))
				throw new NativeException;
			break;
		}
		case dispid_fs_openfilename:
		{
			CString filter;
			CString initDir;
			if (args.size() > 0) {
				std::wstring str;
				std::wstring ptn;
				picojson::value v;
				picojson::parse(v, LPCWSTR(args[0]->GetStringValue().c_str()));
				picojson::array& a = v.get<picojson::array>();
				for (picojson::array::iterator it = a.begin(); it != a.end(); it++) {
					std::wstring ext = it->get<std::wstring>();
					str += (ext + L"/");
					ptn += (L"*." + ext + L";");
				}
				if (!str.empty()) {
					str.pop_back();
					ptn.pop_back();
					str += L"\f" + ptn + L"\f";
					filter = str.c_str();
				}
			}
			if (args.size() > 1) initDir = CString(args[1]->GetStringValue().c_str());
			mp_objs->mp_intf->openPanel(filter, initDir);
			break;
		}
		case dispid_fs_savefilename:
		{
			CString name, ext;
			if (args.size() > 0) name = CString(args[0]->GetStringValue().c_str());
			if (args.size() > 1) ext = CString(args[1]->GetStringValue().c_str());
			mp_objs->mp_intf->savePanel(name, ext);
			break;
		}
		case dispid_fs_choosefolder:
		{
			CString initDir;
			if (args.size() > 0) initDir = CString(args[0]->GetStringValue().c_str());
			mp_objs->mp_intf->chooseFolder(initDir);
			break;
		}
		case dispid_fs_unmount:
		{
			CStringW ev;
			CString drv(args[0]->GetStringValue().c_str());
			VolumeEject eject;
			if (eject.ejectVolume(drv[0])) {
				ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"unmounted", CStringW(drv));
			} else {
				NativeException error;
				ev.Format(L"%s\f%s\f%s\f%s", OBJ_NAME, L"unmountfailed", CStringW(drv), error.message);
			}
			mp_objs->mp_intf->postEvent(ev);
			break;
		}
		case dispid_fs_watch:
		{
			mp_objs->fsevent->observe(args[0]->GetStringValue());
			break;
		}
	}
}

static void attributes(picojson::object& o, WIN32_FIND_DATA& wfd)
{
	bool directory = !!(wfd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY);
	bool readable  = true;
	bool writable  = !(wfd.dwFileAttributes & FILE_ATTRIBUTE_READONLY);
	bool deletable = !(wfd.dwFileAttributes & FILE_ATTRIBUTE_READONLY);

	o[LocalFSNameKey]      = (picojson::value)std::wstring(CStringW(wfd.cFileName));
	o[LocalFSSizeKey]      = (picojson::value)double(wfd.nFileSizeLow);
	o[LocalFSDirectoryKey] = (picojson::value)bool(directory);
	o[LocalFSReadableKey]  = (picojson::value)bool(readable);
	o[LocalFSWritableKey]  = (picojson::value)bool(writable);
	o[LocalFSDeletableKey] = (picojson::value)bool(deletable);
}

static void deleteFiles(LPCTSTR folderName)
{
	CString folder = folderName;
	folder.TrimRight(TEXT('\\'));

	WIN32_FIND_DATA wfd;
	HANDLE find = ::FindFirstFile(LPCTSTR(folder + TEXT("\\*")), &wfd);
	if (find == INVALID_HANDLE_VALUE) return;
	do {
		if (!_tcscmp(wfd.cFileName, TEXT(".")) || !_tcscmp(wfd.cFileName, TEXT("..")))
			continue;
		CString path = folder + TEXT("\\") + wfd.cFileName;
		if (wfd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
			deleteFiles(path);
			if (!::RemoveDirectory(path))
				throw new NativeException;
		} else {
			if (!::DeleteFile(path))
				throw new NativeException;
		}
	} while (::FindNextFile(find, &wfd));
	::FindClose(find);
}

static bool read(LPCTSTR path, LONG offset, LONG length, bool isString, CStringW& result)
{
	bool success = false;

	HANDLE hFile = ::CreateFile(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile != INVALID_HANDLE_VALUE) {

		if (offset) { ::SetFilePointer(hFile, offset, NULL, FILE_BEGIN); }

		DWORD datalen = (length < 0) ? ::GetFileSize(hFile, NULL) : length;
		BYTE* data = new BYTE[datalen + 1];

		DWORD bytes;
		if (data && ::ReadFile(hFile, data, datalen, &bytes, NULL)) {
			if (isString) {
				data[bytes] = '\0';
				result = UTF::UTF8toUTF16(CStringA(data));
			} else {
				result = HEX::text(data, bytes);
			}
			success = true;
		}
		::CloseHandle(hFile);

		delete [] data;
	}
	return success;
}

static bool write(LPCTSTR path, const CStringW& str, bool isString, bool append)
{
	bool success = false;

	DWORD flag = append ? OPEN_ALWAYS : CREATE_ALWAYS;

	HANDLE hFile = ::CreateFile(path, GENERIC_WRITE, FILE_SHARE_READ, NULL, flag, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile != INVALID_HANDLE_VALUE) {
		if (append) ::SetFilePointer(hFile, 0, 0, FILE_END);

		CStringA text;
		std::string data;

		LPCSTR buf;
		int buflen;
		if (isString) {
			text = UTF::UTF16toUTF8(str);
			buf = text;
			buflen = (int)strlen(text);
		} else {
			data = HEX::data(str);
			buf = data.c_str();
			buflen = (int)data.length();
		}

		DWORD bytes;
		if (::WriteFile(hFile, buf, buflen, &bytes, NULL)) {
			success = true;
		}
		::CloseHandle(hFile);
	}

	return success;
}

void _FSEventDelegate::directoryDidUpdate(std::vector<std::wstring> paths)
{
	picojson::array a;
	for (std::vector<std::wstring>::iterator iter = paths.begin(); iter != paths.end(); iter++) {
		a.push_back((picojson::value)*iter);
	}
	picojson::value v = picojson::value(a);

	CStringW ev;
	ev.Format(L"%s\f%s\f%s", OBJ_NAME, L"watch", v.serialize().c_str());
	mp_intf->postEvent(ev);
}
