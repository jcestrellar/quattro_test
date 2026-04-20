//
// Sequencer.cpp
//
// Copyright 2025 Roland Corporation. All rights reserved.
//

#include "Sequencer.h"

Sequencer::~Sequencer()
{
	if (mp_timer) {
		delete mp_timer;
		::timeEndPeriod(1);
	}
}

int Sequencer::vlength(const BYTE* data, int& pos)
{
	int len = 0;
	while (true) {
		BYTE x = data[pos++];
		len |= (x & 0x7f);
		if ((x & 0x80) != 0) {
			len <<= 7;
			continue;
		}
		break;
	}
	return len;
}

int Sequencer::parse(Track& track, const BYTE* data, int datalen)
{
	BYTE running = 0;

	int pos = 0, ticks = 0;
	while (pos < datalen) {
		int delta = vlength(data, pos);
		int len = 0, meta = -1;
		bool STS = false, F0 = false;

		BYTE sts = data[pos];
		switch (sts & 0xf0) {
			case 0x80: len = 3; running = sts; break;
			case 0x90: len = 3; running = sts; break;
			case 0xa0: len = 3; running = sts; break;
			case 0xb0: len = 3; running = sts; break;
			case 0xc0: len = 2; running = sts; break;
			case 0xd0: len = 2; running = sts; break;
			case 0xe0: len = 3; running = sts; break;
			case 0xf0:
				pos++;
				switch (sts & 0xff) {
					case 0xf0: len = vlength(data, pos); F0 = true; break;
					case 0xf7: len = vlength(data, pos); break;
					case 0xff:
						meta = data[pos++];
						len = vlength(data, pos);
						break;
					default:
						return -1; // found illegal F? message
				}
				break;
			default:
				len = 2; STS = true; // running status
				break;
		}

		std::string msg;
		if (len > 0) {
			std::string str((char*)data + pos, len);
			if (STS) {
				msg = char(running); msg += str;
			} else if (F0) {
				msg = char(0xf0); msg += str;
			} else {
				msg = str;
			}
			pos += len;
		}
		track.addEvent(TICK_EVENT(delta, meta, msg));
		ticks += delta;

		if (meta == 0x2f) break;

		if (meta == 0x02) {
			if (m_copyright.empty()) { m_copyright = msg; }
		} else if (meta == 0x03) {
			if (m_title.empty()) { m_title = msg; }
		} else 	if ((meta < 0) && ((msg[0] & 0xf0) == 0x90)) {
			m_ticks0 = (m_ticks0 < 0) ? ticks : min(m_ticks0, ticks);
		} else if (meta == 0x51) {
			const BYTE* data = (const BYTE*)msg.c_str();
			m_countin.setTempo(ticks, (data[0] << 16) | (data[1] << 8) | data[2]);
		} else if (meta == 0x58) {
			const BYTE* data = (const BYTE*)msg.c_str();
			m_measures.setTimeSignature(ticks, data[0], data[1], data[2]);
		}
	}

	return ticks;
}

bool Sequencer::load(const BYTE* data, int datalen, bool cue)
{
	static const BYTE MTHD[] = {
		0x4d, 0x54, 0x68, 0x64,	// "MThd"
		0x00, 0x00, 0x00, 0x06
	};

	static const BYTE MTRK[] = {
		0x4d, 0x54, 0x72, 0x6b	// "MTrk"
	};

	stop(false);

	m_tracks.removeAllTracks();
	m_metro.clearEvents();
	m_countin.clear();
	m_measures.clear();

	m_curticks = 0;
	m_ticks0 = -1;
	m_ticksA = m_ticksB = 0;

	m_title.clear();
	m_copyright.clear();

	if (!data || (datalen < 22)) {
		return false;
	}
	if (memcmp(MTHD, data, sizeof(MTHD))) {
		return false; // !SMF
	}
	m_ticksPQN = (data[12] << 8) | data[13];
	if ((m_ticksPQN & 0x8000) != 0) {
		return false; // SMPTE not supported
	}

	int ntrks = (data[10] << 8) | data[11];
	int maxticks = 0;
	data += 14;

	try {
		m_tracks.resize(ntrks);
		for (int trk = 0; trk < ntrks; ) {
			int len = ((data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]);
			if (memcmp(MTRK, data, sizeof(MTRK)) == 0) {
				int ticks = parse(m_tracks[trk], data + 8, len);
				if (ticks < 0) break;
				maxticks = max(ticks, maxticks);
				trk++;
			}
			data += (8 + len);
		}
	} catch (...) {
		m_tracks.removeAllTracks();
		return false;
	}

	m_measures.build(m_ticksPQN, maxticks);

	m_ticksA = m_ticks0 = (cue ? (max(0, m_ticks0)) : 0);
	m_ticksB = maxticks;

	m_smftempo.relative(0);
	evTimeSignature(4, 2, 24);
	m_tracks.advance(this, m_curticks = 1);
	seek(m_ticksA);

	return true;
}

void Sequencer::play(bool loop)
{
	m_loop = loop;
	if (!m_playing) {
		mutex_lock obj(m_mtx);
		if (m_countInBars != 0) {
			m_countin.start(this);
		}
		const SEQ_POSITION& s = m_measures.currentSection();
		m_metro.reset();
		m_metro.advance(this, (m_curticks - s.ticks) % (s.nn * s.ticksPerBeat));
		m_playing = true;
		if (!mp_timer) {
			::timeBeginPeriod(1);
			m_t0 = 0;
			mp_timer = new Timer(this);
			mp_timer->start(1);
		}
	}
}

void Sequencer::stop(bool reset)
{
	m_countin.clearEvents();

	if (m_playing) {
		{
			mutex_lock obj(m_mtx);
			if (!m_metroOn) {
				if (::GetCurrentThreadId() == mp_timer->tid()) {
					mp_timer->m_deleteSelf = true;
					mp_timer->stop();
				} else {
					delete mp_timer;
				}
				mp_timer = 0;
				::timeEndPeriod(1);
			}
			m_playing = false;
		}
		if ((0 < m_curticks) && (m_curticks < m_measures.maxticks())) {
			char msg[16 * 3];
			for (int ch = 0, i = 0; ch < 16; ch++) {
				msg[i++] = 0xb0 | ch; msg[i++] = 0x78; msg[i++] = 0x00; // All Sound Off
			}
			MIDISend(std::string(msg, sizeof(msg)), std::string());
		}
		if (mp_delegate) {
			mp_delegate->sequencerDidFinishPlaying();
		}
	}
	if (reset || (m_curticks >= m_ticksB)) {
		seek(m_ticksA);
	}
}

void Sequencer::metroSw(bool on)
{
	m_metroOn = on;
	if (on && !mp_timer) {
		m_metro.reset();
		::timeBeginPeriod(1);
		m_t0 = 0;
		mp_timer = new Timer(this);
		mp_timer->start(1);
	} else if (!on && !m_playing && mp_timer) {
		delete mp_timer;
		mp_timer = 0;
		::timeEndPeriod(1);
	}
}

void Sequencer::timerproc()
{
	if (m_t0 == 0) { m_t0 = Timer::currentUSecTimestamp(); m_flac = 0; }
	double  t1 = Timer::currentUSecTimestamp();
	double usec = (t1 - m_t0); m_t0 = t1;
	if (usec > 100000) return;
	m_flac += (usec * m_ticksPQN / m_tempoPQN);

	int ticks = int(m_flac);
	if (ticks == 0) return;
	m_flac -= ticks;

	mutex_lock obj(m_mtx);

	if (!m_playing) {
		MIDISend(std::string(), m_metro.advance(this, ticks));
		return;
	}
	do {
		if (m_countin.length() > 0) {
			m_metroticks = 0;
			MIDISend(std::string(), m_countin.advance(this, ticks));
			ticks = m_metroticks;
		} else {
			int step = max(0, min(ticks, m_ticksB - m_curticks));
			advance(step);
			ticks -= step;
			if (m_curticks >= m_ticksB) {
				if (m_loop && (m_ticksA != m_ticksB)) {
					seek(m_ticksA);
					if (m_countInBars < 0) {
						m_countin.start(this);
					}
				} else {
					stop(true);
					return;
				}
			}
		}
	} while (ticks > 0);
}

void Sequencer::advance(int ticks)
{
	m_curticks += ticks;
	m_measures.locate(m_curticks);

	std::string msg1 = m_tracks.advance(this, ticks);
	std::string msg2 = m_metro.advance(this, m_metroticks);
	if (!m_metroOn || m_seeking) {
		msg2 = std::string();
	}

	MIDISend(msg1, msg2);
}

void Sequencer::seek(int ticks)
{
	if (m_curticks == ticks) return;

	char msg[16 * 5];
	for (int ch = 0, i = 0; ch < 16; ch++) {
		msg[i++] = 0xb0 | ch;
		msg[i++] = 0x79; msg[i++] = 0x00; // Reset All Controllers
		msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
	}
	MIDISend(std::string(msg, sizeof(msg)), std::string());

	m_tracks.reset();
	m_metro.reset();
	m_measures.locate(0);
	m_curticks = 0;

	m_pending.clearBuffer();

	m_seeking = true;
	advance(ticks);
	m_seeking = false;

	MIDISend(m_pending.flushEvents(), std::string());
}

void Sequencer::locate(int beats)
{
	m_countin.clearEvents();

	if (lengthInBeats() == 0) return;

	int ticks = position(beats).ticks;
	if (ticks < m_ticksA) {
		ticks = m_ticksA;
	}
	if (ticks > m_ticksB) {
		ticks = m_ticksB;
	}

	mutex_lock obj(m_mtx);

	int ticksInBar = -1;
	if (!m_playing && m_metroOn) {
		// if the same time signature, leave the metronome in its current state.
		const SEQ_POSITION& s0 = m_measures.currentSection();
		const SEQ_POSITION& s1 = m_measures.findSection([ticks](auto it) {
			return (ticks >= it->ticks);
		});
		if ((s0.nn == s1.nn) && (s0.dd == s1.dd) && (s0.cc == s1.cc)) {
			ticksInBar = m_metro.ticksInBar();
		}
	}

	seek(ticks);

	if (ticksInBar >= 0) {
		m_metro.reset();
		m_metro.advance(this, ticksInBar);
	}
}

void Sequencer::range(int beatsA, int beatsB)
{
	int ticksA = position(beatsA).ticks;
	int ticksB = position(beatsB).ticks;

	if (ticksA < m_ticks0) {
		ticksA = m_ticks0;
	}
	if (ticksB > m_measures.maxticks()) {
		ticksB = m_measures.maxticks();
	}
	if (ticksA >= ticksB) {
		return;
	}

	mutex_lock obj(m_mtx);
	m_ticksA = ticksA;
	m_ticksB = ticksB;
	if ((m_curticks < m_ticksA) || (m_curticks >= m_ticksB)) {
		locate(beatsA);
	}
}

void Sequencer::evSetTempo(int newTempo)
{
	if (m_mute & (1 << CH_TEMPO_MUTE)) {
		return; /* skip during tempo mute */
	}

	if (newTempo == 0) {
		m_smftempo.relative(0);
	} else {
		newTempo = m_smftempo.convert(newTempo);
		if (m_tempoPQN != newTempo) {
			m_tempoPQN = newTempo;
			if (mp_delegate) {
				mp_delegate->sequencerTempoDidChange(tempo());
			}
		}
	}
}

void Sequencer::evTimeSignature(int nn, int dd, int cc)
{
	int ticks = nn * ((m_ticksPQN << 2) >> dd);
	if (ticks == 0) return;
	int delta = m_ticksPQN * cc / 24;
	if (delta == 0) { delta = 1; }

	m_metro.setEvents(createMetroEvents(ticks, delta, ticks / delta));
}

std::vector<Sequencer::TICK_EVENT> Sequencer::createMetroEvents(int ticks, int delta, int count) const
{
	std::vector<TICK_EVENT> events;
	events.push_back(TICK_EVENT(0, 0x7e, std::string(1, 0)));
	for (char n = 1; ticks > delta; ticks -= delta, n++) {
		events.push_back(TICK_EVENT(delta, 0x7e, std::string(1, n % count)));
	}
	events.push_back(TICK_EVENT(ticks, 0x2f, std::string()));
	return events;
}

void Sequencer::MIDISend(std::string msg1, std::string msg2) const
{
	if (mp_delegate) {
		while (msg1.length() > 255) {
			int pos = 255;
			while (!(msg1[pos] & 0x80)) pos--;
			mp_delegate->sequencerMIDISend(msg1.substr(0, pos), msg2);
			msg1 = msg1.substr(pos);
			msg2 = std::string();
		}
		if (!msg1.empty() || !msg2.empty()) {
			mp_delegate->sequencerMIDISend(msg1, msg2);
		}
	}
}

/* class Sequencer::TickHandler */

inline void Sequencer::TickHandler::setEvents(const std::vector<TICK_EVENT>& events)
{
	mutex_lock obj(m_mtx);
	reset();
	m_events = events;
}

inline void Sequencer::TickHandler::clearEvents()
{
	mutex_lock obj(m_mtx);
	reset();
	m_events.clear();
}

std::string Sequencer::TickHandler::advance(Sequencer* seq, int ticks)
{
	m_delta += ticks;
	m_msg.clear();
	mutex_lock obj(m_mtx);
	while (m_index < (int)m_events.size() && m_events[m_index].delta <= m_delta) {
		TICK_EVENT ev = m_events[m_index++];
		m_delta -= ev.delta;
		process(seq, ev);
	}
	return m_msg;
}

/* class Sequencer::Track */

void Sequencer::Track::process(Sequencer* seq, const TICK_EVENT& ev)
{
	if (ev.meta < 0) {
		BYTE sts = ev.data[0] & 0xf0;
		if (sts == 0x80 || sts == 0x90) {
			if (seq->m_seeking) {
				return; /* skip the note message in seeking */
			}
			BYTE ch = ev.data[0] & 0x0f;
			if (seq->m_mute & (1 << ch)) {
				return; /* skip muted channel */
			}
			if (seq->m_keyShift && (ch != 0x09)) {
				char buf[3] = { ev.data[0], char(ev.data[1] + seq->m_keyShift), ev.data[2] };
				m_msg += std::string(buf, 3);
				return;
			}
		} else if (seq->m_seeking && seq->m_pending.bufferEvent((const BYTE*)ev.data.c_str())) {
			return; /* skip pending event in seeking */
		}
		m_msg += ev.data;
	} else {
		if (ev.meta == 0x2f) {
			/* nothing to do */
		} else if (ev.meta == 0x58) {
			seq->m_metroticks = m_delta + 1;
			const BYTE* data = (const BYTE*)ev.data.c_str();
			seq->evTimeSignature(data[0], data[1], data[2]);
		} else if (ev.meta == 0x51) {
			const BYTE* data = (const BYTE*)ev.data.c_str();
			seq->evSetTempo((data[0] << 16) | (data[1] << 8) | data[2]);
		}
	}
}

/* class Sequencer::Metronome */

void Sequencer::Metronome::process(Sequencer* seq, const TICK_EVENT& ev)
{
	if (ev.meta == 0x2f) {
		m_index = 0;
	} else if (ev.meta == 0x7e) {
		if (!m_notes.empty()) {
			const BYTE* data = (const BYTE*)ev.data.c_str();
			int last = int(m_notes.size() - 1);
			int n = max(0, min(data[0], last));
			m_msg = m_notes[n];
		}
	}
}

/* class Sequencer::CountIn */

void Sequencer::CountIn::process(Sequencer* seq, const TICK_EVENT& ev)
{
	if (ev.meta == 0x2f) {
		seq->m_metroticks = m_delta + 1;
		clearEvents();
	} else {
		Sequencer::Metronome::process(seq, ev);
	}
}

void Sequencer::CountIn::start(Sequencer* seq)
{
	if (seq->lengthInBeats() == 0) return;

	SEQ_POSITION p = seq->position();

	std::map<int, int>::iterator it = m_map.find(p.ticks);
	if (it != m_map.end()) {
		seq->evSetTempo(it->second);
	}

	int bars = abs(seq->countInBars());
	int ticks = (p.beatsInBar * p.ticksPerBeat) + p.ticksInBeat;
	int ticksInBar = p.nn * p.ticksPerBeat;
	if (ticks > (ticksInBar - p.ticksPerBeat)) { bars--; }
	while (bars-- > 0) { ticks += ticksInBar; }

	setEvents(seq->createMetroEvents(ticks, p.ticksPerBeat, p.nn));
}

/* class Sequencer::Measures */

void Sequencer::Measures::build(int ticksPQN, int maxticks)
{
	auto last = m_sections.back();
	setTimeSignature(maxticks, last.nn, last.dd, last.cc);

	std::sort(m_sections.begin(), m_sections.end(), [](const SEQ_POSITION& a, const SEQ_POSITION& b) {
		return a.ticks < b.ticks;
	});

	std::for_each(m_sections.begin(), m_sections.end(), [ticksPQN](SEQ_POSITION& v) {
		int ticksPerBeat = ((ticksPQN << 2) >> v.dd);
		if (ticksPerBeat == 0) { ticksPerBeat = 1; }
		v.ticksPerBeat = ticksPerBeat;
	});

	for (auto it = m_sections.begin(), end = m_sections.end() - 1; it != end; it++) {
		int ticks = (it + 1)->ticks - it->ticks;
		int beats = (ticks + it->ticksPerBeat - 1) / it->ticksPerBeat;
		int bars = (beats + it->nn - 1) / it->nn;
		(it + 1)->beats = it->beats + beats;
		(it + 1)->bars = it->bars + bars;
	}
}

/* class Sequencer::PendingEvents */

bool Sequencer::PendingEvents::bufferEvent(const BYTE* data)
{
	BYTE sts = data[0] & 0xf0;
	BYTE ch  = data[0] & 0x0f;

	if (sts == 0xa0) { // Polyphonic Aftertouch
		int num = data[1] & 0x7f;
		m_An[ch][num] = data[2];
		return true;
	}

	if (sts == 0xe0) { // Pitch Bend
		m_En[ch][0] = data[1];
		m_En[ch][1] = data[2];
		return true;
	}

	if (sts == 0xb0) {
		int num = data[1] & 0x7f;
		switch (num) {
			case  1: // Modulation (MSB)
			case  2: // Breath Controller (MSB)
			case  4: // Foot Controller (MSB)
			case 10: // Pan (MSB)
			case 11: // Expression (MSB)
			case 16: // General Purpose Controller 1 (MSB)
			case 17: // General Purpose Controller 2 (MSB)
			case 18: // General Purpose Controller 3 (MSB)
			case 19: // General Purpose Controller 4 (MSB)
				m_Bn[ch][num] = data[2];
				if (m_Bn[ch][num + 32] != 0xff) {
					m_Bn[ch][num + 32] = 0;
				}
				return true;
			case 33: // Modulation (LSB)
			case 34: // Breath Controller (LSB)
			case 36: // Foot Controller (LSB)
			case 42: // Pan (LSB)
			case 43: // Expression (LSB)
			case 48: // General Purpose Controller 1 (LSB)
			case 49: // General Purpose Controller 2 (LSB)
			case 50: // General Purpose Controller 3 (LSB)
			case 51: // General Purpose Controller 4 (LSB)
			case 64: // Damper Pedal
			case 66: // Sostenuto Pedal
			case 67: // Soft Pedal
			case 80: // General Purpose Controller 5
			case 81: // General Purpose Controller 6
			case 82: // General Purpose Controller 7
			case 83: // General Purpose Controller 8
			case 88: // High Resolution Velocity Prefix
				m_Bn[ch][num] = data[2];
				return true;
			case 121: // Reset All Controllers
				clearBuffer();
				break;
		}
	}

	return false;
}

std::string Sequencer::PendingEvents::flushEvents() const
{
	std::string msg;
	for (int ch = 0; ch < 16; ch++) {
		char buf[3];
		if (m_En[ch][0] != 0xff) {
			buf[0] = (0xe0 + ch);
			buf[1] = m_En[ch][0];
			buf[2] = m_En[ch][1];
			msg += std::string(buf, 3);
		}
		for (int num = 0; num < 128; num++) {
			if (m_An[ch][num] != 0xff) {
				buf[0] = (0xa0 + ch);
				buf[1] = num;
				buf[2] = m_An[ch][num];
				msg += std::string(buf, 3);
			}
			if (m_Bn[ch][num] != 0xff) {
				buf[0] = (0xb0 + ch);
				buf[1] = num;
				buf[2] = m_Bn[ch][num];
				msg += std::string(buf, 3);
			}
		}
	}
	return msg;
}
