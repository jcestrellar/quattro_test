//
//  Sequencer.h
//
//  Copyright 2025 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface SEQPosition : NSObject

@property (assign) int ticks;
@property (assign) int nn, dd, cc; // Time Signature (FF 58 04 nn dd cc)
@property (assign) int ticksPerBeat;
@property (assign) int beats;
@property (assign) int bars;
@property (assign) int beatsInBar;
@property (assign) int ticksInBeat;

- (id)initWithTicks:(int)ticks nn:(int)nn dd:(int)dd cc:(int)cc;

@end

@protocol SequencerDelegate <NSObject>

@required
- (void)sequencerMIDISend:(NSData *)data metroNote:(NSData *)note;
- (void)sequencerDidFinishPlaying;
- (void)sequencerTempoDidChange:(int)newTempo;

@end

@interface Sequencer : NSObject

@property (assign) id<SequencerDelegate> delegate;

@property (retain) NSString *title;
@property (retain) NSString *copyright;

@property (assign) int tempo;
@property (assign) int mute;
@property (assign) int transpose;
@property (assign) int countInBars;
@property (assign) BOOL loop;
@property (assign) BOOL metroSw;

@property (readonly) int lengthInBeats;
@property (readonly) int beatsA;
@property (readonly) int beatsB;
@property (readonly) int countInState;

- (BOOL)loadWithSMFData:(NSData *)data cue:(BOOL)cue;
- (void)play:(BOOL)loop;
- (void)stop:(BOOL)reset;

- (void)locate:(int)beats;
- (void)rangeFrom:(int)beatsA to:(int)beatsB;

- (SEQPosition *)position;
- (SEQPosition *)positionAtBeats:(int)beats;

- (void)setMetroNotes:(NSArray<NSData *> *)notes;
- (void)setCountNotes:(NSArray<NSData *> *)notes;

@end
