//
//  AudioRecorder.m
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "AudioRecorder.h"

@interface AudioRecorder () {
    id<AudioInputStream> _input;
	AudioStreamBasicDescription _inputFormat;
    ExtAudioFileRef _extAudioFile;
}
@property (retain) NSString *deviceUID;
@property (retain) NSURL *fileURL;
@end

@implementation AudioRecorder

@synthesize delegate = _delegate;

@dynamic device;
@dynamic file;
@dynamic input;
@dynamic volume;
@dynamic numberOfChannels;
@dynamic currentTime;
@dynamic status;

- (void)dealloc
{
    _delegate = nil;
    [self close];
    [_input setDelegate:nil];
    self.deviceUID = nil;

    [super dealloc];
}

- (NSURL *)file
{
	return self.fileURL;
}

- (void)close
{
    [_input stop:YES];

    ExtAudioFileDispose(_extAudioFile);
    _extAudioFile = NULL;
    self.fileURL = nil;
}

- (void)setInput:(id<AudioInputStream>)input
{
    [_input stop:true];

    _input = input;

    [_input setDelegate:self];
}

- (NSString *)device
{
    return self.deviceUID ? self.deviceUID : @"";
}

- (void)setDevice:(NSString *)deviceUID
{
	[self stop:NO];

#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
    self.deviceUID = deviceUID;
#endif
}

- (void)record
{
    [_input start:self.deviceUID];
}

- (void)pause
{
    [_input pause];
}

- (void)stop:(BOOL)shouldStopImmediate
{
    [_input stop:shouldStopImmediate];

    if (shouldStopImmediate) {
        [self inputStreamDidClosed];
    }
}

- (int)status
{
    return _input.status;
}

- (NSTimeInterval)currentTime
{
	return (_extAudioFile ? [_input currentTime] : 0);
}

- (float)volume
{
    return _input.volume;
}

- (void)setVolume:(float)gain
{
    if (gain < 0 || gain > 1.0)
        return;

    _input.volume = gain;
}

- (NSUInteger)numberOfChannels
{
    return _input.numberOfChannels;
}

- (float)peakPowerForChannel:(NSUInteger)channelNumber
{
    if (channelNumber >= [self numberOfChannels])
        return 0;

    return [_input peakPowerForChannel:channelNumber];
}

- (BOOL)create:(NSURL *)url format:(enum RecordingFormat)format
{
    [self close];

    BOOL success;
    OSStatus err;

    [_input ASBD:&_inputFormat];

    AudioStreamBasicDescription outputFormat;

    if (format == kRecordingFormatWAV) {

        outputFormat.mSampleRate        = _inputFormat.mSampleRate;
        outputFormat.mFormatID          = kAudioFormatLinearPCM;
        outputFormat.mFormatFlags       = kLinearPCMFormatFlagIsSignedInteger
                                        | kLinearPCMFormatFlagIsPacked;
        outputFormat.mChannelsPerFrame  = _inputFormat.mChannelsPerFrame;
        outputFormat.mBytesPerPacket    = sizeof(int16_t) * _inputFormat.mChannelsPerFrame;
        outputFormat.mBytesPerFrame     = sizeof(int16_t) * _inputFormat.mChannelsPerFrame;
        outputFormat.mBitsPerChannel    = 8 * sizeof(int16_t);
        outputFormat.mFramesPerPacket   = 1;
        outputFormat.mReserved          = 0;

        err = ExtAudioFileCreateWithURL((CFURLRef)url,
                                        kAudioFileWAVEType,
                                        &outputFormat, 
                                        NULL,
                                        kAudioFileFlags_EraseFile, 
                                        &_extAudioFile);
        success = (err == 0);

        if (success) {
            err = ExtAudioFileSetProperty(_extAudioFile,
                                          kExtAudioFileProperty_ClientDataFormat,
                                          sizeof(AudioStreamBasicDescription),
                                          &_inputFormat);
            success = (err == 0);
        }

    } else {

        memset(&outputFormat, 0, sizeof(AudioStreamBasicDescription));
        outputFormat.mSampleRate       = _inputFormat.mSampleRate;
        outputFormat.mFormatID         = kAudioFormatMPEG4AAC;
        outputFormat.mChannelsPerFrame = _inputFormat.mChannelsPerFrame;

        UInt32 size = sizeof(AudioStreamBasicDescription);
        AudioFormatGetProperty(kAudioFormatProperty_FormatInfo, 
                               0, NULL,
                               &size,
                               &outputFormat);
        err = ExtAudioFileCreateWithURL((CFURLRef)url,
                                        kAudioFileM4AType,
                                        &outputFormat,
                                        NULL,
                                        kAudioFileFlags_EraseFile,
                                        &_extAudioFile);
        success = (err == 0);
#if 0
        if (success) {
            UInt32 codecManufacturer = kAppleSoftwareAudioCodecManufacturer;
            err = ExtAudioFileSetProperty(extAudioFile,
                                          kExtAudioFileProperty_CodecManufacturer,
                                          sizeof(UInt32),
                                          &codecManufacturer);
            success = (err == 0);
        }
#endif
        if (success) {
            err = ExtAudioFileSetProperty(_extAudioFile,
                                          kExtAudioFileProperty_ClientDataFormat,
                                          sizeof(AudioStreamBasicDescription),
                                          &_inputFormat);
            success = (err == 0);
        }

        AudioConverterRef audioConverter = nil;

        if (success) {
            size = sizeof(audioConverter);
            err = ExtAudioFileGetProperty(_extAudioFile,
                                          kExtAudioFileProperty_AudioConverter,
                                          &size,
                                          &audioConverter);
            success = (err == 0);
        }

        if (success) {
            UInt32 bitrate;
            switch (format) {
                case kRecordingFormatAAC_256K:
                    bitrate = 256000;
                    break;
                case kRecordingFormatAAC_192K:
                    bitrate = 192000;
                    break;
                case kRecordingFormatAAC_128K:
                    bitrate = 128000;
                    break;
                default:
                    bitrate = 64000;
                    break;
            }
            err = AudioConverterSetProperty(audioConverter,
                                            kAudioConverterEncodeBitRate,
                                            sizeof(bitrate),
                                            &bitrate);
            success = (err == 0);
        }
    }

    if (success) {
        err = ExtAudioFileWriteAsync(_extAudioFile, 0, NULL);
        success = (err == 0);
    }

    if (success) {
		self.fileURL = url;
	} else {
        ExtAudioFileDispose(_extAudioFile);
        _extAudioFile = NULL;
        [[NSFileManager defaultManager] removeItemAtURL:url error:nil];
    }

	return success;
}

- (void)inputStream:(u_int8_t *)buffer maxLength:(NSInteger)length;
{
    if (!_extAudioFile) return;

    if (length > 0) {
        AudioBufferList audioBufferList;
        audioBufferList.mNumberBuffers = 1;
        audioBufferList.mBuffers[0].mNumberChannels = _inputFormat.mChannelsPerFrame;
        audioBufferList.mBuffers[0].mDataByteSize = (UInt32)length;
        audioBufferList.mBuffers[0].mData = buffer;

        NSInteger frames = length / _inputFormat.mBytesPerFrame;

        OSStatus err = ExtAudioFileWrite(_extAudioFile, (UInt32)frames, &audioBufferList);

        if (err) {
            if (self.fileURL && [self.delegate respondsToSelector:@selector(audioRecorderErrorDidOccur:)]) {
                [self.delegate audioRecorderErrorDidOccur:self.fileURL];
            }
			[self stop:YES];
        }
    }
}

- (void)inputStreamDidClosed
{
    ExtAudioFileDispose(_extAudioFile);
    _extAudioFile = NULL;

    if (self.fileURL && [self.delegate respondsToSelector:@selector(audioRecorderDidFinishRecording:)]) {
        [self.delegate audioRecorderDidFinishRecording:self.fileURL];
    }

	self.fileURL = nil;
}

@end
