//
//  RWCNetClient.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCNetClient.h"
#import "RWCProtocol.h"
#import <sys/socket.h>
#import <arpa/inet.h>

@interface RWCKeepAliveThread : NSObject {
    BOOL stop;
    RWCNetClient *client;
}
- (void)kill;
- (void)run:(RWCNetClient *)client;
@end

@interface RWCNetClient () {

    enum TCPStatus {
        kTCP_Closed,
        kTCP_Opening,
        kTCP_Connecting
    };
    enum TCPStatus _status;

    NSTimer *_timer;
    RWCKeepAliveThread *_keepAlive;
    int _checkCounter;
}

- (void)connectTimeoutExpired;
- (void)startTimer;
- (void)stopTimer;
- (void)checkConnection:(NSTimer *)_timer;

@end

@implementation RWCNetClient

@synthesize delegate = _delegate;
@synthesize inputStream = _inputStream;
@synthesize outputStream = _outputStream;
@synthesize connectTimeout = _connectTimeout;
@synthesize keepAliveTimeout = _keepAliveTimeout;

- (id)init
{
    if (self = [super init]) {
        _status = kTCP_Closed;
        _connectTimeout = kDefaultConnectTimeout;
        _keepAliveTimeout = kDefaultKeepAliveTimeout;
    }
    return self;
}

- (void)dealloc
{
    @synchronized(self) {

        [_keepAlive kill];
        [_keepAlive release];
    
        [self stopConnection];
        [super dealloc];

    }
}

- (void)connectToServer:(NSString *)url portNo:(UInt32)port
{
    CFReadStreamRef readStream;
    CFWriteStreamRef writeStream;

    assert(self.inputStream == nil);
    assert(self.outputStream == nil);

    CFStreamCreatePairWithSocketToHost(kCFAllocatorDefault, (CFStringRef)url, port, &readStream, &writeStream);
    assert(readStream != NULL);
    assert(writeStream != NULL);

    self.inputStream = (NSInputStream *)readStream;
    self.outputStream = (NSOutputStream *)writeStream;

    CFRelease(readStream);
    CFRelease(writeStream);

    [self.inputStream setProperty:(id)kCFBooleanTrue forKey:(NSString *)kCFStreamPropertyShouldCloseNativeSocket];
    self.inputStream.delegate = self;
    [self.inputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
    [self.inputStream open];

    [self.outputStream setProperty:(id)kCFBooleanTrue forKey:(NSString *)kCFStreamPropertyShouldCloseNativeSocket];
    [self.outputStream open];
        
    _status = kTCP_Opening;

    [self performSelector:@selector(connectTimeoutExpired) withObject:nil afterDelay:self.connectTimeout];
}

- (void)connectTimeoutExpired
{
    if (_status == kTCP_Opening) {
        [self stopConnection];
        [self.delegate streamOpenFailed];
    }
}

- (void)stopConnection
{
    [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(connectTimeoutExpired) object:nil];
    [self stopTimer];

    [_keepAlive kill];
    [_keepAlive release];
    _keepAlive = nil;
    
    _status = kTCP_Closed;

    if (self.inputStream != nil) {
        [self.inputStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        self.inputStream.delegate = nil;
        [self.inputStream close];
        self.inputStream = nil;
    }

    if (self.outputStream != nil) {
        [self.outputStream close];
         self.outputStream = nil;
    }
}

- (void)stream:(NSStream *)aStream handleEvent:(NSStreamEvent)eventCode
{
    switch (eventCode) {
        case NSStreamEventNone:
            break;

        case NSStreamEventOpenCompleted:
            _status = kTCP_Connecting;
            if (_keepAlive == nil) {
                _keepAlive = [[RWCKeepAliveThread alloc] init];
                [_keepAlive performSelectorInBackground:@selector(run:) withObject:self];
            }
            [self.delegate streamOpenCompleted];
            [self startTimer];
            break;

        case NSStreamEventHasBytesAvailable:
            _checkCounter = 0;
            [self.delegate streamHasBytesAvailable:(NSInputStream *)aStream];
            break;

        case NSStreamEventHasSpaceAvailable:
            break;

        case NSStreamEventErrorOccurred:
            [self stopConnection];
            [self.delegate streamErrorOccurred];
            break;

        case NSStreamEventEndEncountered:
            [self stopConnection];
            [self.delegate streamEndEncountered];
            break;
    }
}

- (NSInteger)read:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    u_int8_t *bufptr = buffer;
    NSInteger bytes;

    while (length > 0) {
        bytes = [self.inputStream read:bufptr maxLength:length];
        if (bytes <= 0) {
            return bytes;
        }
        length -= bytes;
        bufptr += bytes;
    }

    return bufptr - buffer;
}

- (NSInteger)write:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    u_int8_t *bufptr = buffer;
    NSInteger written;

    @synchronized(self) {

        while (length > 0) {
            written = [self.outputStream write:bufptr maxLength:length];
            if (written <= 0) {
                return written;
            }
            length -= written;
            bufptr += written;
        }
    }
    
    return bufptr - buffer;
}

- (void)startTimer
{
    _timer = [NSTimer scheduledTimerWithTimeInterval:1.0
                                             target:self
                                           selector:@selector(checkConnection:)
                                           userInfo:nil
                                            repeats:YES];
    _checkCounter = 0;
}

- (void)stopTimer
{
    [_timer invalidate];
    _timer = nil;
}

- (void)checkConnection:(NSTimer *)timer
{
    if ((_status == kTCP_Connecting) && (self.keepAliveTimeout > 0)) {
        if (++_checkCounter > self.keepAliveTimeout) {
            [self stopConnection];
            [self.delegate streamEndEncountered];
        }
    }
}

@end

@implementation RWCKeepAliveThread

- (void)kill
{
    stop = YES;
}

- (void)sendKeepAlive
{
    if (client.keepAliveTimeout > 0) {
        
        RNP_HEADER header;
        header.type    = RNP_TYPE_KEEP_ALIVE;
        header.subtype = RNP_SUBTYPE_0;
        header.size[0] = 0;
        header.size[1] = 0;
        
        [client write:(u_int8_t *)&header maxLength:sizeof(RNP_HEADER)];
    }
}

- (void)run:(RWCNetClient *)_client;
{
    client = _client;
    
    NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

    while (!stop) {
        
        NSAutoreleasePool *poolInLoop = [[NSAutoreleasePool alloc] init];
        
        [NSThread sleepForTimeInterval:1.0];

        @synchronized(client) {
            [self sendKeepAlive];
        }

        [poolInLoop release];
    }
    
    [pool release];
}

@end
