//
//  NativeCall+sh.cpp
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"
#include "../Common/Process.h"

static LPCWSTR OBJ_NAME = L"sh";

enum {
	dispid_sh_exec,
	dispid_sh_kill,
};

NativeCall_sh::NativeCall_sh(NativeObjects* objs) : NativeCall(objs)
{
	set(L"exec", dispid_sh_exec);
	set(L"kill", dispid_sh_kill);
}

LPCWSTR NativeCall_sh::InterfaceName() const { return OBJ_NAME; }

static void __sh_output_monitor(DWORD pid, const LPCTSTR output, void *userInfo)
{
	NativeObjects* mp_objs = (NativeObjects*)userInfo;

	CStringW ev;
	ev.Format(L"%s\f%s\f%u\f%s", OBJ_NAME, L"stdout", pid, CStringW(output));
	mp_objs->mp_intf->postEvent(ev);
}

void NativeCall_sh::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {

		case dispid_sh_exec:
		{
			std::wstring commandLine = L"cmd.exe /a /s /c \"";
			picojson::value v;
			picojson::parse(v, LPCWSTR(args[0]->GetStringValue().c_str()));
			picojson::array& a = v.get<picojson::array>();
			for (picojson::array::iterator it = a.begin(); it != a.end(); it++) {
				std::wstring arg = it->get<std::wstring>();
				commandLine += (arg + L" ");
			}
			commandLine += L"\"";
			Process* sh = new Process(__sh_output_monitor, mp_objs);
			ret = sh->launch((LPCTSTR)CString(commandLine.c_str()));
		}
		break;
		case dispid_sh_kill:
		{
			DWORD pid = args[0]->GetUIntValue();
			if (pid) {
				CString params;
				params.Format(L"/T /F /PID %u", pid);
				::ShellExecute(NULL, TEXT("open"), TEXT("taskkill.exe"), params, NULL, 0);
			}
		}
		break;

	}
}
