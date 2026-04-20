//
//  NativeCall+netservice.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"netservice";

@interface NativeCall (netservice) <NetServiceDiscoveryDelegate> @end

@implementation NativeCall (netservice)

- (NSString *)$$netservice_search:(NSString *)param1 :(NSString *)param2
{
    if (!netservice) {
        netservice = [[NetServiceDiscovery alloc] init];
        netservice.delegate = self;
    }
    return_b([netservice searchForServicesOfType:param1]);
}

- (NSString *)$$netservice_stop:(NSString *)param1 :(NSString *)param2
{
    [netservice stop];
    undefined;
}

- (void)netServiceDidResolve:(NSString *)name address:(NSString *)address port:(int)port
{
    NSDictionary *dict = @{
                           @"name": name,
                           @"address": address,
                           @"port":[NSNumber numberWithInt:port]
                           };

    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"resolved", JSONStringWithObject(dict)];
    [self postEvent:event];
}

- (void)netServiceDidRemoveService:(NSString *)name
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"lost", name];
    [self postEvent:event];
}

- (void)netServiceDidStopSearch:(DNSServiceErrorType)error
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"stopped", error ? [NSString stringWithFormat:@"%d", error] : @""];
    [self postEvent:event];
}

@end
