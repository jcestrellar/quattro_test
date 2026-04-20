//
//  JavaScriptInterface.m
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#else
#import <WebKit/WebKit.h>
#endif

#import "JavaScriptInterface.h"

NSString *const POST_EVENT         = @"quattro.postEvent";
NSString *const EVAL_JAVASCRIPT    = @"quattro.evalJavaScript";
NSString *const WEB_AUTHENTICATION = @"quattro.webAuthentication";
NSString *const NATIVE_CONTROL     = @"quattro.nativeControl";
NSString *const NATIVE_LOCATE      = @"quattro.nativeLocate";
NSString *const ENABLE_DRAGDROP    = @"quattro.enableDragDrop";
NSString *const DROP_FILES         = @"quattro.dropFiles";

@interface JavaScriptInterface () {
    NativeCall *_native;
}
@end

@implementation JavaScriptInterface

@synthesize native = _native;

+ (JavaScriptInterface *)sharedInstance
{
    static JavaScriptInterface *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[self alloc] initWithController:nil];
    });
    return instance;
}

- (id)initWithController:(id)controller
{
    if (self = [super init]) {
        _controller = controller;

        NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
        [center addObserver:self selector:@selector(postEvent:) name:POST_EVENT object:nil];
		[center addObserver:self selector:@selector(evalJavaScript:) name:EVAL_JAVASCRIPT object:nil];
        [center addObserver:self selector:@selector(webAuthentication:) name:WEB_AUTHENTICATION object:nil];
		[center addObserver:self selector:@selector(nativeControl:) name:NATIVE_CONTROL object:nil];
		[center addObserver:self selector:@selector(nativeLocate:) name:NATIVE_LOCATE object:nil];
		[center addObserver:self selector:@selector(enableDragDrop:) name:ENABLE_DRAGDROP object:nil];
		[center addObserver:self selector:@selector(dropFiles:) name:DROP_FILES object:nil];
#if TARGET_OS_IPHONE
        [center addObserver:self selector:@selector(stopHTTPServer) name:@"stopHTTPServer" object:nil];
        [center addObserver:self selector:@selector(coreMIDIBLE:) name:@"coreMIDIBLE" object:nil];
        [center addObserver:self selector:@selector(documentInteraction:) name:@"documentInteraction" object:nil];
        [center addObserver:self selector:@selector(openSafariView:) name:@"openSafariView" object:nil];
        [center addObserver:self selector:@selector(openFilename:) name:@"openFilename" object:nil];
        [center addObserver:self selector:@selector(saveFilename:) name:@"saveFilename" object:nil];
        [center addObserver:self selector:@selector(importFile:) name:@"importFile" object:nil];
        [center addObserver:self selector:@selector(exportFile:) name:@"exportFile" object:nil];
        [center addObserver:self selector:@selector(browsingWeb:) name:@"browsingWeb" object:nil];
        [center addObserver:self selector:@selector(barcodeScanner:) name:@"barcodeScanner" object:nil];
#endif

        _native = [[NativeCall alloc] init];

#ifdef SUPPORT_LOCALHOST
        _httpServer = [[HTTPServer alloc] init];
        [self startHTTPServer];
#endif
    }
    return self;
}

- (void)dealloc
{
    _native.event = NO;
    
    [_native release];
    [_httpServer release];

    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center removeObserver:self];

	[super dealloc];
}

- (BOOL)startHTTPServer
{
#ifdef SUPPORT_LOCALHOST
    uint16_t _portNo = self.portNo;
    if (_portNo) {
        if ([_httpServer isAlive]) return NO;
        self.portNo = [_httpServer start:_portNo];
    }
    if (self.portNo == 0) {
        self.portNo = [_httpServer start:0];
    }
    if (_portNo != self.portNo) {
        _native.event = NO;
        return YES;
    }
#endif
    return NO;
}

- (void)stopHTTPServer
{
    [_httpServer stop];
}

- (void)postEvent:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *target = [userInfo objectForKey:@"native"];
    if (target == nil || target == self.native) {
        NSString *event = notification.object;
        [self.native postEvent:event];
    }
}

-(void)evalJavaScript:(NSNotification *)notification
{
	NSDictionary *userInfo = notification.userInfo;
	NativeCall *sender = [userInfo objectForKey:@"native"];
	if (sender == nil || sender == self.native) {
        SEL selector = NSSelectorFromString(@"evaluateJavaScript:");
		[_controller performSelector:selector withObject:notification.object];
	}
}

- (void)webAuthentication:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *sender = [userInfo objectForKey:@"native"];
    if (sender == nil || sender == self.native) {
        SEL selector = NSSelectorFromString(@"webAuthentication:");
        if ([_controller respondsToSelector:selector]) {
            [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
        }
    }
}

- (void)nativeControl:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *sender = [userInfo objectForKey:@"native"];
    if (sender == nil || sender == self.native) {
        SEL selector = NSSelectorFromString(@"nativeControl:");
        if ([_controller respondsToSelector:selector]) {
            [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
        }
    }
}

- (void)nativeLocate:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *sender = [userInfo objectForKey:@"native"];
    if (sender == nil || sender == self.native) {
        SEL selector = NSSelectorFromString(@"loadURL:");
        if ([_controller respondsToSelector:selector]) {
            [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
        }
    }
}

- (void)enableDragDrop:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *sender = [userInfo objectForKey:@"native"];
    if (sender == nil || sender == self.native) {
        _dragdrop = [notification.object boolValue];
    }
}

- (void)dropFiles:(NSNotification *)notification
{
    NSDictionary *userInfo = notification.userInfo;
    NativeCall *sender = [userInfo objectForKey:@"native"];
    if (sender == nil || sender == self.native) {
        self.native.dropfiles = notification.object;
    }
}

#if TARGET_OS_IPHONE
- (void)coreMIDIBLE:(NSNotification *)notification
{
#ifndef FORCE_MIDI_PANEL
    if (CBManager.authorization == CBManagerAuthorizationDenied) {
        NSString *event = [NSString stringWithFormat:@"%@\f%@", @"ble", @"unauthorized"];
        [self.native postEvent:event];
        return;
    }
#endif

    SEL selector = NSSelectorFromString(@"coreMIDIBLE");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:nil waitUntilDone:NO];
    }
}
- (void)documentInteraction:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"documentInteraction:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
    }
}

- (void)openSafariView:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"openSafariView:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
    }
}

- (void)openFilename:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"openFilename:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelector:selector withObject:notification.object];
    }
}

- (void)saveFilename:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"saveFilename:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelector:selector withObject:notification.object];
    }
}

- (void)importFile:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"importFile:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
    }
}

- (void)exportFile:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"exportFile:");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:notification.object waitUntilDone:NO];
    }
}

- (void)browsingWeb:(NSNotification *)notification
{
    NSURL *url = notification.object;
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"url", url ? [url absoluteString] : @""];
    [self.native postEvent:event];

    SEL selector = NSSelectorFromString(@"webAuthenticationCancel");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelector:selector withObject:nil];
    }
}

- (void)barcodeScanner:(NSNotification *)notification
{
    SEL selector = NSSelectorFromString(@"barcodeScanner");
    if ([_controller respondsToSelector:selector]) {
        [_controller performSelectorOnMainThread:selector withObject:nil waitUntilDone:NO];
    }
}
#endif

@end
