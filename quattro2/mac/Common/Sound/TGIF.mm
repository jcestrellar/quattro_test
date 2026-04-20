//
//  TGIF.cpp
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#ifdef USE_TGIF

#import "TGIF.h"
#import <libtg/TGAdaptor.h>
#import <AudioUnit/AudioUnit.h>
#import <pthread.h>
#import <string>
#import <list>
#import "../MIDIClient/timestamp.h"
#import "../Audio/AudioDevice.h"
#import "security.h"

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>

#define IDLE_STATE_COUNT    (6)
#define MONITOR_INTERVAL    (10) // (6 * 10 seconds) = 1 minutes

@interface AudioUnitController : NSObject {
	NSTimer *_timer;
}
- (void)applicationDidEnterBackground:(NSNotification *)notification;
- (void)applicationWillEnterForeground:(NSNotification *)notification;
- (void)audioSessionInterruption:(NSNotification *)notification;
@end

static AudioUnitController *_controller = nil;
static int _idlecount = 0;
#endif

#define kSampleRate         (44100.0)
#define kNumOfChannels      (2)

static AudioUnit       _audioUnit = 0;
static MIDIClientRef   _clientRef = 0;
static MIDIPortRef     _outputPortRef = 0;
static MIDIEndpointRef _destinationRef = 0;

static NSString *_deviceUID = nil;

static int  _refcount = 0;
static BOOL _initialized = NO;
static BOOL _started = NO;
static BOOL _thru = NO;

static uint32_t _base = 0;
static uint64_t _time0 = 0;
static uint64_t _renderFrames = 0;
static pthread_mutex_t _mutex = PTHREAD_MUTEX_INITIALIZER;

typedef struct EVENT {
    uint64_t frame;
    std::string data;
} EVENT;
static std::list<EVENT> _events;
static uint64_t _currentFrame = 0;

extern "C" {

/* private functions */

static OSStatus renderCallback(void*                       inRefCon,
                               AudioUnitRenderActionFlags* ioActionFlags,
                               const AudioTimeStamp*       inTimeStamp,
                               UInt32                      inBusNumber,
                               UInt32                      inNumberFrames,
                               AudioBufferList*            ioData)
{
    if ((_renderFrames * 1000 / (int)kSampleRate) + _time0 < current_millis_timestamp()) {
        _renderFrames = _currentFrame = 0;
        pthread_mutex_lock(&_mutex);
        while (!_events.empty()) {
            EVENT ev = _events.front();
            TGMac_processEvents((const unsigned char *)ev.data.c_str(), (int)ev.data.length(), 0);
            _events.pop_front();
        }
        pthread_mutex_unlock(&_mutex);
        TGAdaptor_flushEvents();
    }

    long endFrame = _currentFrame + inNumberFrames;
    pthread_mutex_lock(&_mutex);
    for (long lastframe = 0; !_events.empty(); ) {
        EVENT ev = _events.front();
        if (!_currentFrame || (_currentFrame > ev.frame)) {
            _currentFrame = ev.frame;
            endFrame = _currentFrame + inNumberFrames;
            lastframe = 0;
        }
        if (lastframe == 0) {
            lastframe = _currentFrame;
        }
        if (ev.frame >= endFrame) break;
        long deltaFrames = (long)(ev.frame - lastframe);
        lastframe = ev.frame;
        TGMac_processEvents((const unsigned char *)ev.data.c_str(), (int)ev.data.length(), deltaFrames);
        _events.pop_front();
    }
    pthread_mutex_unlock(&_mutex);
    if (_currentFrame) { _currentFrame = endFrame; }

    TGAdaptor_processReplacingFloat((float *)ioData->mBuffers[0].mData, inNumberFrames);

    if (_renderFrames == 0) {
        _time0 = current_millis_timestamp() + 1;
    }
    _renderFrames += inNumberFrames;

    return noErr;
}

static void ReadProc(const MIDIPacketList *pktlist, void *readProcRefCon, void *srcConnRefCon)
{
#if TARGET_OS_IPHONE
    _idlecount = 0; // clear idle counter.
#endif

    MIDIPacket *packet = (MIDIPacket *)&(pktlist->packet[0]);
    for (UInt32 i = 0; i < pktlist->numPackets; i++) {
        EVENT ev;
        ev.frame = ((int)kSampleRate / 100) * (packet->timeStamp * _base / 1000) / 10000;
        ev.data = std::string((char*)packet->data, packet->length);

        pthread_mutex_lock(&_mutex);
        auto iter = _events.rbegin(), end = _events.rend();
        for ( ; iter != end; iter++) {
            if (iter->frame <= ev.frame) {
                _events.insert(iter.base(), ev);
                break;
            }
        }
        if (iter == end) {
            _events.push_front(ev);
        }
        pthread_mutex_unlock(&_mutex);

        packet = MIDIPacketNext(packet);
    }
}

/* public functions */

void TGIF_Initialize()
{
    if ((++_refcount) != 1) return;

	mach_timebase_info_data_t base;
    mach_timebase_info(&base);
	_base = base.numer / base.denom;
	
    pthread_mutex_init(&_mutex, NULL);

#if TARGET_OS_IPHONE
    [[AVAudioSession sharedInstance] setPreferredIOBufferDuration:0.02f error:nil];
    [[AVAudioSession sharedInstance] setPreferredSampleRate:kSampleRate error:nil];
#endif

    /* initialize AudioUnit Output */

    AudioComponentDescription cd;
    cd.componentType = kAudioUnitType_Output;
#if TARGET_OS_IPHONE
    cd.componentSubType = kAudioUnitSubType_RemoteIO;
#else
    cd.componentSubType = kAudioUnitSubType_DefaultOutput;
#endif
    cd.componentManufacturer = kAudioUnitManufacturer_Apple;
    cd.componentFlags = 0;
    cd.componentFlagsMask = 0;
    AudioComponent component = AudioComponentFindNext(NULL, &cd);
    if (AudioComponentInstanceNew(component, &_audioUnit) != noErr) return;
    if (AudioUnitInitialize(_audioUnit) != noErr) return;

    AURenderCallbackStruct callbackStruct;
    callbackStruct.inputProc = renderCallback;
    callbackStruct.inputProcRefCon = nil;
    AudioUnitSetProperty(_audioUnit,
                         kAudioUnitProperty_SetRenderCallback,
                         kAudioUnitScope_Input,
                         0,
                         &callbackStruct,
                         sizeof(AURenderCallbackStruct));

    AudioStreamBasicDescription audioFormat;
    audioFormat.mSampleRate        = kSampleRate;
    audioFormat.mFormatID          = kAudioFormatLinearPCM;
    audioFormat.mFormatFlags       = kAudioFormatFlagsNativeFloatPacked;
    audioFormat.mChannelsPerFrame  = kNumOfChannels;
    audioFormat.mBytesPerPacket    = sizeof(float) * kNumOfChannels;
    audioFormat.mBytesPerFrame     = sizeof(float) * kNumOfChannels;
    audioFormat.mBitsPerChannel    = 8 * sizeof(float);
    audioFormat.mFramesPerPacket   = 1;
    audioFormat.mReserved          = 0;
    AudioUnitSetProperty(_audioUnit,
                         kAudioUnitProperty_StreamFormat,
                         kAudioUnitScope_Input,
                         0,
                         &audioFormat,
                         sizeof(AudioStreamBasicDescription));

    UInt32 maxFramesPerSlice = 0;
    UInt32 propertySize = sizeof(maxFramesPerSlice);
    AudioUnitGetProperty(_audioUnit,
                         kAudioUnitProperty_MaximumFramesPerSlice,
                         kAudioUnitScope_Global,
                         0,
                         &maxFramesPerSlice,
                         &propertySize);

    /* initialize libtg */
    unsigned char context[LIBTG_ACTIVATION_KEY_LEN];
    DESCRUMBLE_KEY(context, LIBTG_ACTIVATION_KEY);
    BOOL success = TGMac_initialize(context, kSampleRate);

    /* activate libtg */
    if (success) {
        _initialized = YES;
        success = TGAdaptor_activate(kSampleRate, maxFramesPerSlice);
    }

    /* create virtual MIDI output endpoint */
    if (success) {
        MIDIClientCreate((CFStringRef)@"jp.co.roland.quattro.TGIF", NULL, nil, &_clientRef);
        MIDIOutputPortCreate(_clientRef, (CFStringRef)@"TGIFOutputPort", &_outputPortRef);
        MIDIDestinationCreate(_clientRef, (CFStringRef)@"TGIF", ReadProc, nil, &_destinationRef);
        MIDIObjectSetIntegerProperty(_destinationRef, kMIDIPropertyUniqueID, 'TGIF');

        /* hidden from other clients */
        SInt32 isOffline = 1;
        MIDIObjectSetIntegerProperty(_destinationRef, kMIDIPropertyOffline, isOffline);
    }

#if TARGET_OS_IPHONE
    if (success) {
        _controller = [[AudioUnitController alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:_controller
                                                 selector:@selector(applicationDidEnterBackground:)
                                                     name:UIApplicationDidEnterBackgroundNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:_controller
                                                 selector:@selector(applicationWillEnterForeground:)
                                                     name:UIApplicationWillEnterForegroundNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:_controller
                                                 selector:@selector(audioSessionInterruption:)
                                                     name:AVAudioSessionInterruptionNotification
                                                   object:nil];
    }
#endif
    
    /* start AudioUnit Output */
    if (success) {
        _started = (AudioOutputUnitStart(_audioUnit) == noErr);
    }
}

void TGIF_Uninitialize()
{
    if ((--_refcount) != 0) return;

    _started = _thru = NO;

    if (_destinationRef) {
        MIDIEndpointDispose(_destinationRef);
        _destinationRef = 0;
    }
    if (_outputPortRef) {
        MIDIPortDispose(_outputPortRef);
        _outputPortRef = 0;
    }
    if (_clientRef) {
        MIDIClientDispose(_clientRef);
        _clientRef = 0;
    }

    if (_audioUnit) {
        AudioOutputUnitStop(_audioUnit);
        AudioUnitUninitialize(_audioUnit);
        AudioComponentInstanceDispose(_audioUnit);
        _audioUnit = 0;
    }

#if TARGET_OS_IPHONE
    if (_controller) {
        [[NSNotificationCenter defaultCenter] removeObserver:_controller];
        [_controller release];
        _controller = nil;
    }
#endif

    if (_initialized) {
        TGAdaptor_deactivate();
        TGMac_terminate();
    }

    pthread_mutex_destroy(&_mutex);
}

NSString *TGIF_GetDevice()
{
	return _deviceUID ? _deviceUID : @"";
}

void TGIF_SetDevice(NSString *deviceUID)
{
#if TARGET_OS_IPHONE
	/* Not supported */
#elif TARGET_OS_MAC
	_deviceUID = deviceUID;

	AudioDeviceID deviceId = [AudioDevice deviceIDForUID:_deviceUID scope:kAudioDevicePropertyScopeOutput];
	if (deviceId != kAudioObjectUnknown) {
		AudioUnitSetProperty(_audioUnit,
								   kAudioOutputUnitProperty_CurrentDevice,
								   kAudioUnitScope_Global,
								   0,
								   &deviceId,
								   sizeof(AudioDeviceID));
	}
#endif
}

int TGIF_GetValue(u_int32_t pid)
{
    return (_started ? TGAdaptor_getValue(pid) : 0);
}

void TGIF_SetValue(u_int32_t pid, int val)
{
    if (_started) TGAdaptor_setValue(pid, val);
}

void TGIF_MIDISend(const u_int8_t *data, int bytes, MIDITimeStamp timeStamp)
{
//  if (!_started || !_destinationRef)
    if (!_started)
        return;

    if (data == NULL || bytes <= 0)
        return;

    assert(bytes <= 512);

    ByteCount list[bytes + 100];

    MIDIPacketList  *packetList = (MIDIPacketList*)list;
    MIDIPacket      *packet     = MIDIPacketListInit(packetList);
    MIDITimeStamp   time        = timeStamp;

    MIDIPacketListAdd(packetList, sizeof(list), packet, time, bytes, data);
//  MIDISend(_outputPortRef, _destinationRef, packetList);
    ReadProc(packetList, NULL, NULL);
}

void TGIF_MIDIThru(const MIDIPacketList *pktlist)
{
    if (_started && _thru) ReadProc(pktlist, NULL, NULL);
}

MIDIEndpointRef TGIF_MIDIGetDestination() { return _destinationRef; }

BOOL TGIF_IsThru() { return _thru; }
void TGIF_SetThru(BOOL enable) { _thru = enable; }

} /* extern "C" */

#if TARGET_OS_IPHONE
@implementation AudioUnitController

- (void)applicationDidEnterBackground:(NSNotification *)notification
{
#ifndef TGIF_ALWAYS_RUN
    _idlecount = 0;
    _timer = [NSTimer scheduledTimerWithTimeInterval:MONITOR_INTERVAL
                                              target:self
                                            selector:@selector(monitorIdleState)
                                            userInfo:nil
                                             repeats:YES];
#endif
}

- (void)applicationWillEnterForeground:(NSNotification *)notification
{
    [_timer invalidate];
    _timer = nil;

    _started = (AudioOutputUnitStart(_audioUnit) == noErr);
}

- (void)audioSessionInterruption:(NSNotification *)notification
{
    AVAudioSessionInterruptionType type = (AVAudioSessionInterruptionType)[notification.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
    switch (type) {
        case AVAudioSessionInterruptionTypeBegan:
            _started = NO;
            AudioOutputUnitStop(_audioUnit);
            break;
        case AVAudioSessionInterruptionTypeEnded:
            _started = (AudioOutputUnitStart(_audioUnit) == noErr);
            break;
        default:
            break;
    }
}

- (void)monitorIdleState
{
    #define TGIF_VID_POLYPHONY (4 << 16)

    if (TGIF_GetValue(TGIF_VID_POLYPHONY)) {
        _idlecount = 0; // clear idle counter.
    } else {
        if (++_idlecount > IDLE_STATE_COUNT) {
            [_timer invalidate];
            _timer = nil;
            AudioOutputUnitStop(_audioUnit);
        }
    }
}

@end

#endif

#endif /* USE_TGIF */
