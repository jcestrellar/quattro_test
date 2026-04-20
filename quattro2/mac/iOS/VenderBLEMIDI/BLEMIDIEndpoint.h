//
//  BLEMIDIEndpoint.h
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#ifdef USE_VENDER_BLEMIDI

#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import "../../Common/MIDIClient/MIDIClient.h"

#define BLE_MAX_DATA_SIZE   20

#define BLE_MIDI_HEADER     0x80
#define BLE_MIDI_TIMESTAMP  0x80
#define TIMESTAMP_RANGE     (0x1fff + 1) /* 8192 msec */

@interface BLEMIDIEndpoint : NSObject <CBPeripheralDelegate>

- (id)initWithCharacteristic:(CBCharacteristic *)characteristic;

- (void)connectPort:(id)port;
- (void)disconnectPort:(id)port;

- (BOOL)enqueue:(id)port packet:(const u_int8_t *)data size:(int)datalen;
- (BOOL)dequeue:(CBPeripheral *)peripheral;

@end

#endif /* USE_VENDER_BLEMIDI */
