//
//  NativeCall+seq.m
//
//  Copyright 2025 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

enum { kBuiltinSound, kExternalMIDI, kMIDIInputMessage };

static NSString *const OBJ_NAME = @"seq";

@interface NativeCall (seq) @end

@implementation NativeCall (seq)

- (NSString *)$$seq_load:(NSString *)param1 :(NSString *)param2
{ return_b([seq loadWithSMFData:dataWithHexString(param1) cue:[param2 boolValue]]); }

- (NSString *)$$seq_play: (NSString *)param1 :(NSString *)param2
{ [seq play:[param1 boolValue]]; undefined; }

- (NSString *)$$seq_pause:(NSString *)param1 :(NSString *)param2
{ [seq stop:NO]; undefined; }

- (NSString *)$$seq_stop: (NSString *)param1 :(NSString *)param2
{ [seq stop:YES]; undefined; }

- (NSString *)$$seq_locate: (NSString *)param1 :(NSString *)param2
{ [seq locate:[param1 intValue]]; undefined; }

- (NSString *)$$seq_range: (NSString *)param1 :(NSString *)param2
{
    if (param1 && param2) {
        [seq rangeFrom:[param1 intValue] to:[param2 intValue]];
    }
    return_s(JSONStringWithObject(@[@(seq.beatsA), @(seq.beatsB)]));
}

- (NSString *)$$seq_tempo:(NSString *)param1 :(NSString *)param2
{
    if (param1) {
        seq.tempo = [param1 intValue];
    }
    return_d(seq.tempo);
}

- (NSString *)$$seq_mute:(NSString *)param1 :(NSString *)param2
{
    if (param1) {
        seq.mute = [param1 intValue];
    }
    return_d(seq.mute);
}

- (NSString *)$$seq_transpose:(NSString *)param1 :(NSString *)param2
{
    if (param1) {
        seq.transpose = [param1 intValue];
    }
    return_d(seq.transpose);
}

- (NSString *)$$seq_countin:(NSString *)param1 :(NSString *)param2
{
    if (param1) {
        seq.countInBars = [param1 intValue];
    }
    return_d(seq.countInBars);
}

- (NSString *)$$seq_metro:(NSString *)param1 :(NSString *)param2
{
    if (param1) {
        seq.metroSw = [param1 boolValue];
    }
    return_b(seq.metroSw);
}

- (NSString *)$$seq_metroset:(NSString *)param1 :(NSString *)param2
{
    NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
    NSArray *array = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
    NSMutableArray *notes = [NSMutableArray array];
    for (NSString *note in array) {
        [notes addObject:dataWithHexString(note)];
    }
    [seq setMetroNotes:notes];

    undefined;
}

- (NSString *)$$seq_countset:(NSString *)param1 :(NSString *)param2
{
    NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
    NSArray *array = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
    NSMutableArray *notes = [NSMutableArray array];
    for (NSString *note in array) {
        [notes addObject:dataWithHexString(note)];
    }
    [seq setCountNotes:notes];

    undefined;
}

- (NSString *)$$seq_position:(NSString *)param1 :(NSString *)param2
{
    SEQPosition *p = [seq position];
    return_d(p.beats);
}

- (NSString *)$$seq_totalbeats:(NSString *)param1 :(NSString *)param2
{ return_d(seq.lengthInBeats); }

- (NSString *)$$seq_measure:(NSString *)param1 :(NSString *)param2
{
    SEQPosition *p = param1 ? [seq positionAtBeats:[param1 intValue]] : [seq position];
    return_s(JSONStringWithObject(@[
        @(p.beats), @(p.nn), @(1 << p.dd), @(p.cc),
        @(p.bars), @(p.beatsInBar), @((p.ticksInBeat * 1000) / p.ticksPerBeat),
        @(seq.countInState)
    ]));
}

- (NSString *)$$seq_info:(NSString *)param1 :(NSString *)param2
{
    return_s(JSONStringWithObject(@{
        @"title":seq.title, @"copyright":seq.copyright
    }));
}

- (NSString *)$$seq_output:(NSString *)param1 :(NSString *)param2
{ _seq.output = [param1 intValue]; undefined; }

@end

@implementation _SequencerDelegate

- (void)sequencerMIDISend:(NSData *)data metroNote:(NSData *)note
{
    if (self.output == kExternalMIDI) {
        [self.native.MIDI.outputPort send:(u_int8_t *)data.bytes size:(int)data.length];
        return;
    }
    if (self.output == kMIDIInputMessage) {
        NSString *hexString = hexStringWithBytes(data.bytes, (int)data.length);
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%u", @"midi", @"message", hexString, current_millis_timestamp()];
        [self.native postEvent:event];
        [hexString release];
        return;
    }
    if (note.length) {
        NSMutableData *tmp = [NSMutableData dataWithData:note];
        [tmp appendData:data];
        data = tmp;
    }
    if (data.length) {
#ifdef USE_TGIF
        TGIF_MIDISend((u_int8_t *)data.bytes, (int)data.length, mach_absolute_time());
#endif
    }
}

- (void)sequencerDidFinishPlaying
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@", OBJ_NAME, @"stop"];
    [self.native postEvent:event];
}

- (void)sequencerTempoDidChange:(int)newTempo
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d", OBJ_NAME, @"tempo", newTempo];
    [self.native postEvent:event];
}

@end
