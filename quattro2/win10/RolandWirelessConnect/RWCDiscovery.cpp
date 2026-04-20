/*
 * @(#)Synchronous.cpp
 *
 * Copyright 2008 Roland Corporation, Japan. All rights reserved.
 */

#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include "RWCDiscovery.h"

static const char *RWCDeviceDiscoveryHeader = "RDDPv1";

const TCHAR* const RWCDeviceAddressKey      = TEXT("RWCDeviceAddressKey");
const TCHAR* const RWCDevicePortNoKey       = TEXT("RWCDevicePortNoKey");
const TCHAR* const RWCDeviceUIDKey          = TEXT("RWCDeviceUIDKey");
const TCHAR* const RWCDeviceCapsKey         = TEXT("RWCDeviceCapsKey");
const TCHAR* const RWCDeviceImageKey        = TEXT("RWCDeviceImageKey");
const TCHAR* const RWCDeviceStatusKey       = TEXT("RWCDeviceStatusKey");
const TCHAR* const RWCDeviceManufacturerKey = TEXT("RWCDeviceManufacturerKey");
const TCHAR* const RWCDeviceVersionKey      = TEXT("RWCDeviceVersionKey");
const TCHAR* const RWCDeviceNameKey         = TEXT("RWCDeviceNameKey");

/* class Reply */

class Reply : public Thread
{
  public:
	Reply(RWCDiscovery* discovery, Socket* socket);
	virtual ~Reply();

  private:
	RWCDiscovery* mp_discovery;
	Socket* mp_socket;
	void run();
};

Reply::Reply(RWCDiscovery* discovery, Socket* socket) :
	mp_discovery(discovery), mp_socket(socket)
{
	mp_discovery->incremantReplyObjects();
}

Reply::~Reply()
{
	delete mp_socket;
	mp_discovery->decremantReplyObjects();
}

void Reply::run()
{
	RNP_DEV_INFO info;
	int len = mp_socket->recv(&info, sizeof(info));
	if (len != sizeof(info))
		return;
	if (memcmp(info.header, RWCDeviceDiscoveryHeader, sizeof(info.header)))
		return;

	RWC_DEV_INFO dev;
	dev.portNo = (info.port[0] << 8) | info.port[1];
	dev.caps   = info.caps;
	dev.image  = info.image;
	dev.status = info.status;

	struct in_addr sin_addr;
	sin_addr.s_addr = mp_socket->addr();
	if (sin_addr.s_addr == 0 || dev.portNo == 0)
		return;
	if (dev.caps == 0)
		return;

	char buf[32];
	char tmp[sizeof(info.productCode) + 1];

	dev.address = inet_ntop(AF_INET, &sin_addr, buf, sizeof(buf));

	strncpy_s(buf, sizeof(buf), (char*)info.manufacturer, sizeof(info.manufacturer));
	buf[sizeof(info.manufacturer)] = '\0';
	dev.manufacturer = buf;

	strncpy_s(buf, sizeof(buf), (char*)info.productVersion, sizeof(info.productVersion));
	buf[sizeof(info.productVersion)] = '\0';
	dev.version = buf;

	strncpy_s(buf, sizeof(buf), (char*)info.name, sizeof(info.name));
	buf[sizeof(info.name)] = '\0';
	dev.name = buf;

	strncpy_s(tmp, sizeof(tmp), (char *)info.productCode, sizeof(info.productCode));
	tmp[sizeof(info.productCode)] = '\0';
	DWORD serial = (info.serial[0] << 24) |
				   (info.serial[1] << 16) |
				   (info.serial[2] <<  8) |
				    info.serial[3];
	sprintf_s(buf, sizeof(buf), "%s-%08X", tmp, serial);
	dev.uid = buf;

	mp_discovery->appendDevice(&dev);
}

/* class RWCDiscovery */

void RWCDiscovery::search()
{
	stopServer();

	removeAllDevices();

	startServer();

	RNP_DEV_DISCOVERY data;
	memcpy(data.header, RWCDeviceDiscoveryHeader, sizeof(data.header));
	data.port[0] = (unsigned char)(mp_listeningSocket->portNo() >> 8);
	data.port[1] = (unsigned char)(mp_listeningSocket->portNo() >> 0);

	SOCKET fd = ::socket(AF_INET, SOCK_DGRAM, 0);
	if (fd == INVALID_SOCKET)
		return;

	int yes = 1;
	if (::setsockopt(fd, SOL_SOCKET, SO_BROADCAST, (char*)&yes, sizeof(yes)) == SOCKET_ERROR)
		return;

	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(RWCDeviceDiscoveryPortNo);

	INTERFACE_INFO if_info[20];
	DWORD bytes;

	if (::WSAIoctl(fd, SIO_GET_INTERFACE_LIST, NULL, 0, &if_info,
				sizeof(if_info), &bytes, NULL, NULL) == SOCKET_ERROR) {
		inet_pton(AF_INET, "255.255.255.255", &addr.sin_addr.s_addr);
		::sendto(fd, (const char *)&data, sizeof(data), 0, (struct sockaddr *)&addr, sizeof(addr));
    } else {
		int num = bytes / sizeof(INTERFACE_INFO);
		for (int n = 0; n < num; n++) {
			struct sockaddr_in *sa = (struct sockaddr_in *)&(if_info[n].iiBroadcastAddress);
			if (sa->sin_family == AF_INET) {
				addr.sin_addr.s_addr = sa->sin_addr.s_addr;
				::sendto(fd, (const char *)&data, sizeof(data), 0, (struct sockaddr *)&addr, sizeof(addr));
			}
		}
	}

	::closesocket(fd);
}

void RWCDiscovery::removeAllDevices()
{
	mutex_lock obj(mtx_devices);

	m_devices.clear();
}

void RWCDiscovery::appendDevice(RWC_DEV_INFO* device)
{
	{
		mutex_lock obj(mtx_devices);

		std::vector<RWC_DEV_INFO>::iterator dev;
		for (dev = m_devices.begin(); dev != m_devices.end(); dev++) {
			if (dev->uid == device->uid)
				return; /* allready exists */
		}

		m_devices.push_back(*device);
	}

	if (mp_delegate) {
		mp_delegate->discoveryDeviceDidFound(device);
	}
}

void RWCDiscovery::startServer()
{
	mutex_lock obj(mtx_server);

	if (mp_listeningSocket = new ServerSocket()) {
		if (mp_listeningSocket->create(0)) {
			_threadStart(); /* call run() on new Thread */
		} else {
			delete mp_listeningSocket;
			mp_listeningSocket = 0;
		}
	}
}

void RWCDiscovery::run()
{
	Socket *fd;
	while (fd = mp_listeningSocket->accept()) {
		(new Reply(this, fd))->_threadStart(true);
	}
}

void RWCDiscovery::stopServer()
{
	mutex_lock obj(mtx_server);

	if (mp_listeningSocket) {
		mp_listeningSocket->close();
		wait();
		delete mp_listeningSocket;
		mp_listeningSocket = 0;
	}
}
