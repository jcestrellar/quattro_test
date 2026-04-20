//
//  AudioDevice.h
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>

extern NSString *const AudioDeviceNameKey;
extern NSString *const AudioDeviceUIDKey;
extern NSString *const AudioDeviceChannelsKey;
extern NSString *const AudioDeviceSampleRateKey;
extern NSString *const AudioDeviceBitDepthKey;
extern NSString *const AudioDeviceCurrentKey;

@protocol AudioDeviceDelegate <NSObject>

@optional
- (void)audioObjectAddedRemoved;

@end

@interface AudioDevice : NSObject

@property (assign) id<AudioDeviceDelegate> delegate;

#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
+ (NSArray *)enumulateDeviceWithScope:(AudioObjectPropertyScope)scope;
+ (AudioDeviceID)deviceIDForUID:(NSString *)deviceUID scope:(AudioObjectPropertyScope)scope;
#endif

@end
