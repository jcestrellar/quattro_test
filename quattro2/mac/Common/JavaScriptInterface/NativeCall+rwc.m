//
//  NativeCall+rwc.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"rwc";

@interface NativeCall (rwc) @end

@implementation NativeCall (rwc)

- (NSString *)$$rwc_discovery:(NSString *)param1 :(NSString *)param2
{ [discovery search]; undefined; }

- (NSString *)$$rwc_device:(NSString *)param1 :(NSString *)param2
{ return_s(JSONStringWithObject(rwc.device)); }

- (NSString *)$$rwc_connect:(NSString *)param1 :(NSString *)param2
{ [rwc connect:dictionaryWithJSONString(param1)]; undefined; }

- (NSString *)$$rwc_disconnect:(NSString *)param1 :(NSString *)param2
{ [rwc disconnect]; undefined; }

- (NSString *)$$rwc_send:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);
	[rwc.midiService send:(u_int8_t *)data.bytes size:(int)data.length];
	undefined;
}

- (NSString *)$$rwc_inputmode:(NSString *)param1 :(NSString *)param2
{ [rwc.inputStream inputMode:[param1 intValue]]; undefined; }

- (NSString *)$$rwc_timeout:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		rwc.connectTimeout = [param1 intValue];
	}
	return_d(rwc.connectTimeout);
}

- (NSString *)$$rwc_keepalive:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		rwc.keepAliveTimeout = [param1 intValue];
	}
	return_d(rwc.keepAliveTimeout);
}

@end

@implementation _RWCDiscoveryDelegate

- (void)discoveryDeviceDidFound:(NSDictionary *)device
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"found", JSONStringWithObject(device)];
    [self.native postEvent:event];
}

@end

@implementation _RWCConnectionDelegate

- (void)connectionFailed:(NSDictionary *)device
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"connectfailed", JSONStringWithObject(device)];
    [self.native postEvent:event];
}

- (void)connectionDidEstablished:(NSDictionary *)device
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"connected", JSONStringWithObject(device)];
    [self.native postEvent:event];
}

- (void)connectionDidClosed:(NSDictionary *)device
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"closed", JSONStringWithObject(device)];
    [self.native postEvent:event];
}

- (void)connectionErrorDidOccur:(NSDictionary *)device
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"error", JSONStringWithObject(device)];
    [self.native postEvent:event];
}

- (void)midiInputMessage:(u_int8_t *)msg size:(int)bytes timeStamp:(u_int32_t)msec cable:(int)cin
{
	NSString *hexString = hexStringWithBytes(msg, bytes);

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%u", OBJ_NAME, @"message", hexString, msec];
    [self.native postEvent:event];

	[hexString release];
}

@end
