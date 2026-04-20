/*
 * @(#)Bundle.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __BUNDLE_H__
#define __BUNDLE_H__

#include <windows.h>
#include <atlstr.h>
#include "Thread.h"

class Bundle : public Thread
{
  public:
	Bundle(LPCTSTR appName) : m_appName(appName),
		m_wnd(NULL), m_bitmap(NULL), m_bundleIdentifier(0), m_clickKey(0) {}
	CString getBundlePath() const;
	CString getLocalPath(LPCTSTR folder = NULL) const;
	bool copyResource(HINSTANCE hInstance, UINT bundleIdentifier);

	static bool unzip(LPCWSTR zipFile, LPCWSTR unzipPath);

	/* copyResource with splash window */
	bool copyResource(HINSTANCE hInstance, UINT bundleIdentifier, UINT bmpIdentifier);

	void run();
	HBITMAP getBitmap() const;
	WPARAM getClickKey() const;
	void setClickKey(WPARAM wParam);

  private:
	CString m_appName;

	HWND m_wnd;
	HBITMAP m_bitmap;
	UINT m_bundleIdentifier;
	WPARAM m_clickKey;

	bool extract(CString zipFile);

};

/* Inline function declarations */

inline HBITMAP Bundle::getBitmap() const
	{ return m_bitmap; }
inline WPARAM Bundle::getClickKey() const
	{ return m_clickKey; }
inline void Bundle::setClickKey(WPARAM wParam)
	{ m_clickKey = wParam; }

#endif /* __BUNDLE_H__ */
