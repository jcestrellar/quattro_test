//
//  AudioPlayer.m
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "AudioPlayer.h"

@interface AudioPlayer () {
    id<AudioOutputStream> _output;
    AudioStreamBasicDescription _inputFormat;
    AudioStreamBasicDescription _outputFormat;
    ExtAudioFileRef _extAudioFile;
    UInt64 _totalFrames;
    NSTimeInterval _locateTime;
}
@property (retain) NSString *deviceUID;
@property (retain) NSURL *fileURL;
@end

@implementation AudioPlayer

@synthesize delegate = _delegate;

@dynamic device;
@dynamic file;
@dynamic output;
@dynamic volume;
@dynamic numberOfChannels;
@dynamic currentTime;
@dynamic status;

- (void)dealloc
{
    _delegate = nil;
    [self close];
    [_output setDelegate:nil];
    self.deviceUID = nil;

    [super dealloc];
}

- (NSURL *)file
{
	return self.fileURL;
}

- (void)close
{
    [_output stop];

    ExtAudioFileDispose(_extAudioFile);
    _extAudioFile = NULL;
    self.fileURL = nil;
    _totalFrames = 0;
    _locateTime = 0;
}

- (void)setOutput:(id<AudioOutputStream>)output
{
    [_output stop];

     _output = output;

    [_output setDelegate:self];
}

-(id<AudioOutputStream>)output
{
    return _output;
}

- (NSString *)device
{
    return self.deviceUID ? self.deviceUID : @"";
}

- (void)setDevice:(NSString *)deviceUID
{
	[self stop];

#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
    self.deviceUID = deviceUID;
#endif
}

- (void)play
{
    if (_extAudioFile) {
        [_output start:self.deviceUID];
    }
}

- (void)pause
{
    [_output pause];
}

- (void)stop
{
    [_output stop];

	ExtAudioFileSeek(_extAudioFile, 0);
    _locateTime = 0;

    if ([self.delegate respondsToSelector:@selector(audioPlayerDidFinishPlaying:)]) {
        [self.delegate audioPlayerDidFinishPlaying: self.fileURL];
    }
}

- (void)locate:(NSTimeInterval)time
{
    [_output stop];

    SInt64 frame = _inputFormat.mSampleRate * time;
    if (ExtAudioFileSeek(_extAudioFile, frame) == 0) {
        _locateTime = time;
    }
}

- (int)status
{
    return _output.status;
}

- (NSTimeInterval)currentTime
{
    return [_output currentTime] + _locateTime;
}

- (float)volume
{
    return _output.volume;
}

- (void)setVolume:(float)gain
{
    if (gain < 0 || gain > 1.0)
        return;

    _output.volume = gain;
}

- (float)speed
{
    return _output.speed;
}

- (void)setSpeed:(float)rate
{
    if (rate < 0.5 || rate > 2.0)
        return;

    _output.speed = rate;
}

- (float)pitch
{
	return _output.pitch;
}

- (void)setPitch:(float)cent
{
	if (cent < -2400.0 || cent > 2400.0)
		return;

	_output.pitch = cent;
}

- (NSTimeInterval)totalTime
{
	return (_outputFormat.mSampleRate ? _totalFrames / _outputFormat.mSampleRate : 0);
}

- (NSUInteger)numberOfChannels
{
    return _output.numberOfChannels;
}

- (float)peakPowerForChannel:(NSUInteger)channelNumber
{
    if (channelNumber >= [self numberOfChannels])
        return 0;

    return [_output peakPowerForChannel:channelNumber];
}

- (BOOL)open:(NSURL *)url
{
    [self close];

    BOOL success;
    OSStatus err;
    SInt64 fileLengthFrames = 0;

    [_output ASBD:&_outputFormat];

    err = ExtAudioFileOpenURL((CFURLRef)url, &_extAudioFile);
    success = (err == 0);

    if (success) {
        err = ExtAudioFileSetProperty(_extAudioFile,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &_outputFormat);
        success = (err == 0);
    }

    if (success) {
        UInt32 size = sizeof(SInt64);
        err = ExtAudioFileGetProperty(_extAudioFile,
                                      kExtAudioFileProperty_FileLengthFrames,
                                      &size,
                                      &fileLengthFrames);
        success = (err == 0);
    }

    if (success) {
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = ExtAudioFileGetProperty(_extAudioFile,
                                      kExtAudioFileProperty_FileDataFormat,
                                      &size,
	                                  &_inputFormat);
        success = (err == 0);
        if (success) {
            _totalFrames = fileLengthFrames;
        }
    }

    if (success) {
		self.fileURL = url;
	} else {
        ExtAudioFileDispose(_extAudioFile);
        _extAudioFile = NULL;
        _totalFrames = 0;
    }

	return success;
}

- (NSInteger)outputStream:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    UInt32 readFrameSize = (UInt32)length / _outputFormat.mBytesPerFrame;

    AudioBufferList audioBufferList;
    audioBufferList.mNumberBuffers = 1;
    audioBufferList.mBuffers[0].mNumberChannels = (UInt32)_output.numberOfChannels;
    audioBufferList.mBuffers[0].mDataByteSize = (UInt32)length;
    audioBufferList.mBuffers[0].mData = buffer;
    OSStatus err = ExtAudioFileRead(_extAudioFile, &readFrameSize, &audioBufferList);

    if (err) {
        [self stop];
        if ([self.delegate respondsToSelector:@selector(audioPlayerErrorDidOccur:)]) {
            [self.delegate audioPlayerErrorDidOccur: self.fileURL];
        }
        return 0;
    }

    if (readFrameSize == 0) {
        [self stop];
        if ([self.delegate respondsToSelector:@selector(audioPlayerDidEndSong:)]) {
            [self.delegate audioPlayerDidEndSong: self.fileURL];
        }
    }

    return readFrameSize * _outputFormat.mBytesPerFrame;
}

@end
