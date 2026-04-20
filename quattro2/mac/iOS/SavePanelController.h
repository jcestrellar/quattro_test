//
//  SavePanelController.h
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "../Common/JavaScriptInterface/NativeCall.h"

@interface SavePanelController : UIViewController
@property (retain) SavePanel *panel;
@property (retain) NSURL *currentURL;
@end
