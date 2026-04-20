/*
 * @(#)WebView2Controller.cpp
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#include "WebView2Controller.h"
#include "JavaScriptInterface.h"

#ifdef VIRTUAL_HOST_MAPPING
extern const LPCWSTR VIRTUAL_HOST = L"app.invalid";
#endif

#ifdef MODE_VISUAL_DCOMP
HRESULT WebView2Controller::DCompositionCreateDevice2(IUnknown* renderingDevice, REFIID riid, void** ppv)
{
	HRESULT result = E_FAIL;
	static decltype(::DCompositionCreateDevice2)* fnCreateDCompDevice2 = nullptr;
	if (fnCreateDCompDevice2 == nullptr) {
		HMODULE module = ::LoadLibraryEx(L"dcomp.dll", nullptr, 0);
		if (module != nullptr) {
			fnCreateDCompDevice2 = reinterpret_cast<decltype(::DCompositionCreateDevice2)*>(
				::GetProcAddress(module, "DCompositionCreateDevice2"));
		}
	}
	if (fnCreateDCompDevice2 != nullptr) {
		result = fnCreateDCompDevice2(renderingDevice, riid, ppv);
	}
	return result;
}
#endif

WebView2Controller::WebView2Controller()
{
	WSADATA wsaData;
	::OleInitialize(NULL);
	::WSAStartup(MAKEWORD(2, 0), &wsaData);
	::MFStartup(MF_VERSION, MFSTARTUP_NOSOCKET);

#ifdef MODE_VISUAL_DCOMP
	DCompositionCreateDevice2(nullptr, IID_PPV_ARGS(&m_dcompDevice));
#endif

	mp_objects = new NativeObjects(this);

	(new NativeCall_app(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_midi(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_midix(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_tgif(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_seq(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_audio(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_player(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_recorder(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_sampler(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_rwc(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_http(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_tcpip(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_netservice(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_fs(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_security(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_ble(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_store(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_sh(mp_objects))->OnContextCreated(m_objMap);
	(new NativeCall_util(mp_objects))->OnContextCreated(m_objMap);
}

WebView2Controller::~WebView2Controller()
{
	closeWebView();

	for (auto iter = m_objMap.begin(); iter != m_objMap.end(); iter++) {
		delete iter->second;
	}
	delete mp_objects;

	::MFShutdown();
	::WSACleanup();
	::OleUninitialize();
}

bool WebView2Controller::createWebView(HWND wnd, CString appName, LPCTSTR URL)
{
	m_wnd = wnd;
	m_appName = appName;
	m_URL = URL;

	wil::unique_cotaskmem_string version_info;
	HRESULT result = ::GetAvailableCoreWebView2BrowserVersionString(nullptr, &version_info);
	if ((result == S_OK) && (version_info != nullptr)) {
		unsigned long REQUIRED_VERSION[] = { 113, 0, 1774, 30 };
		std::wstring str = version_info.get();
		std::wsmatch match;
		for (int n = 0; std::regex_search(str, match, std::wregex(L"([0-9]+)")) && (n < 4); n++) {
			unsigned long ver = std::stoul(match[0].str());
			if (ver > REQUIRED_VERSION[n]) break;
			if (ver < REQUIRED_VERSION[n]) goto ERR_VERSION;
			str = match.suffix();
		}

		Bundle bundle(m_appName);
		auto options = Microsoft::WRL::Make<CoreWebView2EnvironmentOptions>();
		options->put_AdditionalBrowserArguments(L"--allow-file-access-from-files --disable-web-security --autoplay-policy=no-user-gesture-required");
#ifndef NO_APPLY_USER_LANGUAGE_SETTING
		wchar_t locale[LOCALE_NAME_MAX_LENGTH]; locale[0] = L'0';
		int len = ::GetLocaleInfoW(::GetUserDefaultUILanguage(), LOCALE_SNAME, locale, LOCALE_NAME_MAX_LENGTH);
		if (len > 0) {
			options->put_Language(locale);
		}
#endif
		result = ::CreateCoreWebView2EnvironmentWithOptions(
			nullptr, bundle.getLocalPath(), options.Get(),
			Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
				this, &WebView2Controller::OnCreateEnvironmentCompleted
			).Get());
		return SUCCEEDED(result);
	}

ERR_VERSION:
	::MessageBox(m_wnd,
		L"Please download and install \"Microsoft Edge WebView2\".",
		m_appName, MB_OK);
	::ShellExecute(NULL, TEXT("open"),
		TEXT("https://developer.microsoft.com/microsoft-edge/webview2/consumer/"),
		NULL, NULL, SW_SHOWNORMAL);

	return false;
}

HRESULT WebView2Controller::OnCreateEnvironmentCompleted(HRESULT result, ICoreWebView2Environment* environment)
{
	if (SUCCEEDED(result)) {
		m_webViewEnvironment = environment;
#ifdef MODE_VISUAL_DCOMP
		auto webViewEnvironment3 = m_webViewEnvironment.try_query<ICoreWebView2Environment3>();
		if (webViewEnvironment3 && m_dcompDevice) {
			webViewEnvironment3->CreateCoreWebView2CompositionController(
				m_wnd, Callback<ICoreWebView2CreateCoreWebView2CompositionControllerCompletedHandler>(
					[this](HRESULT result, ICoreWebView2CompositionController* compositionController) -> HRESULT {
						auto controller =
							wil::com_ptr<ICoreWebView2CompositionController>(compositionController)
							.query<ICoreWebView2Controller>();
						return OnCreateCoreWebView2ControllerCompleted(result, controller.get());
					}
			).Get());
		}
		else {
			environment->CreateCoreWebView2Controller(
				m_wnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
					this, &WebView2Controller::OnCreateCoreWebView2ControllerCompleted
				).Get());
		}
#else
		environment->CreateCoreWebView2Controller(
			m_wnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
				this, &WebView2Controller::OnCreateCoreWebView2ControllerCompleted
			).Get());
#endif
	}
	return result;
}

HRESULT WebView2Controller::OnCreateCoreWebView2ControllerCompleted(HRESULT result, ICoreWebView2Controller* controller)
{
	if (SUCCEEDED(result)) {
		m_controller = controller;
		m_controller->get_CoreWebView2(&m_webView2);
#ifdef MODE_VISUAL_DCOMP
		m_compositionController = m_controller.try_query<ICoreWebView2CompositionController>();
		if (m_compositionController && m_dcompDevice) {
			if (m_dcompWebViewVisual == nullptr) {
				m_dcompDevice->CreateTargetForHwnd(m_wnd, true, &m_dcompHwndTarget);
				m_dcompDevice->CreateVisual(&m_dcompRootVisual);
				m_dcompHwndTarget->SetRoot(m_dcompRootVisual.get());
				m_dcompDevice->CreateVisual(&m_dcompWebViewVisual);
				m_dcompRootVisual->AddVisual(m_dcompWebViewVisual.get(), true, nullptr);
			}
			m_compositionController->put_RootVisualTarget(m_dcompWebViewVisual.get());
			m_dcompDevice->Commit();

			m_compositionController->add_CursorChanged(
				Callback<ICoreWebView2CursorChangedEventHandler>(
					[this](ICoreWebView2CompositionController* sender, IUnknown* args) -> HRESULT {
						HCURSOR cursor;
						sender->get_Cursor(&cursor);
						::SetClassLongPtr(m_wnd, GCLP_HCURSOR, (LONG_PTR)cursor);
						return S_OK;
					}
				).Get(), &m_cursorChangedToken);

			wil::com_ptr<ICoreWebView2CompositionController3>
				compositionController3 = m_controller.query<ICoreWebView2CompositionController3>();
			m_dropTarget = Make<DropTarget>(m_wnd, this, compositionController3.get());
		}
#endif
	}

	if (m_webView2 != nullptr) {
		wil::com_ptr<ICoreWebView2Settings> settings;
		m_webView2->get_Settings(&settings);
		settings->put_IsScriptEnabled(TRUE);
		settings->put_AreHostObjectsAllowed(TRUE);
		settings->put_AreDefaultScriptDialogsEnabled(TRUE);
		settings->put_IsWebMessageEnabled(TRUE);
		settings->put_IsStatusBarEnabled(FALSE);
		settings->put_AreDefaultContextMenusEnabled(FALSE);
		settings->put_IsZoomControlEnabled(FALSE);
#ifdef ENABLE_DEVTOOLS
		settings->put_AreDevToolsEnabled(TRUE);
#else
		settings->put_AreDevToolsEnabled(FALSE);
		{
			wil::com_ptr<ICoreWebView2Settings3> settings3 = settings.try_query<ICoreWebView2Settings3>();
			if (settings3) {
				settings3->put_AreBrowserAcceleratorKeysEnabled(FALSE);
			}
		}
#endif
		{
			wil::com_ptr<ICoreWebView2Settings2> settings2 = settings.try_query<ICoreWebView2Settings2>();
			if (settings2) {
				LPWSTR _userAgent;
				settings2->get_UserAgent(&_userAgent);
				settings2->put_UserAgent(CStringW(_userAgent) + L" roland.quattro(Win)");
				::CoTaskMemFree(_userAgent);
			}
		}

		{
			m_webView2->add_SourceChanged(
				Callback<ICoreWebView2SourceChangedEventHandler>(
					[this](ICoreWebView2* sender, ICoreWebView2SourceChangedEventArgs* args) -> HRESULT {
						wil::unique_cotaskmem_string uri;
						sender->get_Source(&uri);
						std::wstring url(uri.get());
						url = std::regex_replace(url, std::wregex(L"[;?#].*"), L"");
						if (m_url != url) {
							m_url = url;
							m_event = false;
						}
						return S_OK;
					}
				).Get(), &m_sourceChangedToken);
		}

		{
			m_webView2->add_DocumentTitleChanged(
				Callback<ICoreWebView2DocumentTitleChangedEventHandler>(
					[this](ICoreWebView2* sender, IUnknown* args) -> HRESULT {
						wil::unique_cotaskmem_string title;
						sender->get_DocumentTitle(&title);
						::SetWindowText(m_wnd, CString(title.get()));
						return S_OK;
					}
				).Get(), &m_documentTitleChangedToken);
		}

		{
			m_webView2->add_NewWindowRequested(
				Callback<ICoreWebView2NewWindowRequestedEventHandler>(
					[this](ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args) {
						wil::unique_cotaskmem_string uri;
						args->get_Uri(&uri);
						std::wstring url(uri.get());
						if (url.substr(0, 8) == L"file:///") {
							if (!m_dragdrop) {
								std::wstring s1 = url.substr(8);
								std::wstring s2 = std::regex_replace(s1, std::wregex(L"/"), L"\\");
								std::wstring path = URI::decodeUTF16(s2.c_str());
								CStringW ev;
								ev.Format(L"%s\f%s\f%s\f%s", L"app", L"command", L"open", path.c_str());
								postEvent(ev);
							}
							args->put_Handled(true);
						}
						return S_OK;
					}
				).Get(), nullptr);
		}

		{
			m_webView2->add_PermissionRequested(
				Callback<ICoreWebView2PermissionRequestedEventHandler>(
					[this](ICoreWebView2* sender, ICoreWebView2PermissionRequestedEventArgs* args) -> HRESULT {
						wil::com_ptr<ICoreWebView2Deferral> deferral;
						args->GetDeferral(&deferral);
						args->put_State(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
						deferral->Complete();
						return S_OK;
				}).Get(), &m_permissionRequestedToken);
		}

		wil::com_ptr<ICoreWebView2_4> webView2_4 = m_webView2.try_query<ICoreWebView2_4>();
		if (webView2_4) {
			webView2_4->add_DownloadStarting(
				Callback<ICoreWebView2DownloadStartingEventHandler>(
					[this](ICoreWebView2* sender, ICoreWebView2DownloadStartingEventArgs* args) -> HRESULT {
						wil::com_ptr<ICoreWebView2DownloadOperation> download;
						wil::unique_cotaskmem_string uri;
						args->get_DownloadOperation(&download);
						download->get_Uri(&uri);
						CStringW ev;
						ev.Format(L"%s\f%s\f%s\f%s", L"app", L"command", L"download", uri.get());
						postEvent(ev);
						args->put_Cancel(true);
						return S_OK;
				}).Get(), &m_downloadStartingToken);

			webView2_4->add_FrameCreated(
				Callback<ICoreWebView2FrameCreatedEventHandler>(
					[this](ICoreWebView2* sender, ICoreWebView2FrameCreatedEventArgs* args) -> HRESULT {
						wil::com_ptr<ICoreWebView2Frame> webViewFrame;
						args->get_Frame(&webViewFrame);
						m_frames.emplace_back(webViewFrame);
						webViewFrame->add_Destroyed(
							Callback<ICoreWebView2FrameDestroyedEventHandler>(
								[this](ICoreWebView2Frame* sender, IUnknown* args) -> HRESULT {
									auto frame = std::find(m_frames.begin(), m_frames.end(), sender);
									if (frame != m_frames.end()) {
										m_frames.erase(frame);
									}
									return S_OK;
							}).Get(), NULL);

						wil::unique_variant remoteObjectAsVariant;
						m_hostObject.query_to<IDispatch>(&remoteObjectAsVariant.pdispVal);
						remoteObjectAsVariant.vt = VT_DISPATCH;
						LPCWSTR origin = L"*";
						webViewFrame->AddHostObjectToScriptWithOrigins(L"native", &remoteObjectAsVariant, 1, &origin);

						wil::com_ptr<ICoreWebView2Frame2> webViewFrame2 = webViewFrame.try_query<ICoreWebView2Frame2>();
						if (webViewFrame2) {
							webViewFrame2->add_WebMessageReceived(
								Callback<ICoreWebView2FrameWebMessageReceivedEventHandler>(
									[this](ICoreWebView2Frame* sender, ICoreWebView2WebMessageReceivedEventArgs* args) {
										wil::unique_cotaskmem_string nameRaw;
										wil::unique_cotaskmem_string messageRaw;
										sender->get_Name(&nameRaw);
										HRESULT hr = args->TryGetWebMessageAsString(&messageRaw);
										if (hr == E_INVALIDARG) {
											return S_OK;
										}
										std::wstring name = nameRaw.get();
										std::wstring message = messageRaw.get();
										CStringW ev;
										ev.Format(L"%s\f%s\f%s\f%s", L"app", L"iframe", name.c_str(), message.c_str());
										postEvent(ev);
										return S_OK;
									}).Get(), NULL);
						}
						wil::com_ptr<ICoreWebView2Frame3> webViewFrame3 = webViewFrame.try_query<ICoreWebView2Frame3>();
						if (webViewFrame3) {
							webViewFrame3->add_PermissionRequested(
								Callback<ICoreWebView2FramePermissionRequestedEventHandler>(
									[this](ICoreWebView2Frame* sender, ICoreWebView2PermissionRequestedEventArgs* args) -> HRESULT {
										wil::com_ptr<ICoreWebView2Deferral> deferral;
										args->GetDeferral(&deferral);
										args->put_State(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
										deferral->Complete();
										return S_OK;
								}).Get(), NULL);
						}
						return S_OK;
					}).Get(), &m_frameCreatedToken);
		}

#ifdef VIRTUAL_HOST_MAPPING
		wil::com_ptr<ICoreWebView2_3> webView2_3 = m_webView2.try_query<ICoreWebView2_3>();
		if (webView2_3) {
			TCHAR drive[MAX_PATH];
			if (::SHGetFolderPath(NULL, CSIDL_PROFILE, NULL, 0, drive) == S_OK) {
				drive[3] = TEXT('\0');
				webView2_3->SetVirtualHostNameToFolderMapping(VIRTUAL_HOST, drive, COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);
				CString host = VIRTUAL_HOST;
				CString path = m_URL.Mid(3);
				m_URL.Format(TEXT("https://%s/%s"), host, path);
			}
		}
#endif

		{
			m_hostObject = Microsoft::WRL::Make<HostObject>(m_objMap);
			VARIANT remoteObjectAsVariant = {};
			m_hostObject.query_to<IDispatch>(&remoteObjectAsVariant.pdispVal);
			remoteObjectAsVariant.vt = VT_DISPATCH;
			m_webView2->AddHostObjectToScript(L"native", &remoteObjectAsVariant);
			remoteObjectAsVariant.pdispVal->Release();
		}
		m_webView2->add_WebMessageReceived(
			Callback<ICoreWebView2WebMessageReceivedEventHandler>(
				this, &WebView2Controller::OnMessageReceivedEvent
			).Get(), &m_webMessageReceivedToken);

		locate(m_URL);
	}

	resizeWebView();
	handleWindowMessage(m_wnd, WM_SETFOCUS, 0, 0);

	OnCreateCoreWebView2Completed(result);

	return result;
}

void WebView2Controller::closeWebView()
{
#ifdef MODE_VISUAL_DCOMP
	if (m_dropTarget) {
		::RevokeDragDrop(m_wnd);
		m_dropTarget = nullptr;
	}
	if (m_compositionController) {
		m_compositionController->remove_CursorChanged(m_cursorChangedToken);
		m_compositionController->put_RootVisualTarget(nullptr);
		if (m_dcompWebViewVisual) {
			m_dcompWebViewVisual->RemoveAllVisuals();
			m_dcompWebViewVisual.reset();
			m_dcompRootVisual->RemoveAllVisuals();
			m_dcompRootVisual.reset();
			m_dcompHwndTarget->SetRoot(nullptr);
			m_dcompHwndTarget.reset();
			m_dcompDevice->Commit();
		}
		m_compositionController = nullptr;
		m_dcompHwndTarget = nullptr;
		m_dcompRootVisual = nullptr;
		m_dcompWebViewVisual = nullptr;
	}
#endif
	if (m_controller) {
		m_controller->Close();
		m_controller = nullptr;
	}
	if (m_webView2) {
		m_webView2->remove_WebMessageReceived(m_webMessageReceivedToken);
		m_webView2->remove_DocumentTitleChanged(m_documentTitleChangedToken);
		m_webView2->remove_SourceChanged(m_sourceChangedToken);
		m_webView2->remove_PermissionRequested(m_permissionRequestedToken);
		wil::com_ptr<ICoreWebView2_4> webView2_4;
		webView2_4 = m_webView2.try_query<ICoreWebView2_4>();
		if (webView2_4) {
			webView2_4->remove_DownloadStarting(m_downloadStartingToken);
		}
		m_webView2 = nullptr;
	}
	if (m_webViewEnvironment) {
		m_webViewEnvironment = nullptr;
	}
}

void WebView2Controller::postWebMessage(LPCWSTR message)
{
	if (m_webView2) {
		m_webView2->PostWebMessageAsString(message);
	}
}

HRESULT WebView2Controller::OnMessageReceivedEvent(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args)
{
	wil::unique_cotaskmem_string messageRaw;
	args->TryGetWebMessageAsString(&messageRaw);
	std::wstring message = messageRaw.get();

	/* not implemented */

	return S_OK;
}

void WebView2Controller::postWebMessage(LPCWSTR iframeName, LPCWSTR message)
{
	for (size_t i = 0; i < m_frames.size(); i++) {
		wil::unique_cotaskmem_string nameRaw;
		m_frames[i]->get_Name(&nameRaw);
		std::wstring name = nameRaw.get();
		if (iframeName == name) {
			wil::com_ptr<ICoreWebView2Frame2> webViewFrame2 = m_frames[i].try_query<ICoreWebView2Frame2>();
			if (webViewFrame2) {
				webViewFrame2->PostWebMessageAsString(message);
			}
			return;
		}
	}
}

void WebView2Controller::webauth(CString url, CString scheme)
{
	if (scheme.GetLength() > 0) {
		Registry classes(TEXT("Software\\Classes\\") + scheme);
		classes.setString(NULL, TEXT("URL:") + scheme + TEXT(" Protocol"));
		classes.setString(TEXT("URL Protocol"), TEXT(""));
		Registry command(TEXT("Software\\Classes\\") + scheme + TEXT("\\shell\\open\\command"));
		TCHAR path[MAX_PATH];
		HINSTANCE instance = (HINSTANCE)GetWindowLongPtr(m_wnd, GWLP_HINSTANCE);
		::GetModuleFileName(instance, path, MAX_PATH);
		command.setString(NULL, CString(TEXT("\"")) + path + TEXT("\" -url \"%1\""));
	}
	::ShellExecute(NULL, TEXT("open"), url, NULL, NULL, SW_SHOWNORMAL);
}

void WebView2Controller::locate(CString url)
{
	m_webView2->Navigate(CStringW(url));
}

void WebView2Controller::processEvent()
{
	while (m_event) {
		std::wstring ev = L"";
		{
			mutex_lock obj(mtx_queue);
			if (!m_queue.empty()) {
				ev = m_queue.front();
				m_queue.pop();
			}
			else {
				m_triggered = false;
				break;
			}
		}
		std::wstring s;
		for (const wchar_t* p = ev.c_str(); *p != L'\0'; p++) {
			switch (*p) {
			case L'\'': s += L"\\'";  break;
			case L'\n': s += L"\\n";  break;
			case L'\\': s += L"\\\\"; break;
			default:
				s += *p; break;
			}
		}
		CStringW script;
		script.Format(L"window.$event.dispatch('%s')", s.c_str());
		m_webView2->ExecuteScript(script, Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
			[](HRESULT errorCode, LPCWSTR resultObjectAsJson) -> HRESULT { return S_OK; }).Get());
	}
}

void WebView2Controller::resizeWebView()
{
	RECT bounds;
	::GetClientRect(m_wnd, &bounds);
	m_controller->put_Bounds(bounds);
#ifdef MODE_VISUAL_DCOMP
	if (m_dcompRootVisual) {
		int cx = bounds.right - bounds.left;
		int cy = bounds.bottom - bounds.top;
		m_dcompRootVisual->SetClip({ 0, 0, float(cx), float(cy) });
		m_dcompDevice->Commit();
	}
#endif
}

bool WebView2Controller::handleWindowMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	if (m_controller) {
		if (message == WM_SIZE) {
			if (wParam == SIZE_MINIMIZED) {
				m_controller->put_IsVisible(false);
			} else if ((wParam == SIZE_RESTORED) || (wParam == SIZE_MAXIMIZED)) {
				m_controller->put_IsVisible(true);
			}
			resizeWebView();
			return true;
		}
#ifdef MODE_VISUAL_DCOMP
		if (message == WM_DISPLAYCHANGE) {
			RECT rc;
			::GetWindowRect(hWnd, &rc);
			::SetWindowPos(hWnd, NULL, rc.left, rc.top + 1, 0, 0, SWP_NOZORDER | SWP_NOSIZE | SWP_NOACTIVATE);
			::SetWindowPos(hWnd, NULL, rc.left, rc.top, 0, 0, SWP_NOZORDER | SWP_NOSIZE | SWP_NOACTIVATE);
			return true;
		}
		if ((message >= WM_MOUSEFIRST && message <= WM_MOUSELAST) || message == WM_MOUSELEAVE) {
			return handleMouseEvent(message, wParam, lParam);
		}
#endif
		if (message == WM_MOVE || message == WM_MOVING) {
			m_controller->NotifyParentWindowPositionChanged();
			return true;
		}
		if (message == WM_SETFOCUS) {
			m_controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
			return true;
		}
	}
	return false;
}

#ifdef MODE_VISUAL_DCOMP
bool WebView2Controller::handleMouseEvent(UINT message, WPARAM wParam, LPARAM lParam)
{
	POINT point;
	POINTSTOPOINT(point, lParam);
	if (message == WM_MOUSEWHEEL || message == WM_MOUSEHWHEEL) {
		::ScreenToClient(m_wnd, &point);
	}
	RECT bounds;
	GetClientRect(m_wnd, &bounds);
	bool isMouseInWebView = PtInRect(&bounds, point);

	if (isMouseInWebView || m_isCapturingMouse || message == WM_MOUSELEAVE) {
		DWORD data = 0;
		switch (message) {
			case WM_MOUSEWHEEL:
			case WM_MOUSEHWHEEL:
				data = GET_WHEEL_DELTA_WPARAM(wParam);
				break;
			case WM_XBUTTONDBLCLK:
			case WM_XBUTTONDOWN:
			case WM_XBUTTONUP:
				data = GET_XBUTTON_WPARAM(wParam);
				break;
			case WM_MOUSEMOVE:
				if (!m_isTrackingMouse) {
					trackMouseEvents(TME_LEAVE);
					m_isTrackingMouse = true;
				}
				break;
			case WM_MOUSELEAVE:
				m_isTrackingMouse = false;
				break;
		}
		switch (message) {
			case WM_LBUTTONDOWN:
			case WM_MBUTTONDOWN:
			case WM_RBUTTONDOWN:
			case WM_XBUTTONDOWN:
				if (isMouseInWebView && ::GetCapture() != m_wnd) {
					m_isCapturingMouse = true;
					::SetCapture(m_wnd);
				}
				break;
			case WM_LBUTTONUP:
			case WM_MBUTTONUP:
			case WM_RBUTTONUP:
			case WM_XBUTTONUP:
				if (::GetCapture() == m_wnd) {
					m_isCapturingMouse = false;
					::ReleaseCapture();
				}
				break;
		}
		m_compositionController->SendMouseInput(
			static_cast<COREWEBVIEW2_MOUSE_EVENT_KIND>(message),
			static_cast<COREWEBVIEW2_MOUSE_EVENT_VIRTUAL_KEYS>(GET_KEYSTATE_WPARAM(wParam)),
			data, point);
		return true;
	} else if (message == WM_MOUSEMOVE && m_isTrackingMouse) {
		m_isTrackingMouse = false;
		trackMouseEvents(TME_LEAVE | TME_CANCEL);
		handleMouseEvent(WM_MOUSELEAVE, 0, 0);
	}

	return false;
}

void WebView2Controller::trackMouseEvents(DWORD mouseTrackingFlags)
{
	TRACKMOUSEEVENT tme;
	tme.cbSize = sizeof(tme);
	tme.dwFlags = mouseTrackingFlags;
	tme.hwndTrack = m_wnd;
	tme.dwHoverTime = 0;
	::TrackMouseEvent(&tme);
}

void WebView2Controller::dragEnter(IDataObject* dataObject)
{
	if (m_dragdrop) {
		STGMEDIUM stgm;
		FORMATETC fmte = { CF_HDROP, NULL, DVASPECT_CONTENT, -1, TYMED_HGLOBAL };
		if (SUCCEEDED(dataObject->GetData(&fmte, &stgm))) {
			mp_objects->m_dropfiles.resize(0);
			HDROP drop = reinterpret_cast<HDROP>(stgm.hGlobal);
			UINT nFiles = ::DragQueryFileW(drop, 0xFFFFFFFF, NULL, 0);
			for (UINT i = 0; i < nFiles; i++) {
				static WCHAR file[MAX_PATH];
				::DragQueryFileW(drop, i, file, sizeof(file));
				mp_objects->m_dropfiles.push_back(file);
			}
			::ReleaseStgMedium(&stgm);
		}
	}
}
#endif /* MODE_VISUAL_DCOMP */

STDMETHODIMP HostObject::Invoke(
	DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS* pDispParams,
	VARIANT* pVarResult, EXCEPINFO* pExcepInfo, UINT* puArgErr)
{
	if (riid != IID_NULL) {
		return DISP_E_UNKNOWNINTERFACE;
	}
	if (((wFlags & DISPATCH_METHOD) == 0) || (dispIdMember != 0)) {
		return DISP_E_MEMBERNOTFOUND;
	}

	std::wstring object;
	std::wstring dispid;
	UINT cArgs = pDispParams->cArgs;
	if (cArgs > 0) {
		std::wstring arg0 = pDispParams->rgvarg[--cArgs].bstrVal;
		std::wstring::size_type pos = arg0.find_first_of(L'_');
		object = arg0.substr(0, pos);
		dispid = arg0.substr(pos + 1);
	}
	CefV8ValueList arguments;
	if (cArgs > 0) { arguments.push_back(new CefV8Value(pDispParams->rgvarg[--cArgs].bstrVal)); }
	if (cArgs > 0) { arguments.push_back(new CefV8Value(pDispParams->rgvarg[--cArgs].bstrVal)); }

	std::wstring body = L"v";
	std::map<std::wstring, NativeCall*>::iterator iter = m_objMap.find(object);
	if (iter != m_objMap.end()) {
		body = iter->second->Execute(dispid, arguments);
	}
	std::for_each(arguments.begin(), arguments.end(), [](CefV8Value* x) { delete x; });

	pVarResult->vt = VT_BSTR;
	pVarResult->bstrVal = ::SysAllocString(body.c_str());

	return S_OK;
}
