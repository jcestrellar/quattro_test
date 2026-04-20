//
//  WebViewController.m
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import <AVFoundation/AVFoundation.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import "WebViewController.h"
#import "OpenPanelController.h"
#import "SavePanelController.h"
#import "BarcodeScannerController.h"

#include <TargetConditionals.h>
#if TARGET_IPHONE_SIMULATOR
@compatibility_alias CABTMIDICentralViewController UIViewController;
#elif TARGET_OS_IPHONE
#import <CoreAudioKit/CoreAudioKit.h>
#endif

#ifdef USE_VENDER_BLEMIDI
#import "ScanBLEMIDIController.h"
#endif

#ifdef VMIDI_IN
NSString *const midiDestinationName = @"Quattro (IN)";
SInt32 midiSourceUniqueID = 'QaTR';
#endif

@interface WebViewController () {
    BOOL _documentPickerModeImport;
}
@property (assign) UILongPressGestureRecognizer *longpress1;
@property (assign) UILongPressGestureRecognizer *longpress2;
@property (retain) NSArray *exportfiles;
@property (retain) ASWebAuthenticationSession *webAuthenticationSession;
@property (retain) SFSafariViewController *safariViewController;
@end

@implementation WebViewController

- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];

    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"prompt"];
    [self.webView setUIDelegate:nil];
    [self.webView setNavigationDelegate:nil];

    [_webView release];
    [_longpress1 release];
    [_longpress2 release];
    [_exportfiles release];

    [_intf stopHTTPServer];
    [_intf release];

    [super dealloc];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    _intf = [JavaScriptInterface sharedInstance];
    _intf.controller = self;

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationDidEnterBackground:) name:UIApplicationDidEnterBackgroundNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationWillEnterForeground:) name:UIApplicationWillEnterForegroundNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationWillTerminate:) name:UIApplicationWillTerminateNotification object:nil];
    
#ifdef ENABLE_ADJUST_FONT_SIZE
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(adjustFontSizeBasedOnAccessibility)
                                                 name:UIContentSizeCategoryDidChangeNotification
                                               object:nil];
#endif


#ifdef USE_IN_APP_PURCHASE
    [StoreManager setViewController:self];
#endif

    WKUserScript *userScript = [[WKUserScript alloc] initWithSource:[NSString stringWithFormat:@"window.$$prompt = true"]
                                                      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                   forMainFrameOnly:NO];
    WKUserContentController *userContentController = [[WKUserContentController alloc] init];
    [userContentController addUserScript:userScript];
    
#ifdef ENABLE_ADJUST_FONT_SIZE
    NSString *fontSizeScriptSource = [self fontSizeAdjustmentScript];
    WKUserScript *fontSizeScript = [[WKUserScript alloc] initWithSource:fontSizeScriptSource
                                                          injectionTime:WKUserScriptInjectionTimeAtDocumentEnd
                                                       forMainFrameOnly:YES];
    
    [userContentController addUserScript:fontSizeScript];
#endif
    
    [userContentController addScriptMessageHandler:self name:@"prompt"];
    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.userContentController = userContentController;
    [configuration setURLSchemeHandler:self forURLScheme:@"native"];
    @try {
        [configuration.preferences setValue:@TRUE forKey:@"allowFileAccessFromFileURLs"];
    } @catch (NSException *exception) {}
#ifdef ALLOW_CROSS_ORIGIN
    @try {
        [configuration setValue:@TRUE forKey:@"allowUniversalAccessFromFileURLs"];
    } @catch (NSException *exception) {}
#endif
    configuration.applicationNameForUserAgent = @"roland.quattro(iOS)";
    configuration.allowsInlineMediaPlayback = YES;

    CGRect frame = self.view.bounds;
#if defined(CONTENT_WIDTH) && defined(CONTENT_HEIGHT)
    UIWindow *window = UIApplication.sharedApplication.windows.firstObject;
    frame.origin.x = window.safeAreaInsets.left;
    frame.origin.y = window.safeAreaInsets.top;
    frame.size.width  -= (window.safeAreaInsets.left + window.safeAreaInsets.right);
    frame.size.height -= (window.safeAreaInsets.top + window.safeAreaInsets.bottom);
    float scale = MIN(frame.size.width / CONTENT_WIDTH, frame.size.height / CONTENT_HEIGHT);
    self.view.transform = CGAffineTransformMakeScale(scale, scale);
#endif
    _webView = [[WKWebView alloc] initWithFrame:frame configuration:configuration];
#ifdef DEBUG
  #if __IPHONE_OS_VERSION_MAX_ALLOWED >= 160400
    if (@available(iOS 16.4, *)) {
        _webView.inspectable = YES;
    }
  #endif
#endif
#ifdef WEBVIEW_NO_BOUNCE
    self.webView.scrollView.bounces = false;
#endif
    self.webView.autoresizingMask = (UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth);
    [self.webView setUIDelegate:self];
    [self.webView setNavigationDelegate:self];
    [self.view addSubview:_webView];
    [self loadURL:[self startURL]];
}

#ifdef PREFERS_STATUSBAR_HIDDEN
- (BOOL)prefersStatusBarHidden
{
    return YES;
}
#endif

- (UIStatusBarStyle)preferredStatusBarStyle
{
#if defined(CONTENT_WIDTH) && defined(CONTENT_HEIGHT)
	if (@available(iOS 14.2, *)) {
		return UIStatusBarStyleLightContent;
	}
#endif
	return [super preferredStatusBarStyle];
}

- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self.navigationController setToolbarHidden:YES];
    [self.navigationController setNavigationBarHidden:YES];

    [self removeLongPressGestures];
}

- (void)viewDidDisappear:(BOOL)animated
{
    [super viewDidDisappear:animated];
    [self.navigationController setNavigationBarHidden:NO];
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
        [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
        decisionHandler(WKNavigationResponsePolicyCancel);
    }
}

- (void)webView:(WKWebView *)webView requestMediaCapturePermissionForOrigin:(WKSecurityOrigin *)origin initiatedByFrame:(WKFrameInfo *)frame type:(WKMediaCaptureType)type decisionHandler:(void (^)(WKPermissionDecision decision))decisionHandler
API_AVAILABLE(ios(15.0))
{
    decisionHandler(WKPermissionDecisionGrant);
}

- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(nonnull NSString *)message initiatedByFrame:(nonnull WKFrameInfo *)frame completionHandler:(nonnull void (^)(void))completionHandler
{
	UIAlertController *alertController = [UIAlertController alertControllerWithTitle:message message:webView.URL.host preferredStyle:UIAlertControllerStyleAlert];
	[alertController addAction:[UIAlertAction actionWithTitle:@"CLOSE" style:UIAlertActionStyleCancel handler:^(UIAlertAction *action) {
		completionHandler();
	}]];
	[self presentViewController:alertController animated:YES completion:^{}];
}

- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL))completionHandler
{
	UIAlertController *alertController = [UIAlertController alertControllerWithTitle:message message:webView.URL.host preferredStyle:UIAlertControllerStyleAlert];
	[alertController addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
		completionHandler(YES);
	}]];
	[alertController addAction:[UIAlertAction actionWithTitle:@"Cancel" style:UIAlertActionStyleCancel handler:^(UIAlertAction *action) {
		completionHandler(NO);
	}]];
	[self presentViewController:alertController animated:YES completion:^{}];
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

- (NSURL *)startURL
{
    NSBundle *bundle = [NSBundle bundleForClass:[self class]];
    NSString *path = [bundle pathForResource:@"html/index" ofType:@"html"];
    return [NSURL fileURLWithPath:path];
}

- (void)loadURL:(NSURL *)url
{
    if ([[url scheme] isEqualToString:@"file"]) {
        NSString *path = [[NSURL URLWithString:@"./" relativeToURL:url] absoluteString];
        [self.webView loadFileURL:url allowingReadAccessToURL:[NSURL URLWithString:path]];
    } else {
        [self.webView loadRequest:[NSURLRequest requestWithURL:url]];
    }
}

- (void)evaluateJavaScript:(NSString *)script
{
    [self.webView evaluateJavaScript:script completionHandler:nil];
}

- (void)applicationDidEnterBackground:(NSNotification *)notification
{
	[self evaluateJavaScript:@"$native.stop()"];

	NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"log", @"app_stop", JSONStringWithObject(@{ @"timestamp" : @(unixtime) })];
	[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
	[[NSUserDefaults standardUserDefaults] setObject:[@(unixtime) stringValue] forKey:@"__app_close"];
}

- (void)applicationWillEnterForeground:(NSNotification *)notification
{
    if ([_intf startHTTPServer]) {
        [self loadURL:[self startURL]];
    } else {
        [self evaluateJavaScript:@"$native.restart()"];
    }

    NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"log", @"app_restart", JSONStringWithObject(@{ @"timestamp" : @(unixtime) })];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

- (void)applicationWillTerminate:(NSNotification *)notification
{
}

#pragma mark - remove long press guestures (bugfix for -webkit-touch-callout)

- (void)removeLongPressGestures
{
    _longpress1 = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleGestures:)];
    self.longpress1.minimumPressDuration = 0.45f;
    self.longpress1.allowableMovement = 100.0f;

    _longpress2 = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleGestures:)];
    self.longpress2.minimumPressDuration = 0.08f;
    self.longpress2.allowableMovement = 100.0f;
    self.longpress2.numberOfTapsRequired = 1;

    NSArray *views = self.webView.subviews;
    for (int i = 0; i < views.count; i++) {
        UIView *webViewScrollView = views[i];
        if ([webViewScrollView isKindOfClass:[UIScrollView class]]) {
            NSArray *webViewScrollViewSubViews = webViewScrollView.subviews;
            if (webViewScrollViewSubViews.count) {
                UIView *view = webViewScrollViewSubViews[0];
                [view addGestureRecognizer:self.longpress1];
                [view addGestureRecognizer:self.longpress2];
                break;
            }
        }
    }
}

- (void)handleGestures:(UILongPressGestureRecognizer *)sender
{
    /* no guestures */
}

#pragma mark - open "Bluetooth MIDI Devices"

- (void)coreMIDIBLE
{
#ifdef USE_VENDER_BLEMIDI
    ScanBLEMIDIController *controller = [[[ScanBLEMIDIController alloc] initWithNibName:@"ScanBLEMIDIController" bundle:nil] autorelease];
#else
    CABTMIDICentralViewController *controller = [[[CABTMIDICentralViewController alloc] init] autorelease];
#endif

#if TARGET_IPHONE_SIMULATOR
    controller.preferredContentSize = CGSizeMake(800, 600);
#endif
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPhone) {
        [self.navigationController setNavigationBarHidden:NO];
        [self.navigationController pushViewController:controller animated:YES];
    } else {
        [self popoverViewController:@[controller]];
    }
}

#pragma mark - ASWebAuthenticationSession foriOS

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session
{
	return self.view.window;
}

- (void)webAuthentication:(NSArray *)params
{
    NSURL *url = (params.count > 0) ? [params objectAtIndex:0] : nil;
    NSString *urlScheme = (params.count > 1) ? [params objectAtIndex:1] : nil;

    if (url && !self.webAuthenticationSession) {
        self.webAuthenticationSession = [[ASWebAuthenticationSession alloc] initWithURL:url callbackURLScheme:urlScheme completionHandler:^(NSURL *callbackURL, NSError *error) {
            [[NSNotificationCenter defaultCenter] postNotificationName:@"browsingWeb" object:callbackURL userInfo:nil];
            self.webAuthenticationSession = nil;
        }];
        self.webAuthenticationSession.presentationContextProvider = self;
        [self.webAuthenticationSession start];
    }
}

- (void)webAuthenticationCancel
{
    [self.webAuthenticationSession cancel];
    self.webAuthenticationSession = nil;
}

#pragma mark - document interaction for iOS

- (void)documentInteraction:(NSURL *)url
{
    UIDocumentInteractionController *controller = [UIDocumentInteractionController interactionControllerWithURL:url];
    controller.delegate = self;
    [controller presentPreviewAnimated:YES];
}

- (UIViewController *)documentInteractionControllerViewControllerForPreview:(UIDocumentInteractionController *)controller
{
    return  self;
}

- (void)documentInteractionController:(UIDocumentInteractionController *)controller willBeginSendingToApplication:(NSString *)application
{
    /* nothing to do */
}

- (void)documentInteractionController:(UIDocumentInteractionController *)controller didEndSendingToApplication:(NSString *)application
{
    /* nothing to do */
}

#pragma mark - open SFSafariViewController

- (void)openSafariView:(NSURL *)url
{
    if (!self.safariViewController) {
        self.safariViewController = [[SFSafariViewController alloc] initWithURL:url];
        self.safariViewController.modalTransitionStyle = UIModalTransitionStyleCrossDissolve;
        self.safariViewController.delegate = self;
        [self presentViewController:self.safariViewController animated:YES completion:nil];
    }
}

- (void)safariViewController:(SFSafariViewController *)controller
      didCompleteInitialLoad:(BOOL)didLoadSuccessfully
{
    /* nothing to do */
}
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller
{
    self.safariViewController = nil;
}
- (NSArray<UIActivity *> *)safariViewController:(SFSafariViewController *)controller
                            activityItemsForURL:(NSURL *)URL
                                          title:(NSString *)title
{
  return @[];
}
- (NSArray<UIActivityType> *)safariViewController:(SFSafariViewController *)controller
                      excludedActivityTypesForURL:(NSURL *)URL
                                            title:(NSString *)title
{
    return @[];
}

#pragma mark - openfilename & savefilename for iOS

- (NSArray *)createPathStack:(NSString *)initDirectory
{
    NSMutableArray *paths = [NSMutableArray array];

    [paths addObject:[NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) objectAtIndex:0]];

    if (initDirectory.length > 0) {
        BOOL directory, exist = [[NSFileManager defaultManager] fileExistsAtPath:initDirectory isDirectory:&directory];
        if (exist && directory) {
            NSRange range = [initDirectory rangeOfString:paths.firstObject];
            if (range.location == 0) {
                NSArray *compoments = [[initDirectory substringFromIndex:range.length] componentsSeparatedByString:@"/"];
                NSString *path = paths.firstObject;
                for (NSString *compoment in compoments) {
                    if (compoment.length == 0) continue;
                    path = [[path stringByAppendingString:@"/"] stringByAppendingString:compoment];
                    [paths addObject:path];
                }
            }
        }
    }

    return paths;
}

- (void)openFilename:(id)obj
{
    NSMutableArray<UIViewController *> *controllers = [NSMutableArray array];
    OpenPanel *panel = [obj autorelease];
    NSArray *paths = [self createPathStack:panel.directory];
    for (NSString *path in paths) {
        OpenPanelController *controller = [[[OpenPanelController alloc] initWithNibName:@"OpenPanelController" bundle:nil] autorelease];
        controller.panel = panel;
        controller.currentURL = [NSURL fileURLWithPath:path];
        [controllers addObject:controller];
    }
    [self popoverViewController:controllers];
}

- (void)saveFilename:(id)obj
{
    NSMutableArray<UIViewController *> *controllers = [NSMutableArray array];
    SavePanel *panel = [obj autorelease];
    NSArray *paths = [self createPathStack:panel.directory];
    for (NSString *path in paths) {
        SavePanelController *controller = [[[SavePanelController alloc] initWithNibName:@"SavePanelController" bundle:nil] autorelease];
        controller.panel = panel;
        controller.currentURL = [NSURL fileURLWithPath:path];
        [controllers addObject:controller];
    }
    [self popoverViewController:controllers];
}

- (void)popoverViewController:(NSArray<UIViewController *> *)controllers
{
    UINavigationController* navigation = [[[UINavigationController alloc] initWithRootViewController:controllers.firstObject] autorelease];
    if (controllers.count > 1) {
        [navigation setViewControllers:controllers animated:NO];
    }
    navigation.modalPresentationStyle = UIModalPresentationPopover;
    //navigation.preferredContentSize = self.view.frame.size;
    [self presentViewController:navigation animated:YES completion:nil];

    if (navigation.popoverPresentationController) {
        navigation.popoverPresentationController.permittedArrowDirections = 0;
        navigation.popoverPresentationController.sourceView = self.view;
        navigation.popoverPresentationController.sourceRect = self.view.bounds;
        navigation.popoverPresentationController.delegate = self;
    }
}

#pragma mark - import & export file for iOS

#ifdef USE_iCLOUD_DOCUMENTS
- (void)importFile:(NSDictionary *)options
{
    _documentPickerModeImport = YES;

    NSArray *filters = nil;
    @try {
        filters = (NSArray *)[[options valueForKey:@"filter"] valueForKey:@"uti"];
    } @catch (NSException *exception) {}

    NSArray *types = @[UTTypeData];
    if (filters.count) {
        NSMutableArray *utis = [NSMutableArray array];
        for (NSString *uti in filters) {
            if ([uti hasPrefix:@"."]) {
                [utis addObject:[UTType typeWithFilenameExtension:[uti substringFromIndex:1]]];
            } else {
                [utis addObject:[UTType typeWithIdentifier:uti]];
            }
        }
        types = utis;
    }

    UIDocumentPickerViewController *controller = [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:types asCopy:YES];
    controller.delegate = self;
    controller.allowsMultipleSelection = [[options valueForKey:@"multiple"] boolValue];
    [self presentViewController:controller animated:YES completion:nil];
}

- (void)exportFile:(NSString *)path
{
    _documentPickerModeImport = NO;

    UIDocumentPickerViewController *controller;
    if ([path hasPrefix:@"[\""]) {
        NSData *data = [path dataUsingEncoding:NSUTF8StringEncoding];
        self.exportfiles = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
        controller = [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:@[UTTypeFolder]];
    } else {
        NSURL *url = [NSURL fileURLWithPath:path];
        controller = [[UIDocumentPickerViewController alloc] initForExportingURLs:@[url] asCopy:true];
    }
    controller.delegate = self;
    [self presentViewController:controller animated:YES completion:nil];
}
#endif

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(nonnull NSArray<NSURL *> *)urls
{
    if (self.exportfiles) {
        NSURL *folderURL = [NSURL URLWithString:urls[0].absoluteString];
        if ([folderURL startAccessingSecurityScopedResource]) {
            for (NSString *path in _exportfiles) {
                NSString *filename = [path lastPathComponent];
                NSURL *source = [NSURL fileURLWithPath:path];
                NSURL *destination = [folderURL URLByAppendingPathComponent:filename];
                [[NSFileManager defaultManager] removeItemAtURL:destination error:nil];
                [[NSFileManager defaultManager] copyItemAtURL:source toURL:destination error:nil];
            }
            [folderURL stopAccessingSecurityScopedResource];
        }
        self.exportfiles = nil;
    }

    NSString *param1 = _documentPickerModeImport ? @"import" : @"export";
    NSString *param2 = [urls[0] path];
    if (controller.allowsMultipleSelection) {
        NSMutableArray *array = [NSMutableArray array];
        for (NSURL *url in urls) {
            [array addObject:[url path]];
        }
        param2 = JSONStringWithObject(array);
    }
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", param1, param2];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller
{
    self.exportfiles = nil;

    if (!_documentPickerModeImport) {
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f", @"app", @"command", @"export"];
        [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
    }
}

#pragma mark - scanning QRCode for iOS

- (void)barcodeScanner
{
    BarcodeScannerController *controller = [[[BarcodeScannerController alloc] init] autorelease];
    controller.metadataObjectTypes = @[AVMetadataObjectTypeQRCode];
    [self.navigationController pushViewController:controller animated:YES];
}

#pragma mark - font size for iOS

#ifdef ENABLE_ADJUST_FONT_SIZE
- (void)adjustFontSizeBasedOnAccessibility {
    NSString *js = [self fontSizeAdjustmentScript];
    [self.webView evaluateJavaScript:js completionHandler:^(id _Nullable result, NSError * _Nullable error) {
        if (error) {
            NSLog(@"font-size 注入エラー: %@", error.localizedDescription);
        }
    }];
}

- (NSString *)fontSizeAdjustmentScript
{
    UIContentSizeCategory contentSizeCategory = [[UIApplication sharedApplication] preferredContentSizeCategory];
        
    // カテゴリごとのパーセンテージマップ
    // 以下を参考におおよその算出
    // https://developer.apple.com/jp/design/human-interface-guidelines/typography#iOS-iPadOS-Dynamic-Type-sizes
    // カテゴリごとの倍率マップ（100% = 1.0）
    static NSDictionary<UIContentSizeCategory, NSNumber *> *scaleMap = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        scaleMap = [@{
            UIContentSizeCategoryExtraSmall: @(0.85),
            UIContentSizeCategorySmall: @(0.90),
            UIContentSizeCategoryMedium: @(0.95),
            UIContentSizeCategoryLarge: @(1.0),
            UIContentSizeCategoryExtraLarge: @(1.10),
            UIContentSizeCategoryExtraExtraLarge: @(1.20),
            UIContentSizeCategoryExtraExtraExtraLarge: @(1.30),
            UIContentSizeCategoryAccessibilityMedium: @(1.40),
            UIContentSizeCategoryAccessibilityLarge: @(1.50),
            UIContentSizeCategoryAccessibilityExtraLarge: @(1.60),
            UIContentSizeCategoryAccessibilityExtraExtraLarge: @(1.70),
            UIContentSizeCategoryAccessibilityExtraExtraExtraLarge: @(1.80)
        } retain];
    });

    NSNumber *scaleFactor = scaleMap[contentSizeCategory] ?: @(1.0);
    // ベースとなるフォントサイズ（CSS の root 要素に設定している基準値）
    CGFloat baseFontSizePx = BASE_FONT_SIZE_PX;
    CGFloat adjustedFontSize = baseFontSizePx * scaleFactor.floatValue;

    // WebView に font-size を反映
    NSString *js = [NSString stringWithFormat:@"document.documentElement.style.fontSize = '%.2fpx';", adjustedFontSize];
    
    return js;
}
#endif

@end
