//
//  NetServiceDiscovery.h
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <dns_sd.h>

@protocol NetServiceDiscoveryDelegate <NSObject>

@optional
- (void)netServiceDidResolve:(NSString *)name address:(NSString *)address port:(int)port;
- (void)netServiceDidRemoveService:(NSString *)name;
- (void)netServiceDidStopSearch:(DNSServiceErrorType)error;

@end

@interface NetServiceDiscovery : NSObject <NSNetServiceBrowserDelegate, NSNetServiceDelegate>

@property (assign) id<NetServiceDiscoveryDelegate> delegate;

- (BOOL)searchForServicesOfType:(NSString *)type;
- (void)stop;

@end

@interface NetServiceBrowser : NSObject {
    DNSServiceRef _browseRef;
}
@property (assign) id<NSNetServiceBrowserDelegate> delegate;
@property (assign, readonly) DNSServiceRef mainRef;
- (void)searchForServicesOfType:(NSString *)type inDomain:(NSString *)domain;
- (void)stop;
@end

@interface NetService : NSObject {
    DNSServiceRef _mainRef;
    DNSServiceRef _resolveRef;
    DNSServiceRef _addressRef;
}
@property (assign) id<NSNetServiceDelegate> delegate;
@property(retain, readonly) NSString *name;
@property(retain, readonly) NSString *type;
@property(retain, readonly) NSString *domain;
@property(assign, readonly) uint32_t interfaceIndex;
@property(assign, readonly) NSInteger port;
@property(retain, readonly) NSArray<NSData *> *addresses;
- (id)initWithServiceRef:(DNSServiceRef)mainRef
                    name:(const char *)name
                    type:(const char *)type
                  domain:(const char *)domain
               interface:(uint32_t)interfaceIndex;
- (void)resolveWithTimeout:(NSTimeInterval)timeout;
@end
