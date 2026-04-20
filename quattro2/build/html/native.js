//
//	native.js
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

(function(window) {

	var _  = function() { return 0 };

	var native = {

		app: {
			device: function() { return JSON.parse(_('$$app_device')); },
			version: function() { return JSON.parse(_('$$app_version')); },
			locale: function() { return _('$$app_locale'); },
			storage: function(data) { if (data !== undefined) _('$$app_storage', data); else return _('$$app_storage'); },
			storage2: function(key, data) { if (data !== undefined) _('$$app_storage2', key, data); else return _('$$app_storage2', key); },
			clipboard: function(data) { if (data !== undefined) _('$$app_clipboard', data); else return _('$$app_clipboard'); },
			importfile: function(filter, multiple) { _('$$app_importfile', (filter ? JSON.stringify(filter) : '{}'), multiple); },
			exportfile: function(file) { _('$$app_exportfile', file); },
			control: function(req) { _('$$app_control', req); },
			webauth: function(url, scheme) { _('$$app_webauth', url, scheme); },
			barcode: function() { _('$$app_barcode'); },
			locate: function(url) { _('$$app_locate', url); },
			dragdrop: function(enable) { _('$$app_dragdrop', enable); },
			dropfiles: function() { return JSON.parse(_('$$app_dropfiles')); },
			exit: function() { _('$$app_exit'); },

			event: {
				log: function(tag, msg) {},
				command: function(param1, param2) {}
			}
		},

		midi: {
			input: {
				endpoints: function() { return JSON.parse(_('$$midi_inendpoints')); },
				connect: function(ep) { _('$$midi_inconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _('$$midi_indisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			output: {
				endpoints: function() { return JSON.parse(_('$$midi_outendpoints')); },
				connect: function(ep) { _('$$midi_outconnect', (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(ep) { _('$$midi_outdisconnect', (ep ? JSON.stringify(ep) : undefined)); }
			},
			send: function(msg) { _('$$midi_send', msg); },
			panel: function() { _('$$midi_panel'); },

			ble: { /* not recommended */
				scanstart: function() { _('$$blemidi_scanstart'); },
				scanstop: function() { _('$$blemidi_scanstop'); },
				connect: function(id) { _('$$blemidi_connect', id); },
				disconnect: function(id) { _('$$blemidi_disconnect', id); }
			},

			event: {
				ble: function(devices) {},
				message: function(msg, timestamp) {},
				changed: function() {},
				connectfailed: function(ep) {},
				error: function(code) {}
			}
		},

		midix: {
			client: function(count) { _('$$midix_client', count * 1); },
			input: {
				endpoints: function() { return JSON.parse(_('$$midix_inendpoints')); },
				connect: function(cid, ep) { _('$$midix_inconnect', cid * 1, (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(cid, ep) { _('$$midix_indisconnect', cid * 1, (ep ? JSON.stringify(ep) : undefined)); }
			},
			output: {
				endpoints: function() { return JSON.parse(_('$$midix_outendpoints')); },
				connect: function(cid, ep) { _('$$midix_outconnect', cid * 1, (ep ? JSON.stringify(ep) : undefined)); },
				disconnect: function(cid, ep) { _('$$midix_outdisconnect', cid * 1, (ep ? JSON.stringify(ep) : undefined)); }
			},
			send: function(cid, msg) { _('$$midix_send', cid * 1, msg); },
			thru: function(cid, enable) { _('$$midix_thru', cid * 1, enable); },
			panel: function() { _('$$midix_panel'); },

			event: {
				changed: function() {},
				message: function(cid, msg, timestamp) {},
				connectfailed: function(cid, ep) {},
				error: function(cid, code) {}
			}
		},

		tgif: {
			device: function(uid) { return _('$$tgif_device', uid); },
			param: function(pid, val) { if (val !== undefined) _('$$tgif_param', pid, val * 1); else return _('$$tgif_param', pid); },
			send: function(msg, msg2) { _('$$tgif_send', (msg2 ? F5(msg2) + msg : msg)); },
			thru: function(enable) { _('$$tgif_thru', enable); },
			buffer: function(num) { if (num !== undefined) _('$$tgif_buffer', num * 1); else return _('$$tgif_buffer'); }
		},

		seq: {
			load: function(data, cue) { return _('$$seq_load', data, cue); },
			play: function(loop) { _('$$seq_play', loop); },
			pause: function() { _('$$seq_pause'); },
			stop: function() { _('$$seq_stop'); },
			locate: function(beats) { _('$$seq_locate', beats); },
			range: function(a, b) { return JSON.parse(_('$$seq_range', a, b)); },
			tempo: function(bpm) { return _('$$seq_tempo', bpm); },
			mute: function(channels) { return _('$$seq_mute', channels); },
			transpose: function(shift) { return _('$$seq_transpose', shift); },
			countin: function(bars) { return _('$$seq_countin', bars); },
			metro: function(on) { return _('$$seq_metro', on); },
			metroset: function(notes) { _('$$seq_metroset', JSON.stringify(notes)); },
			countset: function(notes) { _('$$seq_countset', JSON.stringify(notes)); },
			position: function() { return _('$$seq_position'); },
			totalbeats: function() { return _('$$seq_totalbeats'); },
			measure: function(beats) { return JSON.parse(_('$$seq_measure', beats)); },
			info: function() { return JSON.parse(_('$$seq_info')); },
			output: function(type) { _('$$seq_output', type); },

			event: {
				stop: function() {},
				tempo: function(bpm) {}
			}
		},

		player: {
			device: function(uid) { return _('$$player_device', uid); },
			open: function(file) { return _('$$player_open', file); },
			play: function() { _('$$player_play'); },
			pause: function() { _('$$player_pause'); },
			stop: function() { _('$$player_stop'); },
			locate: function(time) { _('$$player_locate', time * 1.0); delete window['$$player_time']; },
			volume: function(gain) { return _('$$player_volume', gain); },
			speed: function(rate) { return _('$$player_speed', rate); },
			pitch: function(cent) { return _('$$player_pitch', cent); },
			file: function() { return _('$$player_file'); },
			totaltime: function() { return _('$$player_totaltime'); },
			status: function() { return _('$$player_status'); },
			channels: function() { return _('$$player_channels'); },
			peakpower: function(cahnnel) { return _('$$player_peakpower', cahnnel); },
			time: function() { return _('$$player_time'); },

			event: {
				eof: function(file) {},
				stop: function(file) {},
				error: function(file) {}
			}
		},

		recorder: {
			device: function(uid) { return _('$$recorder_device', uid); },
			create: function(file, format) { return _('$$recorder_create', file, format * 1); },
			record: function() { _('$$recorder_record'); },
			pause: function() { _('$$recorder_pause'); },
			stop: function() { _('$$recorder_stop'); },
			volume: function(gain) { return _('$$recorder_volume', gain); },
			file: function() { return _('$$recorder_file'); },
			status: function() { return _('$$recorder_status'); },
			channels: function() { return _('$$recorder_channels'); },
			peakpower: function(cahnnel) { return _('$$recorder_peakpower', cahnnel); },
			time: function() { return _('$$recorder_time'); },

			event: {
				unauthorized: function() {},
				stop: function(file) {},
				error: function(file) {}
			}
		},

		sampler: {
			create: function(num) { _('$$sampler_create', num); },
			device: function(id, uid) { return _('$$sampler_device', id * 1, uid); },
			open: function(id, file) { return _('$$sampler_open', id * 1, file); },
			close: function(id) { return _('$$sampler_close', id * 1); },
			play: function(id) { _('$$sampler_play', id * 1); },
			pause: function(id) { _('$$sampler_pause', id * 1); },
			stop: function(id, force) { if (id !== undefined) _('$$sampler_stop', id * 1, force); else _('$$sampler_stop'); },
			locate: function(id, time) { _('$$sampler_locate', id * 1, time * 1.0); },
			begin: function(id, time) { return _('$$sampler_begin', id * 1, time); },
			end: function(id, time) { return _('$$sampler_end', id * 1, time); },
			volume: function(id, gain) { return _('$$sampler_volume', id * 1, gain); },
			repeat: function(id, count) { return _('$$sampler_repeat', id * 1, count); },
			speed: function(id, rate) { return _('$$sampler_speed', id * 1, rate); },
			pitch: function(id, cent) { return _('$$sampler_pitch', id * 1, cent); },
			fadein: function(id, time) { return _('$$sampler_fadein', id * 1, time); },
			fadeout: function(id, time) { return _('$$sampler_fadeout', id * 1, time); },
			control: function(id, params) { return _('$$sampler_control', id * 1, params); },
			file: function(id) { return _('$$sampler_file', id * 1); },
			totaltime: function(id) { return _('$$sampler_totaltime', id * 1); },
			status: function() { return JSON.parse( _('$$sampler_status')); },

			event: {
				eof: function(id, file) {}
			}
		},

		audio: {
			inputs: function() { return JSON.parse(_('$$audio_inputs')); },
			outputs: function() { return JSON.parse(_('$$audio_outputs')); },
			format: function(file) { return JSON.parse(_('$$audio_format', file)); },
			convert: function(file, out) { _('$$audio_convert', file, JSON.stringify(out)); },
			split: function(file, wavs) { _('$$audio_split', file, JSON.stringify(wavs)); },
			reverse: function(file, wav) { _('$$audio_reverse', file, wav); },

			event: {
				changed: function() {},
				converted: function(file, outputs) {},
				convertfailed: function(file) {}
			}
		},

		rwc: {
			discovery: function() { _('$$rwc_discovery'); },
			connect: function(dev) { _('$$rwc_connect', JSON.stringify(dev)); },
			disconnect: function() { _('$$rwc_disconnect'); },
			device: function() { var dev = _('$$rwc_device'); return (dev ? JSON.parse(dev) : null); },
			send: function(msg) { _('$$rwc_send', msg); },
			inputmode: function(mode) { _('$$rwc_inputmode', mode); },
			timeout: function(sec) { return _('$$rwc_timeout', sec); },
			keepalive: function(sec) { return _('$$rwc_keepalive', sec); },

			event: {
				found: function(dev) {},
				connected: function(dev) {},
				connectfailed: function(dev) {},
				closed: function(dev) {},
				message: function(msg, timestamp) {},
				error: function(dev) {}
			}
		},

		http: {
			download: function(url, to) { return _('$$http_download', url, to); },
			upload: function(url, file) { return _('$$http_upload', url, file); },
			cancel: function(id) { _('$$http_cancel', id * 1); },

			event: {
				progress: function(id, total, amount) {},
				completed: function(id, file) {},
				error: function(id, url) {}
			}
		},

		tcpip: {
			connect: function(addr, port) { return _('$$tcpip_connect', addr, port * 1); },
			close: function(fd) { _('$$tcpip_close', fd * 1); },
			write: function(fd, data) { _('$$tcpip_write', fd * 1, data); },

			event: {
				closed: function(fd) {},
				read: function(fd, data) {}
			}
		},

		netservice: {
			search: function(type) { return _('$$netservice_search', type); },
			stop: function() { _('$$netservice_stop'); },

			event: {
				resolved: function(serveice) {},
				lost: function(name) {},
				stopped: function(error) {}
			}
		},

		fs: {
			separator: function() { return _('$$fs_separator'); },
			path: function(where) { return _('$$fs_path', where); },
			volumes: function() { return JSON.parse(_('$$fs_volumes')); },
			contents: function(path) { return JSON.parse(_('$$fs_contents', path)); },
			stat: function(path) { return JSON.parse(_('$$fs_stat', path)); },
			exec: function(file) { _('$$fs_exec', file); },
			mkdir: function(path) { _('$$fs_mkdir', path); },
			unlink: function(path) { _('$$fs_unlink', path); },
			copy: function(from, to) { _('$$fs_copy', from, to); },
			move: function(from, to) { _('$$fs_move', from, to); },
			unzip: function(zip, folder) { _('$$fs_unzip', zip, folder); },
			readString: function(file) { return _('$$fs_readString', file); },
			readData: function(file, opt) { return _('$$fs_readData', file, (opt ? JSON.stringify(opt) : undefined)); },
			writeString: function(file, text) { _('$$fs_writeString', file, text); },
			writeData: function(file, data) { _('$$fs_writeData', file, data); },
			appendString: function(file, text) { _('$$fs_appendString', file, text); },
			appendData: function(file, data) { _('$$fs_appendData', file, data); },
			openfilename: function(filter, path) { _('$$fs_openfilename', (filter ? JSON.stringify(filter) : undefined), path); },
			savefilename: function(name, ext)  { _('$$fs_savefilename', name, ext); },
			choosefolder: function(path)  { _('$$fs_choosefolder', path); },
			unmount: function(path) { _('$$fs_unmount', path); },
			watch: function(path) { _('$$fs_watch', path); },

			event: {
				openfilename: function(file) {},
				savefilename: function(file) {},
				choosefolder: function(path) {},
				unmounted: function(path) {},
				unmountfailed: function(path, reason) {},
				watch: function(paths) {}
			}
		},

		security: {
			kiv: function(salt) { return _('$$security_kiv', salt); },
			uuidgen: function() { return _('$$security_uuidgen'); },
			md5: function(data) { return _('$$security_md5', data); },
			encipher: function(text) { return _('$$security_encipher', text); },
			decipher: function(data) { return _('$$security_decipher', data); },
			aes: {
				encrypt: function(data, key) { return _('$$security_aesencrypt', data, (key ? key : undefined)); },
				decrypt: function(data, key) { return _('$$security_aesdecrypt', data, (key ? key : undefined)); }
			},
			des: {
				encrypt: function(data, key) { return _('$$security_desencrypt', data, (key ? key : undefined)); },
				decrypt: function(data, key) { return _('$$security_desdecrypt', data, (key ? key : undefined)); }
			}
		},

		ble: {
			scan : {
				start: function(services) { _('$$ble_scanstart', JSON.stringify(services)); },
				stop: function() { _('$$ble_scanstop'); },
			},
			connect: function(id) { _('$$ble_connect', id); },
			disconnect: function(id) { _('$$ble_disconnect', id); },
			discover: function(id, service) { _('$$ble_discover', id, service); },
			properties: function(ep) { return _('$$ble_properties', JSON.stringify(ep)); },
			notify: function(ep, enabled) { _('$$ble_notify', JSON.stringify(ep), enabled); },
			read: function(ep) { _('$$ble_read', JSON.stringify(ep)); },
			write: function(ep, value) { _('$$ble_write', JSON.stringify(ep), value); },
			writewithoutresponse: function(ep, value) { _('$$ble_writewithoutresponse', JSON.stringify(ep), value); },

			event: {
				unauthorized: function() {},
				found: function(id, name, rssi) {},
				connected: function(id, name) {},
				connectfailed: function(id, name) {},
				disconnected: function(id, name) {},
				discovered: function(id, service, characteristics) {},
				discoverfailed: function(id, reason) {},
				write: function(ep, error) {},
				changed: function(ep, value, error) {}
			}
		},

		store: {
			query: function(products) {_('$$store_query', JSON.stringify(products)); },
			launchflow: function(params) { _('$$store_launchflow', JSON.stringify(params)); },
			accept: function(receipt) { _('$$store_accept', JSON.stringify(receipt)); },
			recover: function() { _('$$store_recover'); },
			event: {
				reply: function(details) {},
				changed: function(id, state) {},
				purchased: function(receipt, signature) {},
				revoked: function(products) {}
			}
		},

		sh: {
			exec: function(argv) { return _('$$sh_exec', JSON.stringify(argv)); },
			kill: function(pid) { _('$$sh_kill', pid); },

			event: {
				stdout: function(pid, output) {}
			}
		},

		util: {
			bytes: function(text) { return _('$$util_bytes', text); },
			text: function(bytes) { return _('$$util_text', bytes); }
		},

		stop: function() {},    /* iOS: applicationDidEnterBackground,  Android: onStop() */
		restart: function() {}, /* iOS: applicationWillEnterForeground, Android: onRestart() */

		bridge: function() {}
	};

	var pumpevent = function() {
		var ev;
		while (ev = _('$$app_getevent')) { dispatch(ev); }
	};

	var dispatch = function(ev) {
		var args = ev.split('\f');
		var prop = args.shift();
		var type = args.shift();
		if (native[prop] && native[prop].event[type]) {
			native[prop].event[type].apply(native, args);
		}
	};

	window.$native = native; /* export window object */
	window.$event = { start: function(delay) { window.setInterval(pumpevent, delay ? delay : 50); } };

	if (typeof window.$$app !== 'undefined') {
		_ = function() {
			var a = arguments[0].split('_');
			var o = a[0]; var f = a[1];
			if (typeof arguments[2] !== 'undefined')
				return window[o][f](arguments[1], arguments[2]);
			if (typeof arguments[1] !== 'undefined')
				return window[o][f](arguments[1]);
			return window[o][f]();
		}
		window.$event.trigger = pumpevent;
		window.$event.start = function() {
			window.addEventListener('beforeunload', function(){
				_('$$app_startevent', false); /* stop event */
			});
			_('$$app_startevent', true);
		}
	} else if (navigator.userAgent.indexOf('roland.quattro') != -1) {
		if (typeof window.$$prompt !== 'undefined') {
			_ = function() {
				var req = arguments[0];
				if (typeof arguments[1] !== 'undefined')
					req += ('\f' + encodeURIComponent(arguments[1]));
				if (typeof arguments[2] !== 'undefined')
					req += ('\f' + encodeURIComponent(arguments[2]));
				var res = prompt(req);
				if (res) { return decode(res) }
				webkit.messageHandlers.prompt.postMessage(req);
			}
			var bridge = {};
			bridge['prompt'] = _;
			bridge['xhr'] = function() {
				var req = arguments[0];
				if (typeof arguments[1] !== 'undefined')
					req += (',' + encodeURIComponent(arguments[1]));
				if (typeof arguments[2] !== 'undefined')
					req += (',' + encodeURIComponent(arguments[2]));
				var xhr = new XMLHttpRequest();
				var url = 'native://call?' + req;
				xhr.open('GET', url, false);
				xhr.send(null);
				return decode(xhr.responseText);
			}
			native.bridge = function(type) { _ = bridge[type]; }
		} else {
			_ = function() {
				var res;
				if (typeof arguments[2] !== 'undefined') {
					res = chrome.webview.hostObjects.sync.native(arguments[0], '' + arguments[1], '' + arguments[2]);
				} else if (typeof arguments[1] !== 'undefined') {
					res = chrome.webview.hostObjects.sync.native(arguments[0], '' + arguments[1]);
				} else {
					res = chrome.webview.hostObjects.sync.native(arguments[0]);
				}
				return decode(res);
			}
		}
		window.$event.dispatch = function(ev) { dispatch(ev); };
		window.$event.start = function() {
			_('$$app_startevent', true);
		}
	}

	native.call = _;  /* for native extensions */

	function decode(str) {
		var x = str.slice(1);
		switch (str.charAt(0)) {
			case 'v': return undefined;
			case 'b': return Boolean(x);
			case 'd': return parseInt(x);
			case 'f': return parseFloat(x);
			case 's': return x;
		}
		throw new Error(x);
	}

	function F5(x) {
		return 'F5' + (('0' + (x.length >> 1).toString(16)).substr(-2)) + x;
	}

	window.$load = function(url) {
		try  {
			var path = decodeURIComponent(window.location.href.replace('file://', ''));
			if (path.match(/^\/[a-zA-Z]:\//)) { path = path.substr(1); }
			var str = path.substring(0, path.lastIndexOf('/') + 1) + url;
			var file = str.replace(/\//g, $native.fs.separator());
			var data = $native.fs.readData(file);
			if (data.substring(0, 16) == '53616C7465645F5F') {
				var salt = data.substring(16, 32);
				var kiv = $native.security.kiv(salt);
				data = $native.security.aes.decrypt(data.substring(32), kiv);
			}
			var script = document.createElement('script');
			script.innerHTML = $native.util.text(data);
			document.head.appendChild(script);
		} catch (e) { alert(e); }
	}

})(window);
