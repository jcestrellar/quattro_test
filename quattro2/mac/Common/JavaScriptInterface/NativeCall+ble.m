//
//  NativeCall+ble.m
//
//  Copyright 2020 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"ble";

static NSString *const BLEPeripheralKey     = @"BLEPeripheralKey";
static NSString *const BLEServiceKey        = @"BLEServiceKey";
static NSString *const BLECharacteristicKey = @"BLECharacteristicKey";

@implementation BLECentralManager

- (id)init
{
    if (self = [super init]) {
		_queue = dispatch_queue_create("jp.co.roland.quattro.ble.central.manager", DISPATCH_QUEUE_SERIAL);
		self.peripherals = [[NSMutableArray alloc] init];
        self.targetService = [[NSMutableDictionary alloc] init];

    }
    return self;
}

- (void)dealloc
{
    self.centralManager.delegate = nil;
    [self disconnect:nil];

	self.peripherals = nil;
	self.centralManager = nil;
	dispatch_release(_queue);
    self._services = nil;
    
	self.targetService = nil;

    [super dealloc];
}

- (void)scanForPeripheralsWithServices:(NSArray *)services
{
    self._services = nil;
    
    if (!services) {
        /* skip */
    } else if (!self.centralManager) {
        self._services = services;
        self.centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:_queue];
    } else if (self.centralManager.state == CBManagerStateUnauthorized) {
        NSString *event = [NSString stringWithFormat:@"%@\f%@", OBJ_NAME, @"unauthorized"];
        [self.native postEvent:event];
    } else if (self.centralManager.state == CBManagerStatePoweredOff) {
        self._services = services;
        [[[CBCentralManager alloc] initWithDelegate:nil queue:nil] autorelease];
    } else if ((self.centralManager.state == CBManagerStatePoweredOn) && !self.centralManager.isScanning) {
        NSDictionary *options = [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:YES]
                                                            forKey:CBCentralManagerScanOptionAllowDuplicatesKey];
        [self.centralManager scanForPeripheralsWithServices:services options:options];
    }
}

- (void)stopScan
{
    if ((self.centralManager.state == CBManagerStatePoweredOn) && self.centralManager.isScanning) {
		[self.centralManager stopScan];
	}
    self._services = nil;
}

- (void)connect:(NSUUID *)identifier
{
    NSArray *peripherals = [self.centralManager retrievePeripheralsWithIdentifiers:[NSArray arrayWithObjects:identifier, nil]];
    if (peripherals && peripherals.count > 0) {
        CBPeripheral *peripheral = [peripherals objectAtIndex:0];
        @synchronized(self.peripherals) {
            if ([self.peripherals indexOfObject:peripheral] == NSNotFound) {
                [self.peripherals addObject:peripheral];
                [self.centralManager connectPeripheral:peripheral options:nil];
            }
        }
    }
}

- (void)disconnect:(NSUUID *)identifier
{
    @synchronized(self.peripherals) {
        for (CBPeripheral *peripheral in self.peripherals) {
            if (identifier && ![identifier isEqual:peripheral.identifier]) continue;
            if (peripheral.state != CBPeripheralStateDisconnected) {
                [self.centralManager cancelPeripheralConnection:peripheral];
            }
        }
    }
}

- (void)discover:(NSUUID *)identifier forService:(NSString *)serviceUUID
{
    @synchronized(self.peripherals) {
		for (CBPeripheral *peripheral in self.peripherals) {
			if ([identifier isEqual:peripheral.identifier]) {
				CBUUID *uuid = [CBUUID UUIDWithString:serviceUUID];
				[self.targetService setObject:uuid forKey:identifier.UUIDString];
				[peripheral discoverServices:[NSArray arrayWithObjects:uuid, nil]];
				return;
			}
		}
	}
}

- (CBCharacteristic *)characteristicWithDictionary:(NSDictionary *)dict
{
    if ([dict[BLEPeripheralKey] isEqual:[NSNull null]] ||
        [dict[BLEServiceKey] isEqual:[NSNull null]] ||
        [dict[BLECharacteristicKey] isEqual:[NSNull null]]) {
        return nil;
    }

    NSUUID *identifier = [[[NSUUID alloc] initWithUUIDString:dict[BLEPeripheralKey]] autorelease];
	CBUUID *serviceUUID = [CBUUID UUIDWithString:dict[BLEServiceKey]];
	CBUUID *characteristicUUID = [CBUUID UUIDWithString:dict[BLECharacteristicKey]];

	for (CBPeripheral *peripheral in self.peripherals) {
		if ([identifier isEqual:peripheral.identifier] && (peripheral.state == CBPeripheralStateConnected)) {
			for (CBService *service in peripheral.services) {
				if ([service.UUID isEqual:serviceUUID]) {
					for (CBCharacteristic *characteristic in service.characteristics) {
						if ([characteristic.UUID isEqual:characteristicUUID]) {
							return characteristic;
						}
					}
					break;
				}
			}
			break;
		}
	}

	return nil;
}

- (NSString *)getProperties:(NSDictionary *)ep
{
    @synchronized(self.peripherals) {
        CBCharacteristic *characteristic = [self characteristicWithDictionary:ep];
        if (characteristic) {
            NSDictionary *dict = @{
                @"broadcast":
                    (characteristic.properties & CBCharacteristicPropertyBroadcast) ? @YES : @NO,
                @"read":
                    (characteristic.properties & CBCharacteristicPropertyRead) ? @YES : @NO,
                @"writeWithoutResponse":
                    (characteristic.properties & CBCharacteristicPropertyWriteWithoutResponse) ? @YES : @NO,
                @"write":
                    (characteristic.properties & CBCharacteristicPropertyWrite) ? @YES : @NO,
                @"notify":
                    (characteristic.properties & CBCharacteristicPropertyNotify) ? @YES : @NO,
                @"indicate":
                    (characteristic.properties & CBCharacteristicPropertyIndicate) ? @YES : @NO
            };
            return JSONStringWithObject(dict);
        }
    }
    return @"{}";
}

- (void)setNotify:(BOOL)enabled forCharacteristic:(NSDictionary *)ep
{
	@synchronized(self.peripherals) {
		CBCharacteristic *characteristic = [self characteristicWithDictionary:ep];
		if (characteristic) {
			[characteristic.service.peripheral setNotifyValue:enabled forCharacteristic:characteristic];
		}
	}
}

- (void)readCharacteristic:(NSDictionary *)ep
{
	@synchronized(self.peripherals) {
		CBCharacteristic *characteristic = [self characteristicWithDictionary:ep];
		if (characteristic) {
			[characteristic.service.peripheral readValueForCharacteristic:characteristic];
		}
	}
}

- (void)writeCharacteristic:(NSDictionary *)ep data:(NSData *)data type:(CBCharacteristicWriteType)type
{
	@synchronized(self.peripherals) {
		CBCharacteristic *characteristic = [self characteristicWithDictionary:ep];
		if (characteristic) {
			[characteristic.service.peripheral writeValue:data forCharacteristic:characteristic type:type];
		}
	}
}

#pragma mark - CBCentralManagerDelegate

- (void)centralManagerDidUpdateState:(CBCentralManager *)central
{
	if (central.state == CBManagerStatePoweredOff || central.state == CBManagerStateResetting) {
        @synchronized(self.peripherals) {
            for (CBPeripheral *peripheral in self.peripherals) {
                NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"disconnected", peripheral.identifier.UUIDString, peripheral.name];
                [self.native postEvent:event];
            }
            [self.peripherals removeAllObjects];
        }
    } else if (central.state == CBManagerStatePoweredOn && self._services) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.5 * NSEC_PER_SEC), _queue, ^{
            [self scanForPeripheralsWithServices:self._services];
        });
    } else if (central.state == CBManagerStateUnauthorized) {
        [self scanForPeripheralsWithServices:self._services];
    }
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary<NSString *,id> *)advertisementData RSSI:(NSNumber *)RSSI
{
    NSString *name = [advertisementData objectForKey:@"kCBAdvDataLocalName"];
    if (!name) { name = peripheral.name; }
    if (name) {
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@\f%d", OBJ_NAME, @"found", peripheral.identifier.UUIDString, name, [RSSI intValue]];
        [self.native postEvent:event];
    }
}

- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    @synchronized(self.peripherals) {
        [self.peripherals removeObject:peripheral];
    }

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"connectfailed", peripheral.identifier.UUIDString, peripheral.name];
	[self.native postEvent:event];
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
    peripheral.delegate = self;

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"connected", peripheral.identifier.UUIDString, peripheral.name];
	[self.native postEvent:event];
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
    @synchronized(self.peripherals) {
        [self.peripherals removeObject:peripheral];
    }
    peripheral.delegate = nil;
    
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"disconnected", peripheral.identifier.UUIDString, peripheral.name];
	[self.native postEvent:event];
}

#pragma mark - CBPeripheralDelegate

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error
{
	if (error) {
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"discoverfailed", peripheral.identifier.UUIDString, error.localizedDescription];
		[self.native postEvent:event];
		return;
	}

	NSString *uuid = [self.targetService valueForKey:peripheral.identifier.UUIDString];

	for (CBService *service in peripheral.services) {
		if ([service.UUID isEqual:uuid]) {
			[peripheral discoverCharacteristics:nil forService:service];
			return;
		}
	}

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f0", OBJ_NAME, @"discoverfailed", peripheral.identifier.UUIDString];
	[self.native postEvent:event];
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error
{
	if (error) {
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"discoverfailed", peripheral.identifier.UUIDString, error.localizedDescription];
		[self.native postEvent:event];
		return;
	}

	NSMutableArray *characteristics = [[[NSMutableArray alloc] init] autorelease];
	for (CBCharacteristic *characteristic in service.characteristics) {
		[characteristics addObject:characteristic.UUID.UUIDString];
	}

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@\f%@", OBJ_NAME, @"discovered",
					   peripheral.identifier.UUIDString,
					   service.UUID.UUIDString,
					   JSONStringWithObject(characteristics)
					   ];
	[self.native postEvent:event];
}

- (void)peripheral:(CBPeripheral *)peripheral didWriteValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
	NSDictionary *dict = @{
		BLEPeripheralKey:peripheral.identifier.UUIDString,
		BLEServiceKey:characteristic.service.UUID.UUIDString,
		BLECharacteristicKey:characteristic.UUID.UUIDString
	};

	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"write", JSONStringWithObject(dict), (error ? error.localizedDescription : @"")];
	[self.native postEvent:event];
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
	NSDictionary *dict = @{
		BLEPeripheralKey:peripheral.identifier.UUIDString,
		BLEServiceKey:characteristic.service.UUID.UUIDString,
		BLECharacteristicKey:characteristic.UUID.UUIDString
	};

	if (error) {
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@\f%@", OBJ_NAME, @"changed", JSONStringWithObject(dict), @"", error.localizedDescription];
		[self.native postEvent:event];
	} else {
		NSString *hexString = hexStringWithBytes(characteristic.value.bytes, (int)characteristic.value.length);
		NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@\f%@", OBJ_NAME, @"changed", JSONStringWithObject(dict), hexString, @""];
		[self.native postEvent:event];
		[hexString release];
	}
}

@end

@interface NativeCall (ble) @end

@implementation NativeCall (ble)

- (NSString *)$$ble_scanstart:(NSString *)param1 :(NSString *)param2
{
	NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
	NSArray *uuids = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
	NSMutableArray *services = [[[NSMutableArray alloc] init] autorelease];
	for (NSString *uuid in uuids) {
		[services addObject:[CBUUID UUIDWithString:uuid]];
	}
	[centralManager scanForPeripheralsWithServices:services];
    undefined;
}
- (NSString *)$$ble_scanstop:(NSString *)param1 :(NSString *)param2
{
	[centralManager stopScan];
	undefined;
}
- (NSString *)$$ble_connect:(NSString *)param1 :(NSString *)param2
{
    NSUUID *identifier = [[[NSUUID alloc] initWithUUIDString:param1] autorelease];
    [centralManager connect:identifier];
    undefined;
}
- (NSString *)$$ble_disconnect:(NSString *)param1 :(NSString *)param2
{
    NSUUID *identifier = param1 ? [[[NSUUID alloc] initWithUUIDString:param1] autorelease] : nil;
    [centralManager disconnect:identifier];
    undefined;
}
- (NSString *)$$ble_discover:(NSString *)param1 :(NSString *)param2
{
	NSUUID *identifier = [[[NSUUID alloc] initWithUUIDString:param1] autorelease];
    [centralManager discover:identifier forService:param2];
    undefined;
}
- (NSString *)$$ble_properties:(NSString *)param1 :(NSString *)param2
{
    return_s([centralManager getProperties:dictionaryWithJSONString(param1)]);
}
- (NSString *)$$ble_notify:(NSString *)param1 :(NSString *)param2
{
    [centralManager setNotify:[param2 boolValue] forCharacteristic:dictionaryWithJSONString(param1)];
    undefined;
}
- (NSString *)$$ble_read:(NSString *)param1 :(NSString *)param2
{
    [centralManager readCharacteristic:dictionaryWithJSONString(param1)];
    undefined;
}
- (NSString *)$$ble_write:(NSString *)param1 :(NSString *)param2
{
    [centralManager writeCharacteristic:dictionaryWithJSONString(param1) data:dataWithHexString(param2) type:CBCharacteristicWriteWithResponse];
    undefined;
}
- (NSString *)$$ble_writewithoutresponse:(NSString *)param1 :(NSString *)param2
{
	[centralManager writeCharacteristic:dictionaryWithJSONString(param1) data:dataWithHexString(param2) type:CBCharacteristicWriteWithoutResponse];
	undefined;
}

@end
