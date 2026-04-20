//
//  ScanBLEMIDIController.m
//
//  Copyright (c) 2018 Roland Corporation. All rights reserved.
//

#ifdef USE_VENDER_BLEMIDI

#import "ScanBLEMIDIController.h"
#import "BLEMIDIConnectionManager.h"

@interface ScanBLEMIDIController ()
@property (assign) IBOutlet UITableView *tableView;
@end

@implementation ScanBLEMIDIController

- (void)viewDidLoad
{
    [super viewDidLoad];
}

- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    self.navigationItem.title = NSLocalizedString(@"Bluetooth MIDI Devices", nil);
    [self.navigationController setToolbarHidden:YES animated:NO];

    [[BLEMIDIConnectionManager sharedInstance] startScan:self.tableView];
}

- (void)viewDidDisappear:(BOOL)animated
{
    [super viewDidDisappear:animated];

    [[BLEMIDIConnectionManager sharedInstance] stopScan];
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    return (section == 0) ? [[BLEMIDIConnectionManager sharedInstance] devices].count : 0;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    static NSString *CellIdentifier = @"Cell";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
    if (cell == nil) {
        cell = [[[UITableViewCell alloc] initWithStyle:UITableViewCellStyleValue1 reuseIdentifier:CellIdentifier] autorelease];
    }

    NSArray *devices = [[BLEMIDIConnectionManager sharedInstance] devices];
    if (indexPath.row < devices.count) {
        CBPeripheral *peripheral = [devices objectAtIndex:indexPath.row];

        UIActivityIndicatorView *activityIndicatorView = [[[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleMedium] autorelease];
        [activityIndicatorView startAnimating];

        NSString *state = @"";
        UIColor *color = [UIColor grayColor];
        UIView *accessoryView = nil;

        switch (peripheral.state) {
            case CBPeripheralStateDisconnected:
                state = NSLocalizedString(@"Not Connected", nil);
                break;
            case CBPeripheralStateConnecting:
                state = NSLocalizedString(@"Connecting...", nil);
                accessoryView = activityIndicatorView;
                break;
            case CBPeripheralStateConnected:
                state = NSLocalizedString(@"Connected", nil);
                color = [UIColor blackColor];
                if (@available(iOS 12.0, *)) {
                    if (UIScreen.mainScreen.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark) {
                        color = [UIColor whiteColor];
                    }
                }
                break;
            case CBPeripheralStateDisconnecting:
                state = NSLocalizedString(@"Disconnecting...", nil);
                accessoryView = activityIndicatorView;
                break;
        }

		cell.textLabel.text = peripheral.advertisingName;
        cell.detailTextLabel.text = state;
        cell.detailTextLabel.textColor = color;
        cell.accessoryView = accessoryView;
    }

    return cell;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
    [[BLEMIDIConnectionManager sharedInstance] tapAtIndex:indexPath.row];
}

@end

#endif /* USE_VENDER_BLEMIDI */
