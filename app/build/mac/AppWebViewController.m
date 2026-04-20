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
    
    [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback withOptions:AVAudioSessionCategoryOptionAllowBluetooth error:nil];
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

#ifdef USE_IN_APP_PURCHASE
- (BOOL)isConsumable:(NSString *)productIdentifier
{
    //	return [productIdentifier isEqual:@"com.example.product.002"];
    return NO;
}
#endif

- (NSURL *)startURL
{
    NSBundle *bundle = [NSBundle bundleForClass:[self class]];
    NSString *path = [bundle pathForResource:@"html/index" ofType:@"html"];
    return [NSURL fileURLWithPath:path];
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

// Sample Project 用に追加
#pragma mark - Battery
/**
 Quattro の仕様上 以下を守ること。
 - 実装するメソッドの param1 と param2 の２つの引数は、使用の是非にかかわらず必ず定義する。
 - 戻り値は NSString にする。
 */

static NSString *const OBJ_BATTERY = @"battery";
- (NSString*)$$battery_monitoring:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL enabled = [param1 boolValue];
        UIDevice.currentDevice.batteryMonitoringEnabled = enabled;
        
        if (enabled) {
            [NSNotificationCenter.defaultCenter addObserver:self
                                                   selector:@selector(batteryLevelDidChange:)
                                                       name:UIDeviceBatteryLevelDidChangeNotification
                                                     object:nil];
            
            [NSNotificationCenter.defaultCenter addObserver:self
                                                   selector:@selector(batteryStateDidChange:)
                                                       name:UIDeviceBatteryStateDidChangeNotification
                                                     object:nil];
        }
        else {
            [NSNotificationCenter.defaultCenter removeObserver:self
                                                          name:UIDeviceBatteryLevelDidChangeNotification
                                                        object:nil];
            
            [NSNotificationCenter.defaultCenter removeObserver:self
                                                          name:UIDeviceBatteryStateDidChangeNotification
                                                        object:nil];
        }
    });
    undefined;
#else
    undefined;
#endif
}

- (NSString *)$$battery_level:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    UIDevice *device = UIDevice.currentDevice;
    float level = device.batteryLevel;
    return_f(level);
#else
    return_f(-1);
#endif
}

- (NSString *)$$battery_state:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    UIDevice *device = UIDevice.currentDevice;
    UIDeviceBatteryState state = device.batteryState;
    return_d(state);
#else
    return_d(0);
#endif
}

#pragma mark function
/// UIDeviceBatteryState を Javascript に渡す値へ変換
#if TARGET_OS_IPHONE
- (int) convertBatteryStateToResult:(UIDeviceBatteryState) state
{
    switch (state) {
        case UIDeviceBatteryStateUnplugged:
            return 1;
        case UIDeviceBatteryStateCharging:
            return 2;
        case UIDeviceBatteryStateFull:
            return 3;
        case UIDeviceBatteryStateUnknown:
        default:
            return 0;
    }
}
#endif

#pragma mark selector
/// バッテリー残量変更通知
#if TARGET_OS_IPHONE
- (void)batteryLevelDidChange:(NSNotification *)notification
{
    float level = UIDevice.currentDevice.batteryLevel;
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%f", OBJ_BATTERY, @"levelChanged", level];
    [self.intf.native postEvent:event];
}
#endif

/// バッテリー状態変更通知
#if TARGET_OS_IPHONE
- (void)batteryStateDidChange:(NSNotification *)notification
{
    UIDeviceBatteryState state = UIDevice.currentDevice.batteryState;
    int nState = [self convertBatteryStateToResult:state];
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%ld", OBJ_BATTERY, @"stateChanged", (long)nState];
    [self.intf.native postEvent:event];
}
#endif

@end
