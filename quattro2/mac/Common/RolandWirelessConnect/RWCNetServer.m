//
//  RWCNetServer.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCNetServer.h"
#import <sys/socket.h>
#import <arpa/inet.h>

@interface RWCNetServer () {
    CFSocketRef _listeningSocket;
}
@end

@implementation RWCNetServer

@synthesize delegate = _delegate;
@synthesize portNo = _portNo;
@synthesize multiclient = _multiclient;
@synthesize clientAddress = _clientAddress;
@synthesize inputStream = _inputStream;
@synthesize outputStream = _outputStream;

- (id)initWithPortNo:(int)portNo
{
    if (self = [super init]) {
        _portNo = portNo;
    }
    return self;
}

- (void)dealloc
{
    [self stopServer];
    [super dealloc];
}

- (void)acceptConnection:(int)fd clientAddress:(NSData *)address
{
    CFReadStreamRef readStream;
    CFWriteStreamRef writeStream;

    assert(fd >= 0);

    if (self.multiclient) {

        RWCNetServer *session = [[RWCNetServer alloc] initWithPortNo:0];
        [session acceptConnection:fd clientAddress:address];
        session.delegate = self.delegate;

    } else {

        self.clientAddress = address;

        assert(self.inputStream == nil);
        assert(self.outputStream == nil);

        CFStreamCreatePairWithSocket(NULL, fd, &readStream, &writeStream);
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
        self.outputStream.delegate = self;
        [self.outputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        [self.outputStream open];

    }
}

- (void)stopConnection
{
    if (self.clientAddress != nil) {
        self.clientAddress = nil;
    }

    if (self.inputStream != nil) {
        [self.inputStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        self.inputStream.delegate = nil;
        [self.inputStream close];
        self.inputStream = nil;
    }
    if (self.outputStream != nil) {
        [self.outputStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        self.outputStream.delegate = nil;
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
            [self.delegate streamEventOpenCompleted:(RWCNetServer *)self];
            break;

        case NSStreamEventHasBytesAvailable:
            [self.delegate streamHasBytesAvailable:(RWCNetServer *)self stream:(NSInputStream *)aStream];
            break;

        case NSStreamEventHasSpaceAvailable:
            [self.delegate streamHasSpaceAvailable:(RWCNetServer *)self stream:(NSOutputStream *)aStream];
            break;

        case NSStreamEventErrorOccurred:
            [self stopConnection];
            [self.delegate streamErrorOccurred:(RWCNetServer *)self];
            break;

        case NSStreamEventEndEncountered:
            [self stopConnection];
            [self.delegate streamEndEncountered:(RWCNetServer *)self];
            break;
    }
}

static void AcceptCallback(CFSocketRef s, CFSocketCallBackType type, CFDataRef address, const void *data, void *info)
{
    RWCNetServer *obj;

    assert(type == kCFSocketAcceptCallBack);
    assert(data != NULL);

    obj = (RWCNetServer *)info;
    assert(obj != nil);

    [obj acceptConnection:*(int *)data clientAddress:(NSData *)address];
}

- (void)startServer
{
    BOOL success;
    int  err;
    int  fd;
    int  yes;
    int  junk;

    struct sockaddr_in addr;

    fd = socket(AF_INET, SOCK_STREAM, 0);
    success = (fd != -1);

    if (success) {
        yes = 1;
        err = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));
        success = (err == 0);
    }
    if (success) {
        memset(&addr, 0, sizeof(addr));
        addr.sin_len    = sizeof(addr);
        addr.sin_family = AF_INET;
        addr.sin_port   = htons(self.portNo);
        addr.sin_addr.s_addr = INADDR_ANY;
        err = bind(fd, (const struct sockaddr *) &addr, sizeof(addr));
        success = (err == 0);
    }
    if (success) {
        err = listen(fd, 5);
        success = (err == 0);
    }

    if (success) {
        socklen_t addrLen;
        addrLen = sizeof(addr);
        err = getsockname(fd, (struct sockaddr *) &addr, &addrLen);
        success = (err == 0);
        if (success) {
            assert(addrLen == sizeof(addr));
            self.portNo = ntohs(addr.sin_port);
        }
    }

    if (success) {
        CFSocketContext context = { 0, self, NULL, NULL, NULL };
        _listeningSocket = CFSocketCreateWithNative(
            NULL,
            fd,
            kCFSocketAcceptCallBack,
            AcceptCallback,
            &context
        );
        success = (_listeningSocket != NULL);
        if (success) {
            fd = -1; // _listeningSocket is now responsible for closing fd
            CFRelease(_listeningSocket);

            CFRunLoopSourceRef rls;
            rls = CFSocketCreateRunLoopSource(NULL, _listeningSocket, 0);
            assert(rls != NULL);
            CFRunLoopAddSource(CFRunLoopGetCurrent(), rls, kCFRunLoopDefaultMode);
            CFRelease(rls);
        }
    }

    // Clean up after failure.
    if (success) {
        assert(self.portNo != 0);
    } else {
        [self stopServer];
        if (fd != -1) {
            junk = close(fd);
            assert(junk == 0);
        }
    }
}

- (void)stopServer
{
    [self stopConnection];

    if (_listeningSocket != NULL) {
        CFSocketInvalidate(_listeningSocket);
        _listeningSocket = NULL;
    }
}

@end
