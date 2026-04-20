/*
 * @(#)NativeCall.h
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __NATIVE_CALL_H__
#define __NATIVE_CALL_H__

#include <windows.h>
#include <atlstr.h>
#include <string>
#include <map>
#include <vector>
#include <regex>
#include "NativeObjects.h"
#include "NativeConverters.h"

class NativeException
{
public:
	CStringW message;
	NativeException() {
		LPTSTR str = NULL;
		::FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM, NULL,
			::GetLastError(), MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), (LPTSTR)&str, 0, NULL);
		message = CStringW(str);
		::LocalFree(str);
	}
};

class CefV8Value {
  public:
	CefV8Value(std::wstring _x) : x(_x) {}
	bool GetBoolValue() { return std::regex_match(x, std::wregex(L".*[YyTt1-9].*")); }
	int GetIntValue() { return std::stoi(x); }
	DWORD GetUIntValue() { return DWORD(std::stoi(x)); }
	double GetDoubleValue() { return std::stod(x); }
	std::wstring GetStringValue() { return x; }
  private:
	std::wstring x;
};

class CefRetValue {
  public:
	CefRetValue(std::wstring& _x) : x(_x) {}
	void operator=(bool v) { x = (v ? L"b1" : L"b"); }
	void operator=(int v) { x = L"d" + std::to_wstring(v); }
	void operator=(DWORD v) { x = L"d" + std::to_wstring(v); }
	void operator=(float v) { x = L"f" + std::to_wstring(v); }
	void operator=(LPCWSTR v) { x = L"s" + std::wstring(v); }
  private:
	std::wstring& x;
};

typedef std::vector<CefV8Value*> CefV8ValueList;

class NativeCall
{
  public:
	NativeCall(NativeObjects* objs) : mp_objs(objs) {}
	virtual ~NativeCall() {}

	void OnContextCreated(std::map<std::wstring, NativeCall*>& objMap) {
		objMap.insert(std::make_pair(LPCTSTR(CStringW(L"$$") + InterfaceName()), this));
	}

	virtual std::wstring Execute(const std::wstring name, const CefV8ValueList& arguments) {
		std::wstring retval = L"v";
		std::map<std::wstring, UINT>::iterator iter = idMap.find(name);
		if (iter != idMap.end()) {
			CefRetValue ret(retval);
			try {
				Dispatch(iter->second, arguments, ret);
			} catch (NativeException* e) {
				retval = L"e" + std::wstring(e->message);
			} catch (...) {
				retval = L"e" L"system exception";
			}
		}
		return retval;
	}

	virtual LPCWSTR InterfaceName() const = 0;
	virtual void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret) = 0;

  protected:
	NativeObjects* mp_objs;
	std::map<std::wstring, UINT> idMap;
	void set(const wchar_t* name, UINT dispid) { idMap.insert(std::make_pair(name, dispid)); }
};

class NativeCall_extention : public NativeCall {
  public:
	NativeCall_extention(NativeObjects* objs) : NativeCall(objs) {}
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret) {}
	virtual void Dispatch(const std::wstring name, const CefV8ValueList& args, CefRetValue& ret) = 0;

	std::wstring Execute(const std::wstring name, const CefV8ValueList& arguments) {
		std::wstring retval = L"v";
		CefRetValue ret(retval);
		try {
			Dispatch(name, arguments, ret);
		} catch (NativeException* e) {
			retval = L"e" + std::wstring(e->message);
		} catch (...) {
			retval = L"e" L"system exception";
		}
		return retval;
	}
};

class NativeCall_app : public NativeCall {
  public:
	NativeCall_app(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_midi : public NativeCall {
  public:
	NativeCall_midi(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_midix : public NativeCall {
  public:
	NativeCall_midix(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_tgif : public NativeCall {
  public:
	NativeCall_tgif(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_seq : public NativeCall {
  public:
	NativeCall_seq(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_audio : public NativeCall {
  public:
	NativeCall_audio(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_player : public NativeCall {
  public:
	NativeCall_player(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_recorder : public NativeCall {
  public:
	NativeCall_recorder(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_sampler : public NativeCall {
  public:
	NativeCall_sampler(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_rwc : public NativeCall {
  public:
	NativeCall_rwc(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_http : public NativeCall {
  public:
	NativeCall_http(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_tcpip : public NativeCall {
  public:
	NativeCall_tcpip(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_netservice : public NativeCall {
  public:
	NativeCall_netservice(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_fs : public NativeCall {
  public:
	NativeCall_fs(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_security : public NativeCall {
  public:
	NativeCall_security(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_ble : public NativeCall {
  public:
	NativeCall_ble(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_store : public NativeCall {
  public:
	NativeCall_store(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_sh : public NativeCall {
  public:
	NativeCall_sh(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

class NativeCall_util : public NativeCall {
  public:
	NativeCall_util(NativeObjects* objs);
	LPCWSTR InterfaceName() const;
	void Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret);
};

#endif /* __NATIVE_CALL_H__ */
