//
//  NativeCall.h
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import <WebKit/WebKit.h>
#if TARGET_OS_IPHONE
#import <AVFoundation/AVFoundation.h>
#endif

#import "../MIDIClient/MIDIClient.h"
#import "../Audio/AudioDevice.h"
#import "../Audio/AudioPlayer.h"
#import "../Audio/AudioRecorder.h"
#import "../Audio/AudioOutput.h"
#import "../Audio/AudioInput.h"
#import "../Audio/AudioConverter.h"
#import "Audio/ExtSamplePlayer.h"
#import "../RolandWirelessConnect/RWCDiscovery.h"
#import "../RolandWirelessConnect/RWCConnection.h"
#import "../Network/HTTPConnection.h"
#import "../Network/NetServiceDiscovery.h"
#import "../Network/TCPIPClient.h"
#import "../Sound/Sequencer.h"

#import "Quattro-Swift.h"

@class NativeCall;
@class BLECentralManager;
#if !TARGET_OS_IPHONE
@class FSEventObserver;
#endif

@interface _MIDIClientDelegate : NSObject <MIDIClientDelegate, MIDIInputDelegate>
@property (assign) NativeCall *native;
@end
@interface _SequencerDelegate : NSObject <SequencerDelegate>
@property (assign) NativeCall *native;
@property (assign) int output;
@end
@interface _AudioDeviceDelegate : NSObject <AudioDeviceDelegate>
@property (assign) NativeCall *native;
@end
@interface _AudioPlayerDelegate : NSObject <AudioPlayerDelegate>
@property (assign) NativeCall *native;
@end
@interface _AudioRecorderDelegate : NSObject <AudioRecorderDelegate>
@property (assign) NativeCall *native;
@end
@interface _RWCDiscoveryDelegate : NSObject <RWCDiscoveryDelegate>
@property (assign) NativeCall *native;
@end
@interface _RWCConnectionDelegate : NSObject <RWCConnectionDelegate, RWCMIDIInputDelegate>
@property (assign) NativeCall *native;
@end
@interface _HTTPConnectionDelegate : NSObject <HTTPConnectionDelegate>
@property (assign) NativeCall* native;
@end
#ifdef USE_IN_APP_PURCHASE
@interface _StoreManagerDelegate : NSObject <StoreManagerDelegate>
@property (assign) NativeCall* native;
@end
#endif

@interface NativeCall : NSObject
{
    MIDIClient*		midi;
	Sequencer*		seq;
	AudioDevice*	audio;
	AudioPlayer*	player;
	AudioRecorder*	recorder;
	AudioOutput*	output;
	AudioInput*		input;
	RWCDiscovery*	discovery;
	RWCConnection*	rwc;
	HTTPConnection*	http;

	_MIDIClientDelegate*     _midi;
	_SequencerDelegate*      _seq;
	_AudioDeviceDelegate*    _audio;
	_AudioPlayerDelegate*    _player;
	_AudioRecorderDelegate*  _recorder;
	_RWCDiscoveryDelegate*   _discovery;
	_RWCConnectionDelegate*  _rwc;
	_HTTPConnectionDelegate* _http;

#ifdef USE_IN_APP_PURCHASE
	StoreManager *store;
	_StoreManagerDelegate *_store;
#endif

	NSMutableArray *clients;
	NSMutableArray *sampler;

    NetServiceDiscovery *netservice;
    NSMutableDictionary *connections;

    BLECentralManager *centralManager;
#if !TARGET_OS_IPHONE
	FSEventObserver *fsEventObserver;
#endif

    NSMutableArray *_queue;
    BOOL _triggered;
}

@property (assign) BOOL event;
@property (retain) NSString *clipboard;
@property (retain) NSArray *dropfiles;
@property (readonly) MIDIClient *MIDI;

- (NSString *)dispatch:(NSArray *)args extension:(id)extension;
- (void)postEvent:(NSString *)event;
- (void)processEvent;

@end

#define undefined   { return _retv( ); } /* return value is void ( == undefined ) */
#define return_b(x) { return _retb(x); } /* return value is a boolean value */
#define return_d(x) { return _retd(x); } /* return value is a integer string */
#define return_u(x) { return _retu(x); } /* return value is a unsigned integer string */
#define return_f(x) { return _retf(x); } /* return value is a floating point string */
#define return_s(x) { return _rets(x); } /* return value is a string */
#define return_e(x) { return _rete(x); } /* return value is a exception with string */

extern NSString *const POST_EVENT;
extern NSString *const EVAL_JAVASCRIPT;
extern NSString *const WEB_AUTHENTICATION;
extern NSString *const NATIVE_CONTROL;
extern NSString *const NATIVE_LOCATE;
extern NSString *const ENABLE_DRAGDROP;
extern NSString *const DROP_FILES;

extern NSString *const DEVICE_TOKEN_KEY;

extern NSString *_retv(void);
extern NSString *_retb(BOOL b);
extern NSString *_retd(NSInteger d);
extern NSString *_retu(NSUInteger u);
extern NSString *_retf(float f);
extern NSString *_rets(NSString *s);
extern NSString *_rete(NSString *s);

extern NSString *JSONStringWithObject(id obj);
extern NSDictionary *dictionaryWithJSONString(NSString *json);
extern NSString *hexStringWithBytes(const u_int8_t *bytes, int length);
extern NSData *dataWithHexString(NSString *hexStirng);

@interface OpenPanel : NSObject
@property (retain) NSURL* URL;
@property (retain) NSArray* filter;
@property (retain) NSString* directory;
- (void)close;
@end

@interface SavePanel : NSObject
@property (retain) NSURL* URL;
@property (retain) NSString* directory;
@property (retain) NSString* filename;
@property (retain) NSString* extension;
@property (assign) BOOL canChooseDirectories;
- (void)close;
@end

@interface BLECentralManager : NSObject <CBCentralManagerDelegate, CBPeripheralDelegate> {
	dispatch_queue_t _queue;
}
@property (assign) NativeCall* native;
@property (atomic, retain) NSArray *_services;
@property (nonatomic, retain) CBCentralManager *centralManager;
@property (nonatomic, retain) NSMutableArray *peripherals;
@property (nonatomic, retain) NSMutableDictionary *targetService;
@end

#if !TARGET_OS_IPHONE
@interface FSEventObserver : NSObject {
	dispatch_queue_t _queue;
	FSEventStreamRef _stream;
}
@property (assign) NativeCall* native;
- (void)startObservingWithPath:(NSString *)path;
@end
#endif
