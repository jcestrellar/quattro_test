//
//  WebViewController.h
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <SafariServices/SafariServices.h>
#import <AuthenticationServices/AuthenticationServices.h>
#import <AVFoundation/AVFoundation.h>
#import "../Common/JavaScriptInterface/JavaScriptInterface.h"

@interface WebViewController : UIViewController <WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler, WKURLSchemeHandler,
    SFSafariViewControllerDelegate,
    UIDocumentInteractionControllerDelegate,
    UIDocumentPickerDelegate,
    UIPopoverPresentationControllerDelegate,
	ASWebAuthenticationPresentationContextProviding>

@property (assign) JavaScriptInterface *intf;
@property (assign) WKWebView *webView;

- (void)applicationDidEnterBackground:(NSNotification *)notification;
- (void)applicationWillEnterForeground:(NSNotification *)notification;
- (void)applicationWillTerminate:(NSNotification *)notification;
@end
