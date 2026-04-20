//
//	rcp_log.js
//
//	Copyright 2024 Roland Corporation. All rights reserved.
//

function RCPLog(url, tracking) {

	this.TAG = 'RCPLog';
	this.inspect = function(){};

	this.MAX_EVENT_NAME_LENGTH = 50;
	this.MAX_BODY_LENGTH = 1000;
	this.MAX_QUEUE_LENGTH = (this.MAX_BODY_LENGTH * 250);

	this.DEF_TIMER_INTERVAL =   500; /* msec */
	this.MAX_TIMER_INTERVAL = 60000; /* msec */
	this.KEY_DEVID = '__rcplog_devid';
	this.KEY_QUEUE = '__rcplog_queue';
	this.KEY_INDEX = '__rcplog_index';

	this.url = url;
	this.queue = null;
	this.index = 0;

	var dev = $native.app.device();
	this.anonymousId = dev ? dev.id : null;
	this.eventId = Math.random().toString(36).substr(2, 9);
	this.eventNumber = 0;

	if (this.tracking = tracking) {
		var devid = localStorage.getItem(this.KEY_DEVID);
		if (!devid) {
			devid = this.uuidgen(this.anonymousId + ':' + this.eventId);
		}
		this.anonymousId = devid;
	}

	var self = this;
	$native.app.event.log = function(tag, msg) {
		self.post(tag, JSON.parse(msg));
	};
}

RCPLog.prototype.uuidgen = function(text) {

	var data = $native.util.bytes(text);
	var dgst = $native.security.md5(data).toLowerCase();
	var uuid = dgst.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
	localStorage.setItem(this.KEY_DEVID, uuid);
	return uuid;
}

RCPLog.prototype.optin = function(evcommon) {

	if (this.timer !== undefined) {
		return; /* already started */
	}

	this.inspect('(start sending logs...)');

	this.evcommon = evcommon;

	var str = localStorage.getItem(this.KEY_QUEUE);
	this.queue = str ? str : '';
	var num = localStorage.getItem(this.KEY_INDEX);
	this.index = num ? (num * 1) : 0;
	if ((this.index != this.queue.length) && (this.queue.charAt(this.index) != '{')) {
		this.queue = '';
		this.index = 0;
	}

	var ver = $native.app.version();
	var dev = $native.app.device();
	if (!ver || !dev) return;

	this.timer = null;

	var ts = $native.app.storage2('__app_close');
	if (ts) {
		$native.app.storage2('__app_close', '');
		this.post('app_close', { timestamp: ts * 1 });
	}

	ts = $native.app.storage2('__app_open');
	if (ts) {
		$native.app.storage2('__app_open', '');
		var body = {
			timestamp: ts * 1,
			version: ver.name,
			buildNumber: ver.code,
			model: dev.model,
			os: dev.os,
			firstInstallTime: ver.ctime,
			locale: $native.app.locale(),
		};
		var mtime = $native.app.storage2('__mtime');
		if (!mtime) {
			this.post('app_first_open', body);
			$native.app.storage2('__mtime', ver.mtime);
		} else if (mtime != ver.mtime) {
			this.post('app_update', body);
			$native.app.storage2('__mtime', ver.mtime);
		}
		this.post('app_open', body);
	}

	this.timerproc();
}

RCPLog.prototype.optout = function() {

	if (this.timer !== undefined) {
		this.post('app_optout', {});
		if (this.timer) {
			clearTimeout(this.timer);
			delete this.timer;
		}
		this.inspect('(stop sending logs)');
	}
}

RCPLog.prototype.post = function(ev, obj) {

	if (this.timer === undefined) {
		return; /* not started */
	}
	if (!ev || !obj) return;
	if (/[^a-zA-Z0-9-_]+/.test(ev)) {
		console.log(this.TAG, ev + ' != [a-zA-Z0-9-_]');
		return;
	}
	if (ev.length > this.MAX_EVENT_NAME_LENGTH) {
		console.log(this.TAG, ev + ' > MAX_EVENT_NAME_LENGTH');
		return;
	}

	if (!this.locked && (this.index > 0)) {
		this.queue = this.queue.substring(this.index);
		this.index = 0;
	}

	if (obj.timestamp === undefined) {
		obj.timestamp = Date.now();
	}
	obj.event = ev;
	obj.anonymousId = this.anonymousId;
	obj.eventId = this.eventId + '-' + this.eventNumber.toString(36);
	obj.timestamp = (new Date(obj.timestamp)).toISOString();
	obj.__queue = this.queue.length;
	for (var key in this.evcommon) {
		if (obj[key] === undefined) {
			obj[key] = this.evcommon[key];
		}
	}
	var str = JSON.stringify(obj);
	if (str.length >= this.MAX_BODY_LENGTH) {
		console.log(this.TAG, ev + ' >= MAX_BODY_LENGTH');
		return;
	}
	this.eventNumber++;

	if (this.queue.length > this.MAX_QUEUE_LENGTH) {
		var pos = this.queue.lastIndexOf('\f');
		this.queue = this.queue.substring(0, pos);
		obj.__queue = -1;
		str = JSON.stringify(obj);
	}
	this.queue += (this.queue.length ? ('\f' + str) : str);
	try {
		localStorage.setItem(this.KEY_INDEX, this.index);
		localStorage.setItem(this.KEY_QUEUE, this.queue);
	} catch(e) {}

	this.timerproc();
}

RCPLog.prototype.timerproc = function(interval) {

	if (this.timer || this.locked) return;

	if (this.index < this.queue.length) {
		if (!interval) {
			interval = this.DEF_TIMER_INTERVAL;
		} else if (interval > this.MAX_TIMER_INTERVAL) {
			interval = this.MAX_TIMER_INTERVAL;
		}
		(function(self, interval) {
			self.timer = setTimeout(function() {
				var pos = self.queue.indexOf('\f', self.index);
				if (pos == -1) { pos = self.queue.length; }
				var body = self.queue.substring(self.index, pos);
				var eventName;
				try {
					eventName = JSON.parse(body).event;
				} catch(e) {
					self.inspect('(queue is corrupted, init logs.)');
					self.queue = '';
					self.index = 0;
					if (self.timer !== undefined) {
						self.timer = null;
					}
					return;
				}
				self.locked = true;
				var xhr = new XMLHttpRequest();
				xhr.open('POST', self.url + '/' + eventName);
				xhr.setRequestHeader('Content-Type', 'application/json');
				xhr.onload = function() {
					delete self.locked;
					if (xhr.status == 202) {
						self.inspect(body);
						if (body == self.queue.substring(self.index, pos)) {
							self.index = Math.min(pos + 1, self.queue.length);
							try {
								localStorage.setItem(self.KEY_INDEX, self.index);
							} catch(e) {}
						}
						if (self.timer !== undefined) {
							self.timer = null;
							self.timerproc();
						}
					} else if (self.timer !== undefined) {
						self.inspect('(xhr error ' + xhr.status + '! retry...)');
						self.timer = null;
						self.timerproc(interval + 5000);
					}
				};
				xhr.onerror = xhr.ontimeout = function() {
					delete self.locked;
					if (self.timer !== undefined) {
						self.inspect('(network error! retry...)');
						self.timer = null;
						self.timerproc(interval + 5000);
					}
				};
				xhr.send(body);
			}, interval);
		})(this, interval);
	}
}

RCPLog.prototype.user = function(token) {

	if (token && this.tracking) {
		var body = JSON.stringify({
			event: 'app_user',
			timestamp: (new Date()).toISOString(),
			anonymousId: this.anonymousId,
			eventId: this.eventId + '-' + this.eventNumber.toString(36)
		});
		this.eventNumber++;
		var xhr = new XMLHttpRequest();
		xhr.open('POST', this.url + '/app_user');
		xhr.setRequestHeader("Authorization", token);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(body);
	}
}

RCPLog.prototype.remove = function(token) {

	this.anonymousId = this.uuidgen(this.anonymousId);
	this.eventId = Math.random().toString(36).substr(2, 9);
	this.eventNumber = 0;

	var url = this.url;
	return new Promise(function(resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('DELETE', url);
		xhr.setRequestHeader("Authorization", token);
		xhr.onload = function() {
			if (xhr.status == 200) {
				resolve();
			} else {
				reject(xhr.status);
			}
		};
		xhr.onerror = xhr.ontimeout = function() {
			reject(-1);
		};
		xhr.send();
	});
}
