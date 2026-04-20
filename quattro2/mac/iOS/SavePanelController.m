//
//  SavePanelController.m
//
//  Copyright (c) 2015 Roland Corporation. All rights reserved.
//

#import "SavePanelController.h"

@interface SavePanelController () {
    NSMutableArray *_list;
}
@property (assign) IBOutlet UITableView *tableView;
@property (assign) IBOutlet UIBarButtonItem *saveButton;
@end

@implementation SavePanelController

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
    self.saveButton.title = self.panel.canChooseDirectories ? @"OK" : NSLocalizedString(@"!SAVE", nil);

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
    NSArray *urls = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:self.currentURL
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
        } else if (self.panel.extension.length > 0) {
            if ([[url pathExtension] caseInsensitiveCompare:self.panel.extension] == NSOrderedSame) {
                [_list addObject:url];
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
        cell.textLabel.textColor = [UIColor blackColor];
        if (@available(iOS 12.0, *)) {
            if (UIScreen.mainScreen.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark) {
                cell.textLabel.textColor = [UIColor whiteColor];
            }
        }
        cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
    } else {
        cell.textLabel.text = [[url lastPathComponent] stringByDeletingPathExtension];
        cell.textLabel.textColor = [UIColor lightGrayColor];
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
        SavePanelController *controller = [[[SavePanelController alloc] initWithNibName:@"SavePanelController" bundle:nil] autorelease];
        controller.panel = self.panel;
        controller.currentURL = url;
        [self.navigationController pushViewController:controller animated:YES];
    }
}

#pragma mark - UIBarButtonItem action

- (IBAction)tapCancel:(id)sender
{
    [self close];
}

- (IBAction)tapSave:(id)sender
{
    if (self.panel.canChooseDirectories) {
        self.panel.URL = self.currentURL;
        [self close];
        return;
    }

    UIAlertController *alert= [UIAlertController alertControllerWithTitle:NSLocalizedString(@"!ENTER_FILE_NAME", nil)
                                                                  message:nil
                                                           preferredStyle:UIAlertControllerStyleAlert];
    
    UIAlertAction *ok = [UIAlertAction actionWithTitle:NSLocalizedString(@"!OK", nil)
                                                 style:UIAlertActionStyleDefault
                                               handler:^(UIAlertAction * action) {
                                                   UITextField *textField = alert.textFields[0];
                                                   if (textField.text.length != 0) {
                                                       self.panel.filename = textField.text;
                                                       [self doSave];
                                                   }
                                               }];
    
    UIAlertAction *cancel = [UIAlertAction actionWithTitle:NSLocalizedString(@"!CANCEL", nil)
                                                     style:UIAlertActionStyleCancel
                                                   handler:nil];
    
    [alert addAction:cancel];
    [alert addAction:ok];
    [alert addTextFieldWithConfigurationHandler:^(UITextField *textField) {
        textField.text = self.panel.filename;
        textField.placeholder = NSLocalizedString(@"!FILE_NAME", nil);
        textField.keyboardType = UIKeyboardTypeDefault;
    }];
    
    [self presentViewController:alert animated:YES completion:nil];
}

- (IBAction)tapFolder:(id)sender
{
    UIAlertController *alert= [UIAlertController alertControllerWithTitle:NSLocalizedString(@"!ENTER_FOLDER_NAME", nil)
                                                                  message:nil
                                                           preferredStyle:UIAlertControllerStyleAlert];
    
    UIAlertAction *ok = [UIAlertAction actionWithTitle:NSLocalizedString(@"!OK", nil)
                                                 style:UIAlertActionStyleDefault
                                               handler:^(UIAlertAction * action) {
                                                   UITextField *textField = alert.textFields[0];
                                                   NSString *path = [textField.text stringByReplacingOccurrencesOfString:@"/" withString:@":"];
                                                   if (path.length != 0) {
                                                       [[NSFileManager defaultManager] createDirectoryAtURL:[self.currentURL URLByAppendingPathComponent:path]
                                                                                withIntermediateDirectories:YES
                                                                                                 attributes:nil
                                                                                                      error:nil];
                                                       [self dir];
                                                       [self.tableView reloadData];
                                                   }
                                               }];
    
    UIAlertAction *cancel = [UIAlertAction actionWithTitle:NSLocalizedString(@"!CANCEL", nil)
                                                     style:UIAlertActionStyleCancel
                                                   handler:nil];
    
    [alert addAction:cancel];
    [alert addAction:ok];
    [alert addTextFieldWithConfigurationHandler:^(UITextField *textField) {
        textField.placeholder = NSLocalizedString(@"!FOLDER_NAME", nil);
        textField.keyboardType = UIKeyboardTypeDefault;
    }];
    
    [self presentViewController:alert animated:YES completion:nil];
}

- (void)doSave
{
    NSString *path = [self.panel.filename stringByReplacingOccurrencesOfString:@"/" withString:@":"];
    if (self.panel.extension.length > 0) {
        if ([[path pathExtension] caseInsensitiveCompare:self.panel.extension] != NSOrderedSame) {
            path = [path stringByAppendingPathExtension:self.panel.extension];
        }
    }
    NSURL *url = [self.currentURL URLByAppendingPathComponent:path];
    
    BOOL exist, directory;
    exist = [[NSFileManager defaultManager] fileExistsAtPath:[url path] isDirectory:&directory];
    if (!exist) {
        self.panel.URL = url;
        [self close];
        return;
    }

    UIAlertController *alert = nil;

    if (directory) {
        alert= [UIAlertController alertControllerWithTitle:NSLocalizedString(@"!CANNOT_OVERWRITE", nil)
                                                   message:NSLocalizedString(@"!EXISTS_SAME_FOLDER", nil)
                                            preferredStyle:UIAlertControllerStyleAlert];
         
        UIAlertAction *close = [UIAlertAction actionWithTitle:NSLocalizedString(@"!CLOSE", nil)
                                                        style:UIAlertActionStyleDestructive
                                                      handler:nil];
        [alert addAction:close];
    } else {
        alert= [UIAlertController alertControllerWithTitle:NSLocalizedString(@"!OVERWRITE", nil)
                                                   message:nil
                                            preferredStyle:UIAlertControllerStyleAlert];
    
        UIAlertAction *no = [UIAlertAction actionWithTitle:NSLocalizedString(@"!NO", nil)
                                                     style:UIAlertActionStyleDefault
                                                   handler:nil];
    
        UIAlertAction *yes = [UIAlertAction actionWithTitle:NSLocalizedString(@"!YES", nil)
                                                      style:UIAlertActionStyleDestructive
                                                    handler:^(UIAlertAction * action) {
                                                        self.panel.URL = url;
                                                        [self close];
                                                    }];
    
        [alert addAction:yes];
        [alert addAction:no];
    }

    [self presentViewController:alert animated:YES completion:nil];
}

@end
