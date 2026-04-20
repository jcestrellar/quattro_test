/*
 * @(#)NetServiceDiscovery.h
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __NET_SERVICE_DISCOVERY_H__
#define __NET_SERVICE_DISCOVERY_H__

#include <windows.h>
#include <windns.h>
#include <atlstr.h>
#include <vector>

class NetServiceDiscoveryDelegate
{
  public:
	virtual ~NetServiceDiscoveryDelegate() { }

	/* @optional */
	virtual void netServiceDidResolve(CString name, CString addr, int port) {}
	virtual void netServiceDidStopSearch(DWORD errorCode) {}
};

class NetServiceDiscovery
{
  public:
	NetServiceDiscovery();
	virtual ~NetServiceDiscovery() { };

	void delegate(NetServiceDiscoveryDelegate* obj);
	NetServiceDiscoveryDelegate* delegate() const;

	bool search(const CString queryName);
	void stop();

	void stopped(const DWORD errorCode);
	void resolved(const DNS_RECORD *records);

  private:
	NetServiceDiscoveryDelegate* mp_delegate;
	std::vector<CString> m_services;

	DNS_SERVICE_CANCEL* mp_cancel;
};

/* Inline function declarations */

inline NetServiceDiscovery::NetServiceDiscovery() : mp_delegate(0), mp_cancel(0)
	{ }

inline void NetServiceDiscovery::delegate(NetServiceDiscoveryDelegate* obj)
	{ mp_delegate = obj; }
inline NetServiceDiscoveryDelegate* NetServiceDiscovery::delegate() const
	{ return mp_delegate; }

#endif /* __NET_SERVICE_DISCOVERY__ */
