/*
 * @(#)WebView2Controller.h
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __WEBVIEW2_CONTROLLER_H__
#define __WEBVIEW2_CONTROLLER_H__

#include "JavascriptInterface.h"

#include <dcomp.h>
#include <wrl.h>
#include <wil/com.h>
#include "WebView2.h"
#include "WebView2EnvironmentOptions.h"

#include "Common/Bundle.h"
#include "Common/Registry.h"
#include "JavaScriptInterface/NativeCall.h"
#include "JavaScriptInterface/NativeObjects.h"
#include "JavaScriptInterface/NativeConverters.h"

#define MODE_VISUAL_DCOMP

using namespace Microsoft::WRL;

class JavaScriptInterface;
class HostObject;
class DropTarget;

class WebView2Controller : public JavaScriptInterface
{
  public:
	WebView2Controller();
	virtual ~WebView2Controller();

	bool createWebView(HWND wnd, CString appName, LPCTSTR URL);
	void closeWebView();
	void webauth(CString url, CString scheme);
	void locate(CString url) override;
	void processEvent() override;

	void postWebMessage(LPCWSTR message);
	void postWebMessage(LPCWSTR iframeName, LPCWSTR message);

	virtual void OnCreateCoreWebView2Completed(HRESULT result) {}
	virtual bool handleWindowMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
#ifdef MODE_VISUAL_DCOMP
	void dragEnter(IDataObject* dataObject);
#endif

	ICoreWebView2Environment* getWebView2Environment() { return m_webViewEnvironment.get(); }
	ICoreWebView2* getWebView2() { return m_webView2.get(); }
#ifdef MODE_VISUAL_DCOMP
	IDCompositionDevice* getDCompositionDevice() { return m_dcompDevice.get(); }
	IDCompositionVisual* getDCompositionRootVisual() { return m_dcompRootVisual.get(); }
	IDCompositionVisual* getDCompositionWebViewVisual() { return m_dcompWebViewVisual.get(); }
#endif

  protected:
	NativeObjects* mp_objects = 0;
	std::map<std::wstring, NativeCall*> m_objMap;

  private:
	wil::com_ptr<ICoreWebView2Environment> m_webViewEnvironment = nullptr;
	wil::com_ptr<ICoreWebView2Controller> m_controller = nullptr;
	wil::com_ptr<ICoreWebView2> m_webView2 = nullptr;
	wil::com_ptr<HostObject> m_hostObject;

	std::wstring m_url;
	std::vector<wil::com_ptr<ICoreWebView2Frame>> m_frames;

#ifdef MODE_VISUAL_DCOMP
	wil::com_ptr<ICoreWebView2CompositionController> m_compositionController = nullptr;
	wil::com_ptr<IDCompositionDevice> m_dcompDevice = nullptr;
	wil::com_ptr<IDCompositionTarget> m_dcompHwndTarget = nullptr;
	wil::com_ptr<IDCompositionVisual> m_dcompRootVisual = nullptr;
	wil::com_ptr<IDCompositionVisual> m_dcompWebViewVisual = nullptr;
#endif

	EventRegistrationToken m_webMessageReceivedToken = {};
	EventRegistrationToken m_documentTitleChangedToken = {};
	EventRegistrationToken m_sourceChangedToken = {};
	EventRegistrationToken m_downloadStartingToken = {};
	EventRegistrationToken m_frameCreatedToken = {};
	EventRegistrationToken m_permissionRequestedToken = {};
#ifdef MODE_VISUAL_DCOMP
	EventRegistrationToken m_cursorChangedToken = {};
	wil::com_ptr<DropTarget> m_dropTarget = nullptr;
	bool m_isTrackingMouse = false;
	bool m_isCapturingMouse = false;
#endif

	HRESULT OnCreateEnvironmentCompleted(HRESULT result, ICoreWebView2Environment* environment);
	HRESULT OnCreateCoreWebView2ControllerCompleted(HRESULT result, ICoreWebView2Controller* controller);
	HRESULT OnMessageReceivedEvent(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args);

	void resizeWebView();
#ifdef MODE_VISUAL_DCOMP
	HRESULT DCompositionCreateDevice2(IUnknown* renderingDevice, REFIID riid, void** ppv);
	bool handleMouseEvent(UINT message, WPARAM wParam, LPARAM lParam);
	void trackMouseEvents(DWORD mouseTrackingFlags);
#endif
};

class HostObject : public Microsoft::WRL::RuntimeClass<
	Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>, IDispatch>
{
  public:
	HostObject(std::map<std::wstring, NativeCall*> objMap) : m_objMap(objMap) {}
	virtual ~HostObject() {}

	STDMETHODIMP GetTypeInfoCount(UINT* pctinfo) override;
	STDMETHODIMP GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo** ppTInfo) override;
	STDMETHODIMP GetIDsOfNames(
		REFIID riid, LPOLESTR* rgszNames, UINT cNames, LCID lcid, DISPID* rgDispId) override;
	STDMETHODIMP Invoke(
		DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS* pDispParams,
		VARIANT* pVarResult, EXCEPINFO* pExcepInfo, UINT* puArgErr) override;

  private:
	std::map<std::wstring, NativeCall*> m_objMap;
};

/* Inline function declarations */

inline STDMETHODIMP HostObject::GetTypeInfoCount(UINT* pctinfo)
{
	*pctinfo = 1;
	return S_OK;
}

inline STDMETHODIMP HostObject::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo** ppTInfo)
	{ return E_NOTIMPL; }

inline STDMETHODIMP HostObject::GetIDsOfNames(
	REFIID riid, LPOLESTR* rgszNames, UINT cNames, LCID lcid, DISPID* rgDispId)
	{ return E_NOTIMPL; }

#ifdef MODE_VISUAL_DCOMP
class DropTarget : public Microsoft::WRL::RuntimeClass<
	Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>, IDropTarget>
{
  public:
	DropTarget(HWND wnd, WebView2Controller* controller,
		ICoreWebView2CompositionController3* compositionController3);
	virtual ~DropTarget();

	HRESULT __stdcall DragEnter(IDataObject* dataObject,
		DWORD keyState,
		POINTL cursorPosition,
		DWORD* effect) override;
	HRESULT __stdcall DragOver(DWORD keyState,
		POINTL cursor_position,
		DWORD* effect) override;
	HRESULT __stdcall DragLeave() override;
	HRESULT __stdcall Drop(IDataObject* dataObject,
		DWORD keyState,
		POINTL cursorPosition,
		DWORD* effect) override;

  private:
	HWND m_wnd = NULL;
	WebView2Controller* mp_controller = 0;
	wil::com_ptr<ICoreWebView2CompositionController3> m_compositionController3 = nullptr;
};

/* Inline function declarations */

inline DropTarget::DropTarget(HWND wnd, WebView2Controller* controller,
	ICoreWebView2CompositionController3* compositionController3)
	: m_wnd(wnd), mp_controller(controller), m_compositionController3(compositionController3)
	{ ::RegisterDragDrop(m_wnd, this); }

inline DropTarget::~DropTarget()
	{ }

inline HRESULT DropTarget::DragEnter(
	IDataObject* dataObject, DWORD keyState, POINTL cursorPosition, DWORD* effect)
{
	mp_controller->dragEnter(dataObject);
	POINT point = { cursorPosition.x, cursorPosition.y };
	::ScreenToClient(m_wnd, &point);
	return m_compositionController3->DragEnter(dataObject, keyState, point, effect);
}

inline HRESULT DropTarget::DragOver(DWORD keyState, POINTL cursorPosition, DWORD* effect)
{
	POINT point = { cursorPosition.x, cursorPosition.y };
	::ScreenToClient(m_wnd, &point);
	return m_compositionController3->DragOver(keyState, point, effect);
}

inline HRESULT DropTarget::DragLeave()
	{ return m_compositionController3->DragLeave(); }

inline HRESULT DropTarget::Drop(
	IDataObject* dataObject, DWORD keyState, POINTL cursorPosition, DWORD* effect)
{
	POINT point = { cursorPosition.x, cursorPosition.y };
	::ScreenToClient(m_wnd, &point);
	return m_compositionController3->Drop(dataObject, keyState, point, effect);
}
#endif

#endif /* __WEBVIEW2_CONTROLLER_H__ */
