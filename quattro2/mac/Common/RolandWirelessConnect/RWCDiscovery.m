//
//  RWCDiscovery.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCProtocol.h"
#import "RWCDiscovery.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <ifaddrs.h>
#include <net/if.h>

static char *RWCDeviceDiscoveryHeader = "RDDPv1";

NSString *const RWCDeviceAddressKey      = @"RWCDeviceAddressKey";
NSString *const RWCDevicePortNoKey       = @"RWCDevicePortNoKey";
NSString *const RWCDeviceUIDKey          = @"RWCDeviceUIDKey";
NSString *const RWCDeviceCapsKey         = @"RWCDeviceCapsKey";
NSString *const RWCDeviceImageKey        = @"RWCDeviceImageKey";
NSString *const RWCDeviceStatusKey       = @"RWCDeviceStatusKey";
NSString *const RWCDeviceManufacturerKey = @"RWCDeviceManufacturerKey";
NSString *const RWCDeviceVersionKey      = @"RWCDeviceVersionKey";
NSString *const RWCDeviceNameKey         = @"RWCDeviceNameKey";

@interface RWCDiscovery () {
    NSMutableArray *_devices;
    RWCNetServer *_server;
}
- (void)addDevice:(NSDictionary *)device;
@end

@implementation RWCDiscovery

@synthesize delegate = _delegate;

- (id)init
{
    if (self = [super init]) {
        _devices = [[NSMutableArray alloc] init];
        _server = [[RWCNetServer alloc] initWithPortNo:0];
        _server.delegate = self;
        _server.multiclient = YES;
    }
    return self;
}

- (void)dealloc
{
    _server.delegate = nil;
    [_server release];
    [_devices release];
    [super dealloc];
}

- (void)search
{
    BOOL success;
    int  err;
    int  fd;
    int  yes;
    int  junk;

    struct sockaddr_in addr;
    struct ifaddrs *ifa_list;
    struct ifaddrs *ifa;

    [_server stopServer];

    [_devices removeAllObjects];

    [_server startServer];

    assert(_server.portNo != 0);

    RNP_DEV_DISCOVERY data;
    memcpy(data.header, RWCDeviceDiscoveryHeader, sizeof(data.header));
    data.port[0] = (unsigned char)(_server.portNo >> 8);
    data.port[1] = (unsigned char)(_server.portNo >> 0);

    fd = socket(AF_INET, SOCK_DGRAM, 0);
    success = (fd != -1);
    if (success) {
        yes = 1;
        err = setsockopt(fd, SOL_SOCKET, SO_BROADCAST, (char *)&yes, sizeof(yes));
        success = (err == 0);
    }

    if (success) {
        memset(&addr, 0, sizeof(addr));
        addr.sin_len    = sizeof(addr);
        addr.sin_family = AF_INET;
        addr.sin_port = htons(RWCDeviceDiscoveryPortNo);

        err = getifaddrs(&ifa_list);
        if (err != 0) {
            addr.sin_addr.s_addr = inet_addr("255.255.255.255");
            sendto(fd, &data, sizeof(data), 0, (struct sockaddr *)&addr, sizeof(addr));
        } else {
            for (ifa = ifa_list; ifa != NULL; ifa = ifa->ifa_next) {
                if ((ifa->ifa_addr->sa_family == AF_INET) &&
                    ((ifa->ifa_flags & IFF_LOOPBACK) == 0)) {
                    addr.sin_addr.s_addr = ((struct sockaddr_in *)ifa->ifa_addr)->sin_addr.s_addr;
                    addr.sin_addr.s_addr |= ~(((struct sockaddr_in *)ifa->ifa_netmask)->sin_addr.s_addr);
                    sendto(fd, &data, sizeof(data), 0, (struct sockaddr *)&addr, sizeof(addr));
                }
            }
            freeifaddrs(ifa_list);
        }
    }

    if (fd != -1) {
        junk = close(fd);
        assert(junk == 0);
    }
}

- (void)addDevice:(NSDictionary *)device
{
    for (NSDictionary *dev in _devices) {
        if ([[dev objectForKey:RWCDeviceUIDKey] isEqualToString:[device objectForKey:RWCDeviceUIDKey]])
            return;
    }

    [_devices addObject:device];

    if ([self.delegate respondsToSelector:@selector(discoveryDeviceDidFound:)])
        [self.delegate discoveryDeviceDidFound:device];
}

- (void)streamHasBytesAvailable:(RWCNetServer *)session stream:(NSInputStream *)istream;
{
    struct sockaddr_in *sockaddr = (struct sockaddr_in *)[session.clientAddress bytes];

    RNP_DEV_INFO info;
    int len = (int)[istream read:(u_int8_t *)&info maxLength:sizeof(info)];

    [session stopConnection];
    [session autorelease];

    if (len != sizeof(info))
        return;
    if (memcmp(info.header, RWCDeviceDiscoveryHeader, sizeof(info.header)))
        return;

    unsigned short port;
    unsigned int   serial;
    unsigned char  caps;
    unsigned char  image;
    unsigned char  status;

    port   = (info.port[0] << 8) | info.port[1];
    serial = (info.serial[0] << 24) | (info.serial[1] << 16) | (info.serial[2] <<  8) | info.serial[3];
    caps   = info.caps;
    image  = info.image;
    status = info.status;

    if (sockaddr->sin_addr.s_addr == 0 || port == 0)
        return;
    if (caps == 0)
        return;

    NSString *deviceAddress = [NSString stringWithCString:inet_ntoa(sockaddr->sin_addr)
                                                 encoding:NSASCIIStringEncoding];

    char buf[64];

    strncpy(buf, (char *)info.manufacturer, sizeof(info.manufacturer));
    buf[sizeof(info.manufacturer)] = '\0';
    NSString *manufacturer = [NSString stringWithCString:buf encoding:NSASCIIStringEncoding];

    strncpy(buf, (char *)info.productCode, sizeof(info.productCode));
    buf[sizeof(info.productCode)] = '\0';
    NSString *productCode = [NSString stringWithCString:buf encoding:NSASCIIStringEncoding];

    strncpy(buf, (char *)info.productVersion, sizeof(info.productVersion));
    buf[sizeof(info.productVersion)] = '\0';
    NSString *productVersion = [NSString stringWithCString:buf encoding:NSASCIIStringEncoding];

    strncpy(buf, (char *)info.name, sizeof(info.name));
    buf[sizeof(info.name)] = '\0';
    NSString *name = [NSString stringWithCString:buf encoding:NSASCIIStringEncoding];

    NSString *uid = [NSString stringWithFormat:@"%@-%08X", productCode, serial];
    
    NSDictionary *dict;
    dict = [NSDictionary dictionaryWithObjectsAndKeys:
            deviceAddress, RWCDeviceAddressKey,
            [NSNumber numberWithUnsignedShort: port], RWCDevicePortNoKey,
            uid, RWCDeviceUIDKey,
            [NSNumber numberWithUnsignedChar:  caps], RWCDeviceCapsKey,
            [NSNumber numberWithUnsignedChar: image], RWCDeviceImageKey,
            [NSNumber numberWithUnsignedChar:status], RWCDeviceStatusKey,
            manufacturer, RWCDeviceManufacturerKey,
            productVersion, RWCDeviceVersionKey,
            name, RWCDeviceNameKey,
            nil];

    [self addDevice:dict];
}

- (void)streamEventOpenCompleted:(RWCNetServer *)session { }

- (void)streamHasSpaceAvailable:(RWCNetServer *)session stream:(NSOutputStream *)ostream { }

- (void)streamErrorOccurred:(RWCNetServer *)session
{
    [session autorelease];
}

- (void)streamEndEncountered:(RWCNetServer *)session
{
    [session autorelease];
}

@end
