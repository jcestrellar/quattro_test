//
//	Sequencer.java
//
//	Copyright 2025 Roland Corporation. All rights reserved.
//

package quattro.Sound;

import static java.util.Arrays.copyOfRange;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;
import java.util.function.Predicate;

public class Sequencer {

	private static final byte[] MTHD = {
		0x4d, 0x54, 0x68, 0x64,	// "MThd"
		0x00, 0x00, 0x00, 0x06
	};

	private static final byte[] MTRK = {
		0x4d, 0x54, 0x72, 0x6b	// "MTrk"
	};

	private class TickEvent {
		public int delta;
		public int meta;
		public byte[] data;

		TickEvent(int delta, int meta, byte[] data) {
			this.delta = delta;
			this.meta = meta;
			this.data = data;
		}
	}

	private abstract class TickHandler {
		protected ArrayList<TickEvent> events = new ArrayList<TickEvent>();
		protected int index = 0;
		protected int delta = -1;
		protected ByteArrayOutputStream data = new ByteArrayOutputStream();

		public void setEvents(ArrayList<TickEvent> events) {
			synchronized(this) {
				reset();
				this.events = events;
			}
		}
		public void clearEvents() {
			synchronized(this) {
				reset();
				events.clear();
			}
		}
		public void addEvent(TickEvent ev) {
			events.add(ev);
		}
		public int length() {
			return events.size();
		}
		public void reset() {
			index = 0; delta = -1;
		}

		public byte[] advance(int ticks) {
			delta += ticks;
			data.reset();
			synchronized(this) {
				while ((index < events.size()) && (events.get(index).delta <= delta)) {
					TickEvent ev = events.get(index++);
					delta -= ev.delta;
					process(ev);
				}
			}
			return (data.size() > 0) ? data.toByteArray() : null;
		}
		protected abstract void process(TickEvent ev);
	}

	private class Track extends TickHandler {
		@Override
		protected void process(TickEvent ev) {
			if (ev.meta < 0) {
				byte[] msg = ev.data;
				int sts = (msg[0] & 0xf0);
				if (sts == 0x80 || sts == 0x90) {
					if (seeking) return; /* skip the note message in seeking */
					int ch = (msg[0] & 0x0f);
					if ((mute & (1 << ch)) != 0) return; /* skip muted channel */
					if ((keyShift != 0) && (ch != 0x09)) {
						msg = new byte[]{ msg[0], (byte)(msg[1] + keyShift), msg[2] };
					}
				} else if (seeking && pending.bufferEvent(msg)) {
					return; /* skip pending event in seeking */
				}
				try {
					data.write(msg);
				} catch (IOException e) { }
			} else {
				if (ev.meta == 0x2f) {
					/* nothing to do */
				} else if (ev.meta == 0x58) {
					metroticks = delta + 1;
					evTimeSignature(
						(ev.data[0] & 0xff),
						(ev.data[1] & 0xff),
						(ev.data[2] & 0xff));
				} else if (ev.meta == 0x51) {
					int tempo =
						((ev.data[0] & 0xff) << 16) |
						((ev.data[1] & 0xff) <<  8) |
						((ev.data[2] & 0xff));
					evSetTempo(tempo);
				}
			}
		}
	}

	private class Metronome extends TickHandler {
		private ArrayList<byte[]> notes = new ArrayList<byte[]>();

		public void setNotes(ArrayList<byte[]> notes) {
			synchronized(this) {
				this.notes = notes;
			}
		}
		public int ticksInBar() {
			int ticks = delta + 1;
			for (int i = 0; i < index; i++) {
				ticks += events.get(i).delta;
			}
			return ticks;
		}

		@Override
		protected void process(TickEvent ev) {
			if (ev.meta == 0x2f) {
				index = 0;
			} else if (ev.meta == 0x7e) {
				if ((notes != null) && !notes.isEmpty()) {
					int last = notes.size() - 1;
					int n = Math.max(0, Math.min(ev.data[0], last));
					try {
						data.write(notes.get(n));
					} catch (IOException e) { }
				}
			}
		}
	}

	private class CountIn extends Metronome {
		private HashMap<Integer, Integer> map = new HashMap<>();

		public void clear() {
			map.clear();
		}
		public void setTempo(int ticks, int tempo) {
			map.put(ticks, tempo);
		}

		public void start() {
			if (lengthInBeats() == 0) return;

			Position p = position();
			if (map.containsKey(p.ticks)) {
				evSetTempo(map.get(p.ticks));
			}

			int bars = Math.abs(countInBars);
			int ticks = (p.beatsInBar * p.ticksPerBeat) + p.ticksInBeat;
			int ticksInBar = p.nn * p.ticksPerBeat;
			if (ticks > (ticksInBar - p.ticksPerBeat)) { bars--; }
			while (bars-- > 0) { ticks += ticksInBar; }
			setEvents(createMetroEvents(ticks, p.ticksPerBeat, p.nn));
		}
		public int count() {
			return (index > 0 ? (length() - index) : 0);
		}

		@Override
		protected void process(TickEvent ev) {
			if (ev.meta == 0x2f) {
				metroticks = delta + 1;
				clearEvents();
			} else {
				super.process(ev);
			}
		}
	}

	private class Tracks extends ArrayList<Track> {
		private ByteArrayOutputStream data = new ByteArrayOutputStream();

		public void addTrack(Track track) {
			add(track);
		}
		public void removeAllTracks() {
			clear();
		}
		public void reset() {
			for (Track track : this) {
				track.reset();
			}
		}
		public byte[] advance(int ticks) {
			metroticks = ticks;
			data.reset();
			for (Track track : this) {
				byte[] msg = track.advance(ticks);
				if (msg != null) {
					try {
						data.write(msg);
					} catch (IOException e) { }
				}
			}
			return (data.size() > 0) ? data.toByteArray() : null;
		}
	}

	private class Measures {
		private ArrayList<Position> sections = new ArrayList<Position>();
		private int index = 0;

		public Measures() {
			setTimeSignature(0, 4, 2, 24);
		}

		public void clear() {
			index = 0;
			sections.subList(1, sections.size()).clear();
		}

		public void setTimeSignature(int ticks, int nn, int dd, int cc) {
			if (nn != 0) {
				sections.add(new Position(ticks, nn, dd, cc));
			}
		}

		public void build(int maxticks) {
			Position last = sections.get(sections.size() - 1);
			setTimeSignature(maxticks, last.nn, last.dd, last.cc);

			sections.sort(Comparator.comparingInt(a -> a.ticks));

			for (Position v : sections) {
				int ticksPerBeat = ((ticksPQN << 2) >> v.dd);
				if (ticksPerBeat == 0) ticksPerBeat = 1;
				v.ticksPerBeat = ticksPerBeat;
			}

			for (int i = 0; i < sections.size() - 1; i++) {
				int ticks = sections.get(i + 1).ticks - sections.get(i).ticks;
				int beats = (ticks + sections.get(i).ticksPerBeat - 1) / sections.get(i).ticksPerBeat;
				int bars = (beats + sections.get(i).nn - 1) / sections.get(i).nn;
				sections.get(i + 1).beats = sections.get(i).beats + beats;
				sections.get(i + 1).bars = sections.get(i).bars + bars;
			}
		}

		public int maxticks() {
			return sections.get(sections.size() - 1).ticks;
		}
		public int maxbeats() {
			return sections.get(sections.size() - 1).beats;
		}

		public void locate(int ticks) {
			if (ticks < sections.get(index).ticks) { index = 0; }
			while ((index < sections.size() - 1) && (ticks >= sections.get(index + 1).ticks)) {
				index++;
			}
		}
		public Position currentSection() {
			return sections.get(index);
		}

		public Position findSection(Predicate<Position> condition) {
			for (int i = sections.size() - 1; i >= 0; i--) {
				if (condition.test(sections.get(i))) {
					return sections.get(i);
				}
			}
			return sections.get(0);
		}
	}

	private class SMFTempo {
		private double rate = 1.0;
		private int tempoPQN = 0;

		public void relative(int tempo) {
			if (tempo == 0) {
				rate = 1.0; tempoPQN = 0;
			} else {
				rate = (tempoPQN != 0) ? (double)tempoPQN / tempo : 1.0;
			}
		}
		public int convert(int tempo) {
			tempoPQN = tempo;
			return (int)(tempo / rate);
		}
	}

	private class PendingEvents {
		private final byte[][] _An = new byte[16][128]; // buffered Polyphonic Aftertouch values
		private final byte[][] _Bn = new byte[16][128]; // buffered Control Change values
		private final byte[][] _En = new byte[16][2];   // buffered Pitch Bend values

		public PendingEvents() {
			clearBuffer();
		}

		public void clearBuffer() {
			for (byte[] a : _An) { Arrays.fill(a, (byte)0xff); }
			for (byte[] a : _Bn) { Arrays.fill(a, (byte)0xff); }
			for (byte[] a : _En) { Arrays.fill(a, (byte)0xff); }
		}

		boolean bufferEvent(byte[] data) {
			int sts = data[0] & 0xf0;
			int ch  = data[0] & 0x0f;
			if (sts == 0xa0) { // Polyphonic Aftertouch
				int num = data[1] & 0x7f;
				_An[ch][num] = data[2];
				return true;
			}
			if (sts == 0xe0) { // Pitch Bend
				_En[ch][0] = data[1];
				_En[ch][1] = data[2];
				return true;
			}
			if (sts == 0xb0) {
				int num = data[1] & 0x7f;
				switch (num) {
					case  1:  // Modulation (MSB)
					case  2:  // Breath Controller (MSB)
					case  4:  // Foot Controller (MSB)
					case 10:  // Pan (MSB)
					case 11:  // Expression (MSB)
					case 16:  // General Purpose Controller 1 (MSB)
					case 17:  // General Purpose Controller 2 (MSB)
					case 18:  // General Purpose Controller 3 (MSB)
					case 19:  // General Purpose Controller 4 (MSB)
						_Bn[ch][num] = data[2];
						if (_Bn[ch][num + 32] != (byte)0xff) {
							_Bn[ch][num + 32] = 0;
						}
						return true;
					case 33:  // Modulation (LSB)
					case 34:  // Breath Controller (LSB)
					case 36:  // Foot Controller (LSB)
					case 42:  // Pan (LSB)
					case 43:  // Expression (LSB)
					case 48:  // General Purpose Controller 1 (LSB)
					case 49:  // General Purpose Controller 2 (LSB)
					case 50:  // General Purpose Controller 3 (LSB)
					case 51:  // General Purpose Controller 4 (LSB)
					case 64:  // Damper Pedal
					case 66:  // Sostenuto Pedal
					case 67:  // Soft Pedal
					case 80:  // General Purpose Controller 5
					case 81:  // General Purpose Controller 6
					case 82:  // General Purpose Controller 7
					case 83:  // General Purpose Controller 8
					case 88:  // High Resolution Velocity Prefix
						_Bn[ch][num] = data[2];
						return true;
					case 121: // Reset All Controllers
						clearBuffer();
						break;
				}
			}
			return false;
		}

		public byte[] flushEvents() {
			ByteArrayOutputStream data = new ByteArrayOutputStream();
			for (int ch = 0; ch < 16; ch++) {
				if (_En[ch][0] != (byte)0xff) {
					data.write(0xe0 + ch);
					data.write(_En[ch][0]);
					data.write(_En[ch][1]);
				}
				for (int num = 0; num < 128; num++) {
					if (_An[ch][num] != (byte)0xff) {
						data.write(0xa0 + ch);
						data.write(num);
						data.write(_An[ch][num]);
					}
					if (_Bn[ch][num] != (byte)0xff) {
						data.write(0xb0 + ch);
						data.write(num);
						data.write(_Bn[ch][num]);
					}
				}
			}
			return (data.size() > 0) ? data.toByteArray() : null;
		}
	}

	public class Position {
		public int ticks = 0;
		public int nn = 0, dd = 0, cc = 0; // Time Signature (FF 58 04 nn dd cc)
		public int ticksPerBeat = 0;
		public int beats = 0;
		public int bars = 0;
		public int beatsInBar = 0;
		public int ticksInBeat = 0;

		public Position(int ticks, int nn, int dd, int cc) {
			this.ticks = ticks;
			this.nn = nn; this.dd = dd; this.cc = cc;
			this.ticksPerBeat = 1;
		}
	}

	public SequencerDelegate delegate = null;

	public boolean loop = false;
	public boolean metroOn = false;
	public int countInBars = 0;

	private boolean playing = false;
	private boolean seeking = false;

	private Tracks tracks = new Tracks();
	private Metronome metro = new Metronome();
	private CountIn countin = new CountIn();
	private Measures measures = new Measures();
	private SMFTempo smftempo = new SMFTempo();
	private PendingEvents pending = new PendingEvents();

	private int ticksPQN = 96;
	private int tempoPQN = 500000; // BPM 120
	private Timer timer = null;
	private long t0 = 0;
	private double flac = 0;

	private int curticks = 0;
	private int metroticks = 0;

	private int ticks0 = 0;
	private int ticksA = 0;
	private int ticksB = 0;

	private int mute = 0;
	private int keyShift = 0;

	private String title = "";
	private String copyright = "";

	private static final int CH_TEMPO_MUTE = 16;

	public Sequencer() {
		evTimeSignature(4, 2, 24);
	}

	private int pos = 0;
	private int vlength(byte[] data) {
		int len = 0;
		while (true) {
			byte x = data[pos++];
			len |= (x & 0x7f);
			if ((x & 0x80) != 0) {
				len <<= 7;
				continue;
			}
			break;
		}
		return len;
	}

	private int parse(Track track, byte[] data) {
		int ticks = 0;
		byte running = 0;

		pos = 0;
		while (pos < data.length) {
			int delta = vlength(data);
			int len = 0, meta = -1;
			boolean STS = false, F0 = false;

			byte sts = data[pos];
			switch (sts & 0xf0) {
				case 0x080: len = 3; running = sts; break;
				case 0x090: len = 3; running = sts; break;
				case 0x0a0: len = 3; running = sts; break;
				case 0x0b0: len = 3; running = sts; break;
				case 0x0c0: len = 2; running = sts; break;
				case 0x0d0: len = 2; running = sts; break;
				case 0x0e0: len = 3; running = sts; break;
				case 0x0f0:
					pos++;
					switch (sts & 0xff) {
						case 0x0f0: len = vlength(data); F0 = true; break;
						case 0x0f7: len = vlength(data); break;
						case 0x0ff:
							meta = data[pos++];
							len = vlength(data);
							break;
						default:
							return -1; // found illegal F? message
					}
					break;
				default:
					len = 2; STS = true; // running status
					break;
			}

			byte[] msg = null;
			if (len > 0) {
				int n = (STS || F0) ? 1 : 0;
				msg = new byte[n + len];
				if (STS) {
					msg[0] = running;
				} else if (F0) {
					msg[0] = (byte)0xf0;
				}
				System.arraycopy(copyOfRange(data, pos, pos + len), 0, msg, n, len);
				pos += len;
			}
			track.addEvent(new TickEvent(delta, meta, msg));
			ticks += delta;

			if (meta == 0x2f) break;
			if (meta == 0x02) {
				if (copyright.isEmpty() && (msg != null)) { copyright = new String(msg); }
			} else if (meta == 0x03) {
				if (title.isEmpty() && (msg != null)) { title =  new String(msg); }
			} else if (meta == 0x51) {
				int tempo =
						((msg[0] & 0xff) << 16) |
						((msg[1] & 0xff) <<  8) |
						((msg[2] & 0xff));
				countin.setTempo(ticks, tempo);
			} else if (meta == 0x58) {
				measures.setTimeSignature(ticks,
						(msg[0] & 0xff),
						(msg[1] & 0xff),
						(msg[2] & 0xff));
			} else 	if ((meta < 0) && ((msg[0] & 0xf0) == 0x90)) {
				ticks0 = (ticks0 < 0) ? ticks : Math.min(ticks0, ticks);
			}
		}

		return ticks;
	}

	public boolean load(byte[] data, boolean cue) {
		stop(false);

		synchronized (tracks) {
			tracks.removeAllTracks();
		}
		metro.clearEvents();
		countin.clear();
		measures.clear();
		curticks = 0;
		ticks0 = -1;
		ticksA = ticksB = 0;

		title = copyright = "";

		if ((data == null) || (data.length < 22)) {
			return false;
		}
		if (!Arrays.equals(MTHD, copyOfRange(data,  0, MTHD.length))) {
			return false; // !SMF
		}

		ticksPQN = ((data[12] & 0xff) << 8) | (data[13] & 0xff);
		if ((ticksPQN & 0x8000) != 0) {
			return false; // SMPTE not supported
		}

		int offset = 14;
		int ntrks = ((data[10] & 0xff) << 8) | (data[11] & 0xff);
		int maxticks = 0;

		try {
			while (ntrks > 0) {
				int len = (
					((data[offset + 4] & 0xff) << 24) |
					((data[offset + 5] & 0xff) << 16) |
					((data[offset + 6] & 0xff) <<  8) |
					((data[offset + 7] & 0xff))
				);
				if (Arrays.equals(MTRK, copyOfRange(data, offset, offset + MTRK.length))) {
					Track track = new Track();
					int ticks = parse(track, copyOfRange(data, offset + 8, offset + (8 + len)));
					if (ticks < 0) break;
					tracks.addTrack(track);
					maxticks = Math.max(ticks, maxticks);
					ntrks--;
				}
				offset += (8 + len);
			}
		} catch (Exception e) {
			tracks.removeAllTracks();
			return false;
		}

		measures.build(maxticks);

		ticksA = ticks0 = (cue ? Math.max(0, ticks0) : 0);
		ticksB = maxticks;

		smftempo.relative(0);
		evTimeSignature(4, 2, 24);
		tracks.advance(curticks = 1);
		seek(ticksA);

		return true;
	}

	public void play(boolean loop) {
		this.loop = loop;
		if (!playing) {
			synchronized (tracks) {
				if (countInBars != 0) {
					countin.start();
				}
				Position s = measures.currentSection();
				metro.reset();
				metro.advance((curticks - s.ticks) % (s.nn * s.ticksPerBeat));
				playing = true;
				if (timer == null) {
					start();
				}
			}
		}
	}

	private void start() {
		t0 = 0;
		timer = new Timer();
		timer.schedule(new TimerTask() {
			@Override
			public void run() {
				synchronized (tracks) {
					timerproc();
				}
			}
		}, 0, 1);
	}

	public void stop(boolean reset) {
		countin.clearEvents();
		if (playing) {
			if (!metroOn) {
				timer.cancel();
				timer = null;
			}
			synchronized (tracks) {
				playing = false;
			}
			if ((0 < curticks) && (curticks < measures.maxticks())) {
				byte[] msg = new byte[16 * 3];
				for (int ch = 0, i = 0; ch < 16; ch++) {
					msg[i++] = (byte) (0xb0 | ch); msg[i++] = 0x78; msg[i++] = 0x00; // All Sound Off
				}
				MIDISend(msg, null);
			}
			if (delegate != null) {
				delegate.sequencerDidFinishPlaying();
			}
		}
		if (reset || (curticks >= ticksB)) {
			seek(ticksA);
		}
	}

	private void timerproc() {
		if (t0 == 0) { t0 = System.nanoTime() / 1000L; flac = 0; }
		long t1 = System.nanoTime() / 1000L;
		double usec = (t1 - t0); t0 = t1;
		if (usec > 100000) return;
		flac += (usec * ticksPQN / tempoPQN);

		int ticks = (int)flac;
		if (ticks == 0) return;
		flac -= ticks;

		if (!playing) {
			MIDISend(null, metro.advance(ticks));
			return;
		}
		do {
			if (countin.length() > 0) {
				metroticks = 0;
				MIDISend(null, countin.advance(ticks));
				ticks = metroticks;
			} else {
				int step = Math.max(0, Math.min(ticks, ticksB - curticks));
				advance(step);
				ticks -= step;
				if (curticks >= ticksB) {
					if (loop && (ticksA != ticksB)) {
						seek(ticksA);
						if (countInBars < 0) {
							countin.start();
						}
					} else {
						stop(true);
						return;
					}
				}
			}
		} while (ticks > 0);
	}

	private void advance(int ticks) {
		curticks += ticks;
		measures.locate(curticks);

		byte[] msg1 = tracks.advance(ticks);
		byte[] msg2 = metro.advance(metroticks);
		if (!metroOn || seeking) {
			msg2 = null;
		}

		MIDISend(msg1, msg2);
	}

	private void seek(int ticks) {
		if (curticks == ticks) return;

		byte[] msg = new byte[16 * 5];
		for (int ch = 0, i = 0; ch < 16; ch++) {
			msg[i++] = (byte) (0xb0 | ch);
			msg[i++] = 0x79; msg[i++] = 0x00; // Reset All Controllers
			msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
		}
		MIDISend(msg, null);

		tracks.reset();
		metro.reset();
		measures.locate(0);
		curticks = 0;

		pending.clearBuffer();

		seeking = true;
		advance(ticks);
		seeking = false;

		MIDISend(pending.flushEvents(), null);
	}

	public void locate(int beats) {
		countin.clearEvents();

		if (lengthInBeats() == 0) return;

		int ticks = position(beats).ticks;
		if (ticks < ticksA) {
			ticks = ticksA;
		}
		if (ticks > ticksB) {
			ticks = ticksB;
		}

		synchronized (tracks) {
			int ticksInBar = -1;
			if (!playing && metroOn) {
				// if the same time signature, leave the metronome in its current state.
				int _ticks = ticks;
				Position s0 = measures.currentSection();
				Position s1 = measures.findSection(section -> _ticks >= section.ticks);
				if ((s0.nn == s1.nn) && (s0.dd == s1.dd) && (s0.cc == s1.cc)) {
					ticksInBar = metro.ticksInBar();
				}
			}
			seek(ticks);
			if (ticksInBar >= 0) {
				metro.reset();
				metro.advance(ticksInBar);
			}
		}
	}

	public void range(int beatsA, int beatsB) {
		int _ticksA = position(beatsA).ticks;
		int _ticksB = position(beatsB).ticks;

		if (_ticksA < ticks0) {
			_ticksA = ticks0;
		}
		if (_ticksB > measures.maxticks()) {
			_ticksB = measures.maxticks();
		}
		if (_ticksA >= _ticksB) {
			return;
		}

		synchronized (tracks) {
			ticksA = _ticksA;
			ticksB = _ticksB;
			if ((curticks < ticksA) || (curticks >= ticksB)) {
				locate(beatsA);
			}
		}
	}

	private void evSetTempo(int newTempo) {
		if ((mute & (1 << CH_TEMPO_MUTE)) != 0) {
			return; /* skip during tempo mute */
		}
		if (newTempo == 0) {
			smftempo.relative(0);
		} else {
			newTempo = smftempo.convert(newTempo);
			if (tempoPQN != newTempo) {
				tempoPQN = newTempo;
				if (delegate != null) {
					delegate.sequencerTempoDidChange(tempo());
				}
			}
		}
	}

	private void evTimeSignature(int nn, int dd, int cc) {
		int ticks = nn * ((ticksPQN << 2) >> dd);
		if (ticks == 0) return;
		int delta = ticksPQN * cc / 24;
		if (delta == 0) { delta = 1; }
		metro.setEvents(createMetroEvents(ticks, delta, ticks / delta));
	}

	private ArrayList<TickEvent> createMetroEvents(int ticks, int delta, int count) {
		ArrayList<TickEvent> events = new ArrayList<TickEvent>();
		events.add(new TickEvent(0, 0x7e, new byte[]{0}));
		for (int n = 1; ticks > delta; ticks -= delta, n++) {
			events.add(new TickEvent(delta, 0x7e, new byte[]{ (byte)(n % count) }));
		}
		events.add(new TickEvent(ticks, 0x2f, null));
		return events;
	}

	private void MIDISend(byte[] msg1, byte[] msg2) {
		if (delegate != null) {
			if (msg1 != null) {
				while (msg1.length > 255) {
					int pos = 255;
					while ((msg1[pos] & 0x80) == 0) pos--;
					delegate.sequencerMIDISend(copyOfRange(msg1, 0, pos), msg2);
					msg1 = copyOfRange(msg1, pos, msg1.length);
					msg2 = null;
				}
			}
			if ((msg1 != null) || (msg2 != null)) {
				delegate.sequencerMIDISend(msg1, msg2);
			}
		}
	}

	public String title() {
		return title;
	}
	public String copyright() {
		return copyright;
	}

	public int lengthInBeats() {
		return measures.maxbeats();
	}

	public Position position() {
		Position s = measures.currentSection();
		int _ticks = curticks - s.ticks;
		int _beats = _ticks / s.ticksPerBeat;

		Position p = new Position(curticks, s.nn, s.dd, s.cc);
		p.ticksPerBeat = s.ticksPerBeat;
		p.beats = _beats + s.beats;
		p.bars = (_beats / s.nn) + s.bars;
		p.beatsInBar = _beats % s.nn;
		p.ticksInBeat = _ticks % s.ticksPerBeat;
		return p;
	}

	public Position position(int beats) {
		Position s = measures.findSection(section -> beats >= section.beats);
		int _beats = beats - s.beats;

		Position p = new Position(0, s.nn, s.dd, s.cc);
		p.ticks = (_beats * s.ticksPerBeat) + s.ticks;
		p.ticksPerBeat = s.ticksPerBeat;
		p.beats = beats;
		p.bars = (_beats / s.nn) + s.bars;
		p.beatsInBar = _beats % s.nn;
		p.ticksInBeat = 0;
		return p;
	}

	public int beatsA() {
		if (ticksA > 0) {
			Position s = measures.findSection(section -> ticksA >= section.ticks);
			return ((ticksA - s.ticks) / s.ticksPerBeat) + s.beats;
		}
		return 0;
	}
	public int beatsB() {
		if (ticksB > 0) {
			Position s = measures.findSection(section -> ticksB >= section.ticks);
			return ((ticksB - s.ticks) / s.ticksPerBeat) + s.beats;
		}
		return 0;
	}

	public int countInState() {
		return countin.count();
	}

	public void tempo(int bpm) {
		if ((bpm < 10) || (480 < bpm))
			return;

		tempoPQN = (int)((60 * 1000000) / bpm);
		smftempo.relative(tempoPQN);
	}
	public int tempo() {
		return (int)((60 * 1000000) / tempoPQN);
	}

	public void mute(int channels) {
		ByteArrayOutputStream msg = new ByteArrayOutputStream();
		for (int ch = 0, i = 0; ch < 16; ch++) {
			if (((channels & (1 << ch)) != 0) && ((mute & (1 << ch)) == 0)) {
				msg.write(0xb0 | ch);
				msg.write(0x7b); // All Notes Off
				msg.write(0x00);
			}
		}
		mute = channels;
		MIDISend(msg.toByteArray(), null);
	}
	public int mute() {
		return mute;
	}

	public void transpose(int shift) {
		keyShift = shift;
		byte[] msg = new byte[16 * 3];
		for (int ch = 0, i = 0; ch < 16; ch++) {
			msg[i++] = (byte) (0xb0 | ch); msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
		}
		MIDISend(msg, null);
	}
	public int transpose() {
		return keyShift;
	}

	public void metroSw(boolean on) {
		metroOn = on;
		if (on && (timer == null)) {
			metro.reset();
			start();
		} else if (!on && !playing && (timer != null)) {
			timer.cancel();
			timer = null;
		}
	}
	public boolean metroSw() {
		return metroOn;
	}

	public void setMetroNotes(ArrayList<byte[]> notes) {
		metro.setNotes(notes);
	}

	public void setCountNotes(ArrayList<byte[]> notes) {
		countin.setNotes(notes);
	}

	public void destroy() {
		if (timer != null) {
			timer.cancel();
			timer = null;
		}
		delegate = null;
		tracks.removeAllTracks();
		tracks = null;
		metro.clearEvents();
		metro = null;
	}

}
