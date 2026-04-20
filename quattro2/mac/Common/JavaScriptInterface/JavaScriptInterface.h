//
//  JavaScriptInterface.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "NativeCall.h"

@interface JavaScriptInterface : NSObject {
    HTTPServer *_httpServer;
}
@property (assign) uint16_t portNo;
- (BOOL)startHTTPServer;
- (void)stopHTTPServer;

@property (assign) id controller;
@property (assign, readonly) NativeCall *native;
@property (assign, readonly) BOOL dragdrop;

+ (JavaScriptInterface *)sharedInstance;

- (id)initWithController:(id)controller;

@end
