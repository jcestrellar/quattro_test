//
//  NativeCall+sampler.m
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"sampler";

@interface _SamplePlayerDelegate : NSObject <SamplePlayerDelegate>
@property (assign) NativeCall *native;
@property (assign) int index;
@end

@implementation NativeCall (sampler)

- (NSString *)$$sampler_create:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) {
        int count = [param1 intValue];
        for (int i = 0; i < count; i++) {
            ExtSamplePlayer *player = [[ExtSamplePlayer alloc] init];
            _SamplePlayerDelegate *_delegate = [[_SamplePlayerDelegate alloc] init];
            _delegate.native = self;
            _delegate.index = i;
            player.delegate = _delegate;
            [sampler addObject:player];
        }
    }
    undefined;
}

- (NSString *)$$sampler_device:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_s(@""); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.device = param2;
    }
	return_s(player.device);
}

- (NSString *)$$sampler_open:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_b(NO); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    return_b([player open:[NSURL fileURLWithPath:param2]]);
}

- (NSString *)$$sampler_close:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { undefined; }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    [player close];
    undefined;
}

- (NSString *)$$sampler_play:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { undefined; }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    [player play];
    undefined;
}

- (NSString *)$$sampler_pause:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { undefined; }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    [player pause];
    undefined;
}

- (NSString *)$$sampler_stop:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { undefined; }

    if (param1) {
        ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
        [player stop:(param2 ? [param2 boolValue] : NO)];
    } else {
        for (NSUInteger index = 0; index < sampler.count; index++) {
            ExtSamplePlayer *player = [sampler objectAtIndex:index];
            [player stop:YES];
        }
    }
    undefined;
}

- (NSString *)$$sampler_locate:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { undefined; }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    [player locate:[param2 floatValue]];
    undefined;
}

- (NSString *)$$sampler_begin:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.begin = [param2 floatValue];
    }
    return_f(player.begin);
}

- (NSString *)$$sampler_end:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.end = [param2 floatValue];
    }
    return_f(player.end);
}

- (NSString *)$$sampler_volume:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(1.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.volume = [param2 floatValue];
    }
    return_f(player.volume);
}

- (NSString *)$$sampler_repeat:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_d(0); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.repeat = [param2 intValue];
    }
    return_d(player.repeat);
}

- (NSString *)$$sampler_speed:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(1.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.speed = [param2 floatValue];
    }
    return_f(player.speed);
}

- (NSString *)$$sampler_pitch:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.pitch = [param2 floatValue];
    }
    return_f(player.pitch);
}

- (NSString *)$$sampler_fadein:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.fadeIn = [param2 floatValue];
    }
    return_f(player.fadeIn);
}

- (NSString *)$$sampler_fadeout:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    if (param2) {
        player.fadeOut = [param2 floatValue];
    }
    return_f(player.fadeOut);
}

- (NSString *)$$sampler_control:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_s(@""); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    return_s([player control:param2]);
}

- (NSString *)$$sampler_file:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_s(@""); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    return_s([player.file path]);
}

- (NSString *)$$sampler_totaltime:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_f(0.0f); }

    ExtSamplePlayer *player = [sampler objectAtIndex:[param1 intValue]];
    return_f(player.totalTime);
}

- (NSString *)$$sampler_status:(NSString *)param1 :(NSString *)param2
{
    if (!sampler.count) { return_s(@""); }

    NSMutableArray *array = [NSMutableArray array];

    for (NSUInteger index = 0; index < sampler.count; index++) {
        ExtSamplePlayer *player = [sampler objectAtIndex:index];
        NSArray *peekPower = [player peakPowerForChannels];
        NSDictionary *status = [NSDictionary dictionaryWithObjectsAndKeys:
                               [NSNumber numberWithFloat:player.currentTime], @"time",
                               [NSNumber numberWithInt:player.state], @"state",
                               peekPower, @"peakpower",
                               nil];
        [array addObject:status];
    }

    return_s(JSONStringWithObject(array));
}

@end

@implementation _SamplePlayerDelegate

- (void)samplePlayerDidEndSong:(NSURL *)fileURL
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"eof", self.index, [fileURL path]];
    [self.native postEvent:event];
}

@end
