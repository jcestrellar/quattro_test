//
//  AppWebViewController.h
//
//  Copyright (c) 2024 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import "mac/iOS/WebViewController.h"
#elif TARGET_OS_MAC
#import "mac/macOS/WebViewController.h"
#endif

@interface AppWebViewController : WebViewController

- (NSURL *)startURL;

@end
