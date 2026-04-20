//
//  NetServiceDiscovery.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import "NetServiceDiscovery.h"
#import <sys/socket.h>
#import <netinet/in.h>
#import <arpa/inet.h>

#ifdef OLD_BONJOUR_API
@interface XNetServiceBrowser : NSNetServiceBrowser @end
#else
@interface XNetServiceBrowser : NetServiceBrowser @end
#endif
@implementation XNetServiceBrowser @end

@interface NetServiceDiscovery () {
    XNetServiceBrowser *_netServiceBrowser;
    NSMutableArray *_services;
    BOOL _searching;
}
@end

@implementation NetServiceDiscovery

- (id)init
{
    if (self = [super init]) {
        _services = [[NSMutableArray alloc] init];
        _netServiceBrowser = [[XNetServiceBrowser alloc] init];
        _netServiceBrowser.delegate = self;
    }
    return self;
}

- (void)dealloc
{
    [_netServiceBrowser release];
    [_services removeAllObjects];
    [_services release];

    [super dealloc];
}

- (BOOL)searchForServicesOfType:(NSString *)type
{
    if (_searching) return NO;

    _searching = YES;
    [_netServiceBrowser searchForServicesOfType:type inDomain:@"local."];
    return YES;
}

- (void)stop
{
    if (_searching) {
        [_netServiceBrowser stop];
    }
}

- (void)stopped:(DNSServiceErrorType)error
{
    [_services removeAllObjects];
    _searching = NO;

    if ([self.delegate respondsToSelector:@selector(netServiceDidStopSearch:)]) {
        [self.delegate netServiceDidStopSearch:error];
    }
}

- (void)netServiceBrowserDidStopSearch:(NSNetServiceBrowser *)browser
{
    [self stopped:0];
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser
             didNotSearch:(NSDictionary<NSString *,NSNumber *> *)errorDict
{
    [self stopped:[[errorDict objectForKey:NSNetServicesErrorCode] intValue]];
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser
           didFindService:(NSNetService *)service
               moreComing:(BOOL)moreComing
{
    [_services addObject:service];
    service.delegate = self;
    [service resolveWithTimeout:10.0f];
}

- (void)netServiceBrowser:(NSNetServiceBrowser *)browser
         didRemoveService:(NSNetService *)service
               moreComing:(BOOL)moreComing
{
    [_services removeObject:service];
    service.delegate = nil;

    if ([self.delegate respondsToSelector:@selector(netServiceDidRemoveService:)])
        [self.delegate netServiceDidRemoveService:[service name]];
}

- (void)netServiceDidResolveAddress:(NSNetService *)sender
{
    struct sockaddr_in addr;
    for (NSData *data in [sender addresses]) {
        if (data.length == sizeof(addr)) {
            [data getBytes:&addr length:sizeof(addr)];
            NSString *name = [sender name];
            NSString *address = @(inet_ntoa(addr.sin_addr));
            int port = (int)[sender port];
            if ([self.delegate respondsToSelector:@selector(netServiceDidResolve:address:port:)])
                [self.delegate netServiceDidResolve:name address:address port:port];
        }
    }
}

@end

@implementation NetServiceBrowser

static void browseReply(
    DNSServiceRef sdRef,
    DNSServiceFlags flags,
    uint32_t interfaceIndex,
    DNSServiceErrorType error,
    const char *name,
    const char *type,
    const char *domain,
    void *context)
{
    NetServiceBrowser *obj = (NetServiceBrowser *)context;

    if (error == kDNSServiceErr_NoError) {
        NetService *service = [[[NetService alloc] initWithServiceRef:obj.mainRef
                                                                 name:name
                                                                 type:type
                                                               domain:domain
                                                            interface:interfaceIndex] autorelease];
        if ((flags & kDNSServiceFlagsAdd) != 0) {
            [obj didFindService:service];
        } else {
            [obj didRemoveService:service];
        }
    } else {
        [obj didNotSearch:error];
    }
}

- (void)dealloc
{
    [self closeRef];

    [super dealloc];
}

- (void)closeRef
{
    if (_browseRef != NULL) {
        DNSServiceRefDeallocate(_browseRef);
        _browseRef = NULL;
    }
    if (_mainRef != NULL) {
        DNSServiceRefDeallocate(_mainRef);
        _mainRef = NULL;
    }
}

- (void)searchForServicesOfType:(NSString *)type inDomain:(NSString *)domain
{
    if (_mainRef) return; /* already searching. */

    DNSServiceErrorType error = DNSServiceCreateConnection(&_mainRef);

    if (error == kDNSServiceErr_NoError) {
        error = DNSServiceSetDispatchQueue(_mainRef, dispatch_get_main_queue());
    }

    if (error == kDNSServiceErr_NoError) {
        _browseRef = _mainRef;
        error = DNSServiceBrowse(&_browseRef,
                                 kDNSServiceFlagsShareConnection,
                                 kDNSServiceInterfaceIndexAny,
                                 [type UTF8String],
                                 [domain UTF8String],
                                 browseReply,
                                 self);
        if (error != kDNSServiceErr_NoError) {
            _browseRef = NULL;
        }
    }

    if (error != kDNSServiceErr_NoError) {
        [self didNotSearch:error];
    }
}

- (void)stop
{
    [self closeRef];

    if ([self.delegate respondsToSelector:@selector(netServiceBrowserDidStopSearch:)]) {
        [self.delegate netServiceBrowserDidStopSearch:(id)self];
    }
}

- (void)didNotSearch:(DNSServiceErrorType)error
{
   [self closeRef];

   if ([self.delegate respondsToSelector:@selector(netServiceBrowser:didNotSearch:)]) {
       [self.delegate netServiceBrowser:(id)self didNotSearch:@{
           NSNetServicesErrorCode: [NSNumber numberWithInteger:error]
       }];
   }
}

- (void)didFindService:(NetService *)service
{
    if ([self.delegate respondsToSelector:@selector(netServiceBrowser:didFindService:moreComing:)]) {
        [self.delegate netServiceBrowser:(id)self didFindService:(id)service moreComing:NO];
    }
}

- (void)didRemoveService:(NetService *)service
{
    if ([self.delegate respondsToSelector:@selector(netServiceBrowser:didRemoveService:moreComing:)]) {
        [self.delegate netServiceBrowser:(id)self didRemoveService:(id)service moreComing:NO];
    }
}

@end

@implementation NetService

static void resolveReply(
    DNSServiceRef sdRef,
    DNSServiceFlags flags,
    uint32_t interfaceIndex,
    DNSServiceErrorType error,
    const char *fullname,
    const char *hosttarget,
    uint16_t port,
    uint16_t txtLen,
    const unsigned char *txtRecord,
    void *context)
{
    NetService *obj = (NetService *)context;

    if (error != kDNSServiceErr_NoError) {
        [obj didNotResolve:error];
    } else if (flags == 0) {
        [obj didResolvePort:ntohs(port) target:(const char *)hosttarget];
    } else {
        /* flag == kDNSServiceFlagsMoreComing */
    }
}

static void getAddrInfoReply(
    DNSServiceRef sdRef,
    DNSServiceFlags flags,
    uint32_t interfaceIndex,
    DNSServiceErrorType error,
    const char *hostname,
    const struct sockaddr *address,
    uint32_t ttl,
    void *context)
{
    NetService *obj = (NetService *)context;

    if (error != kDNSServiceErr_NoError) {
        [obj didNotResolve:error];
    } else if ((flags & kDNSServiceFlagsAdd) != 0) {
        [obj didResolveAddress:address];
    }
}

- (id)initWithServiceRef:(DNSServiceRef)mainRef
                    name:(const char *)name
                    type:(const char *)type
                  domain:(const char *)domain
               interface:(uint32_t)interfaceIndex
{
    if (self = [super init]) {
        _mainRef = mainRef;
        _name = [[NSString alloc] initWithCString:name encoding:NSUTF8StringEncoding];
        _type = [[NSString alloc] initWithCString:type encoding:NSUTF8StringEncoding];
        _domain = [[NSString alloc] initWithCString:domain encoding:NSUTF8StringEncoding];
        _interfaceIndex = interfaceIndex;
    }
    return self;
}

- (void)dealloc
{
    if (_resolveRef != NULL) {
        DNSServiceRefDeallocate(_resolveRef);
    }
    if (_addressRef != NULL) {
        DNSServiceRefDeallocate(_addressRef);
    }

    [_name release];
    [_type release];
    [_domain release];
    [_addresses release];

    [super dealloc];
}

- (void)resolveWithTimeout:(NSTimeInterval)timeout
{
    if (_resolveRef != NULL) {
        DNSServiceRefDeallocate(_resolveRef);
    }

    _resolveRef = _mainRef;
    DNSServiceErrorType error = DNSServiceResolve(&_resolveRef,
                                                  kDNSServiceFlagsShareConnection,
                                                  self.interfaceIndex,
                                                  [self.name UTF8String],
                                                  [self.type UTF8String],
                                                  [self.domain UTF8String],
                                                  resolveReply,
                                                  self);
    if (error != kDNSServiceErr_NoError) {
        _resolveRef = NULL;
        [self didNotResolve:error];
    }
}

- (void)didResolvePort:(NSInteger)port target:(const char *)hosttarget
{
    _port = port;

    if (_addressRef != NULL) {
        DNSServiceRefDeallocate(_addressRef);
    }

    _addressRef = _mainRef;
    DNSServiceErrorType error = DNSServiceGetAddrInfo(&_addressRef,
                                                      kDNSServiceFlagsShareConnection,
                                                      self.interfaceIndex,
                                                      kDNSServiceProtocol_IPv4,
                                                      hosttarget,
                                                      getAddrInfoReply,
                                                      self);
    if (error != kDNSServiceErr_NoError) {
        _addressRef = NULL;
        [self didNotResolve:error];
    }
}

- (void)didResolveAddress:(const struct sockaddr *)address
{
    NSData *data = [NSData dataWithBytes:address length:address->sa_len];
    [_addresses release];
    _addresses = [[NSArray alloc] initWithObjects:data, nil];
    if ([self.delegate respondsToSelector:@selector(netServiceDidResolveAddress:)]) {
        [self.delegate netServiceDidResolveAddress:(id)self];
    }
}

- (void)didNotResolve:(DNSServiceErrorType)error
{
    NSLog(@"NetService didNotResolve:error = %d", error);
}

@end
