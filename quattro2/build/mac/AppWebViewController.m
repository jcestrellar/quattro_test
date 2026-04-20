//
//  AppWebViewController.m
//
//  Copyright (c) 2024 Roland Corporation. All rights reserved.
//

#import "AppWebViewController.h"

@interface AppWebViewController ()
@end

@implementation AppWebViewController

#if TARGET_OS_IPHONE
- (void)viewDidLoad
{
    [super viewDidLoad];

    [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback withOptions:AVAudioSessionCategoryOptionMixWithOthers error:nil];
}

- (void)applicationDidEnterBackground:(NSNotification *)notification
{
    [super applicationDidEnterBackground:notification];
}

- (void)applicationWillEnterForeground:(NSNotification *)notification
{
    [super applicationWillEnterForeground:notification];
}

- (void)applicationWillTerminate:(NSNotification *)notification
{
	[super applicationWillTerminate:notification];
}
#elif TARGET_OS_MAC
- (BOOL)performKeyEquivalent:(NSEvent *)event
{
    return NO;
}
#endif

- (NSURL *)startURL
{
#ifdef SUPPORT_LOCALHOST
    NSString *url = [NSString stringWithFormat:@"http://localhost:%u/html/index.html", self.intf.portNo];
    return [NSURL URLWithString:url];
#else
    NSBundle *bundle = [NSBundle bundleForClass:[self class]];
    NSString *path = [bundle pathForResource:@"html/index" ofType:@"html"];
    return [NSURL fileURLWithPath:path];
#endif
}

/* native API extensions */

static NSString *const OBJ_NAME = @"calc";

- (void)nativeControl:(NSString *)request
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"alert", request];
    [self.intf.native postEvent:event];
}

- (NSString *)$$calc_multiple:(NSString *)param1 :(NSString *)param2
{
    int a = [param1 intValue];
    int b = [param2 intValue];
    return_d(a * b);
}

@end
