/*
 * @(#)RWCDiscovery.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __RWC_DISCOVERY_H__
#define __RWC_DISCOVERY_H__

#include "RWCProtocol.h"
#include "../Network/Socket.h"
#include "../Common/Thread.h"
#include <vector>

class RWCDiscoveryDelegate
{
  public:
	virtual ~RWCDiscoveryDelegate() { }

	/* @required */
	virtual void discoveryDeviceDidFound(const RWC_DEV_INFO* device) = 0;
};

class RWCDiscovery : public Thread
{
  public:
	RWCDiscovery();
	virtual ~RWCDiscovery();

	void delegate(RWCDiscoveryDelegate* obj);
	RWCDiscoveryDelegate* delegate() const;

	void search();

	/* for class Reply */
	void incremantReplyObjects();
	void decremantReplyObjects();
	void appendDevice(RWC_DEV_INFO* device);

  private:
	Mutex mtx_server;
	Mutex mtx_devices;

	RWCDiscoveryDelegate* mp_delegate;
	ServerSocket* mp_listeningSocket;
	std::vector<RWC_DEV_INFO> m_devices;

	LONG m_replyObjects;

	void removeAllDevices();

	void startServer();
	void stopServer();
	void run();
};

/* Inline function declarations */

inline RWCDiscovery::RWCDiscovery()
{
	mp_delegate = 0;
	mp_listeningSocket = 0;
	m_replyObjects = 0;
}
inline RWCDiscovery::~RWCDiscovery()
{
	stopServer();
	while (m_replyObjects != 0) ;
}

inline void RWCDiscovery::delegate(RWCDiscoveryDelegate* obj)
	{ mp_delegate = obj; }
inline RWCDiscoveryDelegate* RWCDiscovery::delegate() const
	{ return mp_delegate; }

inline void RWCDiscovery::incremantReplyObjects()
	{ InterlockedIncrement(&m_replyObjects); }
inline void RWCDiscovery::decremantReplyObjects()
	{ InterlockedDecrement(&m_replyObjects); }

#endif /* __RWC_DISCOVERY_H__ */
