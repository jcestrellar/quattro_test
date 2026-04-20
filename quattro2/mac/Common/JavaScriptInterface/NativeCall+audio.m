//
//  NativeCall+audio.m
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#import "NativeCall.h"

static NSString *const OBJ_NAME = @"audio";

static NSString *const AudioConverterOutputFileKey = @"file";
static NSString *const AudioConverterFormatKey     = @"format";
static NSString *const AudioConverterChannelsKey   = @"channels";
static NSString *const AudioConverterSampleRateKey = @"samplerate";
static NSString *const AudioConverterBitDepthKey   = @"bitdepth";
static NSString *const AudioConverterBitRateKey    = @"bitrate";
static NSString *const AudioConverterDurationKey   = @"duration";

@interface NativeCall (audio) @end

@implementation NativeCall (audio)

- (NSString *)$$audio_inputs:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    return_s(@"[]"); /* Not supported */
#elif TARGET_OS_MAC
    return_s(JSONStringWithObject([AudioDevice enumulateDeviceWithScope:kAudioDevicePropertyScopeInput]));
#endif
}

- (NSString *)$$audio_outputs:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    return_s(@"[]"); /* Not supported */
#elif TARGET_OS_MAC
    return_s(JSONStringWithObject([AudioDevice enumulateDeviceWithScope:kAudioDevicePropertyScopeOutput]));
#endif
}

- (NSString *)$$audio_format:(NSString *)param1 :(NSString *)param2
{
    NSMutableDictionary *dict = [NSMutableDictionary dictionary];

    NSString *formatID = nil;
    AudioStreamBasicDescription format;
    Float64 duration;
    if (![AudioConverter formatWithURL:[NSURL fileURLWithPath:param1] format:&format duration:&duration]) {
        formatID = @"error";
        memset(&format, 0, sizeof(AudioStreamBasicDescription));
        duration = 0;
    } else {
        switch (format.mFormatID) {
            case kAudioFormatLinearPCM:
                formatID = @"PCM";
                if (format.mFormatFlags & kAudioFormatFlagIsFloat) {
                    format.mBitsPerChannel = 0;
                }
                break;
            case kAudioFormatMPEG4AAC:
                formatID = @"AAC";
                break;
            case kAudioFormatMPEGLayer3:
                formatID = @"MP3";
                break;
            default:
                formatID = [NSString stringWithFormat:@"0x%04X", format.mFormatID];
                break;
        }
    }

    [dict setObject:formatID forKey:AudioConverterFormatKey];
    [dict setObject:[NSNumber numberWithInt:format.mChannelsPerFrame] forKey:AudioConverterChannelsKey];
    [dict setObject:[NSNumber numberWithInt:format.mSampleRate] forKey:AudioConverterSampleRateKey];
    [dict setObject:[NSNumber numberWithInt:format.mBitsPerChannel] forKey:AudioConverterBitDepthKey];
    [dict setObject:[NSNumber numberWithInt:format.mReserved] forKey:AudioConverterBitRateKey];
    [dict setObject:[NSNumber numberWithFloat:(float)duration] forKey:AudioConverterDurationKey];

    return_s(JSONStringWithObject(dict));
}

- (NSString *)$$audio_convert:(NSString *)param1 :(NSString *)param2
{
    NSDictionary *dict = dictionaryWithJSONString(param2);

    AudioStreamBasicDescription format;
    memset(&format, 0, sizeof(AudioStreamBasicDescription));

    NSString *formatID = [dict objectForKey:AudioConverterFormatKey];
    if ([formatID isEqualToString:@"wav"]) {
        format.mFormatID = kAudioFormatLinearPCM;
    } else if ([formatID isEqualToString:@"m4a"]) {
        format.mFormatID = kAudioFormatMPEG4AAC;
    }
    format.mChannelsPerFrame = [[dict objectForKey:AudioConverterChannelsKey] intValue];
    format.mSampleRate = [[dict objectForKey:AudioConverterSampleRateKey] intValue];
    format.mBitsPerChannel = [[dict objectForKey:AudioConverterBitDepthKey] intValue];
    format.mReserved = [[dict objectForKey:AudioConverterBitRateKey] intValue];

    NSString *event = nil;
    if (format.mFormatID && [AudioConverter convertAtURL:[NSURL fileURLWithPath:param1]
                                                   toURL:[NSURL fileURLWithPath:[dict objectForKey:AudioConverterOutputFileKey]]
                                                  format:&format]) {
        NSArray *array = @[[dict objectForKey:AudioConverterOutputFileKey]];
        event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"converted", param1, JSONStringWithObject(array)];
    } else {
        event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"convertfailed", param1];
    }
    [self postEvent:event];
    undefined;
}

- (NSString *)$$audio_split:(NSString *)param1 :(NSString *)param2
{
    NSData *data = [param2 dataUsingEncoding:NSUTF8StringEncoding];
    NSArray *array = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
    NSMutableArray *urls = [NSMutableArray array];
    for (NSString *path in array) {
        [urls addObject:[NSURL fileURLWithPath:path]];
    }

    NSString *event = nil;
    if ([AudioConverter splitAtURL:[NSURL fileURLWithPath:param1]
                             toURL:urls]) {
        event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"converted", param1, param2];
    } else {
        event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"convertfailed", param1];
    }
    [self postEvent:event];
    undefined;
}

- (NSString *)$$audio_reverse:(NSString *)param1 :(NSString *)param2
{
    NSString *event = nil;
    if ([AudioConverter reverseAtURL:[NSURL fileURLWithPath:param1]
                               toURL:[NSURL fileURLWithPath:param2]]) {
        NSArray *array = @[param2];
        event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"converted", param1, JSONStringWithObject(array)];
    } else {
        event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"convertfailed", param1];
    }
    [self postEvent:event];
    undefined;
}

@end

@implementation _AudioDeviceDelegate

- (void)audioObjectAddedRemoved
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@", OBJ_NAME, @"changed"];
    [self.native postEvent:event];
}

@end
