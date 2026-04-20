//
//  SceneDelegate.m
//

#import "SceneDelegate.h"
#import "../Common/JavaScriptInterface/JavaScriptInterface.h"

@interface SceneDelegate () {
    UIBackgroundTaskIdentifier _backgroundTask;
}
@end

@implementation SceneDelegate

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions {
	//NSLog(@"UIScene.willConnectToSession");
	for (UIOpenURLContext *context in connectionOptions.URLContexts) {
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", [context.URL absoluteString]];
		[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
	}
}

- (void)sceneDidDisconnect:(UIScene *)scene {
    //NSLog(@"UIScene.sceneDidDisconnect");
    NSInteger unixtime = (NSInteger)([[NSDate date] timeIntervalSince1970] * 1000);
    [[NSUserDefaults standardUserDefaults] setObject:[@(unixtime) stringValue] forKey:@"__app_close"];
}

- (void)sceneDidBecomeActive:(UIScene *)scene {
    //NSLog(@"UIScene.sceneDidBecomeActive");
}

- (void)sceneWillResignActive:(UIScene *)scene {
    //NSLog(@"UIScene.sceneWillResignActive");
#ifdef SUPPORT_LOCALHOST
    if (_backgroundTask == UIBackgroundTaskInvalid) {
        _backgroundTask = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
            [[NSNotificationCenter defaultCenter] postNotificationName:@"stopHTTPServer" object:nil userInfo:nil];
            [[UIApplication sharedApplication] endBackgroundTask:_backgroundTask];
            _backgroundTask = UIBackgroundTaskInvalid;
        }];
    }
#endif
}

- (void)sceneWillEnterForeground:(UIScene *)scene {
    //NSLog(@"UIScene.sceneWillEnterForeground");
#ifdef SUPPORT_LOCALHOST
    if (_backgroundTask != UIBackgroundTaskInvalid) {
        [[UIApplication sharedApplication] endBackgroundTask:_backgroundTask];
        _backgroundTask = UIBackgroundTaskInvalid;
    }
#endif
}

- (void)sceneDidEnterBackground:(UIScene *)scene {
    //NSLog(@"UIScene.sceneDidEnterBackground");
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *) URLContexts
{
	for (UIOpenURLContext *context in URLContexts) {
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"open", [context.URL absoluteString]];
		[[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
	}
}

- (void)scene:(UIScene *)scene continueUserActivity:(nonnull NSUserActivity *)userActivity
{
	if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {
		[[NSNotificationCenter defaultCenter] postNotificationName:@"browsingWeb" object:[userActivity webpageURL] userInfo:nil];
	}
}

@end
