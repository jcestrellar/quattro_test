//
//  Sequencer.m
//
//  Copyright 2025 Roland Corporation. All rights reserved.
//

#import "Sequencer.h"
#import "timestamp.h"

#define CH_TEMPO_MUTE (16)

/* TickEvent */

@interface TickEvent : NSObject {
}
@property (assign) int delta;
@property (assign) int meta;
@property (retain) NSData *data;
@end

@implementation TickEvent

- (id)initWithDelta:(int)delta meta:(int)meta data:(NSData *)data
{
    self = [super init];
    if (self) {
        self.delta = delta;
        self.meta = meta;
        self.data = data;
    }
    return self;
}

- (void)dealloc
{
    self.data = nil;
    [super dealloc];
}

@end

/* TickHandler */

@interface TickHandler : NSObject {
    NSMutableArray<TickEvent *> *_events;
    int _index;
    int _delta;
    NSMutableData *_data;
}
- (void)setEvents:(NSMutableArray<TickEvent *> *)events;
- (void)clearEvents;
- (void)addEvent:(TickEvent *)event;
- (int)length;
- (void)reset;

- (NSData *)advanceWithTicks:(int)ticks sequencer:(Sequencer *)seq;
- (void)processWithEvent:(TickEvent *)event sequencer:(Sequencer *)seq;
@end

@implementation TickHandler

- (id)init
{
    self = [super init];
    if (self) {
        _events = [[NSMutableArray alloc] init];
        _data = [[NSMutableData alloc] init];
        _delta = -1;
    }
    return self;
}

- (void)dealloc
{
    [_data release];
    [_events release];
    [super dealloc];
}

- (void)setEvents:(NSMutableArray<TickEvent *> *)events
{
    @synchronized(self) {
        [self reset];
        [_events release];
        _events = [events retain];
    }
}

- (void)clearEvents
{
    @synchronized(self) {
        [self reset];
        [_events removeAllObjects];
    }
}

- (void)addEvent:(TickEvent *)event
{
    [_events addObject:event];
}

- (int)length
{
    return (int)_events.count;
}

- (void)reset
{
    _index = 0; _delta = -1;
}

- (NSData *)advanceWithTicks:(int)ticks sequencer:(Sequencer *)seq
{
    _delta += ticks;
    _data.length = 0;
    @synchronized(self) {
        while ((_index < _events.count) && ([_events objectAtIndex:_index].delta <= _delta)) {
            TickEvent *ev = [_events objectAtIndex:_index++];
            _delta -= ev.delta;
            [self processWithEvent:ev sequencer:seq];
        }
    }
    return _data.length ? _data : nil;
}

- (void)processWithEvent:(TickEvent *)event sequencer:(Sequencer *)seq {}

@end

/* Track, Metronome, CountIn and Tracks */

@interface Track : TickHandler {
}
- (void)processWithEvent:(TickEvent *)event sequencer:(Sequencer *)seq;
@end

@interface Metronome : TickHandler {
    NSArray<NSData *> *_notes;
}
- (int)ticksInBar;
- (void)setNotes:(NSArray<NSData *> *)notes;
- (void)processWithEvent:(TickEvent *)event sequencer:(Sequencer *)seq;
@end

@interface CountIn : Metronome {
    NSMutableDictionary *_map;
}
- (void)clear;
- (void)setTempo:(int)ticks tempo:(int)tempo;
- (void)start:(Sequencer *)seq;
- (int)count;
- (void)processWithEvent:(TickEvent *)event sequencer:(Sequencer *)seq;
@end

@interface Tracks : NSObject {
    NSMutableArray *_tracks;
    NSMutableData *_data;
}
- (void)addTrack:(Track *)track;
- (void)removeAllTracks;
- (void)reset;
- (NSData *)advanceWithTicks:(int)ticks sequencer:(Sequencer *)seq;
@end

/* Measures */

@interface Measures : NSObject {
    NSMutableArray<SEQPosition *> *_sections;
    int _index;
}
@property (readonly) int maxticks;
@property (readonly) int maxbeats;
- (void)clear;
- (void)setTimeSignature:(int)ticks nn:(int)nn dd:(int)dd cc:(int)cc;
- (void)build:(int)ticksPQN maxticks:(int)maxticks;

- (void)locate:(int)ticks;
- (SEQPosition *)currentSection;
- (SEQPosition *)findSectionWithCondition:(BOOL (^)(SEQPosition *section))condition;
@end

/* SMFTempo */

@interface SMFTempo : NSObject {
    double _rate;
    int _tempoPQN;
}
- (void)relative:(int)tempo;
- (int)convert:(int)tempo;
@end

/* PendingEvents */

@interface PendingEvents : NSObject {
    u_int8_t _An[16][128]; // buffered Polyphonic Aftertouch values
    u_int8_t _Bn[16][128]; // buffered Control Change values
    u_int8_t _En[16][2];   // buffered Pitch Bend values
}
- (void)clearBuffer;
- (BOOL)bufferEvent:(const u_int8_t *)data;
- (NSData *)flushEvents;
@end

/* Sequencer */

@interface Sequencer () {
    Tracks *_tracks;
    Metronome *_metro;
    CountIn *_countin;
    Measures *_measures;
    SMFTempo *_smftempo;

    int _ticksPQN;
    int _tempoPQN;

    dispatch_queue_t _queue;
    dispatch_source_t _timer;
    u_int64_t _t0;
    double _flac;

    int _curticks;

    int _ticks0;
    int _ticksA;
    int _ticksB;

    int _mute;
    int _keyShift;
    BOOL _metroOn;

    BOOL _playing;
}
@property (assign) int metroticks;
@property (assign) BOOL seeking;
@property (assign) PendingEvents *pending;

- (void)evSetTempo:(int)newTempo;
- (void)evTimeSignature:(int)nn :(int)dd :(int)cc;
- (NSMutableArray<TickEvent *> *)createMetroEvents:(int)ticks delta:(int)delta count:(int)count;
- (void)MIDISend:(NSData *)msg1 metroNote:(NSData *)msg2;
@end

@implementation Sequencer

@dynamic tempo;
@dynamic mute;
@dynamic transpose;
@dynamic metroSw;
@dynamic lengthInBeats;
@dynamic beatsA;
@dynamic beatsB;
@dynamic countInState;

- (id)init
{
    self = [super init];
    if (self) {
        _queue = dispatch_queue_create("jp.co.roland.quattro.sequencer", DISPATCH_QUEUE_SERIAL);
        _timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, DISPATCH_TIMER_STRICT, _queue);
        dispatch_source_set_timer(_timer, dispatch_time(DISPATCH_TIME_NOW, 0), NSEC_PER_MSEC, 0);
        __weak id _self = self;
        dispatch_source_set_event_handler(_timer, ^{ [_self timerproc]; });

        _tracks   = [[Tracks alloc] init];
        _metro    = [[Metronome alloc] init];
        _countin  = [[CountIn alloc] init];
        _measures = [[Measures alloc] init];
        _smftempo = [[SMFTempo alloc] init];
        _pending  = [[PendingEvents alloc] init];
        _ticksPQN = 96;
        _tempoPQN = 500000; // BPM 120

        self.title = self.copyright = @"";

        [self evTimeSignature:4 :2 :24];
    }
    return self;
}

- (void)dealloc
{
    dispatch_source_cancel(_timer);
    dispatch_release(_queue);

    self.delegate = nil;
    @synchronized(_tracks) {
        [_tracks release];
    }
    [_metro release];
    [_countin release];
    [_measures release];
    [_smftempo release];
    [_pending release];

    self.title = nil;
    self.copyright = nil;

    [super dealloc];
}

static int vlength(const u_int8_t *data, int *pos)
{
    int len = 0;
    while (true) {
        u_int8_t x = data[(*pos)++];
        len |= (x & 0x7f);
        if ((x & 0x80) != 0) {
            len <<= 7;
            continue;
        }
        break;
    }
    return len;
}

- (int)parseForTrack:(Track*)track data:(const u_int8_t *)data length:(int)datalen
{
    u_int8_t running = 0;

    int pos = 0, ticks = 0;
    while (pos < datalen) {
        int delta = vlength(data, &pos);
        int len = 0, meta = -1;
        BOOL STS = NO, F0 = NO;

        u_int8_t sts = data[pos];
        switch (sts & 0xf0) {
            case 0x80: len = 3; running = sts; break;
            case 0x90: len = 3; running = sts; break;
            case 0xa0: len = 3; running = sts; break;
            case 0xb0: len = 3; running = sts; break;
            case 0xc0: len = 2; running = sts; break;
            case 0xd0: len = 2; running = sts; break;
            case 0xe0: len = 3; running = sts; break;
            case 0xf0:
                pos++;
                switch (sts & 0xff) {
                    case 0xf0: len = vlength(data, &pos); F0 = YES; break;
                    case 0xf7: len = vlength(data, &pos); break;
                    case 0xff:
                        meta = data[pos++];
                        len = vlength(data, &pos);
                        break;
                    default:
                        return -1; // found illegal F? message
                }
                break;
            default:
                len = 2; STS = YES; // running status
                break;
        }

        NSData *msg = nil;
        if (len > 0) {
            const int n = (STS || F0) ? 1 : 0;
            const int buflen = n + len;
            u_int8_t buf[buflen];
            if (STS) {
                buf[0] = running;
            } else if (F0) {
                buf[0] = 0xf0;
            }
            memcpy(buf + n, data + pos, len);
            msg = [NSData dataWithBytes:buf length:buflen];
            pos += len;
        }

        TickEvent *ev = [[TickEvent alloc] initWithDelta:delta meta:meta data:msg];
        [track addEvent:ev];
        [ev release];
        ticks += delta;

        if (meta == 0x2f) break;
        if (meta == 0x02) {
            if (msg && (self.copyright.length == 0)) {
                self.copyright = [[[NSString alloc] initWithData:msg encoding:NSASCIIStringEncoding] autorelease];
            }
        } else if (meta == 0x03) {
            if (msg && (self.title.length == 0)) {
                self.title = [[[NSString alloc] initWithData:msg encoding:NSASCIIStringEncoding] autorelease];
            }
        } else if (meta == 0x51) {
            const u_int8_t *data = msg.bytes;
            [_countin setTempo:ticks tempo:((data[0] << 16) | (data[1] << 8) | data[2])];
        } else if (meta == 0x58) {
            const u_int8_t *data = msg.bytes;
            [_measures setTimeSignature:ticks nn:data[0] dd:data[1] cc:data[2]];
        } else if (meta < 0) {
            const u_int8_t *data = msg.bytes;
            if ((data[0] & 0xf0) == 0x90) {
                _ticks0 = (_ticks0 < 0) ? ticks : MIN(_ticks0, ticks);
            }
        }
    }

    return ticks;
}

- (BOOL)loadWithSMFData:(NSData *)smfdata cue:(BOOL)cue
{
    static const u_int8_t MTHD[] = {
        0x4d, 0x54, 0x68, 0x64,    // "MThd"
        0x00, 0x00, 0x00, 0x06
    };

    static const u_int8_t MTRK[] = {
        0x4d, 0x54, 0x72, 0x6b    // "MTrk"
    };

    [self stop:NO];

    @synchronized(_tracks) {
        [_tracks removeAllTracks];
    }
    [_metro clearEvents];
    [_countin clear];
    [_measures clear];

    _curticks = 0;
    _ticks0 = -1;
    _ticksA = _ticksB = 0;

    self.title = self.copyright = @"";

    if (smfdata.length < 22) {
        return NO;
    }

    const u_int8_t *data = smfdata.bytes;
    if (memcmp(MTHD, data, sizeof(MTHD))) {
        return NO; // !SMF
    }
    _ticksPQN = (data[12] << 8) | data[13];
    if ((_ticksPQN & 0x8000) != 0) {
        return NO; // SMPTE not supported
    }

    int ntrks = (data[10] << 8) | data[11];
    int maxticks = 0;
    data += 14;

    @try {
        while (ntrks > 0) {
            int len = ((data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]);
            if (memcmp(MTRK, data, sizeof(MTRK)) == 0) {
                Track *track = [[[Track alloc] init] autorelease];
                int ticks = [self parseForTrack:track data:(data + 8) length:len];
                if (ticks < 0) break;
                [_tracks addTrack:track];
                maxticks = MAX(ticks, maxticks);
                ntrks--;
            }
            data += (8 + len);
        }
    } @catch (...) {
        [_tracks removeAllTracks];
        return NO;
    }

    [_measures build:_ticksPQN maxticks:maxticks];

    _ticksA = _ticks0 = (cue ? (MAX(0, _ticks0)) : 0);
    _ticksB = maxticks;

    [_smftempo relative:0];
    [self evTimeSignature:4 :2 :24];
    [_tracks advanceWithTicks:(_curticks = 1) sequencer:self];

    [self seekAtTicks:_ticksA];

    return YES;
}

- (void)play:(BOOL)loop
{
    self.loop = loop;
    if (!_playing) {
        @synchronized(_tracks) {
            if (self.countInBars != 0) {
                [_countin start:self];
            }
            SEQPosition *s = [_measures currentSection];
            [_metro reset];
            [_metro advanceWithTicks:((_curticks - s.ticks) % (s.nn * s.ticksPerBeat)) sequencer:self];
            _playing = YES;
            if (!_metroOn) {
                _t0 = 0;
                dispatch_resume(_timer);
            }
        }
    }
}

- (void)stop:(BOOL)reset
{
    [_countin clearEvents];

    if (_playing) {
        if (!_metroOn) {
            dispatch_suspend(_timer);
        }
        @synchronized(_tracks) {
            _playing = NO;
        }
        if ((0 < _curticks) && (_curticks < _measures.maxticks)) {
            u_int8_t msg[16 * 3];
            for (int ch = 0, i = 0; ch < 16; ch++) {
                msg[i++] = 0xb0 | ch; msg[i++] = 0x78; msg[i++] = 0x00; // All Sound Off
            }
            [self MIDISend:[NSData dataWithBytes:msg length:sizeof(msg)] metroNote:nil];
        }
        [self.delegate sequencerDidFinishPlaying];
    }
    if (reset || (_curticks >= _ticksB)) {
        [self seekAtTicks:_ticksA];
    }
}

- (void)timerproc
{
    @synchronized(_tracks) {

        if (_t0 == 0) { _t0 = current_micros_timestamp(); _flac = 0; }
        u_int64_t t1 = current_micros_timestamp();
        double usec = (t1 - _t0); _t0 = t1;
        if (usec > 100000) return;
        _flac += (usec * _ticksPQN / _tempoPQN);

        int ticks = (int)_flac;
        if (ticks == 0) return;
        _flac -= ticks;

        if (!_playing) {
            [self MIDISend:nil metroNote:[_metro advanceWithTicks:ticks sequencer:self]];
            return;
        }
        do {
            if ([_countin length] > 0) {
                self.metroticks = 0;
                [self MIDISend:nil metroNote:[_countin advanceWithTicks:ticks sequencer:self]];
                ticks = self.metroticks;
            } else {
                int step = MAX(0, MIN(ticks, _ticksB - _curticks));
                [self advanceWithTicks:step];
                ticks -= step;
                if (_curticks >= _ticksB) {
                    if (self.loop && (_ticksA != _ticksB)) {
                        [self seekAtTicks:_ticksA];
                        if (self.countInBars < 0) {
                            [_countin start:self];
                        }
                    } else {
                        [self stop:YES];
                        return;
                    }
                }
            }
        } while (ticks > 0);

    }
}

- (void)advanceWithTicks:(int)ticks
{
    _curticks += ticks;
    [_measures locate:_curticks];

    NSData *msg1 = [_tracks advanceWithTicks:ticks sequencer:self];
    NSData *msg2 = [_metro advanceWithTicks:self.metroticks sequencer:self];
    if (!self.metroSw || self.seeking) {
        msg2 = nil;
    }

    [self MIDISend:msg1 metroNote:msg2];
}

- (void)seekAtTicks:(int)ticks
{
    if (_curticks == ticks) return;

    u_int8_t msg[16 * 5];
    for (int ch = 0, i = 0; ch < 16; ch++) {
        msg[i++] = 0xb0 | ch;
        msg[i++] = 0x79; msg[i++] = 0x00; // Reset All Controllers
        msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
    }
    [self MIDISend:[NSData dataWithBytes:msg length:sizeof(msg)] metroNote:nil];

    [_tracks reset];
    [_metro reset];
    [_measures locate:0];
    _curticks = 0;

    [self.pending clearBuffer];

    self.seeking = true;
    [self advanceWithTicks:ticks];
    self.seeking = false;

    [self MIDISend:[self.pending flushEvents] metroNote:nil];
}

- (void)locate:(int)beats
{
    [_countin clearEvents];

    if (self.lengthInBeats == 0) return;

    int ticks = [self positionAtBeats:beats].ticks;
    if (ticks < _ticksA) {
        ticks = _ticksA;
    }
    if (ticks > _ticksB) {
        ticks = _ticksB;
    }

    @synchronized(_tracks) {
        int ticksInBar = -1;
        if (!_playing && _metroOn) {
            // if the same time signature, leave the metronome in its current state.
            SEQPosition *s0 = [_measures currentSection];
            SEQPosition *s1 = [_measures findSectionWithCondition:^BOOL(SEQPosition *section) {
                return (ticks >= section.ticks);
            }];
            if ((s0.nn == s1.nn) && (s0.dd == s1.dd) && (s0.cc == s1.cc)) {
                ticksInBar = [_metro ticksInBar];
            }
        }

        [self seekAtTicks:ticks];

        if (ticksInBar >= 0) {
            [_metro reset];
            [_metro advanceWithTicks:ticksInBar sequencer:self];
        }
    }
}

- (void)rangeFrom:(int)beatsA to:(int)beatsB
{
    int ticksA = [self positionAtBeats:beatsA].ticks;
    int ticksB = [self positionAtBeats:beatsB].ticks;

    if (ticksA < _ticks0) {
        ticksA = _ticks0;
    }
    if (ticksB > _measures.maxticks) {
        ticksB = _measures.maxticks;
    }
    if (ticksA >= ticksB) {
        return;
    }

    @synchronized(_tracks) {
        _ticksA = ticksA;
        _ticksB = ticksB;
        if ((_curticks < _ticksA) || (_curticks >= _ticksB)) {
            [self locate:beatsA];
        }
    }
}

- (int)lengthInBeats
{
    return _measures.maxbeats;
}

- (SEQPosition *)position
{
    SEQPosition *s = [_measures currentSection];
    int _ticks = _curticks - s.ticks;
    int _beats = _ticks / s.ticksPerBeat;

    SEQPosition *p = [[[SEQPosition alloc] initWithTicks:_curticks nn:s.nn dd:s.dd cc:s.cc] autorelease];
    p.ticksPerBeat = s.ticksPerBeat;
    p.beats = _beats + s.beats;
    p.bars = (_beats / s.nn) + s.bars;
    p.beatsInBar = _beats % s.nn;
    p.ticksInBeat = _ticks % s.ticksPerBeat;
    return p;
}

- (SEQPosition *)positionAtBeats:(int)beats
{
    SEQPosition *s = [_measures findSectionWithCondition:^BOOL(SEQPosition *section) {
        return (beats >= section.beats);
    }];
    int _beats = beats - s.beats;

    SEQPosition *p = [[[SEQPosition alloc] initWithTicks:0 nn:s.nn dd:s.dd cc:s.cc] autorelease];
    p.ticks = (_beats * s.ticksPerBeat) + s.ticks;
    p.ticksPerBeat = s.ticksPerBeat;
    p.beats = beats;
    p.bars = (_beats / s.nn) + s.bars;
    p.beatsInBar = _beats % s.nn;
    p.ticksInBeat = 0;
    return p;
}

- (int)beatsA
{
    if (_ticksA > 0) {
        SEQPosition *s = [_measures findSectionWithCondition:^BOOL(SEQPosition *section) {
            return (_ticksA >= section.ticks);
        }];
        return ((_ticksA - s.ticks) / s.ticksPerBeat) + s.beats;
    }
    return 0;
}
- (int)beatsB
{
    if (_ticksB > 0) {
        SEQPosition *s = [_measures findSectionWithCondition:^BOOL(SEQPosition *section) {
            return (_ticksB >= section.ticks);
        }];
        return ((_ticksB - s.ticks) / s.ticksPerBeat) + s.beats;
    }
    return 0;
}

- (int)countInState
{
    return [_countin count];
}

- (int)tempo
{
    return (int)((60 * 1000000) / _tempoPQN);
}

- (void)setTempo:(int)bpm
{
    if (bpm < 10 || bpm > 480) return;

    _tempoPQN = (int)((60 * 1000000) / bpm);
    [_smftempo relative:_tempoPQN];
}

- (int)mute
{
    return _mute;
}

- (void)setMute:(int)channels
{
    int len = 0;
    u_int8_t msg[16 * 3];
    for (int ch = 0; ch < 16; ch++) {
        if ((channels & (1 << ch)) && !(_mute & (1 << ch))) {
            msg[len++] = 0xb0 | ch; msg[len++] = 0x7b; msg[len++] = 0x00; // All Notes Off
        }
    }

    _mute = channels;

    if (len) {
        [self MIDISend:[NSData dataWithBytes:msg length:len] metroNote:nil];
    }
}

- (int)transpose
{
    return _keyShift;
}

- (void)setTranspose:(int)shift
{
    _keyShift = shift;

    u_int8_t msg[16 * 3];
    for (int ch = 0, i = 0; ch < 16; ch++) {
        msg[i++] = 0xb0 | ch; msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
    }
    [self MIDISend:[NSData dataWithBytes:msg length:sizeof(msg)] metroNote:nil];
}

- (BOOL)metroSw
{
    return _metroOn;
}

- (void)setMetroSw:(BOOL)on
{
    if (_metroOn != on) {
        _metroOn = on;
        if (!_playing) {
            if (on) {
                [_metro reset];
                _t0 = 0;
                dispatch_resume(_timer);
            } else {
                dispatch_suspend(_timer);
            }
        }
    }
}

- (void)setMetroNotes:(NSArray<NSData *> *)notes
{
    [_metro setNotes:notes];
}

- (void)setCountNotes:(NSArray<NSData *> *)notes
{
    [_countin setNotes:notes];
}

- (void)evSetTempo:(int)newTempo
{
    if (_mute & (1 << CH_TEMPO_MUTE)) {
        return; /* skip during tempo mute */
    }

    if (newTempo == 0) {
        [_smftempo relative:0];
    } else {
        newTempo = [_smftempo convert:newTempo];
        if (_tempoPQN != newTempo) {
            _tempoPQN = newTempo;
            [self.delegate sequencerTempoDidChange:self.tempo];
        }
    }
}

- (void)evTimeSignature:(int)nn :(int)dd :(int)cc
{
    int ticks = nn * ((_ticksPQN << 2) >> dd);
    if (ticks == 0) return;
    int delta = _ticksPQN * cc / 24;
    if (delta == 0) { delta = 1; }

    [_metro setEvents:[self createMetroEvents:ticks delta:delta count:(ticks / delta)]];
}

- (NSMutableArray<TickEvent *> *)createMetroEvents:(int)ticks delta:(int)delta count:(int)count
{
    u_int8_t bytes[1] = { 0 };
    NSMutableArray<TickEvent *> *events = [NSMutableArray array];
    [events addObject:[[[TickEvent alloc] initWithDelta:0 meta:0x7e data:[NSData dataWithBytes:bytes length:1]] autorelease]];
    for (int n = 1 ; ticks > delta; ticks -= delta, n++) {
        bytes[0] = (u_int8_t)(n % count);
        [events addObject:[[[TickEvent alloc] initWithDelta:delta meta:0x7e data:[NSData dataWithBytes:bytes length:1]] autorelease]];
    }
    [events addObject:[[[TickEvent alloc] initWithDelta:ticks meta:0x2f data:nil] autorelease]];
    return events;
}

- (void)MIDISend:(NSData *)msg1 metroNote:(NSData *)msg2
{
    while (msg1.length > 255) {
        int pos = 255;
        const u_int8_t *data = msg1.bytes;
        while (!(data[pos] & 0x80)) pos--;
        [self.delegate sequencerMIDISend:[msg1 subdataWithRange:NSMakeRange(0, pos)] metroNote:msg2];
        msg1 = [msg1 subdataWithRange:NSMakeRange(pos, msg1.length - pos)];
        msg2 = nil;
    }
    if (msg1 || msg2) {
        [self.delegate sequencerMIDISend:msg1 metroNote:msg2];
    }
}

@end

@implementation SEQPosition

- (id)initWithTicks:(int)ticks nn:(int)nn dd:(int)dd cc:(int)cc
{
    if (self = [super init]) {
        _ticks = ticks;
        _nn = nn; _dd = dd; _cc = cc;
        _ticksPerBeat = 1;
    }
    return self;
}

@end

@implementation Track

- (void)processWithEvent:(TickEvent *)ev sequencer:(Sequencer *)seq
{
    if (ev.meta < 0) {
        const u_int8_t *data = ev.data.bytes;
        u_int8_t sts = data[0] & 0xf0;
        if (sts == 0x80 || sts == 0x90) {
            if (seq.seeking) return; /* skip the note message in seeking */
            u_int8_t ch = data[0] & 0x0f;
            if (seq.mute & (1 << ch)) return; /* skip muted channel */
            if (seq.transpose && (ch != 0x09)) {
                u_int8_t buf[] = { data[0], (u_int8_t)(data[1] + seq.transpose), data[2] };
                [_data appendBytes:buf length:sizeof(buf)];
                return;
            }
        } else if (seq.seeking && [seq.pending bufferEvent:ev.data.bytes]) {
            return; /* skip pending event in seeking */
        }
        [_data appendData:ev.data];
    } else {
        if (ev.meta == 0x2f) {
            /* nothing to do */
        } else if (ev.meta == 0x58) {
            seq.metroticks = _delta + 1;
            const u_int8_t *data = ev.data.bytes;
            [seq evTimeSignature:data[0] :data[1] :data[2]];
        } else if (ev.meta == 0x51) {
            const u_int8_t *data = ev.data.bytes;
            [seq evSetTempo:(data[0] << 16) | (data[1] << 8) | data[2]];
        }
    }
}

@end

@implementation Metronome

- (void)dealloc
{
    [_notes release];
    [super dealloc];
}

- (int)ticksInBar
{
    int ticks = _delta + 1;
    @synchronized(self) {
        for (int i = 0; i < _index; i++) {
            ticks += [_events objectAtIndex:i].delta;
        }
    }
    return ticks;
}

- (void)setNotes:(NSArray<NSData *> *)notes
{
    @synchronized(self) {
        [_notes release];
        _notes = [notes retain];
    }
}

- (void)processWithEvent:(TickEvent *)ev sequencer:(Sequencer *)seq
{
    if (ev.meta == 0x2f) {
        _index = 0;
    } else if (ev.meta == 0x7e) {
        if (_notes.count > 0) {
            const u_int8_t *data = ev.data.bytes;
            int last = (int)_notes.count - 1;
            int n = MAX(0, MIN(data[0], last));
            [_data setData:[_notes objectAtIndex:n]];
        }
    }
}

@end

@implementation CountIn

- (id)init
{
    if (self = [super init]) {
        _map = [[NSMutableDictionary alloc] init];
    }
    return self;
}

- (void)dealloc
{
    [_map release];
    [super dealloc];
}

- (void)clear
{
    [_map removeAllObjects];
}

- (void)setTempo:(int)ticks tempo:(int)tempo
{
    [_map setObject:@(tempo) forKey:@(ticks)];
}

- (int)count
{
    return (_index > 0 ? ([self length] - _index) : 0);
}

- (void)start:(Sequencer *)seq
{
    if (seq.lengthInBeats == 0) return;

    SEQPosition *p = [seq position];
    NSNumber *tempo = [_map objectForKey:@(p.ticks)];
    if (tempo) {
        [seq evSetTempo:[tempo intValue]];
    }

    int bars = abs(seq.countInBars);
    int ticks = (p.beatsInBar * p.ticksPerBeat) + p.ticksInBeat;
    int ticksInBar = p.nn * p.ticksPerBeat;
    if (ticks > (ticksInBar - p.ticksPerBeat)) { bars--; }
    while (bars-- > 0) { ticks += ticksInBar; }

    [self setEvents:[seq createMetroEvents:ticks delta:p.ticksPerBeat count:p.nn]];
}

- (void)processWithEvent:(TickEvent *)ev sequencer:(Sequencer *)seq
{
    if (ev.meta == 0x2f) {
        seq.metroticks = _delta + 1;
        [self clearEvents];
    } else {
        [super processWithEvent:ev sequencer:seq];
    }
}

@end

@implementation Tracks

- (id)init
{
    self = [super init];
    if (self) {
        _tracks = [[NSMutableArray alloc] init];
        _data = [[NSMutableData alloc] init];
    }
    return self;
}

- (void)dealloc
{
    [_tracks release];
    [_data release];
    [super dealloc];
}

- (void)addTrack:(Track *)track
{
    [_tracks addObject:track];
}

- (void)removeAllTracks
{
    [_tracks removeAllObjects];
}

- (void)reset
{
    for (Track *track in _tracks) {
        [track reset];
    }
}

- (NSData *)advanceWithTicks:(int)ticks sequencer:(Sequencer *)seq
{
    seq.metroticks = ticks;

    _data.length = 0;
    for (Track *track in _tracks) {
        NSData *msg = [track advanceWithTicks:ticks sequencer:seq];
        if (msg) {
            [_data appendData:msg];
        }
    }
    return _data.length ? _data : nil;
}

@end

@implementation Measures

@dynamic maxticks;
@dynamic maxbeats;

- (id)init
{
    if (self = [super init]) {
        _sections = [[NSMutableArray alloc] init];
        [self setTimeSignature:0 nn:4 dd:2 cc:24];
    }
    return self;
}

- (void)dealloc
{
    [_sections release];
    [super dealloc];
}

- (void)clear
{
    _index = 0;
    [_sections removeObjectsInRange:NSMakeRange(1, _sections.count - 1)];
}

- (void)setTimeSignature:(int)ticks nn:(int)nn dd:(int)dd cc:(int)cc
{
    if (nn != 0) {
        [_sections addObject:[[[SEQPosition alloc] initWithTicks:ticks nn:nn dd:dd cc:cc] autorelease]];
    }
}

- (void)build:(int)ticksPQN maxticks:(int)maxticks
{
    SEQPosition *last = [_sections lastObject];
    [self setTimeSignature:maxticks nn:last.nn dd:last.dd cc:last.cc];

    [_sections sortUsingComparator:^NSComparisonResult(SEQPosition *a, SEQPosition *b) {
        return a.ticks - b.ticks;
    }];

    for (SEQPosition *v in _sections) {
        int ticksPerBeat = ((ticksPQN << 2) >> v.dd);
        if (ticksPerBeat == 0) ticksPerBeat = 1;
        v.ticksPerBeat = ticksPerBeat;
    }

    for (int i = 0; i < _sections.count - 1; i++) {
        int ticks = _sections[i + 1].ticks - _sections[i].ticks;
        int beats = (ticks + _sections[i].ticksPerBeat - 1) / _sections[i].ticksPerBeat;
        int bars = (beats + _sections[i].nn - 1) / _sections[i].nn;
        _sections[i + 1].beats = _sections[i].beats + beats;
        _sections[i + 1].bars = _sections[i].bars + bars;
    }
}

- (int)maxticks
{
    return [_sections lastObject].ticks;
}

- (int)maxbeats
{
    return [_sections lastObject].beats;
}

- (void)locate:(int)ticks
{
    if (ticks < _sections[_index].ticks) { _index = 0; }
    while ((_index < _sections.count - 1) && (ticks >= _sections[_index + 1].ticks)) {
        _index++;
    }
}

- (SEQPosition *)currentSection
{
    return _sections[_index];
}

- (SEQPosition *)findSectionWithCondition:(BOOL (^)(SEQPosition *section))condition
{
    for (NSUInteger i = _sections.count - 1; i >= 0; i--) {
        if (condition(_sections[i])) {
            return _sections[i];
        }
    }
    return _sections[0];
}

@end

@implementation SMFTempo

- (id)init
{
    self = [super init];
    if (self) {
        _rate = 1.0;
    }
    return self;
}

- (void)relative:(int)tempo
{
    if (tempo == 0) {
        _rate = 1.0;
        _tempoPQN = 0;
    } else {
        _rate = (_tempoPQN != 0) ? (double)_tempoPQN / tempo : 1.0;
    }
}
- (int)convert:(int)tempo
{
    _tempoPQN = tempo;
    return (int)(tempo / _rate);
}

@end

@implementation PendingEvents

- (id)init
{
    self = [super init];
    if (self) {
        [self clearBuffer];
    }
    return self;
}

- (void)clearBuffer
{
    memset(_An, 0xff, sizeof(_An));
    memset(_Bn, 0xff, sizeof(_Bn));
    memset(_En, 0xff, sizeof(_En));
}

- (BOOL)bufferEvent:(const u_int8_t *)data
{
    u_int8_t sts = data[0] & 0xf0;
    u_int8_t ch  = data[0] & 0x0f;

    if (sts == 0xa0) { // Polyphonic Aftertouch
        int num = data[1] & 0x7f;
        _An[ch][num] = data[2];
        return YES;
    }

    if (sts == 0xe0) { // Pitch Bend
        _En[ch][0] = data[1];
        _En[ch][1] = data[2];
        return YES;
    }

    if (sts == 0xb0) {
        int num = data[1] & 0x7f;
        switch (num) {
            case  1: // Modulation (MSB)
            case  2: // Breath Controller (MSB)
            case  4: // Foot Controller (MSB)
            case 10: // Pan (MSB)
            case 11: // Expression (MSB)
            case 16: // General Purpose Controller 1 (MSB)
            case 17: // General Purpose Controller 2 (MSB)
            case 18: // General Purpose Controller 3 (MSB)
            case 19: // General Purpose Controller 4 (MSB)
                _Bn[ch][num] = data[2];
                if (_Bn[ch][num + 32] != 0xff) {
                    _Bn[ch][num + 32] = 0;
                }
                return YES;
            case 33: // Modulation (LSB)
            case 34: // Breath Controller (LSB)
            case 36: // Foot Controller (LSB)
            case 42: // Pan (LSB)
            case 43: // Expression (LSB)
            case 48: // General Purpose Controller 1 (LSB)
            case 49: // General Purpose Controller 2 (LSB)
            case 50: // General Purpose Controller 3 (LSB)
            case 51: // General Purpose Controller 4 (LSB)
            case 64: // Damper Pedal
            case 66: // Sostenuto Pedal
            case 67: // Soft Pedal
            case 80: // General Purpose Controller 5
            case 81: // General Purpose Controller 6
            case 82: // General Purpose Controller 7
            case 83: // General Purpose Controller 8
            case 88: // High Resolution Velocity Prefix
                _Bn[ch][num] = data[2];
                return YES;
            case 121: // Reset All Controllers
                [self clearBuffer];
                break;
        }
    }

    return NO;
}

- (NSData *)flushEvents
{
    NSMutableData *data = [NSMutableData data];
    for (int ch = 0; ch < 16; ch++) {
        u_int8_t buf[3];
        if (_En[ch][0] != 0xff) {
            buf[0] = (0xe0 + ch);
            buf[1] = _En[ch][0];
            buf[2] = _En[ch][1];
            [data appendBytes:buf length:3];
        }
        for (int num = 0; num < 128; num++) {
            if (_An[ch][num] != 0xff) {
                buf[0] = (0xa0 + ch);
                buf[1] = num;
                buf[2] = _An[ch][num];
                [data appendBytes:buf length:3];
            }
            if (_Bn[ch][num] != 0xff) {
                buf[0] = (0xb0 + ch);
                buf[1] = num;
                buf[2] = _Bn[ch][num];
                [data appendBytes:buf length:3];
            }
        }
    }
    return data.length ? data : nil;
}

@end
