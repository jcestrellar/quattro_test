//
//  BLEMIDIConnectionManager.m
//
//  Copyright (c) 2018 Roland Corporation. All rights reserved.
//

#ifdef USE_VENDER_BLEMIDI

#import "BLEMIDIConnectionManager.h"
#import "BLEMIDIEndpoint.h"
#ifdef USE_BLEMIDI_SCANNER
#import "../../Common/JavascriptInterface/NativeCall.h"
#endif

static NSString *const kUUIDServiceCoreMIDIBLE = @"03b80e5a-ede8-4b33-a751-6ce34ec4c700";
static NSString *const kUUIDCharacteristicsCoreMIDIBLE = @"7772e5db-3868-4112-a1a9-f2669d106bf3";

#define TIMER_INTERVAL (11 * NSEC_PER_MSEC) /* connection interval is required 15(ms) or lower */

@interface BLEMIDIConnectionManager () {
    NSMutableArray *_connectedPeripherals;
    NSMutableArray *_discoveredPeripherals;
    dispatch_queue_t _queue;
    dispatch_source_t _timer;
    BOOL _timer_enabled;

    UITableView *_tableView;
    BOOL _scanning;
}
@property (nonatomic, retain) CBCentralManager *centralManager;
@property (nonatomic, assign) NSMutableDictionary *advertisingName;
@end

@implementation BLEMIDIConnectionManager

+ (BLEMIDIConnectionManager *)sharedInstance
{
    static BLEMIDIConnectionManager *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[self alloc] init];
    });
    return instance;
}

- (id)init
{
    if (self = [super init]) {
        _connectedPeripherals = [[NSMutableArray alloc] init];
        _discoveredPeripherals = [[NSMutableArray alloc] init];
        _advertisingName = [[NSMutableDictionary alloc] init];

        _queue = dispatch_queue_create("jp.co.roland.quattro.vender.blemidi", DISPATCH_QUEUE_SERIAL);
        _timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, DISPATCH_TIMER_STRICT, _queue);
        dispatch_source_set_timer(_timer, dispatch_time(DISPATCH_TIME_NOW, TIMER_INTERVAL), TIMER_INTERVAL, 0);
        BLEMIDIConnectionManager *_self = self;
        dispatch_source_set_event_handler(_timer, ^{ [_self dequeue]; });
    }
    return self;
}

- (void)dealloc
{
    /* never called */
    dispatch_source_cancel(_timer);

    self.centralManager = nil;
    dispatch_release(_queue);

    [_connectedPeripherals release];
    [_discoveredPeripherals release];
    [_advertisingName release];

    [super dealloc];
}

@synthesize devices = _discoveredPeripherals;

- (void)endpoints:(NSMutableArray *)_endpoints
{
    @synchronized(_connectedPeripherals) {
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            [_endpoints addObject:[NSDictionary dictionaryWithObjectsAndKeys:
                                   peripheral.name, MIDIDeviceNameKey,
                                   [peripheral.name stringByAppendingString:@" (Bluetooth)"], MIDIEntityNameKey,
                                   [peripheral.identifier UUIDString], MIDIEndpointUIDKey,
                                   [peripheral.identifier UUIDString], MIDIEndpointIndexKey,
                                   nil]];
        }
    }
}

- (BOOL)connectEndpoint:(id)port uuid:(NSString *)uuid
{
    @synchronized(_connectedPeripherals) {
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            if ([uuid isEqualToString:[peripheral.identifier UUIDString]]) {
                [(BLEMIDIEndpoint *)peripheral.delegate connectPort:port];
                return YES;
            }
        }
    }
    return NO;
}

- (void)connectAllEndpoints:(id)port
{
    @synchronized(_connectedPeripherals) {
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            [(BLEMIDIEndpoint *)peripheral.delegate connectPort:port];
        }
    }
}

- (BOOL)disconnectEndpoint:(id)port uuid:(NSString *)uuid
{
    @synchronized(_connectedPeripherals) {
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            if ([uuid isEqualToString:[peripheral.identifier UUIDString]]) {
                [(BLEMIDIEndpoint *)peripheral.delegate disconnectPort:port];
                return YES;
            }
        }
    }
    return NO;
}

- (void)disconnectAllEndpoints:(id)port
{
    @synchronized(_connectedPeripherals) {
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            [(BLEMIDIEndpoint *)peripheral.delegate disconnectPort:port];
        }
    }
}

- (void)send:(id)port data:(const u_int8_t *)data size:(int)datalen
{
    MIDIOutputPort *outputPort = (MIDIOutputPort *)port;

    u_int32_t msec = current_millis_timestamp();
    u_int8_t HEADER = (u_int8_t)(BLE_MIDI_HEADER | ((msec >> 7) & 0x3f));
    u_int8_t TIMESTAMP = (u_int8_t)(BLE_MIDI_TIMESTAMP | (msec & 0x7f));
    
    int buflen = 0;
    u_int8_t buf[BLE_MAX_DATA_SIZE];
    buf[buflen++] = HEADER;
    
    while (datalen > 0) {
        
        u_int8_t sts;
        if ((*data & 0x80) != 0) {
            sts = *data++; datalen--;
        } else {
            sts = outputPort.running;
        }
        
        int len = 0;
        switch (sts & 0xf0) {
            case 0x80: len = 3; outputPort.running = sts; break;
            case 0x90: len = 3; outputPort.running = sts; break;
            case 0xa0: len = 3; outputPort.running = sts; break;
            case 0xb0: len = 3; outputPort.running = sts; break;
            case 0xc0: len = 2; outputPort.running = sts; break;
            case 0xd0: len = 2; outputPort.running = sts; break;
            case 0xe0: len = 3; outputPort.running = sts; break;
            case 0xf0:
                switch (sts) {
                    case 0xf0: outputPort.running = 1; break;
                    case 0xf7: outputPort.running = 0; break;
                        
                    case 0xf1: len = 2; break;
                    case 0xf2: len = 3; break;
                    case 0xf3: len = 2; break;
                    case 0xf6: len = 1; break;
                        
                    case 0xf8:
                    case 0xfa:
                    case 0xfb:
                    case 0xfc:
                    case 0xfe:
                    case 0xff: len = 1; break;
                        
                    default: continue;
                }
                break;
        }
        
        if (len > 0) {
            
            if (buflen + len + 1 > BLE_MAX_DATA_SIZE) {
                [self enqueue:port packet:buf size:buflen];
                buflen = 0;
                buf[buflen++] = HEADER;
            }
            
            buf[buflen++] = TIMESTAMP;
            buf[buflen++] = sts;
            if (len > 1) { buf[buflen++] = *data++; datalen--; }
            if (len > 2) { buf[buflen++] = *data++; datalen--; }
            
        } else if ((sts == 0xf0) || (sts == 0xf7)) {
            
            if (buflen + 2 > BLE_MAX_DATA_SIZE) {
                [self enqueue:port packet:buf size:buflen];
                buflen = 0;
                buf[buflen++] = HEADER;
            }
            
            buf[buflen++] = TIMESTAMP;
            buf[buflen++] = sts;
            
        } else if (outputPort.running > 0) {
            
            if (buflen + 1 > BLE_MAX_DATA_SIZE) {
                [self enqueue:port packet:buf size:buflen];
                buflen = 0;
                buf[buflen++] = HEADER;
            }
            
            buf[buflen++] = *data++; datalen--;
            
        } else {
            
            data++; datalen--;
            
        }
        
    }
    
    if (buflen > 0) {
        [self enqueue:port packet:buf size:buflen];
    }
}

- (void)enqueue:(id)port packet:(const u_int8_t *)data size:(int)bytes
{
    @synchronized(_connectedPeripherals) {
        BOOL _timer_reqired = NO;
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            if ([(BLEMIDIEndpoint *)peripheral.delegate enqueue:port packet:data size:bytes]) {
                _timer_reqired = YES;
            }
        }
        if (_timer_reqired && !_timer_enabled) {
            _timer_enabled = YES;
            dispatch_resume(_timer);
        }
    }
}

- (void)dequeue
{
    @synchronized(_connectedPeripherals) {
        BOOL _more_timer = NO;
        for (CBPeripheral *peripheral in _connectedPeripherals) {
            if ([(BLEMIDIEndpoint *)peripheral.delegate dequeue:peripheral]) {
                _more_timer = YES;
            }
        }
        if (!_more_timer) {
            dispatch_suspend(_timer);
            _timer_enabled = NO;
        }
    }
}

- (void)startScan:(UITableView *)tableView
{
    [self stopScan];

    _tableView = tableView;
    _scanning = YES;

    if (!self.centralManager) {
        self.centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:_queue];
    } else if (self.centralManager.state == CBManagerStateUnauthorized) {
#ifdef USE_BLEMIDI_SCANNER
        NSString *event = [NSString stringWithFormat:@"%@\f%@", @"ble", @"unauthorized"];
        [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
#endif
    } else if (self.centralManager.state == CBManagerStatePoweredOff) {
        [[[CBCentralManager alloc] initWithDelegate:nil queue:nil] autorelease];
    } else if ((self.centralManager.state == CBManagerStatePoweredOn) && !self.centralManager.isScanning) {
        [_discoveredPeripherals removeAllObjects];
        [_advertisingName removeAllObjects];
        @synchronized(_connectedPeripherals) {
            for (CBPeripheral *peripheral in _connectedPeripherals) {
                [_discoveredPeripherals addObject:peripheral];
            }
        }
		NSArray *services = [NSArray arrayWithObjects:[CBUUID UUIDWithString:kUUIDServiceCoreMIDIBLE], nil];
		NSArray *peripherals = [self.centralManager retrieveConnectedPeripheralsWithServices:services];
		for (CBPeripheral *peripheral in peripherals) {
			if ([_discoveredPeripherals indexOfObject:peripheral] == NSNotFound) {
				[_discoveredPeripherals addObject:peripheral];
			}
		}
		NSDictionary *options = [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:NO]
															forKey:CBCentralManagerScanOptionAllowDuplicatesKey];
        [self.centralManager scanForPeripheralsWithServices:services options:options];
        dispatch_async(dispatch_get_main_queue(), ^{
            [_tableView reloadData];
        });
    }
}

- (void)tapAtIndex:(NSInteger)index
{
    if (index < _discoveredPeripherals.count) {
        CBPeripheral *peripheral = [_discoveredPeripherals objectAtIndex:index];
        if (peripheral.state == CBPeripheralStateDisconnected) {
            peripheral.delegate = self;
            [self.centralManager connectPeripheral:peripheral options:nil];
        } else {
            [self.centralManager cancelPeripheralConnection:peripheral];
        }
        dispatch_async(dispatch_get_main_queue(), ^{
            [_tableView reloadData];
        });
    }
}

- (void)stopScan
{
    _scanning = NO;
    [self.centralManager stopScan];

#ifndef USE_BLEMIDI_SCANNER
    [_discoveredPeripherals removeAllObjects];
	[_advDataLocalName removeAllObjects];
    _tableView = nil;
#endif
}

#pragma mark - CBCentralManagerDelegate

- (void)centralManagerDidUpdateState:(CBCentralManager *)central
{
    if (central.state == CBManagerStatePoweredOff || central.state == CBManagerStateResetting) {
        BOOL needsNotification = NO;
        @synchronized(_connectedPeripherals) {
            needsNotification = (_connectedPeripherals.count > 0);
            for (CBPeripheral *peripheral in _connectedPeripherals) {
                [(BLEMIDIEndpoint *)peripheral.delegate release];
                peripheral.delegate = nil;
            }
            [_connectedPeripherals removeAllObjects];
        }
        if (needsNotification) {
            [[NSNotificationCenter defaultCenter] postNotificationName:@"BLEMIDIObjectRemoveNotification" object:nil userInfo:nil];
        }

        [_discoveredPeripherals removeAllObjects];
        [_advertisingName removeAllObjects];
        if (_tableView) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [_tableView reloadData];
            });
        }
    } else if (central.state == CBManagerStatePoweredOn) {
        if (_scanning) {
            [self startScan:_tableView];
        }
	} else if (central.state == CBManagerStateUnauthorized) {
        [self startScan:nil];
    }
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI
{
    NSString *name = [advertisementData objectForKey:@"kCBAdvDataLocalName"];
    if (name) {
        [_advertisingName setObject:name forKey:[peripheral.identifier UUIDString]];
    }
    if ([_discoveredPeripherals indexOfObject:peripheral] == NSNotFound) {
        [_discoveredPeripherals addObject:peripheral];
    }
    dispatch_async(dispatch_get_main_queue(), ^{
        [_tableView reloadData];
    });
}

- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    peripheral.delegate = nil;

    dispatch_async(dispatch_get_main_queue(), ^{
        [_tableView reloadData];
    });
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    @synchronized(_connectedPeripherals) {
        [_connectedPeripherals removeObject:peripheral];
    }

    if (peripheral.delegate && (peripheral.delegate != self)) {
        [(BLEMIDIEndpoint *)peripheral.delegate release];
        [[NSNotificationCenter defaultCenter] postNotificationName:@"BLEMIDIObjectRemoveNotification" object:nil userInfo:nil];
    }
    peripheral.delegate = nil;

    if (_tableView) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [_tableView reloadData];
        });
    }
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
    NSArray *services = [NSArray arrayWithObjects:[CBUUID UUIDWithString:kUUIDServiceCoreMIDIBLE], nil];
    [peripheral discoverServices:services];
}

#pragma mark - CBPeripheralDelegate

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error
{
    if (error || (peripheral.services.count == 0)) {
        [self.centralManager cancelPeripheralConnection:peripheral];
        dispatch_async(dispatch_get_main_queue(), ^{
            [_tableView reloadData];
        });
        return;
    }
    
    for (CBService *service in peripheral.services) {
        if ([service.UUID isEqual:[CBUUID UUIDWithString:kUUIDServiceCoreMIDIBLE]]) {
            [peripheral discoverCharacteristics:[NSArray arrayWithObjects:[CBUUID UUIDWithString:kUUIDCharacteristicsCoreMIDIBLE], nil] forService:service];
        }
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error
{
    if (error || (service.characteristics.count == 0)) {
        [self.centralManager cancelPeripheralConnection:peripheral];
        dispatch_async(dispatch_get_main_queue(), ^{
            [_tableView reloadData];
        });
        return;
    }
    
    for (CBCharacteristic *characteristic in service.characteristics) {
        if ([characteristic.UUID isEqual:[CBUUID UUIDWithString:kUUIDCharacteristicsCoreMIDIBLE]]) {
            [peripheral readValueForCharacteristic:characteristic];
        }
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    if (error) {
        [self.centralManager cancelPeripheralConnection:peripheral];
    } else {
        peripheral.delegate = [[BLEMIDIEndpoint alloc] initWithCharacteristic:characteristic];
        [peripheral setNotifyValue:YES forCharacteristic:characteristic];
        @synchronized(_connectedPeripherals) {
            [_connectedPeripherals addObject:peripheral];
        }
        id manager = nil;
#ifdef SUPPORT_NRF51882
        /* needs "CoreAudioKit.framwwork" */
        @try {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wobjc-method-access"
            manager = [[NSClassFromString(@"AMSBTLEConnectionManager") alloc] initWithUIController:self];
#pragma clang diagnostic pop
        } @catch (...) {}
        if (manager) {
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{

                NSDate *t0 = [NSDate date];
                while ([t0 timeIntervalSinceNow] > -3) {
                    SEL selector = NSSelectorFromString(@"checkAlreadyConnectedPeripherals");
                    if ([manager respondsToSelector:selector]) {
                        [manager performSelector:selector withObject:nil];
                    }
                    selector = NSSelectorFromString(@"amsPeripheralForCBPeripheral:");
                    if ([manager respondsToSelector:selector]) {
                        id amsperipherals = [manager performSelector:selector withObject:peripheral];
                        if (!amsperipherals) continue;
                        selector = NSSelectorFromString(@"connect");
                        if ([amsperipherals respondsToSelector:selector]) {
                            [amsperipherals performSelector:selector withObject:nil];
                        }
                    }
                    break;
                }
                [manager release];

                [[NSNotificationCenter defaultCenter] postNotificationName:@"BLEMIDIObjectAddNotification" object:nil userInfo:nil];
            });
        }
#endif
        if (!manager) {
            [[NSNotificationCenter defaultCenter] postNotificationName:@"BLEMIDIObjectAddNotification" object:nil userInfo:nil];
        }
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [_tableView reloadData];
    });
}

#ifdef SUPPORT_NRF51882
#pragma mark - @protocol BTLEConnectionTable for AMSBTLEConnectionManager
-(void)updatePeripheralTable {}
-(void)setUIEnabled:(bool)arg1 {}
#endif

@end

@implementation CBPeripheral (BLEMIDIConnectionManager)

- (NSString *)advertisingName
{
    NSDictionary *dict = [[BLEMIDIConnectionManager sharedInstance] advertisingName];
    NSString *name = [dict objectForKey:[self.identifier UUIDString]];
    return name ? name : self.name;
}

@end

#endif /* USE_VENDER_BLEMIDI */
