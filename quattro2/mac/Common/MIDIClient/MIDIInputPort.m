//
//  MIDIInputPort.m
//  
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "MIDIClient.h"

#define SYSEX_BUF_LENGTH	512

@interface MIDIInputPort () {

    MIDIClient* _client;
    MIDIPortRef _inputPortRef;
    NSMutableArray *_endpoints;
    NSMutableDictionary *_parsers;
#ifdef VMIDI_IN
	MIDIEndpointRef _destinationRef;
#endif
}

- (MIDIEndpointRef)endpointRefWithDictionay:(NSDictionary*)dict;

@end

@interface MIDIParser : NSObject {
    u_int8_t running;
    int sysex_len;
    u_int8_t sysex_buf[SYSEX_BUF_LENGTH];
}
- (void)reset;
- (void)parse:(MIDIPacket*)packet inputPort:(MIDIInputPort*)port;
@end

@implementation MIDIInputPort

@synthesize delegate = _delegate;
#ifdef VMIDI_IN
@synthesize vparser = _vparser;
#endif

static void ReadProc(const MIDIPacketList *pktlist, void *readProcRefCon, void *srcConnRefCon);

- (id)initWithClient:(MIDIClient*)client UID:(int)uid
{
	if (self = [super init]) {

        OSStatus error;
        error = MIDIInputPortCreate(client.clientRef, (CFStringRef)@"inputPort", ReadProc, self, &_inputPortRef);
        if (!error) {
            _client = client;
            _endpoints = [[NSMutableArray alloc] init];
            _parsers = [[NSMutableDictionary alloc] init];
#ifdef VMIDI_IN
			extern NSString *midiDestinationName;
            extern SInt32 midiSourceUniqueID;
            NSString *destinationName = [NSString stringWithFormat:@"%@ #%d", midiDestinationName, uid];
            MIDIDestinationCreate(_client.clientRef, (CFStringRef)destinationName, ReadProc, self, &_destinationRef);
			MIDIObjectSetIntegerProperty(_destinationRef, kMIDIPropertyUniqueID, midiSourceUniqueID + uid);
			_vparser = [[MIDIParser alloc] init];
#endif
		}
    }

    return self;
}

- (void)dealloc
{
	[self disconnectAllEndpoints];

	if (_inputPortRef)
        MIDIPortDispose(_inputPortRef);

#ifdef VMIDI_IN
	if (_destinationRef) {
		MIDIEndpointDispose(_destinationRef);
		[_vparser release];
	}
#endif

    [_endpoints release];
    [_parsers release];
    
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

    for (ItemCount index = 0; index < MIDIGetNumberOfSources(); index++) {
        MIDIEndpointRef endpointRef = MIDIGetSource(index);
        if (endpointRef == 0) continue;
        NSDictionary *dict = [self propertyWithEndpointRef:endpointRef];
        if (dict) {
            [_endpoints addObject:dict];
        }
    }

    return _endpoints;
}

- (MIDIEndpointRef)endpointRefWithDictionay:(NSDictionary*)dict
{
    MIDIUniqueID uid = [[dict objectForKey:MIDIEndpointUIDKey] intValue];
    
    MIDIEndpointRef endpointRef = 0;
    MIDIObjectType type;
    OSStatus error;
    error = MIDIObjectFindByUniqueID(uid, (MIDIObjectRef*)&endpointRef, &type);
    
    return (!error && (type == kMIDIObjectType_Source)) ? endpointRef : 0;
}

- (OSStatus)connect:(MIDIEndpointRef)endpointRef
{
    MIDIParser *parser = [_parsers objectForKey:[NSNumber numberWithUnsignedInt:endpointRef]];
    if (parser == nil) {
        parser = [[[MIDIParser alloc] init] autorelease];
        [_parsers setObject:parser forKey:[NSNumber numberWithUnsignedInt:endpointRef]];
    }
    [parser reset];
    return MIDIPortConnectSource(_inputPortRef, endpointRef, parser);
}

- (void)disconnect:(MIDIEndpointRef)endpointRef
{
    MIDIPortDisconnectSource(_inputPortRef, endpointRef);
}

- (void)connectEndpoint:(NSDictionary*)endpoint
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    id uuid = [endpoint objectForKey:MIDIEndpointUIDKey];
    if ([uuid isKindOfClass:[NSString class]]) {
        if (![[BLEMIDIConnectionManager sharedInstance] connectEndpoint:self uuid:uuid]) {
            if ([_client.delegate respondsToSelector:@selector(midiInputPortConnectFailed:)])
                [_client.delegate midiInputPortConnectFailed:endpoint];
        }
        return;
    }
#endif
#endif

    MIDIEndpointRef endpointRef = [self endpointRefWithDictionay:endpoint];
    if (endpointRef) {
        OSStatus error = [self connect:endpointRef];
        if (!error) {
            return;
        }
    }
    
    if ([_client.delegate respondsToSelector:@selector(midiInputPortConnectFailed:)])
        [_client.delegate midiInputPortConnectFailed:endpoint];
}

- (void)connectAllEndpoints
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[BLEMIDIConnectionManager sharedInstance] connectAllEndpoints:self];
#endif
#endif

    for (ItemCount index = 0; index < MIDIGetNumberOfSources(); index++) {
        MIDIEndpointRef endpointRef = MIDIGetSource(index);
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

    for (ItemCount index = 0; index < MIDIGetNumberOfSources(); index++) {
        MIDIEndpointRef endpointRef = MIDIGetSource(index);
        if (endpointRef) {
            [self disconnect:endpointRef];
        }
    }
}


static void ReadProc(const MIDIPacketList *pktlist, void *readProcRefCon, void *srcConnRefCon)
{
    MIDIInputPort* obj = (MIDIInputPort*)readProcRefCon;
    if (obj.delegate == nil)
        return;

#ifdef USE_TGIF
    TGIF_MIDIThru(pktlist);
#endif
#ifdef VMIDI_IN
    MIDIParser* parser = (MIDIParser *)(srcConnRefCon ? srcConnRefCon : obj.vparser);
#else
    MIDIParser* parser = (MIDIParser *)srcConnRefCon;
#endif
    MIDIPacket *packet = (MIDIPacket *)&(pktlist->packet[0]);
    for (UInt32 i = 0; i < pktlist->numPackets; i++) {
        [parser parse:packet inputPort:obj];
        packet = MIDIPacketNext(packet);
    }
}

@end

@implementation MIDIParser

#define T(t) nanos_timestamp_to_millis(t)

- (void)reset
{
    running = sysex_len = 0;
}

- (void)parse:(MIDIPacket*)packet inputPort:(MIDIInputPort*)port
{
	int idx = 0;
	int cnt = packet->length;

	while (cnt > 0) {

        u_int8_t sts;
		if ((packet->data[idx] & 0x80) != 0) {
			sts = packet->data[idx++]; cnt--;
		} else {
			sts = running;
		}

		int len = 0;
		switch (sts & 0xf0) {
			case 0x80: len = 3; running = sts; break;
			case 0x90: len = 3; running = sts; break;
			case 0xa0: len = 3; running = sts; break;
			case 0xb0: len = 3; running = sts; break;
			case 0xc0: len = 2; running = sts; break;
			case 0xd0: len = 2; running = sts; break;
			case 0xe0: len = 3; running = sts; break;
			case 0xf0:
				switch (sts) {
					case 0xf0: running = 1; break;
					case 0xf7: running = 0; break;

					case 0xf1: len = 2; break;
					case 0xf2: len = 3; break;
					case 0xf3: len = 2; break;
					case 0xf6: len = 1; break;

				//	case 0xf8:
					case 0xfa:
					case 0xfb:
					case 0xfc:
				//	case 0xfe:
					case 0xff: len = 1; break;

					default: continue;
				}
				break;
		}

		if (len > 0) {
			u_int8_t msg[3] = { sts, 0, 0 };
			if (len > 1) { msg[1] = packet->data[idx++]; cnt--; }
			if (len > 2) { msg[2] = packet->data[idx++]; cnt--; }
			[port.delegate midiInputMessage:msg size:len timeStamp:T(packet->timeStamp)];
		} else if (sts == 0xf0) {
			sysex_len = 0;
			sysex_buf[sysex_len++] = sts;
		} else if (sts == 0xf7) {
			if (sysex_len > 0) {
				sysex_buf[sysex_len++] = sts;
				[port.delegate midiInputMessage:sysex_buf size:sysex_len timeStamp:T(packet->timeStamp)];
				sysex_len = 0;
			}
        } else {
			if (running && sysex_len < (SYSEX_BUF_LENGTH - 1)) {
				sysex_buf[sysex_len++] = packet->data[idx];
			}
			idx++; cnt--;
		}
	}
}

@end
