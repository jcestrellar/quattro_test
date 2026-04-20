/*
 * @(#)Registry.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "Registry.h"
#include <tchar.h>

Registry::Registry(HKEY key, LPCTSTR subkey)
{
	hkey = NULL;

	::RegOpenKeyEx(key, subkey,
				0, KEY_QUERY_VALUE | KEY_WOW64_64KEY, &hkey);
}

Registry::Registry(LPCTSTR subkey)
{
	hkey = NULL;

	DWORD dwDisposition;
	::RegCreateKeyEx(HKEY_CURRENT_USER, subkey,
				0, NULL, REG_OPTION_NON_VOLATILE,
				KEY_ALL_ACCESS, NULL, &hkey, &dwDisposition);
}

Registry::~Registry()
{
	if (hkey) {
		::RegCloseKey(hkey);
	}
}

LPTSTR Registry::loadString(LPCTSTR keyname)
{
	if (hkey == NULL)
		return NULL;

	DWORD type = REG_SZ;
	DWORD length = 0;

	if (::RegQueryValueEx(hkey, keyname, NULL, &type, NULL, &length) != ERROR_SUCCESS)
		return NULL;
	if (type != REG_SZ)
		return NULL;

	LPTSTR buffer = (LPTSTR)(new BYTE[length + 2]);
	memset(buffer, 0, length + 2);
	if (::RegQueryValueEx(hkey, keyname, NULL, &type, (LPBYTE)buffer, &length) != ERROR_SUCCESS) {
		delete [] buffer;
		return NULL;
	}

	return buffer;
}

void Registry::setString(LPCTSTR keyname, LPCTSTR buffer)
{
	if (hkey != NULL) {
		::RegSetValueEx(hkey, keyname, 0, REG_SZ,
			(LPBYTE)buffer, (DWORD)((_tcslen(buffer) + 1) * sizeof(TCHAR)));
	}
}

bool Registry::getValue(LPCTSTR keyname, LPLONG value)
{
	if (hkey == NULL)
		return NULL;

	DWORD type = REG_DWORD;
	DWORD length = sizeof(DWORD);

	if (::RegQueryValueEx(hkey, keyname, NULL, &type, (LPBYTE)value, &length) != ERROR_SUCCESS)
		return false;
	if ((type != REG_DWORD) || (length != sizeof(DWORD)))
		return false;

	return true;
}

void Registry::setValue(LPCTSTR keyname, LONG data)
{
	if (hkey != NULL) {
		::RegSetValueEx(hkey, keyname, 0, REG_DWORD, (LPBYTE)&data, sizeof(DWORD));
	}
}

void Registry::deleteValue(LPCTSTR keyname)
{
	if (hkey != NULL) {
		::RegDeleteValue(hkey, keyname);
	}
}
