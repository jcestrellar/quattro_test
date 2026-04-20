//
//  AudioDevice.m
//  
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "AudioDevice.h"

NSString *const AudioDeviceNameKey       = @"AudioDeviceNameKey";
NSString *const AudioDeviceUIDKey        = @"AudioDeviceUIDKey";
NSString *const AudioDeviceChannelsKey   = @"AudioDeviceChannelsKey";
NSString *const AudioDeviceSampleRateKey = @"AudioDeviceSampleRateKey";
NSString *const AudioDeviceBitDepthKey   = @"AudioDeviceBitDepthKey";
NSString *const AudioDeviceCurrentKey    = @"AudioDeviceCurrentKey";

@interface AudioDevice () {
}
@end

@implementation AudioDevice

@synthesize delegate = _delegate;

#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
static OSStatus ListenerProc(AudioObjectID inObjectID,
                             UInt32 inNumberAddresses,
                             const AudioObjectPropertyAddress *inAddresses,
                             void *inClientData)
{
    AudioDevice *obj = (AudioDevice*)inClientData;
    [obj audioObjectAddedRemoved];
    return noErr;
}

- (id)init
{
    if (self = [super init]) {
        const AudioObjectPropertyAddress address = {
            kAudioHardwarePropertyDevices,
            kAudioObjectPropertyScopeGlobal,
            kAudioObjectPropertyElementMain
        };
        AudioObjectAddPropertyListener(kAudioObjectSystemObject, &address, ListenerProc, self);
    }

    return self;
}

- (void)dealloc
{
    const AudioObjectPropertyAddress address = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };
    AudioObjectRemovePropertyListener(kAudioObjectSystemObject, &address, ListenerProc, self);

    [super dealloc];
}

- (void)audioObjectAddedRemoved
{
    if ([self.delegate respondsToSelector:@selector(audioObjectAddedRemoved)])
        [self.delegate audioObjectAddedRemoved];
}

+ (NSArray *)enumulateDeviceWithScope:(AudioObjectPropertyScope)scope
{
    NSMutableArray *array = [NSMutableArray array];

    UInt32 size;
    OSStatus err;

    /* at first, get default deviceID */
    AudioDeviceID defaultID = kAudioObjectUnknown;
    AudioObjectPropertyAddress address = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };
    if (scope == kAudioDevicePropertyScopeInput) {
        address.mSelector = kAudioHardwarePropertyDefaultInputDevice;
    }
    size = sizeof(AudioDeviceID);
    AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, &defaultID);

    /* enumlate all input/output devices */
    address.mSelector = kAudioHardwarePropertyDevices;
    err = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &address, 0, NULL, &size);
    if (err != noErr) { return array; }

    UInt32 count = size / sizeof(AudioDeviceID);
    AudioDeviceID *deviceList = (AudioDeviceID *)calloc(count, sizeof(AudioDeviceID));
    err = AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, deviceList);
    if (err != noErr) { free(deviceList); return array; }

    address.mScope = scope;

    for (UInt32 i = 0; i < count; i++) {

        /* check channel counts (if 0, this device is out of scope) */
        address.mSelector = kAudioDevicePropertyStreamConfiguration;
        err = AudioObjectGetPropertyDataSize(deviceList[i], &address, 0, NULL, &size);
        if (err != noErr) { continue; }
        UInt32 channelCount = 0;
        AudioBufferList *bufferList = (AudioBufferList*)calloc(size / sizeof(AudioBufferList), sizeof(AudioBufferList));
        err = AudioObjectGetPropertyData(deviceList[i], &address, 0, NULL, &size, bufferList);
        if (err == noErr) {
            for (UInt32 j = 0; j < bufferList->mNumberBuffers; j++) {
                channelCount += bufferList->mBuffers[j].mNumberChannels;
            }
        }
        free(bufferList);
        if (channelCount == 0) { continue; } /* out of scope */

        NSMutableDictionary *dict = [NSMutableDictionary dictionary];

        CFStringRef deviceUIDRef = NULL;
        CFStringRef deviceNameRef = NULL;
        AudioStreamBasicDescription format;

        if (err == noErr) {
            address.mSelector = kAudioDevicePropertyDeviceUID;
            size = sizeof(CFStringRef);
            err = AudioObjectGetPropertyData(deviceList[i], &address, 0, NULL, &size, &deviceUIDRef);
        }
        if (err == noErr) {
            address.mSelector = kAudioObjectPropertyName;
            size = sizeof(CFStringRef);
            err = AudioObjectGetPropertyData(deviceList[i], &address, 0, NULL, &size, &deviceNameRef);
        }
        if (err == noErr) {
            address.mSelector = kAudioStreamPropertyPhysicalFormat;
            size = sizeof(AudioStreamBasicDescription);
            err = AudioObjectGetPropertyData(deviceList[i], &address, 0, NULL, &size, &format);
        }
        if (err == noErr) {
            [dict setObject:[NSString stringWithString:(__bridge NSString *)deviceNameRef] forKey:AudioDeviceNameKey];
            [dict setObject:[NSString stringWithString:(__bridge NSString *)deviceUIDRef] forKey:AudioDeviceUIDKey];
            [dict setObject:[NSNumber numberWithInt:format.mChannelsPerFrame] forKey:AudioDeviceChannelsKey];
            [dict setObject:[NSNumber numberWithInt:format.mSampleRate] forKey:AudioDeviceSampleRateKey];
            [dict setObject:[NSNumber numberWithInt:format.mBitsPerChannel] forKey:AudioDeviceBitDepthKey];
            [dict setObject:[NSNumber numberWithBool:(deviceList[i] == defaultID)] forKey:AudioDeviceCurrentKey];
            [array addObject:dict];
        }

        if (deviceUIDRef) { CFRelease(deviceUIDRef); }
        if (deviceNameRef) { CFRelease(deviceNameRef); }
    }

    free(deviceList);

    return array;
}

+ (AudioDeviceID)deviceIDForUID:(NSString *)deviceUID scope:(AudioObjectPropertyScope)scope
{
	UInt32 size;
	OSStatus err;

	AudioDeviceID deviceID = kAudioObjectUnknown;
    if (!deviceUID.length) {
		AudioObjectPropertyAddress address = {
			kAudioHardwarePropertyDefaultOutputDevice,
			kAudioObjectPropertyScopeGlobal,
			kAudioObjectPropertyElementMain
		};
		if (scope == kAudioDevicePropertyScopeInput) {
			address.mSelector = kAudioHardwarePropertyDefaultInputDevice;
		}
		size = sizeof(AudioDeviceID);
		AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, &deviceID);
        return deviceID;
    }

    AudioObjectPropertyAddress address = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };

    size = sizeof(AudioDeviceID);
    err = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &address, 0, NULL, &size);
    if (err != noErr) { return kAudioObjectUnknown; }

    UInt32 count = size / sizeof(AudioDeviceID);
    AudioDeviceID *deviceList = (AudioDeviceID *)calloc(count, sizeof(AudioDeviceID));
    err = AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, deviceList);
    if (err != noErr) { free(deviceList); return 0; }

    address.mSelector = kAudioDevicePropertyDeviceUID;
    address.mScope = scope;

    for (UInt32 i = 0; i < count && !deviceID; i++) {
        CFStringRef deviceUIDRef = NULL;
        size = sizeof(CFStringRef);
        err = AudioObjectGetPropertyData(deviceList[i], &address, 0, NULL, &size, &deviceUIDRef);
        if (err == noErr) {
            NSString *uid = [NSString stringWithString:(__bridge NSString *)deviceUIDRef];
            if ([uid isEqualToString:deviceUID]) {
                deviceID = deviceList[i];
            }
        }
        if (deviceUIDRef) { CFRelease(deviceUIDRef); }
    }

    free(deviceList);

    return deviceID;
}
#endif

@end
