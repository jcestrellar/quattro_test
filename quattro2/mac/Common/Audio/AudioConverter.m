//
//  AudioConverter.m
//  
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "AudioConverter.h"

@implementation AudioConverter

+ (BOOL)formatWithURL:(NSURL *)fileURL format:(AudioStreamBasicDescription *)format duration:(Float64 *)duration
{
    AudioFileID fileID = NULL;

    OSStatus err;
    BOOL success = YES;

    if (success) {
        err = AudioFileOpenURL((CFURLRef)fileURL, kAudioFileReadPermission, 0, &fileID);
        success = (err == 0);
    }
    if (success && format) {
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = AudioFileGetProperty(fileID, kAudioFilePropertyDataFormat, &size, format);
        success = (err == 0);
    }
    if (success && format) {
        UInt32 bitrate = 0;
        UInt32 size = sizeof(UInt32);
        err = AudioFileGetProperty(fileID, kAudioFilePropertyBitRate, &size, &bitrate);
        success = (err == 0);
        if (success) {
            format->mReserved = bitrate;
        }
    }
    if (success && duration) {
        UInt32 size = sizeof(Float64);
        err = AudioFileGetProperty(fileID, kAudioFilePropertyEstimatedDuration, &size, duration);
        success = (err == 0);
    }

    if (fileID) {
        AudioFileClose(fileID);
    }

    return success;
}

+ (BOOL)convertAtURL:(NSURL *)inURL toURL:(NSURL *)outURL format:(const AudioStreamBasicDescription *)format
{
    ExtAudioFileRef inAudioFileRef = NULL;
    ExtAudioFileRef outAudioFileRef = NULL;

    AudioStreamBasicDescription inputFormat;
    AudioStreamBasicDescription outputFormat;
    AudioFileTypeID fileType = kAudioFileWAVEType;

    float mixfactor = 1.0f;

    OSStatus err;
    BOOL success = YES;

    if (success) {
        err = ExtAudioFileOpenURL((CFURLRef)inURL, &inAudioFileRef);
        success = (err == 0);
    }
    if (success) {
        AudioStreamBasicDescription fileFormat;
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = ExtAudioFileGetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_FileDataFormat,
                                      &size,
                                      &fileFormat);
        success = (err == 0);
        if (success) {
            inputFormat.mFormatID          = kAudioFormatLinearPCM;
            inputFormat.mFormatFlags       = kAudioFormatFlagIsFloat
                                           | kLinearPCMFormatFlagIsPacked;
            inputFormat.mSampleRate        = format->mSampleRate;
            inputFormat.mChannelsPerFrame  = fileFormat.mChannelsPerFrame;
            inputFormat.mBitsPerChannel    = sizeof(float) * 8;
            inputFormat.mBytesPerPacket    = (inputFormat.mBitsPerChannel / 8) * inputFormat.mChannelsPerFrame;
            inputFormat.mBytesPerFrame     = (inputFormat.mBitsPerChannel / 8) * inputFormat.mChannelsPerFrame;
            inputFormat.mFramesPerPacket   = 1;
            inputFormat.mReserved          = 0;
        }
    }
    if (success) {
        err = ExtAudioFileSetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &inputFormat);
        success = (err == 0);
    }

    if (format->mFormatID == kAudioFormatLinearPCM) {

        fileType = kAudioFileWAVEType;

        outputFormat.mFormatID = format->mFormatID;
        if (format->mBitsPerChannel == 0) {
            outputFormat.mFormatFlags    = kAudioFormatFlagIsFloat
                                         | kLinearPCMFormatFlagIsPacked;
            outputFormat.mBitsPerChannel = sizeof(float) * 8;
        } else {
            outputFormat.mFormatFlags    = kLinearPCMFormatFlagIsSignedInteger
                                         | kLinearPCMFormatFlagIsPacked;
            outputFormat.mBitsPerChannel = format->mBitsPerChannel;
        }
        outputFormat.mSampleRate       = format->mSampleRate;
        outputFormat.mChannelsPerFrame = format->mChannelsPerFrame;
        outputFormat.mBytesPerPacket   = (outputFormat.mBitsPerChannel / 8) * outputFormat.mChannelsPerFrame;
        outputFormat.mBytesPerFrame    = (outputFormat.mBitsPerChannel / 8) * outputFormat.mChannelsPerFrame;
        outputFormat.mFramesPerPacket  = 1;
        outputFormat.mReserved         = 0;

    } else if (format->mFormatID == kAudioFormatMPEG4AAC) {

        fileType = kAudioFileM4AType;

        memset(&outputFormat, 0, sizeof(AudioStreamBasicDescription));
        outputFormat.mFormatID         = format->mFormatID;
        outputFormat.mSampleRate       = format->mSampleRate;
        outputFormat.mChannelsPerFrame = format->mChannelsPerFrame;

        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = AudioFormatGetProperty(kAudioFormatProperty_FormatInfo, 
                                     0, NULL,
                                     &size,
                                     &outputFormat);
        success = (err == 0);
    } else {
        success = NO;
    }

    if (success) {
        err = ExtAudioFileCreateWithURL((CFURLRef)outURL,
                                        fileType,
                                        &outputFormat, 
                                        NULL,
                                        kAudioFileFlags_EraseFile, 
                                        &outAudioFileRef);
        success = (err == 0);
    }
    if (success) {
        err = ExtAudioFileSetProperty(outAudioFileRef,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &inputFormat);
        success = (err == 0);
    }
    if (success && (format->mFormatID == kAudioFormatMPEG4AAC)) {
        AudioConverterRef audioConverter = nil;
        UInt32 size = sizeof(audioConverter);
        err = ExtAudioFileGetProperty(outAudioFileRef,
                                      kExtAudioFileProperty_AudioConverter,
                                      &size,
                                      &audioConverter);
        success = (err == 0);
        if (success) {
            UInt32 bitrate = format->mReserved;
            err = AudioConverterSetProperty(audioConverter,
                                            kAudioConverterEncodeBitRate,
                                            sizeof(bitrate),
                                            &bitrate);
            success = (err == 0);
        }
    }

    if (success) {
        if ((outputFormat.mChannelsPerFrame == 1) && (inputFormat.mChannelsPerFrame > 1)) {
            /* calculate the amplitude factor for mixdown */
            UInt32 length = inputFormat.mBytesPerFrame * 0x4000;
            char *buffer = malloc(length);

            AudioBufferList audioBufferList;
            audioBufferList.mNumberBuffers = 1;
            audioBufferList.mBuffers[0].mNumberChannels = inputFormat.mChannelsPerFrame;
            audioBufferList.mBuffers[0].mDataByteSize = length;
            audioBufferList.mBuffers[0].mData = buffer;

            while (success) {
                UInt32 frames = length / inputFormat.mBytesPerFrame;
                audioBufferList.mBuffers[0].mDataByteSize = length;
                err = ExtAudioFileRead(inAudioFileRef, &frames, &audioBufferList);
                success = (err == 0);
                if (success) {
                    if (frames == 0) break;
                    float inMax = 0, mixMax = 0;
                    float *p = (float *)buffer;
                    while (frames-- > 0) {
                        float mix = 0;
                        for (UInt32 ch = inputFormat.mChannelsPerFrame; ch > 0; ch--, p++) {
                            if (inMax < fabsf(*p)) { inMax = fabsf(*p); }
                            mix += *p;
                        }
                        if (mixMax < fabsf(mix)) { mixMax = fabsf(mix); }
                    }
                    mixfactor = (mixMax <= inMax) ? 1.0f : (inMax / mixMax);
                }
            }
            if (success) {
                err = ExtAudioFileSeek(inAudioFileRef, 0);
                success = (err == 0);
            }

            free(buffer);
        }
    }

    if (success) {
        UInt32 length = inputFormat.mBytesPerFrame * 0x4000;
        char *buffer = malloc(length);

        AudioBufferList audioBufferList;
        audioBufferList.mNumberBuffers = 1;
        audioBufferList.mBuffers[0].mNumberChannels = inputFormat.mChannelsPerFrame;
        audioBufferList.mBuffers[0].mDataByteSize = length;
        audioBufferList.mBuffers[0].mData = buffer;

        while (success) {
            UInt32 frames = length / inputFormat.mBytesPerFrame;
            audioBufferList.mBuffers[0].mDataByteSize = length;
            err = ExtAudioFileRead(inAudioFileRef, &frames, &audioBufferList);
            success = (err == 0);
            if (success) {
                if (frames == 0) break;
                if ((outputFormat.mChannelsPerFrame == 1) && (inputFormat.mChannelsPerFrame > 1)) {
                    float *p = (float *)buffer;
                    for (UInt32 cnt = frames; cnt > 0; cnt--, p += inputFormat.mChannelsPerFrame) {
                        for (UInt32 ch = 1; ch < inputFormat.mChannelsPerFrame; ch++) {
                            p[0] += p[ch];
                        }
                        p[0] *= mixfactor;
                    }
                }
                err = ExtAudioFileWrite(outAudioFileRef, frames, &audioBufferList);
                success = (err == 0);
            }
        }

        free(buffer);
    }

    ExtAudioFileDispose(inAudioFileRef);
    ExtAudioFileDispose(outAudioFileRef);

    if (!success) {
        [[NSFileManager defaultManager] removeItemAtURL:outURL error:nil];
    }

    return success;
}

+ (BOOL)splitAtURL:(NSURL *)inURL toURL:(NSArray *)wavURLs
{
    ExtAudioFileRef inAudioFileRef = NULL;

    AudioStreamBasicDescription inputFormat;
    AudioStreamBasicDescription outputFormat;
    UInt32 channels = 0;

    OSStatus err;
    BOOL success = YES;

    if (success) {
        err = ExtAudioFileOpenURL((CFURLRef)inURL, &inAudioFileRef);
        success = (err == 0);
    }
    if (success) {
        AudioStreamBasicDescription fileFormat;
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = ExtAudioFileGetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_FileDataFormat,
                                      &size,
                                      &fileFormat);
        success = (err == 0);
        if (success) {
            if (wavURLs.count > 0) {
                channels = (UInt32)MIN(fileFormat.mChannelsPerFrame / wavURLs.count, 2);
            }
            success = (channels > 0);
        }
        if (success) {
            if (fileFormat.mFormatID == kAudioFormatLinearPCM) {
                inputFormat.mFormatID       = fileFormat.mFormatID;
                inputFormat.mFormatFlags    = fileFormat.mFormatFlags;
                inputFormat.mBitsPerChannel = fileFormat.mBitsPerChannel;
            } else {
                inputFormat.mFormatID       = kAudioFormatLinearPCM;
                inputFormat.mFormatFlags    = kLinearPCMFormatFlagIsSignedInteger
                                            | kLinearPCMFormatFlagIsPacked;
                inputFormat.mBitsPerChannel = 16; /* fixed */
            }
            inputFormat.mSampleRate        = fileFormat.mSampleRate;
            inputFormat.mChannelsPerFrame  = fileFormat.mChannelsPerFrame;
            inputFormat.mBytesPerPacket    = (inputFormat.mBitsPerChannel / 8) * inputFormat.mChannelsPerFrame;
            inputFormat.mBytesPerFrame     = (inputFormat.mBitsPerChannel / 8) * inputFormat.mChannelsPerFrame;
            inputFormat.mFramesPerPacket   = 1;
            inputFormat.mReserved          = 0;

            memcpy(&outputFormat, &inputFormat, sizeof(AudioStreamBasicDescription));
            outputFormat.mChannelsPerFrame  = channels;
            outputFormat.mBytesPerPacket    = (outputFormat.mBitsPerChannel / 8) * outputFormat.mChannelsPerFrame;
            outputFormat.mBytesPerFrame     = (outputFormat.mBitsPerChannel / 8) * outputFormat.mChannelsPerFrame;
        }
    }
    if (success) {
        err = ExtAudioFileSetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &inputFormat);
        success = (err == 0);
    }

    ExtAudioFileRef outAudioFileRef[wavURLs.count];
    memset(&outAudioFileRef, 0, wavURLs.count * sizeof(ExtAudioFileRef));
    
    if (success) {
        for (NSUInteger n = 0; n < wavURLs.count && success; n++) {
            err = ExtAudioFileCreateWithURL((CFURLRef)[wavURLs objectAtIndex:n],
                                            kAudioFileWAVEType,
                                            &outputFormat, 
                                            NULL,
                                            kAudioFileFlags_EraseFile, 
                                            &outAudioFileRef[n]);
            success = (err == 0);
        }
    }
    if (success) {
        for (NSUInteger n = 0; n < wavURLs.count && success; n++) {
            err = ExtAudioFileSetProperty(outAudioFileRef[n],
                                          kExtAudioFileProperty_ClientDataFormat,
                                          sizeof(AudioStreamBasicDescription),
                                          &outputFormat);
            success = (err == 0);
        }
    }

    if (success) {
        UInt32 length = inputFormat.mBytesPerFrame * 0x4000;
        char *buffer1 = malloc(length);
        char *buffer2 = malloc(length);

        AudioBufferList audioBufferList;
        audioBufferList.mNumberBuffers = 1;

        while (success) {
            @autoreleasepool {
                audioBufferList.mBuffers[0].mNumberChannels = inputFormat.mChannelsPerFrame;
                audioBufferList.mBuffers[0].mDataByteSize = length;
                audioBufferList.mBuffers[0].mData = buffer1;
                UInt32 frames = length / inputFormat.mBytesPerFrame;
                err = ExtAudioFileRead(inAudioFileRef, &frames, &audioBufferList);
                success = (err == 0);
                if (success) {
                    if (frames == 0) break;
                    for (NSUInteger n = 0, ch = 0; n < wavURLs.count && success; n++, ch += channels) {
                        char *p = buffer1 + (ch * (inputFormat.mBytesPerFrame / inputFormat.mChannelsPerFrame));
                        char *q = buffer2;
                        for (int cnt = frames; cnt > 0; cnt--) {
                            memcpy(q, p, outputFormat.mBytesPerFrame);
                            p += inputFormat.mBytesPerFrame;
                            q += outputFormat.mBytesPerFrame;
                        }
                        audioBufferList.mBuffers[0].mNumberChannels = outputFormat.mChannelsPerFrame;
                        audioBufferList.mBuffers[0].mDataByteSize = frames * outputFormat.mBytesPerFrame;
                        audioBufferList.mBuffers[0].mData = buffer2;
                        err = ExtAudioFileWrite(outAudioFileRef[n], frames, &audioBufferList);
                        success = (err == 0);
                    }
                }
            }
        }

        free(buffer1);
        free(buffer2);
    }

    ExtAudioFileDispose(inAudioFileRef);
    for (NSUInteger n = 0; n < wavURLs.count; n++) {
        ExtAudioFileDispose(outAudioFileRef[n]);
    }

    if (!success) {
        for (NSUInteger n = 0; n < wavURLs.count; n++) {
            [[NSFileManager defaultManager] removeItemAtURL:[wavURLs objectAtIndex:n] error:nil];
        }
    }

    return success;
}

+ (BOOL)reverseAtURL:(NSURL *)inURL toURL:(NSURL *)wavURL
{
    ExtAudioFileRef inAudioFileRef = NULL;
    ExtAudioFileRef outAudioFileRef = NULL;

    AudioStreamBasicDescription clientFormat;

    NSString *tmpFile = nil;
    NSFileHandle *fh = nil;

    OSStatus err;
    BOOL success = YES;

    if (success) {
        err = ExtAudioFileOpenURL((CFURLRef)inURL, &inAudioFileRef);
        success = (err == 0);
    }
    if (success) {
        AudioStreamBasicDescription fileFormat;
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = ExtAudioFileGetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_FileDataFormat,
                                      &size,
                                      &fileFormat);
        success = (err == 0);
        if (success) {
            if (fileFormat.mFormatID == kAudioFormatLinearPCM) {
                clientFormat.mFormatID       = fileFormat.mFormatID;
                clientFormat.mFormatFlags    = fileFormat.mFormatFlags;
                clientFormat.mBitsPerChannel = fileFormat.mBitsPerChannel;
            } else {
                clientFormat.mFormatID       = kAudioFormatLinearPCM;
                clientFormat.mFormatFlags    = kLinearPCMFormatFlagIsSignedInteger
                                             | kLinearPCMFormatFlagIsPacked;
                clientFormat.mBitsPerChannel = 16; /* fixed */
            }
            clientFormat.mSampleRate        = fileFormat.mSampleRate;
            clientFormat.mChannelsPerFrame  = fileFormat.mChannelsPerFrame;
            clientFormat.mBytesPerPacket    = (clientFormat.mBitsPerChannel / 8) * clientFormat.mChannelsPerFrame;
            clientFormat.mBytesPerFrame     = (clientFormat.mBitsPerChannel / 8) * clientFormat.mChannelsPerFrame;
            clientFormat.mFramesPerPacket   = 1;
            clientFormat.mReserved          = 0;
        }
    }
    if (success) {
        err = ExtAudioFileSetProperty(inAudioFileRef,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &clientFormat);
        success = (err == 0);
    }

    if (success) {
        err = ExtAudioFileCreateWithURL((CFURLRef)wavURL,
                                        kAudioFileWAVEType,
                                        &clientFormat, 
                                        NULL,
                                        kAudioFileFlags_EraseFile, 
                                        &outAudioFileRef);
        success = (err == 0);
    }
    if (success) {
        err = ExtAudioFileSetProperty(outAudioFileRef,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &clientFormat);
        success = (err == 0);
    }

    if (success) {
        /* create unique temporary file for reversing frame data */
        NSString *template = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"___XXXXXX.tmp"]];
        const char *templateASCII = [template cStringUsingEncoding:NSASCIIStringEncoding];
        char *buf = calloc(strlen(templateASCII) + 1, 1);
        strcpy(buf, templateASCII);
        int fd = mkstemps(buf, 4);
        close(fd);
        tmpFile = [NSString stringWithCString:buf encoding:NSASCIIStringEncoding];
        free(buf);
        success = !(fd < 0);
    }

    if (success) {
        UInt32 length = clientFormat.mBytesPerFrame * 0x4000;
        char *buffer = malloc(length);

        AudioBufferList audioBufferList;
        audioBufferList.mNumberBuffers = 1;
        audioBufferList.mBuffers[0].mNumberChannels = clientFormat.mChannelsPerFrame;
        audioBufferList.mBuffers[0].mDataByteSize = length;
        audioBufferList.mBuffers[0].mData = buffer;

        fh = [NSFileHandle fileHandleForWritingToURL:[NSURL fileURLWithPath:tmpFile] error:nil];

        int offset = 0;
        while (success) {
            @autoreleasepool {
                UInt32 frames = length / clientFormat.mBytesPerFrame;
                audioBufferList.mBuffers[0].mDataByteSize = length;
                err = ExtAudioFileRead(inAudioFileRef, &frames, &audioBufferList);
                success = (err == 0);
                if (success) {
                    if (frames == 0) break;
                    int len = frames * clientFormat.mBytesPerFrame;
                    [fh writeData:[NSData dataWithBytes:buffer length:len]];
                    offset += len;
                }
            }
        }

        [fh closeFile];
        fh = [NSFileHandle fileHandleForReadingFromURL:[NSURL fileURLWithPath:tmpFile] error:nil];

        while (success && offset > 0) {
            @autoreleasepool {
                if (offset < length) {
                    length = offset;
                 }
                offset -= length;
                [fh seekToFileOffset:offset];
                NSData *data = [fh readDataOfLength:length];
                if (!data || ([data length] == 0)) break;
                /* reverse the buf1 data to buf2 */
                int len = (int)[data length];
                char* p = buffer;
                const char* q = [data bytes] + len - clientFormat.mBytesPerFrame;
                for ( ; len > 0; len -= clientFormat.mBytesPerFrame) {
                    memcpy(p, q, clientFormat.mBytesPerFrame);
                    p += clientFormat.mBytesPerFrame;
                    q -= clientFormat.mBytesPerFrame;
                }
                UInt32 frames = (UInt32)([data length] / clientFormat.mBytesPerFrame);
                audioBufferList.mBuffers[0].mDataByteSize = (UInt32)[data length];
                err = ExtAudioFileWrite(outAudioFileRef, frames, &audioBufferList);
                success = (err == 0);
            }
        }

        [fh closeFile];
        [[NSFileManager defaultManager] removeItemAtURL:[NSURL fileURLWithPath:tmpFile] error:nil];

        free(buffer);
    }

    ExtAudioFileDispose(inAudioFileRef);
    ExtAudioFileDispose(outAudioFileRef);

    if (!success) {
        [[NSFileManager defaultManager] removeItemAtURL:wavURL error:nil];
    }

    return success;
}

@end
