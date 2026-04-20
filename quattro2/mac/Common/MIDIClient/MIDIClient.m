//
//  MIDIClient.m
//  
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "MIDIClient.h"

NSString *const MIDIDeviceNameKey    = @"MIDIDeviceNameKey";
NSString *const MIDIEntityNameKey    = @"MIDIEntityNameKey";
NSString *const MIDIEndpointUIDKey   = @"MIDIEndpointUIDKey";
NSString *const MIDIEndpointIndexKey = @"MIDIEndpointIndexKey";

@interface MIDIClient () {

}

- (void)addEndpoint:(const MIDIObjectAddRemoveNotification *)message;
- (void)removeEndpoint:(const MIDIObjectAddRemoveNotification *)message;

@end

@implementation MIDIClient

@synthesize delegate = _delegate;
@synthesize clientRef = _clientRef;

@synthesize inputPort = _inputPort;
@synthesize outputPort = _outputPort;

static void NotifyProc(const MIDINotification *message, void *refCon);

- (id)initWithUID:(int)uid
{
	if (self = [super init]) {
        NSString *clientName = [NSString stringWithFormat:@"jp.co.roland.quattro.midi#%d", uid];
        
        OSStatus error;
        error = MIDIClientCreate((CFStringRef)clientName, NotifyProc, self, &_clientRef);
        if (!error) {
            _inputPort = [[MIDIInputPort alloc] initWithClient:self UID:(int)uid];
            _outputPort = [[MIDIOutputPort alloc] initWithClient:self];
        }

#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
        NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
        [center addObserver:self selector:@selector(midiObjectAddedRemoved) name:@"BLEMIDIObjectAddNotification" object:nil];
        [center addObserver:self selector:@selector(midiObjectAddedRemoved) name:@"BLEMIDIObjectRemoveNotification" object:nil];
#endif
#ifdef ENABLE_MIDI_NETWORK_SESSION
		MIDINetworkSession *session = [MIDINetworkSession defaultSession];
		session.enabled = YES;
		session.connectionPolicy = MIDINetworkConnectionPolicy_Anyone;
#endif
#endif
	}

    return self;
}

- (void)dealloc
{
#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
    [[NSNotificationCenter defaultCenter] removeObserver:self];
#endif
#endif

    [_inputPort release];
    [_outputPort release];
	
    if (_clientRef)
        MIDIClientDispose(_clientRef);
    
	[super dealloc];
}

- (void)midiObjectAddedRemoved
{
    if ([self.delegate respondsToSelector:@selector(midiObjectAddedRemoved)])
        [self.delegate midiObjectAddedRemoved];
}

- (void)addEndpoint:(const MIDIObjectAddRemoveNotification *)message
{
    if (message->childType == kMIDIObjectType_Source) {
	} else if (message->childType == kMIDIObjectType_Destination) {
	}

    [self midiObjectAddedRemoved];
}

- (void)removeEndpoint:(const MIDIObjectAddRemoveNotification *)message
{
	if (message->childType == kMIDIObjectType_Source) {
        [self.inputPort disconnect:(MIDIEndpointRef)message->child];
	} else if (message->childType ==  kMIDIObjectType_Destination) {
        [self.outputPort disconnect:(MIDIEndpointRef)message->child];
	}

    [self midiObjectAddedRemoved];
}

- (void)errorDidOccur:(OSStatus)status message:(NSString*)reason
{
    NSDictionary *dict = [NSDictionary dictionaryWithObject:reason forKey:NSLocalizedFailureReasonErrorKey];
    NSError *error = [NSError errorWithDomain:NSOSStatusErrorDomain code:status userInfo:dict];
    
    if ([self.delegate respondsToSelector:@selector(midiErrorDidOccur:)])
		[(NSObject*)self.delegate performSelectorOnMainThread:@selector(midiErrorDidOccur:)
                                              withObject:error
                                           waitUntilDone:NO];
}

static void NotifyProc(const MIDINotification *message, void *refCon)
{
	MIDIClient *obj = (MIDIClient*)refCon;
	
	switch (message->messageID) {
        case kMIDIMsgObjectAdded:
            [obj addEndpoint:(const MIDIObjectAddRemoveNotification *)message];
            break;
			
        case kMIDIMsgObjectRemoved:
            [obj removeEndpoint:(const MIDIObjectAddRemoveNotification *)message];
            break;
        
        case kMIDIMsgPropertyChanged:
			break;
		
		case kMIDIMsgIOError:
            [obj errorDidOccur:((const MIDIIOErrorNotification*)message)->errorCode message:@"kMIDIMsgIOError"];
			break;
			
		default:
            break;
    }
}

+ (MIDIEntityRef)entityWithEndpointRef:(MIDIEndpointRef)endpointRef
{
	OSStatus error;
	MIDIEntityRef entityRef;
    
	error = MIDIEndpointGetEntity(endpointRef, &entityRef);
    
	return error ? 0 : entityRef;
}

+ (MIDIDeviceRef)deviceWithEndpointRef:(MIDIEndpointRef)endpointRef
{
	MIDIEntityRef entityRef = [self entityWithEndpointRef:endpointRef];
    
	OSStatus error;
	MIDIDeviceRef deviceRef;
    
	error = MIDIEntityGetDevice(entityRef, &deviceRef);
    
	return error ? 0 : deviceRef;
}

+ (NSDictionary*)dictionaryWithMIDIObjectRef:(MIDIObjectRef)objRef
{
	OSStatus error;
	NSDictionary *dict;
	CFPropertyListRef property = nil;
    
	error = MIDIObjectGetProperties(objRef, &property, true);
	if (error) {
		return nil;
	}
    
	dict = [NSDictionary dictionaryWithDictionary:(NSDictionary*)property];
	CFRelease(property);
    
	return dict;
}

@end
