//
//	uninstaller.js
//
//	Copyright 2026 Roland Corporation. All rights reserved.
//

/*** Usage example ***/
/*
	var appId = '9954B747-8582-499E-A883-18114EEA530C'

	var uninstaller = new Uninstaller();
	var unins000exe = await uninstaller.search(appId);
	if (unins000exe) {
		console.log('found uninstaller: ' + unins000exe);
		await uninstaller.exec(unins000exe);
		console.log('finished to uninstall.');
	} else {
		console.log('already uninstalled.')
	}
*/

function Uninstaller(x64) {
	if (x64) {
		this.REGKEY = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
	} else {
		this.REGKEY = 'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
	}
}

Uninstaller.prototype.search = function(appId) {
	return new Promise((resolve) => {
		var str = '';
		var key = this.REGKEY + '\\{' + appId + '}}_is1';
		$native.sh.exec(['reg', 'query', key, '/v', 'UninstallString']);
		$native.sh.event.stdout = function(pid, output) {
			if (output.length == 0) { // EOF
				var result = /.*UninstallString\s+REG_SZ\s+(.+)/.exec(str);
				if (result && result.length > 1) {
					resolve(result[1]);
				} else {
					resolve();
				}
			} else {
				str += output;
			}
		};
	});
}

Uninstaller.prototype.exec = function(file) {
	return new Promise((resolve) => {
		$native.sh.exec(['start', '/wait', '""', file, '/SILENT']);
		$native.sh.event.stdout = function(pid, output) {
			if (output.length == 0) { // EOF
				resolve();
			}
		};
	});
}
