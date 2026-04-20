/*
 * @(#)VolumeEject.cpp
 *
 * Copyright 2014 Roland Corporation, Japan. All rights reserved.
 */

#include "VolumeEject.h"

namespace {

#define LOCK_TIMEOUT		10000
#define LOCK_RETRIES		20

	LPCTSTR szVolumeFormat = TEXT("\\\\.\\%c:");
	LPCTSTR szRootFormat = TEXT("%c:\\");

};

HANDLE VolumeEject::openVolume(TCHAR cDriveLetter)
{
	HANDLE hVolume;
	UINT uDriveType;
	TCHAR szVolumeName[8];
	TCHAR szRootName[5];
	DWORD dwAccessFlags;

	wsprintf(szRootName, szRootFormat, cDriveLetter);

	uDriveType = GetDriveType(szRootName);

	switch(uDriveType) {
	case DRIVE_REMOVABLE:
		dwAccessFlags = GENERIC_READ | GENERIC_WRITE;
		break;
	case DRIVE_CDROM:
		dwAccessFlags = GENERIC_READ;
		break;
	default:
		return INVALID_HANDLE_VALUE;
	}

	wsprintf(szVolumeName, szVolumeFormat, cDriveLetter);

	hVolume = CreateFile( szVolumeName, dwAccessFlags,
						  FILE_SHARE_READ | FILE_SHARE_WRITE,
						  NULL,
						  OPEN_EXISTING,
						  0,
						  NULL );
	return hVolume;
}

BOOL VolumeEject::closeVolume(HANDLE hVolume)
{
	return CloseHandle(hVolume);
}

BOOL VolumeEject::lockVolume(HANDLE hVolume)
{
	DWORD dwBytesReturned;
	DWORD dwSleepAmount;
	int nTryCount;

	dwSleepAmount = LOCK_TIMEOUT / LOCK_RETRIES;

	for (nTryCount = 0; nTryCount < LOCK_RETRIES; nTryCount++) {
		if (DeviceIoControl( hVolume,
							 FSCTL_LOCK_VOLUME,
							 NULL, 0, NULL, 0,
							 &dwBytesReturned,
							 NULL ))
			return TRUE;
		Sleep(dwSleepAmount);
	}
	return FALSE;
}

BOOL VolumeEject::dismountVolume(HANDLE hVolume)
{
	DWORD dwBytesReturned;

	return DeviceIoControl( hVolume,
							FSCTL_DISMOUNT_VOLUME,
							NULL, 0,
							NULL, 0,
							&dwBytesReturned,
							NULL );
}

BOOL VolumeEject::preventRemovalOfVolume(HANDLE hVolume, BOOL fPreventRemoval)
{
	DWORD dwBytesReturned;
	PREVENT_MEDIA_REMOVAL PMRBuffer;

	PMRBuffer.PreventMediaRemoval = fPreventRemoval;

	return DeviceIoControl( hVolume,
							IOCTL_STORAGE_MEDIA_REMOVAL,
							&PMRBuffer, sizeof(PREVENT_MEDIA_REMOVAL),
							NULL, 0,
							&dwBytesReturned,
							NULL );
}

BOOL VolumeEject::autoEjectVolume(HANDLE hVolume)
{
	DWORD dwBytesReturned;

	return DeviceIoControl( hVolume,
							IOCTL_STORAGE_EJECT_MEDIA,
							NULL, 0,
							NULL, 0,
							&dwBytesReturned,
							NULL );
}

BOOL VolumeEject::ejectVolume(TCHAR cDriveLetter)
{
	HANDLE hVolume;
	BOOL fRemoveSafely = FALSE;
	BOOL fAutoEject = FALSE;

	hVolume = openVolume(cDriveLetter);

	if (hVolume == INVALID_HANDLE_VALUE)
		return FALSE;

	if (lockVolume(hVolume) && dismountVolume(hVolume)) {
		fRemoveSafely = TRUE;
		if (preventRemovalOfVolume(hVolume, FALSE) && autoEjectVolume(hVolume))
			fAutoEject = TRUE;
	}

	if (!closeVolume(hVolume))
		return FALSE;

	return TRUE;
}
