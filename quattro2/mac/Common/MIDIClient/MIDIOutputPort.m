//
//  MIDIOutputPort.m
//  
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "MIDIClient.h"
#import <mach/mach_time.h>

@implementation MIDIOutputEndpoint

@synthesize endpointRef = _endpointRef;

- (id)initWithEndpointRef:(MIDIEndpointRef)ep
{
    if (self = [super init]) {
        self.endpointRef = ep;
    }
    return self;
}

@end

@interface MIDIOutputPort () {

    MIDIClient      *_client;
    MIDIPortRef     _outputPortRef;
    NSMutableArray  *_endpoints;
    NSMutableArray  *_connected;
}

- (void)sendPacketList:(MIDIPacketList*)pktlist;

@end

@implementation MIDIOutputPort

- (id)initWithClient:(MIDIClient *)client
{
    if (self = [super init]) {
        OSStatus error;
        error = MIDIOutputPortCreate(client.clientRef, (CFStringRef)@"outputPort", &_outputPortRef);
        if (!error) {
            _client = client;
            _endpoints = [[NSMutableArray alloc] init];
            _connected = [[NSMutableArray alloc] init];
		}
    }
    return self;
}

- (void)dealloc
{
	if (_outputPortRef)
        MIDIPortDispose(_outputPortRef);

    [_endpoints release];
    [_connected release];

	[super dealloc];
}

- (NSDictionary*)propertyWithEndpointRef:(MIDIEndpointRef)endpointRef
{
    NSDictionary *endpnt = [MIDIClient dictionaryWithMIDIObjectRef:endpointRef];

    NSString *deviceName = nil;
    NSString *entityName = nil;
    MIDIUniqueID uid = [[endpnt objectForKey:@"uniqueID"] intValue];
    NSString *index = nil;
    
    MIDIDeviceRef deviceRef = [MIDIClient deviceWithEndpointRef:endpointRef];
    if (deviceRef != 0) {
        NSDictionary *device = [MIDIClient dictionaryWithMIDIObjectRef:deviceRef];
#ifdef IGNORE_COREMIDI_NETWORK
        if ([[device objectForKey:@"driver"] isEqualToString:@"com.apple.AppleMIDIRTPDriver"])
            return nil;
#endif
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
        if ([[device objectForKey:@"MIDI Remote Peripheral"] boolValue])
            return nil;
#endif
#endif
        deviceName = [device objectForKey:@"name"];
        index = [device objectForKey:@"uniqueID"];
    } else {
        deviceName = [endpnt objectForKey:@"name"];
    }

    MIDIEntityRef entityRef = [MIDIClient entityWithEndpointRef:endpointRef];
    if (entityRef != 0) {
        NSDictionary *entity = [MIDIClient dictionaryWithMIDIObjectRef:entityRef];
        entityName = [entity objectForKey:@"name"];
        if (![entityName isEqualToString:deviceName]) {
            entityName = [NSString stringWithFormat:@"%@ (%@)",
                          deviceName, [entity objectForKey:@"name"]];
        }
        index = [entity objectForKey:@"uniqueID"];
    } else {
        entityName = [endpnt objectForKey:@"name"];
    }

    if (!index) { index = entityName; }
    
    NSDictionary *dict;
    dict = [NSDictionary dictionaryWithObjectsAndKeys:
            deviceName, MIDIDeviceNameKey,
            entityName, MIDIEntityNameKey,
            [NSNumber numberWithInt:uid], MIDIEndpointUIDKey,
            index, MIDIEndpointIndexKey,
            nil];
    
    return dict;
}

- (NSArray *)endpoints
{
    [_endpoints removeAllObjects];
    
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[BLEMIDIConnectionManager sharedInstance] endpoints:_endpoints];
#endif
#endif

#ifdef USE_TGIF
	MIDIEndpointRef endpointRef = TGIF_MIDIGetDestination();
	if (endpointRef != 0) {
		NSDictionary *dict = [self propertyWithEndpointRef:endpointRef];
		if (dict) {
			[_endpoints addObject:dict];
		}
	}
#endif

	for (ItemCount index = 0; index < MIDIGetNumberOfDestinations(); index++) {
        MIDIEndpointRef endpointRef = MIDIGetDestination(index);
        if (endpointRef == 0) continue;
        NSDictionary *dict = [self propertyWithEndpointRef:endpointRef];
        if (dict) {
            [_endpoints addObject:dict];
        }
    }

    return _endpoints;
}

- (void)connect:(MIDIEndpointRef)endpointRef
{
    MIDIOutputEndpoint *ep;

    @synchronized(_connected) {
        NSUInteger count = _connected.count;
        for (NSUInteger index = 0; index < count; index++) {
            ep = [_connected objectAtIndex:index];
            if (endpointRef == ep.endpointRef)
                return;
        }
    
        ep = [[[MIDIOutputEndpoint alloc] initWithEndpointRef:endpointRef] autorelease];
        [_connected addObject:ep];
    }
}

- (void)disconnect:(MIDIEndpointRef)endpointRef
{
    MIDIOutputEndpoint *ep;
    
    @synchronized(_connected) {
        NSUInteger count = _connected.count;
        for (NSUInteger index = 0; index < count; index++) {
            ep = [_connected objectAtIndex:index];
            if (endpointRef == ep.endpointRef) {
                [_connected removeObjectAtIndex:index];
                return;
            }
        }
    }
}

- (MIDIEndpointRef)endpointRefWithDictionay:(NSDictionary*)dict
{
    MIDIUniqueID uid = [[dict objectForKey:MIDIEndpointUIDKey] intValue];

    MIDIEndpointRef endpointRef = 0;
    MIDIObjectType type;
    OSStatus error;
    error = MIDIObjectFindByUniqueID(uid, (MIDIObjectRef*)&endpointRef, &type);

    return (!error && (type == kMIDIObjectType_Destination)) ? endpointRef : 0;
}

- (void)connectEndpoint:(NSDictionary*)endpoint
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    id uuid = [endpoint objectForKey:MIDIEndpointUIDKey];
    if ([uuid isKindOfClass:[NSString class]]) {
        if (![[BLEMIDIConnectionManager sharedInstance] connectEndpoint:self uuid:uuid]) {
            if ([_client.delegate respondsToSelector:@selector(midiOutputPortConnectFailed:)])
                [_client.delegate midiOutputPortConnectFailed:endpoint];
        }
        return;
    }
#endif
#endif

    MIDIEndpointRef endpointRef = [self endpointRefWithDictionay:endpoint];

#ifdef USE_TGIF
	if (endpointRef == TGIF_MIDIGetDestination()) {
		[self connect:endpointRef];
		return;
	}
#endif
	
    SInt32 isOffline = 0;
    OSStatus error;
    error = MIDIObjectGetIntegerProperty(endpointRef, kMIDIPropertyOffline, &isOffline);

    if (!error && isOffline != 0) {
        if ([_client.delegate respondsToSelector:@selector(midiOutputPortConnectFailed:)])
            [_client.delegate midiOutputPortConnectFailed:endpoint];
        return;
    }
    
    [self connect:endpointRef];
}

- (void)connectAllEndpoints
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[BLEMIDIConnectionManager sharedInstance] connectAllEndpoints:self];
#endif
#endif

#ifdef USE_TGIF
	MIDIEndpointRef endpointRef = TGIF_MIDIGetDestination();
	if (endpointRef != 0) {
		[self connect:endpointRef];
	}
#endif

	for (ItemCount index = 0; index < MIDIGetNumberOfDestinations(); index++) {
        MIDIEndpointRef endpointRef = MIDIGetDestination(index);
        if (endpointRef) {
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
            MIDIDeviceRef deviceRef = [MIDIClient deviceWithEndpointRef:endpointRef];
            if (deviceRef != 0) {
                NSDictionary *device = [MIDIClient dictionaryWithMIDIObjectRef:deviceRef];
                if ([[device objectForKey:@"MIDI Remote Peripheral"] boolValue])
                    continue;
            }
#endif
#endif
            [self connect:endpointRef];
        }
    }
}

- (void)disconnectEndpoint:(NSDictionary*)endpoint
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    id uuid = [endpoint objectForKey:MIDIEndpointUIDKey];
    if ([uuid isKindOfClass:[NSString class]]) {
        [[BLEMIDIConnectionManager sharedInstance] disconnectEndpoint:self uuid:uuid];
        return;
    }
#endif
#endif

    MIDIEndpointRef endpointRef = [self endpointRefWithDictionay:endpoint];

    if (endpointRef) {
        [self disconnect:endpointRef];
    }
}

- (void)disconnectAllEndpoints
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[BLEMIDIConnectionManager sharedInstance] disconnectAllEndpoints:self];
#endif
#endif

    @synchronized(_connected) {
        [_connected removeAllObjects];
    }
}

- (void)send:(const u_int8_t *)data size:(int)bytes
{
    if (data == NULL || bytes <= 0)
        return;
    
	assert(bytes <= 512);

#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[BLEMIDIConnectionManager sharedInstance] send:self data:data size:bytes];
#endif
#endif

    u_int32_t list[256];
	
    MIDIPacketList  *packetList = (MIDIPacketList*)list;
    MIDIPacket      *packet     = MIDIPacketListInit(packetList);
	MIDITimeStamp   time        = mach_absolute_time();
    
	MIDIPacketListAdd(packetList, sizeof(list), packet, time, bytes, data);
	
	[self sendPacketList:packetList];
}

- (void)sendPacketList:(MIDIPacketList*)pktlist
{
    MIDIOutputEndpoint *ep;
    
    @synchronized(_connected) {
        NSUInteger count = _connected.count;
        for (NSUInteger index = 0; index < count; index++) {
            ep = [_connected objectAtIndex:index];
            MIDISend(_outputPortRef, ep.endpointRef, pktlist);
        }
    }
}

@end
