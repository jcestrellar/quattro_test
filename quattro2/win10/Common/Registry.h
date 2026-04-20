/*
 * @(#)Registry.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __REGISTRY_H__
#define __REGISTRY_H__

#include <windows.h>

class Registry
{
  public:
	Registry(HKEY key, LPCTSTR subkey);
	Registry(LPCTSTR subkey);
	~Registry();
	LPTSTR loadString(LPCTSTR keyname);
	void setString(LPCTSTR keyname, LPCTSTR buffer);
	bool getValue(LPCTSTR keyname, LPLONG value);
	void setValue(LPCTSTR keyname, LONG value);
	void deleteValue(LPCTSTR keyname);

  private:
	HKEY hkey;
};

#endif /* __REGISTRY_H__ */
