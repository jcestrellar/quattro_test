//
//  BLEMIDIEndpoint.m
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#ifdef USE_VENDER_BLEMIDI

#import "BLEMIDIEndpoint.h"
#ifdef USE_TGIF
#import "../../Common/Sound/TGIF.h"
#endif

#define SYSEX_BUF_LENGTH    512

@interface BLEMIDIEndpoint () {
    CBCharacteristic *_characteristic;

    NSMutableArray *_ports;
    NSMutableArray *_packets;
    
    u_int8_t running;
    int sysex_len;
    u_int8_t sysex_buf[SYSEX_BUF_LENGTH];

    int t0, ts0;
    u_int32_t timeStamp;
}
@end

@implementation BLEMIDIEndpoint

- (id)initWithCharacteristic:(CBCharacteristic *)characteristic
{
    if (self = [super init]) {
        _characteristic = characteristic;
        _ports = [[NSMutableArray alloc] init];
        _packets = [[NSMutableArray alloc] init];
    }
    return self;
}

- (void)dealloc
{
    _characteristic = nil;
    [_ports release];
    [_packets release];
    
    [super dealloc];
}

- (void)connectPort:(id)port
{
    @synchronized(_ports) {
        if ([_ports indexOfObject:port] == NSNotFound) {
            [_ports addObject:port];
        }
    }
}

- (void)disconnectPort:(id)port
{
    @synchronized(_ports) {
        [_ports removeObject:port];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error
{
    if (error) return;

    const u_int8_t *data = characteristic.value.bytes;
    int datalen = (int)characteristic.value.length;

    u_int32_t now = current_millis_timestamp();
    int ts = (*data++ & 0x3f) << 7; datalen--;

    while (datalen > 0) {

        if ((*data & 0x80) != 0) {
            ts = (ts & ~0x7f) | (*data++ & 0x7f); datalen--;
			int32_t elapsed = now - t0;
			if (elapsed >= TIMESTAMP_RANGE) {
                timeStamp = now;
            } else {
                int delta = ts - ts0;
                if (delta < 0) {
                    delta += TIMESTAMP_RANGE;
                }
                if ((delta < 100) && (elapsed > (TIMESTAMP_RANGE - 100))) {
                    delta += TIMESTAMP_RANGE;
                }
                if (abs(elapsed - delta) > 100) {
                    delta = 0; ts = ts0;
                }
                timeStamp += delta;
            }
            t0 = now; ts0 = ts;
        }

        u_int8_t sts;
        if ((*data & 0x80) != 0) {
            sts = *data++; datalen--;
        } else {
            sts = running;
        }

        int len = 0;
        switch (sts & 0xf0) {
            case 0x80: len = 3; running = sts; break;
            case 0x90: len = 3; running = sts; break;
            case 0xa0: len = 3; running = sts; break;
            case 0xb0: len = 3; running = sts; break;
            case 0xc0: len = 2; running = sts; break;
            case 0xd0: len = 2; running = sts; break;
            case 0xe0: len = 3; running = sts; break;
            case 0xf0:
                switch (sts) {
                    case 0xf0: running = 1; break;
                    case 0xf7: running = 0; break;

                    case 0xf1: len = 2; break;
                    case 0xf2: len = 3; break;
                    case 0xf3: len = 2; break;
                    case 0xf6: len = 1; break;

                //  case 0xf8:
                    case 0xfa:
                    case 0xfb:
                    case 0xfc:
                //  case 0xfe:
                    case 0xff: len = 1; break;
                        
                    default: continue;
                }
                break;
        }

        if (len > 0) {
            u_int8_t msg[3] = { sts, 0, 0 };
            if (len > 1) { msg[1] = *data++; datalen--; }
            if (len > 2) { msg[2] = *data++; datalen--; }
#ifdef USE_TGIF
            if (TGIF_IsThru()) {
                TGIF_MIDISend(msg, len, millis_timestamp_to_nanos(timeStamp));
            }
#endif
            @synchronized(_ports) {
                for (MIDIInputPort *port in _ports) {
                    if ([port respondsToSelector:@selector(delegate)]) {
                        [port.delegate midiInputMessage:msg size:len timeStamp:timeStamp];
                    }
                }
            }
        } else if (sts == 0xf0) {
            sysex_len = 0;
            sysex_buf[sysex_len++] = sts;
        } else if (sts == 0xf7) {
            if (sysex_len > 0) {
                sysex_buf[sysex_len++] = sts;
#ifdef USE_TGIF
            if (TGIF_IsThru()) {
                TGIF_MIDISend(sysex_buf, sysex_len, millis_timestamp_to_nanos(timeStamp));
            }
#endif
                @synchronized(_ports) {
                    for (MIDIInputPort *port in _ports) {
                        if ([port respondsToSelector:@selector(delegate)]) {
                            [port.delegate midiInputMessage:sysex_buf size:sysex_len timeStamp:timeStamp];
                        }
                    }
                }
                sysex_len = 0;
            }
        } else {
            if (running > 0 && sysex_len < (SYSEX_BUF_LENGTH - 1)) {
                sysex_buf[sysex_len++] = *data;
            }
            data++; datalen--;
        }

    }
}

- (BOOL)enqueue:(id)port packet:(const u_int8_t *)data size:(int)datalen;
{
    @synchronized(_ports) {
        if ([_ports indexOfObject:port] == NSNotFound) return NO;
    }

    NSMutableData *last = [_packets lastObject];
    if ((last != nil) && (last.length + datalen - 1 <= BLE_MAX_DATA_SIZE) &&
        (((const u_int8_t *)last.bytes)[0] == data[0])) {
        [last appendBytes:data + 1 length:datalen - 1];
    } else {
        [_packets addObject:[NSMutableData dataWithBytes:data length:datalen]];
    }
    return YES;
}

- (BOOL)dequeue:(CBPeripheral *)peripheral
{
#if 1
    if (_packets.count > 0) {
        [peripheral writeValue:[_packets objectAtIndex:0] forCharacteristic:_characteristic type:CBCharacteristicWriteWithoutResponse];
        [_packets removeObjectAtIndex:0];
        return (_packets.count != 0);
    }
    return NO;
#else
    while (_packets.count > 0) {
        [peripheral writeValue:[_packets objectAtIndex:0] forCharacteristic:_characteristic type:CBCharacteristicWriteWithoutResponse];
        [_packets removeObjectAtIndex:0];
        if (_packets.count == 1) {
            NSData *packet = [_packets objectAtIndex:0];
            if (packet.length < (BLE_MAX_DATA_SIZE / 2)) {
                return YES; /* do process on next timer */
            }
        }
    }
    return NO;
#endif
}

@end

#endif /* USE_VENDER_BLEMIDI */
