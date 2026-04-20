//
//	ble_midi_devices.js
//
//	Copyright 2024 Roland Corporation. All rights reserved.
//

$(function() {

	var STATE = [
		'DISCONNECTED',
		'CONNECTING',
		'CONNECTED',
		'DISCONNECTING',
	];

	var devices = [];

	$native.midi.event.ble = function(devs) {
		devices = JSON.parse(devs);
		list();
	};

	$('#ble-scan').on('click', function(){
		if ($('#ble-scan').text() == 'SCAN') {
			$('#ble-scan').text('SCANNIG...');
			$native.midi.ble.scanstart();
		} else {
			$('#ble-scan').text('SCAN');
			$native.midi.ble.scanstop();
		}
	});

	$('#ble-devices').on('click', '.connect', function(){
		var index = $(this).closest('tr').index();
		$native.midi.ble.connect(devices[index].id);
	});

	$('#ble-devices').on('click', '.disconnect', function(){
		var index = $(this).closest('tr').index();
		$native.midi.ble.disconnect(devices[index].id);
	});

	function list() {
		var doc = '<table>';
		for (var i = 0, num = devices.length; i < num; i++) {
			doc += (
				'<tr>' +
				'<td>' + devices[i].name + '</td>' +
				'<td>' + STATE[devices[i].state] + '</td>' +
				'<td><button class="connect">CONNECT</button></td>' +
				'<td><button class="disconnect">DISCONNECT</button></td>' +
				'</tr>'
			);
		}
		doc += '</table>'
		$('#ble-devices').empty();
		$('#ble-devices').append(doc);
	}

	$native.ble.event.unauthorized = function() {
		if (confirm('BLE unauthorized! Open "Settings"?')) {
			$native.fs.exec('app-settings:');
		}
	};

	window.addEventListener('beforeunload', function(){
		$native.midi.ble.scanstop();
	});
	
});
