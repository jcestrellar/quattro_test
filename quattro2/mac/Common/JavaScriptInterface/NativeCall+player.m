//
//  NativeCall+player.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"player";

@interface NativeCall (player) @end

@implementation NativeCall (player)

- (NSString *)$$player_device:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		player.device = param1;
    }
	return_s(player.device);
}

- (NSString *)$$player_open:(NSString *)param1 :(NSString *)param2
{ return_b([player open:[NSURL fileURLWithPath:param1]]); }

- (NSString *)$$player_play: (NSString *)param1 :(NSString *)param2
{ [player play ]; undefined; }

- (NSString *)$$player_pause:(NSString *)param1 :(NSString *)param2
{ [player pause]; undefined; }

- (NSString *)$$player_stop: (NSString *)param1 :(NSString *)param2
{ [player stop ]; undefined; }

- (NSString *)$$player_file:(NSString *)param1 :(NSString *)param2
{ return_s([player.file path]); }

- (NSString *)$$player_status:(NSString *)param1 :(NSString *)param2
{ return_d(player.status); }

- (NSString *)$$player_channels:(NSString *)param1 :(NSString *)param2
{ return_u(player.numberOfChannels); }

- (NSString *)$$player_peakpower:(NSString *)param1 :(NSString *)param2
{ return_f([player peakPowerForChannel:[param1 intValue]]); }

- (NSString *)$$player_time:(NSString *)param1 :(NSString *)param2
{ return_f(player.currentTime); }

- (NSString *)$$player_totaltime:(NSString *)param1 :(NSString *)param2
{ return_f(player.totalTime); }

- (NSString *)$$player_locate:(NSString *)param1 :(NSString *)param2
{ [player locate:[param1 floatValue]]; undefined; }

- (NSString *)$$player_volume:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		player.volume = [param1 floatValue];
    }
	return_f(player.volume);
}

- (NSString *)$$player_speed:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		player.speed = [param1 floatValue];
    }
	return_f(player.speed);
}

- (NSString *)$$player_pitch:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		player.pitch = [param1 floatValue];
	}
	return_f(player.pitch);
}

- (NSString *)$$player_output:(NSString *)param1 :(NSString *)param2
{ player.output = [param1 boolValue] ? rwc.outputStream : output; undefined; }

@end

@implementation _AudioPlayerDelegate

- (void)audioPlayerDidEndSong:(NSURL *)fileURL
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"eof", [fileURL path]];
    [self.native postEvent:event];
}

- (void)audioPlayerDidFinishPlaying:(NSURL *)fileURL
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"stop", [fileURL path]];
    [self.native postEvent:event];
}

- (void)audioPlayerErrorDidOccur:(NSURL *)fileURL
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"error", [fileURL path]];
    [self.native postEvent:event];
}

@end
