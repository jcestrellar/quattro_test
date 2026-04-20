//
//  AppDelegate.m
//

#import "AppDelegate.h"
#import "../Common/JavaScriptInterface/JavaScriptInterface.h"

@interface AppDelegate ()
@end

@implementation AppDelegate

- (void)dealloc
{
    [[JavaScriptInterface sharedInstance] release];
    [super dealloc];
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.
    NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
    [[NSUserDefaults standardUserDefaults] setObject:[@(unixtime) stringValue] forKey:@"__app_open"];

    [JavaScriptInterface sharedInstance];
    return YES;
}

- (void)applicationWillTerminate:(UIApplication *)application {
    // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
}

- (BOOL)application:(UIApplication *)application openURL:(nonnull NSURL *)url options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", [url absoluteString]];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
    return YES;
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *restorableObjects))restorationHandler
{
    if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:@"browsingWeb" object:[userActivity webpageURL] userInfo:nil];
    }
    return YES;
}

#pragma mark - UISceneSession lifecycle

- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}

- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
}

@end
