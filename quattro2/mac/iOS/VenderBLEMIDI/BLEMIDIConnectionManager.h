//
//  BLEMIDIConnectionManager.h
//
//  Copyright (c) 2018 Roland Corporation. All rights reserved.
//

#ifdef USE_VENDER_BLEMIDI

#import <UIKit/UIKit.h>
#import <CoreBluetooth/CoreBluetooth.h>

@interface CBPeripheral (BLEMIDIConnectionManager)
@property (readonly) NSString *advertisingName;
@end

@interface BLEMIDIConnectionManager : NSObject <CBCentralManagerDelegate, CBPeripheralDelegate>

@property (readonly) NSArray *devices;

+ (BLEMIDIConnectionManager *)sharedInstance;

- (void)endpoints:(NSMutableArray *)_endpoints;
- (BOOL)connectEndpoint:(id)port uuid:(NSString *)uuid;
- (void)connectAllEndpoints:(id)port;
- (BOOL)disconnectEndpoint:(id)port uuid:(NSString *)uuid;
- (void)disconnectAllEndpoints:(id)port;
- (void)send:(id)port data:(const u_int8_t *)data size:(int)datalen;

- (void)startScan:(UITableView *)tableView;
- (void)tapAtIndex:(NSInteger)index;
- (void)stopScan;

@end

#endif /* USE_VENDER_BLEMIDI */
