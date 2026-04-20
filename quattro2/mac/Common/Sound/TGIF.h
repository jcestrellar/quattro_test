//
//  TGIF.h
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#ifdef USE_TGIF

#import <Foundation/Foundation.h>
#import <CoreMIDI/CoreMIDI.h>
#import <mach/mach_time.h>

#ifdef __cplusplus
extern "C" {
#endif

void TGIF_Initialize(void);
void TGIF_Uninitialize(void);

NSString *TGIF_GetDevice(void);
void TGIF_SetDevice(NSString *deviceUID);

int  TGIF_GetValue(u_int32_t pid);
void TGIF_SetValue(u_int32_t pid, int value);
void TGIF_MIDISend(const u_int8_t *data, int bytes, MIDITimeStamp timeStamp);

BOOL TGIF_IsThru(void);
void TGIF_SetThru(BOOL enable);

void TGIF_MIDIThru(const MIDIPacketList *pktlist);
MIDIEndpointRef TGIF_MIDIGetDestination(void);

#ifdef __cplusplus
}
#endif

#endif /* USE_TGIF */
