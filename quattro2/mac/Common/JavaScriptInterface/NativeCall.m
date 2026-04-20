//
//  NativeCall.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"
#ifdef USE_TGIF
#import "../Sound/TGIF.h"
#endif

@interface NativeCall () {
}
@end

@implementation NativeCall

- (id)init
{
	if (self = [super init]) {
		_queue = [[NSMutableArray alloc] init];

#ifdef USE_TGIF
		@synchronized(self) {
			TGIF_Initialize();
		}
#endif

		midi       = [[MIDIClient alloc] initWithUID:0];
		seq        = [[Sequencer alloc] init];
		audio      = [[AudioDevice alloc] init];
		player     = [[AudioPlayer alloc] init];
		recorder   = [[AudioRecorder alloc] init];
		discovery  = [[RWCDiscovery alloc] init];
		rwc        = [[RWCConnection alloc] init];
		http       = [[HTTPConnection alloc] init];

		_midi      = [[_MIDIClientDelegate alloc] init];
		_seq       = [[_SequencerDelegate alloc] init];
		_audio     = [[_AudioDeviceDelegate alloc] init];
		_player    = [[_AudioPlayerDelegate alloc] init];
		_recorder  = [[_AudioRecorderDelegate alloc] init];
		_discovery = [[_RWCDiscoveryDelegate alloc] init];
		_rwc       = [[_RWCConnectionDelegate alloc] init];
		_http      = [[_HTTPConnectionDelegate alloc] init];

        _midi.native = self;
        _seq.native = self;
        _audio.native = self;
        _player.native = self;
        _recorder.native = self;
        _discovery.native = self;
        _rwc.native = self;
        _http.native = self;

		midi.delegate = _midi;
		midi.inputPort.delegate = _midi;
		seq.delegate = _seq;
		audio.delegate = _audio;
		player.delegate = _player;
		recorder.delegate = _recorder;
		discovery.delegate = _discovery;
		rwc.delegate = _rwc;
		rwc.midiService.delegate = _rwc;
		rwc.outputStream.delegate = player;
		rwc.inputStream.delegate = recorder;
		http.delegate = _http;

		output = [[AudioOutput alloc] init];
		input  = [[AudioInput alloc] init];
		player.output = output;
		recorder.input = input;

		clients = [[NSMutableArray alloc] init];
		sampler = [[NSMutableArray alloc] init];
        connections = [[NSMutableDictionary alloc] init];

		centralManager = [[BLECentralManager alloc] init];
		centralManager.native = self;

#ifdef USE_IN_APP_PURCHASE
		store = [[StoreManager alloc] init];
		_store = [[_StoreManagerDelegate alloc] init];
		store.delegate = _store;
#endif

#if !TARGET_OS_IPHONE
		fsEventObserver = [[FSEventObserver alloc] init];
		fsEventObserver.native = self;
#endif

#ifndef USE_VENDER_BLEMIDI
#ifndef DEBUG
        if ([[midi.inputPort endpoints] count] > 0 || [[midi.outputPort endpoints] count] > 0) {
            [_midi midiObjectAddedRemoved];
        }
#endif
#endif /* USE_VENDER_BLEMIDI */
		
#if TARGET_OS_IPHONE
		[[NSNotificationCenter defaultCenter] addObserver:self
												 selector:@selector(applicationDidEnterBackground:)
													 name:UIApplicationDidEnterBackgroundNotification
												   object:nil];
		[[NSNotificationCenter defaultCenter] addObserver:self
												 selector:@selector(audioSessionInterruption:)
													 name:AVAudioSessionInterruptionNotification
												   object:nil];
#endif
    }
	return self;
}

- (void)dealloc
{
#if TARGET_OS_IPHONE
	[[NSNotificationCenter defaultCenter] removeObserver:self];
#endif

#if !TARGET_OS_IPHONE
	[fsEventObserver release];
#endif
	[centralManager release];
	
    while (clients.count) {
		MIDIClient *client = [clients lastObject];
		id _delegate = client.delegate;
		[clients removeLastObject];
		client.inputPort.delegate = nil;
		client.delegate = nil;
		[client release];
		[_delegate release];
	}
	[clients release];
	
    while (sampler.count) {
		ExtSamplePlayer *player = [sampler lastObject];
		id _delegate = player.delegate;
		[sampler removeLastObject];
		player.delegate = nil;
		[player release];
		[_delegate release];
	}
	[sampler release];

	netservice.delegate = nil;
    [netservice stop];
    [netservice release];

    for (id key in [connections keyEnumerator]) {
        TCPIPClient *conn = [connections valueForKey:key];
        id _delegate = conn.delegate;
        conn.delegate = nil;
        [conn close];
        [_delegate release];
    }
    [connections removeAllObjects];
    [connections release];

	[http release];
	[rwc release];
	[discovery release];
	[recorder release];
	[player release];
	[audio release];
	[seq release];
	[midi release];

	[input release];
	[output release];

	[_midi release];
	[_seq release];
	[_audio release];
	[_player release];
	[_recorder release];
	[_discovery release];
	[_rwc release];
	[_http release];

    [_queue removeAllObjects];
	[_queue release];
	[_clipboard release];
	[_dropfiles release];

#ifdef USE_IN_APP_PURCHASE
	[store release];
	[_store release];
#endif

#ifdef USE_TGIF
	@synchronized(self) {
		TGIF_Uninitialize();
	}
#endif

	[super dealloc];
}

- (NSString *)dispatch:(NSArray *)args extension:(id)extension
{
    NSString *method = (args.count > 0) ? [args objectAtIndex:0] : nil;
    NSString *arg1   = (args.count > 1) ? [args objectAtIndex:1] : nil;
    NSString *arg2   = (args.count > 2) ? [args objectAtIndex:2] : nil;
    NSString *param1 = (args.count > 1) ? [arg1 stringByRemovingPercentEncoding] : nil;
    NSString *param2 = (args.count > 2) ? [arg2 stringByRemovingPercentEncoding] : nil;

    id target = nil;
    SEL sel = NSSelectorFromString([NSString stringWithFormat:@"%@::", method]);
    if ([self respondsToSelector:sel]) {
        target = self;
    } else if ([extension respondsToSelector:sel]) {
        target = extension;
    }
    if (target) {
        @try {
            return [target performSelector:sel withObject:param1 withObject:param2];
        }
        @catch (NSException *e) {
            return_e(e.reason);
        }
    } else {
        undefined;
    }
}

- (void)postEvent:(NSString *)event
{
	@synchronized(_queue) {
		[_queue addObject:event];
        if (self.event && !_triggered) {
			_triggered = YES;
			[self performSelectorOnMainThread:@selector(processEvent) withObject:nil waitUntilDone:NO];
        }
	}
}

- (void)processEvent
{
    while (self.event) {
        NSString *event = nil;
        @synchronized(_queue) {
            if ([_queue count] > 0) {
                event = [[[_queue objectAtIndex:0] retain] autorelease];
                [_queue removeObjectAtIndex:0];
            } else {
                _triggered = NO;
                break;
            }
        }
        NSString *rep1 = [event stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
        NSString *rep2 = [rep1 stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        NSString *script = [NSString stringWithFormat:@"window.$event.dispatch('%@')", rep2];
        [[NSNotificationCenter defaultCenter] postNotificationName:EVAL_JAVASCRIPT object:script userInfo:@{@"native":self}];
    }
}

- (MIDIClient *)MIDI { return midi; }

#if TARGET_OS_IPHONE
- (void)applicationDidEnterBackground:(NSNotification *)notification
{
	NSArray *array = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"UIBackgroundModes"];
	if (![array containsObject:@"audio"]) {
		[seq stop:NO];
	}
}

- (void)audioSessionInterruption:(NSNotification *)notification
{
	AVAudioSessionInterruptionType type = (AVAudioSessionInterruptionType)[notification.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
	switch (type) {
		case AVAudioSessionInterruptionTypeBegan:
			[seq stop:NO];
			[player pause];
			[recorder pause];
			break;
		case AVAudioSessionInterruptionTypeEnded:
			break;
		default:
			break;
	}
}
#endif

/* common functions */

NSString *_retv(void) { return @"v"; }
NSString *_retb(BOOL b) { return [NSString stringWithFormat:@"b%@", (b ? @"1" : @"")]; }
NSString *_retd(NSInteger d) { return [NSString stringWithFormat:@"d%ld", (long)d]; }
NSString *_retu(NSUInteger u) { return [NSString stringWithFormat:@"d%lu", (unsigned long)u]; }
NSString *_retf(float f) { return [NSString stringWithFormat:@"f%f", f]; }
NSString *_rets(NSString *s) { return [@"s" stringByAppendingString:(s ? s : @"")]; }
NSString *_rete(NSString *s) { return [@"e" stringByAppendingString:(s ? s : @"")]; }

NSString *JSONStringWithObject(id obj)
{
	NSString* jsonString = nil;

	if ([NSJSONSerialization isValidJSONObject:obj]) {
		NSError *error = nil;
		NSData *data = [NSJSONSerialization dataWithJSONObject:obj options:NSJSONWritingPrettyPrinted error:&error];
		if (error == nil) {
			jsonString = [[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] autorelease];
		}
	}

	return jsonString;
}

NSDictionary *dictionaryWithJSONString(NSString *json)
{
	NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
	NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
	return result;
}

NSString *hexStringWithBytes(const u_int8_t *bytes, int length)
{
	NSMutableString *string = [[NSMutableString alloc] initWithCapacity:length * 2];
	for (NSInteger i = 0; i < length; i++) {
		[string appendFormat:@"%02X", bytes[i]];
	}
	return string;
}

static unsigned char unicharToByte(unichar c)
{
	unsigned char b = 0;
	if ('0' <= c && c <= '9')
		b = c - '0';
	else if ('a' <= c && c <= 'f')
		b = c - 'a' + 10;
	else if ('A' <= c && c <= 'F')
		b = c - 'A' + 10;
	return b;
}

NSData *dataWithHexString(NSString *hexStirng)
{
	unsigned char buf[64];
	unsigned char b1, b2;
	int buflen = 0;

	NSInteger length = hexStirng.length / 2;
	NSMutableData *data = [NSMutableData dataWithCapacity:length];

	NSInteger index = 0;
	while (length--) {
		b1 = unicharToByte([hexStirng characterAtIndex:index++]);
		b2 = unicharToByte([hexStirng characterAtIndex:index++]);

		buf[buflen++] = (b1 << 4) | b2;
		if (buflen >= sizeof(buf)) {
			[data appendData:[NSData dataWithBytes:buf length:buflen]];
			buflen = 0;
		}
	}
	if (buflen > 0) {
		[data appendData:[NSData dataWithBytes:buf length:buflen]];
	}

	return data;
}
@end
