//
//	smf_player.js
//
//	Copyright 2025 Roland Corporation. All rights reserved.
//

$(function() {

	/* create select options */
	(function() {
		var doc = '';
		for (var shift = -12; shift <= 12; shift++) {
			var text = (shift > 0) ? ('+' + shift) : shift;
			doc += '<option value="' + shift + '">' + text + '</option>';
		}
		$('#transpose').append(doc);

		doc = '';
		for (var ch = 1; ch <= 17; ch++) {
			var name = (ch == 17) ? 'TEMPO' : ('CH' + ch);
			doc += '<button class="mute">' + name + '</button>';
		}
		$('#mute').append(doc);
	})();

	var range = [0, 0];
	var measure = false;
	var onlocating = false;

	/* events */
	$native.seq.event = {
		stop: function() {
			$('#play').text('PLAY');
		},
		tempo: function(bpm) {
			update_tempo(bpm);
		}
	};

	$('#smf').on('click', function(e) {
		var filter = [ 'mid' ];
		$native.fs.openfilename(filter);
	});
	$native.fs.event.openfilename = function(file) {
		if (!file) return;
		try {
			var data = $native.fs.readData(file);
			var cue = $('#cue').prop('checked');
			$native.seq.load(data, cue);
			setup();
		} catch (e) { alert(e); }
	};
	$native.app.event.command = function(param1, param2) {
		if (param1 == 'open') {
			$native.fs.event.openfilename(param2);
		}
	};

	$('#play').on('click', function(e) {
		if ($(this).text() == 'PLAY') {
			$(this).text('STOP');
			$native.seq.play(true);
		} else {
			$native.seq.pause();
		}
	});
	$('#reset').on('click', function(e) {
		$native.seq.stop();
	});

	$('#metronome').on('click', function(e) {
		var on = !$native.seq.metro();
		$native.seq.metro(on);
		$(this).css('background', on ? '#fcc' : '#eee');
	});

	$('#tempo').on('change', function(e) {
		var bpm = $(this).val() * 1;
		update_tempo($native.seq.tempo(bpm));
	});

	$('#locate').on('input', function(e) {
		onlocating = true;
	});
	$('#locate').on('change', function(e) {
		var beats = $(this).val() * 1;
		$native.seq.locate(beats);
		onlocating = false;
	});

	$('#position').on('mousedown touchstart', function(e){
		e.preventDefault();
		measure = !measure;
	});
	$('#position').on('mouseup touchend', function(e){
		e.preventDefault();
	});

	$('#rangeA').on('click', function(e) {
		update_range($native.seq.position(), range[1]);
	});
	$('#rangeB').on('click', function(e) {
		update_range(range[0], $native.seq.position());
	});
	$('#rangeA').dblclick('click', function(e) {
		update_range(0, range[1]);
	});
	$('#rangeB').dblclick('click', function(e) {
		update_range(range[0], $native.seq.totalbeats());
	});

	$('#mute').on('click', '.mute', function(e) {
		var channels = $native.seq.mute();
		if ($(this).hasClass('muted')) {
			channels &= ~(1 << $(this).index());
			$(this).removeClass('muted');
		} else {
			channels |=  (1 << $(this).index());
			$(this).addClass('muted');
		}
		$native.seq.mute(channels);
	});

	$('#transpose').on('change', function(e) {
		var shift = $(this).val() * 1;
		$native.seq.transpose(shift);
	});

	$('#count-in').on('change', function(e) {
		var bars = $(this).val() * 1;
		$native.seq.countin(bars);
	});

	function setup() {
		var info = $native.seq.info();
		$('#trackinfo').text(info.title + ' /  ' + info.copyright);
		$('#locate').attr('max', $native.seq.totalbeats());
		range = $native.seq.range();
		update_range();
	};

	function update_tempo(bpm) {
		$('#tempo').val(bpm);
		$('#bpm').text(bpm);
	}

	function update_range(beatsA, beatsB) {
		range = $native.seq.range(beatsA, beatsB);
		$('#rangeA').text('A:' + range[0]);
		$('#rangeB').text('B:' + range[1]);
	}

	setInterval(function(){
		if (!onlocating) {
			var max = $('#locate').attr('max');
			if (measure) {
				var data = $native.seq.measure();
				var timesig = data[1] + '/' + data[2];
				var pos = ('M:' + (data[4] + 1) + '.' + (data[5] + 1));
				if (data[7]) { pos += ('@' + data[7]); } // count-in counts
				$('#locate').val(data[0]);
				$('#position').text(timesig + ' ' + pos);
			} else {
				var pos = $native.seq.position();
				$('#locate').val(pos);
				$('#position').text(pos + ' / ' + max + ' (beats)');
			}
		}
	}, 100);

	/* initialize values */

	var metroNotes = {
		normal:    ['F50590227F2200', 'F50590217F2100'],
		triangle:  ['F50590517F5100', 'F50590507F5000'],
		woodblock: ['F505904C7F4C00', 'F505904D7F4D00'],
		handclap:  ['F50590277F2700'],
		sticks:    ['F505901F7F1F00'],
	};
	$native.seq.metroset(metroNotes['normal']);
	$native.seq.countset(metroNotes['sticks']);

	update_tempo($native.seq.tempo());
	if ($native.seq.metro()) {
		$('#metronome').css('background', '#fcc');
	}
	var channels = $native.seq.mute();
	for (var ch = 0; ch < 17; ch++) {
		if (channels & (1 << ch)) {
			$('.mute').eq(ch).addClass('muted');
		}
	}
	$('#transpose').val($native.seq.transpose());
	$('#count-in').val($native.seq.countin());

	setup();

});
