
//
//  WebViewController.m
//
//  Copyright (c) 2018 Roland Corporation. All rights reserved.
//

#import "WebViewController.h"

#ifdef VMIDI_IN
NSString *const midiDestinationName = @"Quattro (IN)";
SInt32 midiSourceUniqueID = 'QaTR';
#endif

@interface AppWebView ()
@property (assign) WebViewController *controller;
@end

@interface WebViewController ()
@property (retain) ASWebAuthenticationSession *webAuthenticationSession;
@end

@implementation AppWebView

- (NSDragOperation)draggingEntered:(id <NSDraggingInfo>)sender
{
    if (_controller.intf.dragdrop) {
        NSPasteboard *pboard = [sender draggingPasteboard];
        if ([[pboard types] containsObject:NSPasteboardTypeFileURL]) {
            NSArray<Class> *classes = @[[NSURL class]];
            NSArray *urls = [pboard readObjectsForClasses:classes options:@{}];
            NSMutableArray *files = [NSMutableArray array];
            for (NSURL *url in urls) {
                [files addObject:[url path]];
            }
            [[NSNotificationCenter defaultCenter] postNotificationName:DROP_FILES object:files userInfo:@{@"native":_controller.intf.native}];
        }
        return [super draggingEntered:sender];
    }
    return NSDragOperationGeneric;
}

- (NSDragOperation)draggingUpdated:(id <NSDraggingInfo>)sender
{
    return _controller.intf.dragdrop ? [super draggingUpdated:sender] : NSDragOperationGeneric;
}

- (BOOL)prepareForDragOperation:(id <NSDraggingInfo>)sender
{
    return _controller.intf.dragdrop ? [super prepareForDragOperation:sender] : YES;
}

- (BOOL)performDragOperation:(id <NSDraggingInfo>)sender
{
    if (_controller.intf.dragdrop) {
        return [super performDragOperation:sender];
    }

    NSPasteboard *pboard = [sender draggingPasteboard];
    if ([[pboard types] containsObject:NSPasteboardTypeFileURL]) {
        NSArray<Class> *classes = @[[NSURL class]];
        NSArray *urls = [pboard readObjectsForClasses:classes options:@{}];
        for (NSURL *url in urls) {
            NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", [url path]];
            [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:@{@"native":_controller.intf.native}];
        }
    }
    return YES;
}

- (BOOL)performKeyEquivalent:(NSEvent *)event
{
    if ([_controller performKeyEquivalent:event]) {
        return YES;
    }
    if ([event modifierFlags] & NSEventModifierFlagCommand) {
        NSString * chars = [event characters];
        if ([chars isEqualTo:@"x"] && [self respondsToSelector:@selector(cut:)]) {
            [self performSelector:@selector(cut:) withObject:nil];
            return YES;
        }
        if ([chars isEqualTo:@"c"] && [self respondsToSelector:@selector(copy:)]) {
            [self performSelector:@selector(copy:) withObject:nil];
            return YES;
        }
        if ([chars isEqualTo:@"v"] && [self respondsToSelector:@selector(paste:)]) {
            [self performSelector:@selector(paste:) withObject:nil];
            return YES;
        }
        if ([chars isEqualTo:@"a"] && [self respondsToSelector:@selector(selectAll:)]) {
            [self performSelector:@selector(selectAll:) withObject:nil];
            return YES;
        }
    }
    return [super performKeyEquivalent:event];
}

@end

@implementation WebViewController

- (void)awakeFromNib
{
    [super awakeFromNib];
    
    _intf = [[JavaScriptInterface alloc] initWithController:self];
}

- (void)createWebViewWithFrame:(CGRect)frame setMainFrameURL:(NSURL *)URL
{
#ifdef WEBVIEW_NO_BOUNCE
#warning correspond to css file as "body { height: 100%; overflow: hidden; }".
#endif

    WKUserScript *userScript = [[WKUserScript alloc] initWithSource:@"window.$$prompt = true"
                                                      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                   forMainFrameOnly:NO];
    WKUserContentController *userContentController = [[WKUserContentController alloc] init];
    [userContentController addUserScript:userScript];
    [userContentController addScriptMessageHandler:self name:@"prompt"];

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.userContentController = userContentController;
    [configuration setURLSchemeHandler:self forURLScheme:@"native"];
    @try {
        [configuration.preferences setValue:@TRUE forKey:@"allowFileAccessFromFileURLs"];
    } @catch (NSException *exception) {}
    @try {
        [configuration setValue:@TRUE forKey:@"allowUniversalAccessFromFileURLs"];
    } @catch (NSException *exception) {}

#ifdef ENABLE_WEBKIT_DEVELOPER
    [configuration.preferences setValue:[NSNumber numberWithBool:TRUE] forKey:@"developerExtrasEnabled"];
#endif
    configuration.applicationNameForUserAgent = @"roland.quattro(Mac)";

    _webView = [[AppWebView alloc] initWithFrame:frame configuration:configuration];
    _webView.controller = self;

    [self.webView setAutoresizingMask:(NSViewWidthSizable | NSViewHeightSizable)];
    [self.webView setAllowsBackForwardNavigationGestures:NO];
    [self.webView setUIDelegate:self];
    [self.webView setNavigationDelegate:self];

    [self.webView addObserver:self forKeyPath:@"title" options:NSKeyValueObservingOptionNew context:nil];

    [self loadURL:URL];
}

- (void)loadURL:(NSURL *)url
{
    if ([[url scheme] isEqualToString:@"file"]) {
        //NSString *path = [[NSURL URLWithString:@"./" relativeToURL:url] absoluteString];
        NSString *path = @"file:///";
        [self.webView loadFileURL:url allowingReadAccessToURL:[NSURL URLWithString:path]];
    } else {
        NSURLRequest *request = [NSURLRequest requestWithURL:url];
        [self.webView loadRequest:request];
    }
}

- (void)dealloc
{
    [self.webView removeObserver:self forKeyPath:@"title"];
    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"prompt"];
    [self.webView setUIDelegate:nil];
    [self.webView setNavigationDelegate:nil];

    [_webView release];

    [_intf stopHTTPServer];
    [_intf release];

    [super dealloc];
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationResponse:(nonnull WKNavigationResponse *)navigationResponse decisionHandler:(nonnull void (^)(WKNavigationResponsePolicy))decisionHandler
{
    if (navigationResponse.canShowMIMEType) {
        if (navigationResponse.forMainFrame) {
            _intf.native.event = NO;
        }
        decisionHandler(WKNavigationResponsePolicyAllow);
    } else {
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"download", [[navigationResponse.response URL] absoluteString]];
        [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:@{@"native":_intf.native}];
        decisionHandler(WKNavigationResponsePolicyCancel);
    }
}

- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)navigationAction windowFeatures:(WKWindowFeatures *)windowFeatures
{
    /* popp window not supported */
    [[NSWorkspace sharedWorkspace] openURL:navigationAction.request.URL];
    return nil;
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary<NSString *,id> *)change context:(void *)context
{
    if ([keyPath isEqualToString:@"title"]) {
        [[self.webView window] setTitle:self.webView.title];
    }
}

- (void)webView:(WKWebView *)webView requestMediaCapturePermissionForOrigin:(WKSecurityOrigin *)origin initiatedByFrame:(WKFrameInfo *)frame type:(WKMediaCaptureType)type decisionHandler:(void (^)(WKPermissionDecision decision))decisionHandler
API_AVAILABLE(macos(12.0))
{
    decisionHandler(WKPermissionDecisionGrant);
}

- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(nonnull NSString *)message initiatedByFrame:(nonnull WKFrameInfo *)frame completionHandler:(nonnull void (^)(void))completionHandler
{
    NSAlert *alert = [[NSAlert alloc] init];
    [alert addButtonWithTitle:@"OK"];
    [alert setMessageText:message];
    [alert runModal];
    [alert release];
    completionHandler();
}

- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL))completionHandler
{
    BOOL ok = YES;

    NSAlert *alert = [[NSAlert alloc] init];
    [alert addButtonWithTitle:@"Cancel"];
    [alert addButtonWithTitle:@"OK"];
    [alert setMessageText:message];
    if ([alert runModal] == NSAlertFirstButtonReturn) {
        ok = NO;
    }
    [alert release];

    completionHandler(ok);
}

- (void)webView:(WKWebView *)webView runJavaScriptTextInputPanelWithPrompt:(NSString *)prompt defaultText:(NSString *)defaultText initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(NSString *result))completionHandler
{
    NSArray *args = [prompt componentsSeparatedByString:@"\f"];
    completionHandler([_intf.native dispatch:args extension:self]);
}

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message
{
    if ([message.name isEqualToString:@"prompt"]) {
        NSArray *args = [message.body componentsSeparatedByString:@"\f"];
        [_intf.native dispatch:args extension:self];
    }
}

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask
{
    NSArray *args = [[urlSchemeTask.request.URL query] componentsSeparatedByString:@","];
    NSData *data = [[_intf.native dispatch:args extension:self] dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *headers = @{
        @"Content-Type": @"text/plain",
        @"Content-Length": [NSString stringWithFormat:@"%ld", data.length],
        @"Access-Control-Allow-Origin": @"*",
        @"Connection": @"close"
    };
    NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:[NSURL URLWithString:@"native://call"]
                                                              statusCode:200
                                                             HTTPVersion:@"HTTP/1.1"
                                                            headerFields:headers];
    [urlSchemeTask didReceiveResponse:response];
    [urlSchemeTask didReceiveData:data];
    [urlSchemeTask didFinish];
    [response release];
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask
{
    /* nothing to do */
}

- (void)evaluateJavaScript:(NSString *)script;
{
    [self.webView evaluateJavaScript:script completionHandler:nil];
}

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session
{
    return [[NSApplication sharedApplication] mainWindow];
}

- (void)webAuthentication:(NSArray *)params
{
    NSURL *url = (params.count > 0) ? [params objectAtIndex:0] : nil;
    NSString *urlScheme = (params.count > 1) ? [params objectAtIndex:1] : nil;

    if (url && !self.webAuthenticationSession) {
        self.webAuthenticationSession = [[ASWebAuthenticationSession alloc] initWithURL:url callbackURLScheme:urlScheme completionHandler:^(NSURL *callbackURL, NSError *error) {
            [self webAuthenticationCallback:callbackURL];
        }];
        self.webAuthenticationSession.presentationContextProvider = self;
        [self.webAuthenticationSession start];
    }
}

- (void)webAuthenticationCallback:(NSURL *)url
{
    [self webAuthenticationCancel];

    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"url", url ? [url absoluteString] : @""];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:@{@"native":_intf.native}];
}

- (void)webAuthenticationCancel
{
    [self.webAuthenticationSession cancel];
    self.webAuthenticationSession = nil;
}

- (BOOL)performKeyEquivalent:(NSEvent *)event
{
    return NO;
}

@end
