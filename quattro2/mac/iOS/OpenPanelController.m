//
//  OpenPanelController.m
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import "OpenPanelController.h"

@interface OpenPanelController () {
    NSMutableArray *_list;
}
@property (assign) IBOutlet UITableView *tableView;
@end

@implementation OpenPanelController

- (void)dealloc
{
    self.panel = nil;
    self.currentURL = nil;
    [_list release];
    [super dealloc];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    self.navigationItem.title = [self.currentURL lastPathComponent];

    _list = [[NSMutableArray alloc] init];
    [self dir];
}

- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];

    [self.navigationController setToolbarHidden:YES animated:NO];
}

- (void)viewDidDisappear:(BOOL)animated
{
    [super viewDidDisappear:animated];
}

- (void)close
{
    [self.panel close];
    [self dismissViewControllerAnimated:YES completion:nil];
}

#pragma mark - Table view data source

- (void)dir
{
    [_list removeAllObjects];
    
    NSError *error = nil;
    NSArray *properties = [NSArray arrayWithObjects:
                           NSURLLocalizedNameKey,
                           NSURLIsDirectoryKey,
                           nil];
    NSArray *urls =[[NSFileManager defaultManager] contentsOfDirectoryAtURL:self.currentURL
                                                 includingPropertiesForKeys:properties
                                                                    options:NSDirectoryEnumerationSkipsSubdirectoryDescendants
                                                                      error:&error];
    
    urls = [urls sortedArrayUsingComparator:^NSComparisonResult(id obj1, id obj2) {
        NSURL *o1 = obj1;
        NSURL *o2 = obj2;
        NSNumber *dir1 = @0;
        NSNumber *dir2 = @0;
        [o1 getResourceValue:&dir1 forKey:NSURLIsDirectoryKey error:nil];
        [o2 getResourceValue:&dir2 forKey:NSURLIsDirectoryKey error:nil];
        if ( [dir1 boolValue] && ![dir2 boolValue]) return -1;
        if (![dir1 boolValue] &&  [dir2 boolValue]) return  1;
        NSStringCompareOptions compareOptions = NSCaseInsensitiveSearch;
        return [[o1 lastPathComponent] compare:[o2 lastPathComponent] options:compareOptions];
    }];
    
    for (NSURL *url in urls) {
        NSNumber *directory = @0;
        [url getResourceValue:&directory forKey:NSURLIsDirectoryKey error:nil];
        if ([directory boolValue]) {
            [_list addObject:url];
        } else if (self.panel.filter.count > 0) {
            for (int i = 0; i < self.panel.filter.count; i++) {
                NSString *ext = [self.panel.filter objectAtIndex:i];
                if ([[url pathExtension] caseInsensitiveCompare:ext] == NSOrderedSame) {
                    [_list addObject:url];
                    break;
                }
            }
        } else {
            [_list addObject:url];
        }
    }
}

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    return (section == 0) ? _list.count : 0;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    static NSString *CellIdentifier = @"Cell";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
    if (cell == nil) {
        cell = [[[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:CellIdentifier] autorelease];
    }
    
    NSNumber *directory = @0;
    NSURL *url = [_list objectAtIndex:indexPath.row];
    [url getResourceValue:&directory forKey:NSURLIsDirectoryKey error:nil];
    if ([directory boolValue]) {
        cell.textLabel.text = [NSString stringWithFormat:@"%@/", [url lastPathComponent]];
        cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
    } else {
        cell.textLabel.text = [[url lastPathComponent] stringByDeletingPathExtension];
        cell.accessoryType = UITableViewCellAccessoryNone;
    }
    
    return cell;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
    NSURL *url = [_list objectAtIndex:indexPath.row];
    
    NSNumber *directory = @0;
    [url getResourceValue:&directory forKey:NSURLIsDirectoryKey error:nil];
    if ([directory boolValue]) {
        OpenPanelController *controller = [[[OpenPanelController alloc] initWithNibName:@"OpenPanelController" bundle:nil] autorelease];
        controller.panel = self.panel;
        controller.currentURL = url;
        [self.navigationController pushViewController:controller animated:YES];
    } else {
        self.panel.URL = url;
        [self close];
    }
}

#pragma mark - UIBarButtonItem action

- (IBAction)tapCancel:(id)sender
{
    [self close];
}

@end
