//
//  TCPIPClient.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import "TCPIPClient.h"
#import <sys/socket.h>
#import <netinet/in.h>
#import <arpa/inet.h>

#define INVALID_SOCKET  (-1)
#define READ_BUFSIZ     0x20000

@interface TCPIPClient () {
    int _fd;
    NSThread* _thread;
}
@end

@implementation TCPIPClient

@synthesize nativeSocket = _fd;

- (id)init
{
	if (self = [super init]) {
        _fd = INVALID_SOCKET;
    }
	return self;
}

- (void)dealloc
{
    [_thread release];

    [super dealloc];
}

- (BOOL)connect:(NSString *)address port:(int)port
{
    if (_fd != INVALID_SOCKET) return false;

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_len = sizeof(addr);
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr([address UTF8String]);
    addr.sin_port = htons(port);
    int fd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (connect(fd, (struct sockaddr*)&addr, sizeof(addr)) != 0) {
        close(fd);
        return false;
    }
    _fd = fd;
    return true;
}

- (void)start
{
    if (!_thread) {
        _thread = [[NSThread alloc] initWithTarget:self selector:@selector(recv:) object:nil];
        [_thread start];
    }
}

- (void)close
{
    if (_fd != INVALID_SOCKET) {
        int fd = _fd;
        _fd = INVALID_SOCKET;
        close(fd);
    }
}

- (int)send:(const void *)buf size:(int)len
{
    return (int)write(_fd, buf, len);
}

- (void)recv:(id)userInfo
{
    u_int8_t *buf = malloc(READ_BUFSIZ);
    while (1) {
        @autoreleasepool {
            int n = (int)read(_fd, buf, READ_BUFSIZ);
            if (n > 0) {
                [self.delegate received:buf size:n];
            } else {
                break;
            }
        }
    }
    free(buf);

    if ([self.delegate closed]) {
        [_delegate release];
    }
    self.delegate = nil;

    [self close];
}

@end
