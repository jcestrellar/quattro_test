//
//  AppDelegate.m
//

#import "AppDelegate.h"
#import "AppWebViewController.h"

@interface AppDelegate ()
@property (assign) IBOutlet NSWindow *window;
@property (assign) IBOutlet AppWebViewController *viewController;
@property (assign) NSMutableArray *options;
@end

@implementation AppDelegate

#ifdef ENABLE_WEBKIT_DEVELOPER
+ (void)initialize {
    [[NSUserDefaults standardUserDefaults] registerDefaults:@{@"WebKitDeveloperExtras": @YES,
                                                              @"WebKitScriptDebuggerEnabled": @YES,
                                                              @"WebKitScriptProfilerEnabled": @YES}];
}
#endif

- (void)dealloc
{
    [_viewController release];
    [super dealloc];
}

-(void)applicationWillFinishLaunching:(NSNotification *)aNotification
{
    NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
    [[NSUserDefaults standardUserDefaults] setObject:[@(unixtime) stringValue] forKey:@"__app_open"];

    [[[NSWorkspace sharedWorkspace] notificationCenter] addObserver:self
                                                           selector:@selector(receiveWakeNote:)
                                                               name:NSWorkspaceDidWakeNotification object: NULL];

    NSString *productName = [[[NSBundle mainBundle] infoDictionary] objectForKey:(NSString*)kCFBundleNameKey];
    NSMenu *menu = [[[NSApp mainMenu] itemAtIndex:0] submenu];
    NSArray<NSMenuItem *> *items = [menu itemArray];
    for (NSMenuItem *item in items) {
        item.title = [item.title stringByReplacingOccurrencesOfString:@"${PRODUCT_NAME}" withString:productName];
    }
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification
{
	[self.window setFrameAutosaveName:@"mainWindow"];
	
	self.window.delegate = self;
	
	[_viewController createWebViewWithFrame:[self.window.contentView bounds] setMainFrameURL:[_viewController startURL]];
	[self.window.contentView addSubview:self.viewController.webView];
	
	if (_options) {
		for (NSString *filename in _options) {
			NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", filename];
			[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
		}
		[_options release];
	}
}

- (BOOL)application:(NSApplication *)sender openFile:(NSString *)filename
{
    if (_viewController) {
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", filename];
        [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
    } else {
        if (_options == nil) {
            _options = [[NSMutableArray alloc] init];
        }
        [_options addObject:filename];
    }

    return YES;
}

- (BOOL)application:(NSApplication *)application continueUserActivity:(NSUserActivity *)userActivity
    restorationHandler:(void (^)(NSArray<id<NSUserActivityRestoring>> *restorableObjects))restorationHandler
{
    if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {
        [_viewController webAuthenticationCallback:[userActivity webpageURL]];
    }
    return YES;
}

- (void)receiveWakeNote:(NSNotification*)note
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"wakeup", [note name]];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

#ifdef ENABLE_APP_EXIT
- (BOOL)windowShouldClose:(id)sender
{
    [self exit:nil];
    return NO;
}
- (IBAction)exit:(id)sender
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"exit", @""];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}
#else
- (IBAction)exit:(id)sender
{
    [[NSApplication sharedApplication] terminate:sender];
}
#endif

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender
{
    return YES;
}

- (void)applicationWillTerminate:(NSNotification *)aNotification
{
	[_viewController webAuthenticationCancel];

    NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
    [[NSUserDefaults standardUserDefaults] setObject:[@(unixtime) stringValue] forKey:@"__app_close"];
}

@end
