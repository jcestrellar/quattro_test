//
//  WebViewController.h
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <AuthenticationServices/AuthenticationServices.h>
#import "../Common/JavaScriptInterface/JavaScriptInterface.h"

@interface AppWebView : WKWebView
@end

@interface WebViewController : NSObject <WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler, WKURLSchemeHandler, ASWebAuthenticationPresentationContextProviding>

@property (assign) JavaScriptInterface *intf;
@property (assign) AppWebView *webView;

- (void)createWebViewWithFrame:(CGRect)frame setMainFrameURL:(NSURL *)URL;
- (void)evaluateJavaScript:(NSString *)script;

- (void)webAuthenticationCallback:(NSURL *)url;
- (void)webAuthenticationCancel;

- (BOOL)performKeyEquivalent:(NSEvent *)event;

@end
