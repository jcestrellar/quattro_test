//
//  BarcodeScannerController.m
//
//  Copyright (c) 2025 Roland Corporation. All rights reserved.
//

#import <AVFoundation/AVFoundation.h>
#import "BarcodeScannerController.h"

@interface BarcodeScannerController () <AVCaptureMetadataOutputObjectsDelegate> {
    dispatch_queue_t _queue;
    BOOL _detected;
}
@property (retain) NSString *stringValue;
@property (retain) AVCaptureSession *session;
@property (retain) AVCaptureVideoPreviewLayer *previewLayer;
@property (retain) CAShapeLayer *focusLayer;
@end

@implementation BarcodeScannerController

- (void)dealloc
{
    dispatch_release(_queue);

    [super dealloc];
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    self.stringValue = @"";

    _queue = dispatch_queue_create("jp.co.roland.quattro.barcode.scanner", DISPATCH_QUEUE_SERIAL);

    self.session = [[AVCaptureSession alloc] init];
    self.previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:self.session];
    self.previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
    [self.view.layer addSublayer:self.previewLayer];

    self.focusLayer = [[CAShapeLayer alloc] init];
    self.focusLayer.fillRule = kCAFillRuleEvenOdd;
    self.focusLayer.lineWidth = 4.0;
    self.focusLayer.strokeColor = UIColor.orangeColor.CGColor;
    self.focusLayer.fillColor = UIColor.blackColor.CGColor;
    self.focusLayer.opacity = 0.3;
    [self.view.layer addSublayer:self.focusLayer];

    dispatch_async(_queue, ^{
        [self configureSession];
    });
}

- (void)configureSession
{
    [self.session beginConfiguration];

    AVCaptureDevice *device =
        [AVCaptureDevice defaultDeviceWithDeviceType:AVCaptureDeviceTypeBuiltInWideAngleCamera
                                           mediaType:AVMediaTypeVideo
                                            position:AVCaptureDevicePositionBack];

    NSError *error = nil;
    AVCaptureDeviceInput *deviceInput = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
    if (!error && deviceInput) {
        if ([self.session canAddInput:deviceInput]) {
            [self.session addInput:deviceInput];
            AVCaptureMetadataOutput *metadataOutput = [[[AVCaptureMetadataOutput alloc] init] autorelease];
            if ([self.session canAddOutput:metadataOutput]) {
                [self.session addOutput:metadataOutput];
                [metadataOutput setMetadataObjectsDelegate:self queue:dispatch_get_main_queue()];
                metadataOutput.metadataObjectTypes = self.metadataObjectTypes;
            }
        }
    }

    [self.session commitConfiguration];

    dispatch_async(dispatch_get_main_queue(), ^{
        [self setupVideoOrientation];
    });

    [self.session startRunning];
}

-(void)setupVideoOrientation
{
    NSArray *scenes = [[[UIApplication sharedApplication] connectedScenes] allObjects];
    UIWindowScene *windowScene = scenes.lastObject;
    UIInterfaceOrientation orientation = windowScene.interfaceOrientation;
    switch (orientation) {
        case UIInterfaceOrientationPortrait:
            _previewLayer.connection.videoOrientation = AVCaptureVideoOrientationPortrait;
            break;
        case UIInterfaceOrientationPortraitUpsideDown:
            _previewLayer.connection.videoOrientation = AVCaptureVideoOrientationPortraitUpsideDown;
            break;
        case UIInterfaceOrientationLandscapeLeft:
            _previewLayer.connection.videoOrientation = AVCaptureVideoOrientationLandscapeLeft;
            break;
        case UIInterfaceOrientationLandscapeRight:
            _previewLayer.connection.videoOrientation = AVCaptureVideoOrientationLandscapeRight;
            break;
        default:
            break;
    }
}

- (void)captureOutput:(AVCaptureOutput *)captureOutput didOutputMetadataObjects:(NSArray *)metadataObjects fromConnection:(AVCaptureConnection *)connection
{
    for (AVMetadataObject *metadataObject in metadataObjects) {
        if ([metadataObject isKindOfClass:[AVMetadataMachineReadableCodeObject class]]) {
            self.stringValue = [(AVMetadataMachineReadableCodeObject *)metadataObject stringValue];
            AVMetadataObject *transformed = [self.previewLayer transformedMetadataObjectForMetadataObject:metadataObject];
            [self updateFocus:transformed.bounds];
            if (!_detected) {
                _detected = YES;
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.7 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
                    [self.navigationController popViewControllerAnimated:YES];
                });
            }
        }
    }
}

- (void)viewDidDisappear:(BOOL)animated
{
    [super viewDidDisappear:animated];

    dispatch_async(_queue, ^{
        [self.session stopRunning];
        self.session = nil;
        self.previewLayer = nil;
        self.focusLayer = nil;
    });

    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", @"app", @"command", @"barcode", self.stringValue];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];

    self.stringValue = nil;
    self.metadataObjectTypes = nil;

    [self.previewLayer removeFromSuperlayer];
    [self.focusLayer removeFromSuperlayer];
}

-(void)viewDidLayoutSubviews
{
    [super viewDidLayoutSubviews];

    self.previewLayer.frame = self.view.bounds;
    self.focusLayer.frame = self.view.bounds;

    [self setupVideoOrientation];
}

- (void)updateFocus:(CGRect)bounds
{
    CGFloat lineWidth = self.focusLayer.lineWidth;
    UIBezierPath *path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, -8, -8) cornerRadius:16];
    [path appendPath:[UIBezierPath bezierPathWithRect:CGRectInset(self.view.bounds, -lineWidth, -lineWidth)]];
    self.focusLayer.path = path.CGPath;
}

@end
