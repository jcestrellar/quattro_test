//
//  NativeCall+tcpip.cpp
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"tcpip";

class _TCPIPClientDelegate : public TCPIPClientDelegate
{
  public:
	_TCPIPClientDelegate(int fd, NativeObjects* objs) : m_fd(fd), mp_objs(objs) {}
	virtual ~_TCPIPClientDelegate() {}

	void received(const BYTE* buf, int len) {
		CStringW ev;
		ev.Format(L"%s\f%s\f%d\f%s", OBJ_NAME, L"read", m_fd, HEX::text(buf, len));
		mp_objs->mp_intf->postEvent(ev);
	}

	bool closed() {
		CStringW ev;
		ev.Format(L"%s\f%s\f%d", OBJ_NAME, L"closed", m_fd);
		mp_objs->mp_intf->postEvent(ev);

		mutex_lock obj(mp_objs->mtx_connections);
		mp_objs->connections[m_fd] = 0;
		return true; /* delete this */
	}

  private:
	int m_fd;
	NativeObjects* mp_objs;
};

enum {
	dispid_tcpip_connect,
	dispid_tcpip_close,
	dispid_tcpip_write,
};

NativeCall_tcpip::NativeCall_tcpip(NativeObjects* objs) : NativeCall(objs)
{
	set(L"connect", dispid_tcpip_connect);
	set(L"close",   dispid_tcpip_close);
	set(L"write",   dispid_tcpip_write);
}

LPCWSTR NativeCall_tcpip::InterfaceName() const { return OBJ_NAME; }

void NativeCall_tcpip::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_tcpip_connect:
		{
			CString str(args[0]->GetStringValue().c_str());
			unsigned long addr = inet_addr(CStringA(str));
			int port = args[1]->GetIntValue();
			int fd = -1;

			TCPIPClient* conn = new TCPIPClient();
			bool connected = (str.Find(L"COM") == 0) ? conn->comm_open(CString(str), port) :
					conn->connect(addr, port, kDefaultConnectTimeout * 1000);
			if (!connected) {
				delete conn;
			} else {
				mutex_lock obj(mp_objs->mtx_connections);
				for (int i = 0; i < (int)mp_objs->connections.size(); i++) {
					if (!mp_objs->connections[i]) { fd = i; break; }
				}
				if (fd == -1) {
					fd = (int)mp_objs->connections.size();
					mp_objs->connections.push_back(conn);
				} else {
					mp_objs->connections[fd] = conn;
				}
				conn->delegate(new _TCPIPClientDelegate(fd, mp_objs));
				conn->_threadStart(true);
			}
			ret = fd;
			break;
		}
		case dispid_tcpip_close:
		{
			int fd = args[0]->GetIntValue();

			mutex_lock obj(mp_objs->mtx_connections);
			if (0 <= fd && fd < (int)mp_objs->connections.size()) {
				TCPIPClient* conn = mp_objs->connections[fd];
				if (conn) {
					if (conn->comm()) {
						conn->comm_close();
					} else {
						conn->close();
					}
				}
			}
			break;
		}
		case dispid_tcpip_write:
		{
			int fd = args[0]->GetIntValue();

			mutex_lock obj(mp_objs->mtx_connections);
			if (0 <= fd && fd < (int)mp_objs->connections.size()) {
				TCPIPClient* conn = mp_objs->connections[fd];
				if (conn) {
					std::string data = HEX::data(args[1]->GetStringValue().c_str());
					if (conn->comm()) {
						conn->comm_send((void*)data.c_str(), (int)data.length());
					} else {
						conn->send((void*)data.c_str(), (int)data.length());
					}
				}
			}
			break;
		}

	}
}
