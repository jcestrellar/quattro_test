/*
 * @(#)VolumeEject.h
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */
#ifndef __VOLUME_EJECT_H__
#define __VOLUME_EJECT_H__

#include <shlobj.h>
#include "atlstr.h"

class VolumeEject {

  public:
	BOOL ejectVolume(TCHAR cDriveLetter);

  private:
	HANDLE openVolume(TCHAR cDriveLetter);
	BOOL closeVolume(HANDLE hVolume);
	BOOL lockVolume(HANDLE hVolume);
	BOOL dismountVolume(HANDLE hVolume);
	BOOL preventRemovalOfVolume(HANDLE hVolume, BOOL fPreventRemoval);
	BOOL autoEjectVolume(HANDLE hVolume);
};

#endif /* __VOLUME_EJECT_H__ */
