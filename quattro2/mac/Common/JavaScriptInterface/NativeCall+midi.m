//
//  NativeCall+midi.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

#import <TargetConditionals.h>
#if !TARGET_OS_IPHONE
#import <AppKit/AppKit.h>
#endif

#ifdef USE_BLEMIDI_SCANNER
  #if TARGET_OS_IPHONE && defined(USE_VENDER_BLEMIDI)
    #import "../../iOS/VenderBLEMIDI/BLEMIDIConnectionManager.h"
    @interface DummyTableView : UITableView
    - (void)reloadData;
    @end
    static DummyTableView *_tableView = nil;
  #else
    #undef USE_BLEMIDI_SCANNER
  #endif
#endif

static NSString *const OBJ_NAME = @"midi";

@interface NativeCall (midi) @end

@implementation NativeCall (midi)

- (NSString *)$$midi_inendpoints:(NSString *)param1 :(NSString *)param2
{
	return_s(JSONStringWithObject([midi.inputPort endpoints]));
}

- (NSString *)$$midi_inconnect:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		[midi.inputPort connectEndpoint:dictionaryWithJSONString(param1)];
	} else {
		[midi.inputPort connectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midi_indisconnect:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		[midi.inputPort disconnectEndpoint:dictionaryWithJSONString(param1)];
	} else {
		[midi.inputPort disconnectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midi_outendpoints:(NSString *)param1 :(NSString *)param2
{
	return_s(JSONStringWithObject([midi.outputPort endpoints]));
}

- (NSString *)$$midi_outconnect:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		[midi.outputPort connectEndpoint:dictionaryWithJSONString(param1)];
	} else {
		[midi.outputPort connectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midi_outdisconnect:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		[midi.outputPort disconnectEndpoint:dictionaryWithJSONString(param1)];
	} else {
		[midi.outputPort disconnectAllEndpoints];
	}
	undefined;
}

- (NSString *)$$midi_send:(NSString *)param1 :(NSString *)param2
{
    NSData *data = dataWithHexString(param1);
    [midi.outputPort send:(u_int8_t *)data.bytes size:(int)data.length];
	undefined;
}

- (NSString *)$$midi_panel:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    [[NSNotificationCenter defaultCenter] postNotificationName:@"coreMIDIBLE" object:nil userInfo:nil];
#else
    NSURL *url = [[NSWorkspace sharedWorkspace] URLForApplicationWithBundleIdentifier:@"com.apple.audio.AudioMIDISetup"];
    [[NSWorkspace sharedWorkspace] openURL:url];
#endif
	undefined;
}

#ifdef USE_BLEMIDI_SCANNER
- (NSString *)$$blemidi_scanstart:(NSString *)param1 :(NSString *)param2
{
	if (!_tableView) {
        _tableView = [[DummyTableView alloc] init];
    }
    [[BLEMIDIConnectionManager sharedInstance] startScan:_tableView];
    undefined;
}
- (NSString *)$$blemidi_scanstop:(NSString *)param1 :(NSString *)param2
{
    [[BLEMIDIConnectionManager sharedInstance] stopScan];
	undefined;
}
- (NSString *)$$blemidi_connect:(NSString *)param1 :(NSString *)param2
{
    NSArray *devices = [[BLEMIDIConnectionManager sharedInstance] devices];
    for (NSUInteger index = 0; index < devices.count; index++) {
        CBPeripheral *peripheral = [devices objectAtIndex:index];
        if ([param1 isEqualToString:[peripheral.identifier UUIDString]]) {
            if (peripheral.state == CBPeripheralStateDisconnected) {
                [[BLEMIDIConnectionManager sharedInstance] tapAtIndex:index];
            }
            break;
        }
    }
    undefined;
}
- (NSString *)$$blemidi_disconnect:(NSString *)param1 :(NSString *)param2
{
    NSArray *devices = [[BLEMIDIConnectionManager sharedInstance] devices];
    for (NSUInteger index = 0; index < devices.count; index++) {
        CBPeripheral *peripheral = [devices objectAtIndex:index];
        if ([param1 isEqualToString:[peripheral.identifier UUIDString]]) {
            if (peripheral.state != CBPeripheralStateDisconnected) {
                [[BLEMIDIConnectionManager sharedInstance] tapAtIndex:index];
            }
            break;
        }
    }
    undefined;
}
#endif

@end

@implementation _MIDIClientDelegate

- (void)midiInputPortConnectFailed:(NSDictionary*)endpoint
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"connectfailed", JSONStringWithObject(endpoint)];
    [self.native postEvent:event];
}

- (void)midiOutputPortConnectFailed:(NSDictionary*)endpoint
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"connectfailed", JSONStringWithObject(endpoint)];
    [self.native postEvent:event];
}

- (void)midiObjectAddedRemoved
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@", OBJ_NAME, @"changed"];
    [self.native postEvent:event];
}

- (void)midiErrorDidOccur:(NSError*)error
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%ld", OBJ_NAME, @"error", (long)error.code];
    [self.native postEvent:event];
}

- (void)midiInputMessage:(const u_int8_t *)msg size:(int)bytes timeStamp:(u_int32_t)msec;
{
	NSString *hexString = hexStringWithBytes(msg, bytes);
	NSString *event = [[NSString alloc] initWithFormat:@"%@\f%@\f%@\f%u", OBJ_NAME, @"message", hexString, msec];

    [self.native postEvent:event];
	
	[hexString release];
	[event release];
}

@end

#ifdef USE_BLEMIDI_SCANNER
@implementation DummyTableView
- (void)reloadData
{
    NSMutableArray *array = [[[NSMutableArray alloc] init] autorelease];

    NSArray *devices = [[BLEMIDIConnectionManager sharedInstance] devices];
    for (CBPeripheral *peripheral in devices) {
        NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:
            [peripheral.identifier UUIDString], @"id",
            peripheral.advertisingName, @"name",
            [NSNumber numberWithInteger:peripheral.state], @"state",
            nil];
        [array addObject:dict];
    }

    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"ble", JSONStringWithObject(array)];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}
@end
#endif
