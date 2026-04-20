//
//  NativeCall+midixx.m
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

#import <TargetConditionals.h>
#if !TARGET_OS_IPHONE
#import <AppKit/AppKit.h>
#endif

#define MIDIX_UID_OFFSET  10

static NSString *const OBJ_NAME = @"midix";

@interface _MIDIXClientDelegate : NSObject <MIDIClientDelegate, MIDIInputDelegate>
@property (assign) NativeCall *native;
@property (assign) int cid;
@property (assign) BOOL thru;
@property (assign) MIDIClient *client;
@end

@interface NativeCall (midix) @end

@implementation NativeCall (midix)

- (NSString *)$$midix_client:(NSString *)param1 :(NSString *)param2
{
    if (!clients.count) {
		int count = [param1 intValue];
        for (int i = 0; i < count; i++) {
            MIDIClient *client = [[MIDIClient alloc] initWithUID:(MIDIX_UID_OFFSET + i)];
            _MIDIXClientDelegate *_delegate = [[_MIDIXClientDelegate alloc] init];
			_delegate.native = self;
			_delegate.client = client;
            _delegate.cid = i;
            client.delegate = _delegate;
            client.inputPort.delegate = _delegate;
            [clients addObject:client];
#ifndef DEBUG
            if ([[client.inputPort endpoints] count] > 0 || [[client.outputPort endpoints] count] > 0) {
                [_delegate midiObjectAddedRemoved];
            }
#endif
        }
    }
    undefined;
}

- (NSString *)$$midix_inendpoints:(NSString *)param1 :(NSString *)param2
{
    return_s(JSONStringWithObject([midi.inputPort endpoints]));
}

- (NSString *)$$midix_inconnect:(NSString *)param1 :(NSString *)param2
{
    MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
	if (param2) {
		[client.inputPort connectEndpoint:dictionaryWithJSONString(param2)];
	} else {
		[client.inputPort connectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midix_indisconnect:(NSString *)param1 :(NSString *)param2
{
	MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
	if (param2) {
		[client.inputPort disconnectEndpoint:dictionaryWithJSONString(param2)];
	} else {
		[client.inputPort disconnectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midix_outendpoints:(NSString *)param1 :(NSString *)param2
{
	return_s(JSONStringWithObject([midi.outputPort endpoints]));
}

- (NSString *)$$midix_outconnect:(NSString *)param1 :(NSString *)param2
{
	MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
	if (param2) {
		[client.outputPort connectEndpoint:dictionaryWithJSONString(param2)];
	} else {
		[client.outputPort connectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midix_outdisconnect:(NSString *)param1 :(NSString *)param2
{
	MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
	if (param2) {
		[client.outputPort disconnectEndpoint:dictionaryWithJSONString(param2)];
	} else {
		[client.outputPort disconnectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midix_send:(NSString *)param1 :(NSString *)param2
{
	MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
    NSData *data = dataWithHexString(param2);
    [client.outputPort send:(u_int8_t *)data.bytes size:(int)data.length];
	undefined;
}

- (NSString *)$$midix_thru:(NSString *)param1 :(NSString *)param2
{
	MIDIClient *client = [clients objectAtIndex:[param1 intValue]];
	((_MIDIXClientDelegate *)client.delegate).thru = [param2 boolValue];
	undefined;
}

- (NSString *)$$midix_panel:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    [[NSNotificationCenter defaultCenter] postNotificationName:@"coreMIDIBLE" object:nil userInfo:nil];
#else
    NSURL *url = [[NSWorkspace sharedWorkspace] URLForApplicationWithBundleIdentifier:@"com.apple.audio.AudioMIDISetup"];
    [[NSWorkspace sharedWorkspace] openURL:url];
#endif
	undefined;
}

@end

@implementation _MIDIXClientDelegate

- (void)midiInputPortConnectFailed:(NSDictionary*)endpoint
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"connectfailed", self.cid, JSONStringWithObject(endpoint)];
    [self.native postEvent:event];
}

- (void)midiOutputPortConnectFailed:(NSDictionary*)endpoint
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"connectfailed", self.cid, JSONStringWithObject(endpoint)];
    [self.native postEvent:event];
}

- (void)midiObjectAddedRemoved
{
    if (self.cid != 0) return;
    NSString *event = [NSString stringWithFormat:@"%@\f%@", OBJ_NAME, @"changed"];
    [self.native postEvent:event];
}

- (void)midiErrorDidOccur:(NSError*)error
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%ld", OBJ_NAME, @"error", self.cid, (long)error.code];
    [self.native postEvent:event];
}

- (void)midiInputMessage:(const u_int8_t *)msg size:(int)bytes timeStamp:(u_int32_t)msec;
{
	if (self.thru) {
		[self.client.outputPort send:msg size:bytes];
	}

	NSString *hexString = hexStringWithBytes(msg, bytes);
	NSString *event = [[NSString alloc] initWithFormat:@"%@\f%@\f%d\f%@\f%u", OBJ_NAME, @"message", self.cid, hexString, msec];

    [self.native postEvent:event];
	
	[hexString release];
	[event release];
}

@end
