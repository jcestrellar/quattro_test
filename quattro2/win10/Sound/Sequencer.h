/*
 * @(#)Sequencer.h
 *
 * Copyright 2025 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __SEQUENCER_H__
#define __SEQUENCER_H__

#include "../Common/Thread.h"
#include "../Common/Timer.h"

#include <atlstr.h>
#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include <functional>

typedef struct SEQ_POSITION
{
	int ticks;
	int nn; int dd; int cc; // Time Signature (FF 58 04 nn dd cc)
	int ticksPerBeat;
	int beats;
	int bars;
	int beatsInBar;
	int ticksInBeat;

	SEQ_POSITION() { SEQ_POSITION(0, 4, 2, 24); }
	SEQ_POSITION(int ticks, int nn, int dd, int cc) : ticks(ticks), nn(nn), dd(dd), cc(cc),
		ticksPerBeat(1), beats(0), bars(0), beatsInBar(0), ticksInBeat(0) {}
} SEQ_POSITION;

class SequencerDelegate {
  public:
	virtual ~SequencerDelegate() { }

	/* @required */
	virtual void sequencerMIDISend(const std::string& data, const std::string& metroNote) = 0;
	virtual void sequencerDidFinishPlaying() = 0;
	virtual void sequencerTempoDidChange(int newTempo) = 0;
};

class Sequencer : public Timer::Proc
{
  private:
	typedef struct TICK_EVENT
	{
		int delta;
		int meta;
		std::string data;
		TICK_EVENT(int delta, int meta, const std::string data)
			: delta(delta), meta(meta), data(data) {}
	} TICK_EVENT;

	class TickHandler
	{
	  public:
		TickHandler();
		virtual ~TickHandler();

		void setEvents(const std::vector<TICK_EVENT>& events);
		void clearEvents();
		void addEvent(const TICK_EVENT& ev);
		int length() const;
		void reset();

		std::string advance(Sequencer* seq, int ticks);

	  protected:
		std::vector<TICK_EVENT> m_events;
		int m_index;
		int m_delta;
		std::string m_msg;
		Mutex m_mtx;

		virtual void process(Sequencer* seq, const TICK_EVENT& ev) = 0;
	};

	class Track : public TickHandler
	{
	  protected:
		void process(Sequencer* seq, const TICK_EVENT& ev);
	};

	class Metronome : public TickHandler
	{
	  private:
		std::vector<std::string> m_notes;
	  public:
		void setNotes(const std::vector<std::string> notes) {
			mutex_lock obj(m_mtx);
			m_notes = notes;
		}
		int ticksInBar() const {
			mutex_lock obj(m_mtx);
			int ticks = m_delta + 1;
			for (int i = 0; i < m_index; i++) {
				ticks += m_events[i].delta;
			}
			return ticks;
		}
	  protected:
		virtual void process(Sequencer* seq, const TICK_EVENT& ev);
	};

	class CountIn : public Metronome
	{
	  private:
		std::map<int, int> m_map;
	  public:
		void clear() { m_map.clear(); }
		void setTempo(int ticks, int tempo) {
			m_map.insert(std::make_pair(ticks, tempo));
		}
		void start(Sequencer* seq);
		int count() const {
			return (m_index > 0 ? (length() - m_index) : 0);
		}
	  protected:
		virtual void process(Sequencer* seq, const TICK_EVENT& ev);
	};

	class Tracks : public std::vector<Track>
	{
	  public:
		void removeAllTracks();
		void reset();
		std::string advance(Sequencer* seq, int delta);
	};

	class Measures
	{
	  public:
		Measures();
		void clear();
		void setTimeSignature(int ticks, int nn, int dd, int cc);
		void build(int ticksPQN, int maxticks);
		int maxticks() const;
		int maxbeats() const;

		void locate(int ticks);
		const SEQ_POSITION& currentSection() const;
		const SEQ_POSITION& findSection(std::function<bool(std::vector<SEQ_POSITION>::const_reverse_iterator)> condition) const;

	  private:
		int m_index;
		std::vector<SEQ_POSITION> m_sections;
	};

	class SMFTempo
	{
	  public:
		SMFTempo() : m_rate(1.0), m_tempoPQN(0) {}
		void relative(int tempo) {
			if (tempo == 0) {
				m_rate = 1.0; m_tempoPQN = 0;
			} else {
				m_rate = (m_tempoPQN != 0) ? double(m_tempoPQN) / tempo : 1.0;
			}
		}
		int convert(int tempo) {
			m_tempoPQN = tempo;
			return int(tempo / m_rate);
		}

	  private:
		double m_rate;
		int m_tempoPQN;
	};

	class PendingEvents
	{
	  private:
		BYTE m_An[16][128]; // buffered Polyphonic Aftertouch values
		BYTE m_Bn[16][128]; // buffered Control Change values
		BYTE m_En[16][2];   // buffered Pitch Bend values
	  public:
		PendingEvents() { clearBuffer(); }
		void clearBuffer();
		bool bufferEvent(const BYTE* data);
		std::string flushEvents() const;
	};

  public:
	Sequencer();
	virtual ~Sequencer();

	void delegate(SequencerDelegate* obj);
	SequencerDelegate* delegate() const;

	bool load(const BYTE* data, int datalen, bool cue = false);
	void play(bool loop);
	void stop(bool reset);

	void locate(int beats);
	void range(int beatsA, int beatsB);

	CString title() const;
	CString copyright() const;

	int lengthInBeats() const;

	SEQ_POSITION position() const;
	SEQ_POSITION position(int beats) const;

	int beatsA() const;
	int beatsB() const;

	int countInState() const;

	void tempo(int bpm);
	int tempo() const;

	void mute(int channels);
	int mute() const;

	void transpose(int shift);
	int transpose() const;

	void countInBars(int bars);
	int countInBars() const;

	void loop(bool on);
	bool loop() const;

	void metroSw(bool on);
	bool metroSw() const;

	void setMetroNotes(const std::vector<std::string> notes);
	void setCountNotes(const std::vector<std::string> notes);

	/* Timer::Proc */
	void timerproc();

  private:
	enum { CH_TEMPO_MUTE = 16 };

	SequencerDelegate* mp_delegate;

	bool m_loop;
	bool m_metroOn;
	bool m_playing;
	bool m_seeking;

	Tracks m_tracks;
	Metronome m_metro;
	CountIn m_countin;
	Measures m_measures;
	SMFTempo m_smftempo;
	PendingEvents m_pending;

	int m_ticksPQN;
	int m_tempoPQN;
	Timer* mp_timer;
	double m_t0;
	double m_flac;

	int m_curticks;
	int m_metroticks;

	int m_ticks0;
	int m_ticksA;
	int m_ticksB;

	int m_mute;
	int m_keyShift;
	int m_countInBars;

	std::string m_title;
	std::string m_copyright;

	Mutex m_mtx;

	int vlength(const BYTE* data, int& pos);
	int parse(Track& track, const BYTE* data, int datalen);
	void advance(int delta);
	void seek(int ticks);
	void evSetTempo(int newTempo);
	void evTimeSignature(int nn, int dd, int cc);
	std::vector<TICK_EVENT> createMetroEvents(int ticks, int delta, int count) const;
	void MIDISend(std::string msg1, std::string msg2) const;
};

/* Inline function declarations */

/* class Sequencer */

inline Sequencer::Sequencer() : mp_delegate(0), mp_timer(0), m_t0(0), m_flac(0)
{
	m_ticksPQN = 96;
	m_tempoPQN = 500000; // BPM 120

	m_loop = m_metroOn = m_playing = m_seeking = false;
	m_curticks = m_metroticks = 0;

	m_ticks0 = m_ticksA = m_ticksB = 0;

	m_mute = 0;
	m_keyShift = 0;
	m_countInBars = 0;

	evTimeSignature(4, 2, 24);
}

inline void Sequencer::delegate(SequencerDelegate* obj)
	{ mp_delegate = obj; }
inline SequencerDelegate* Sequencer::delegate() const
	{ return mp_delegate; }

inline CString Sequencer::title() const
	{ return CString(m_title.c_str()); }
inline CString Sequencer::copyright() const
	{ return CString(m_copyright.c_str()); }

inline int Sequencer::lengthInBeats() const
	{ return m_measures.maxbeats(); }

inline SEQ_POSITION Sequencer::position() const
{
	SEQ_POSITION p = m_measures.currentSection();
	int _ticks = m_curticks - p.ticks;
	int _beats = _ticks / p.ticksPerBeat;

	p.ticks = m_curticks;
	p.beats += _beats;
	p.bars += (_beats / p.nn);
	p.beatsInBar = _beats % p.nn;
	p.ticksInBeat = _ticks % p.ticksPerBeat;
	return p;
}
inline SEQ_POSITION Sequencer::position(int beats) const
{
	SEQ_POSITION p = m_measures.findSection([beats](auto it){
		return (beats >= it->beats);
	});
	int _beats = beats - p.beats;

	p.ticks += (_beats * p.ticksPerBeat);
	p.beats = beats;
	p.bars += (_beats / p.nn);
	p.beatsInBar = _beats % p.nn;
	p.ticksInBeat = 0;
	return p;
}

inline int Sequencer::beatsA() const
{
	if (m_ticksA > 0) {
		int ticks = m_ticksA;
		const SEQ_POSITION& p = m_measures.findSection([ticks](auto it){
			return (ticks >= it->ticks);
		});
		return ((m_ticksA - p.ticks) / p.ticksPerBeat) + p.beats;
	}
	return 0;
}
inline int Sequencer::beatsB() const
{
	if (m_ticksB > 0) {
		int ticks = m_ticksB;
		const SEQ_POSITION& p = m_measures.findSection([ticks](auto it){
			return (ticks >= it->ticks);
		});
		return ((m_ticksB - p.ticks) / p.ticksPerBeat) + p.beats;
	}
	return 0;
}

inline int Sequencer::countInState() const
	{ return m_countin.count(); }

inline void Sequencer::tempo(int bpm)
{
	if (bpm < 10 || bpm > 480)
		return;

	m_tempoPQN = int((60 * 1000000) / bpm);
	m_smftempo.relative(m_tempoPQN);
}
inline int Sequencer::tempo() const
	{ return int((60 * 1000000) / m_tempoPQN); }

inline void Sequencer::mute(int channels)
{
	int len = 0;
	char msg[16 * 3];
	for (int ch = 0; ch < 16; ch++) {
		if ((channels & (1 << ch)) && !(m_mute & (1 << ch))) {
			msg[len++] = 0xb0 | ch; msg[len++] = 0x7b; msg[len++] = 0x00; // All Notes Off
		}
	}

	m_mute = channels;

	if (len) {
		MIDISend(std::string(msg, len), std::string());
	}
}
inline int Sequencer::mute() const
	{ return m_mute; }

inline void Sequencer::transpose(int shift)
{
	m_keyShift = shift;

	char msg[16 * 3];
	for (int ch = 0, i = 0; ch < 16; ch++) {
		msg[i++] = 0xb0 | ch; msg[i++] = 0x7b; msg[i++] = 0x00; // All Notes Off
	}
	MIDISend(std::string(msg, sizeof(msg)), std::string());
}
inline int Sequencer::transpose() const
	{ return m_keyShift; }

inline void Sequencer::countInBars(int bars)
	{ m_countInBars = bars; }
inline int Sequencer::countInBars() const
	{ return m_countInBars; }

inline void Sequencer::loop(bool on)
	{ m_loop = on; }
inline bool Sequencer::loop() const
	{ return m_loop; }

inline bool Sequencer::metroSw() const
	{ return m_metroOn; }

inline void Sequencer::setMetroNotes(const std::vector<std::string> notes)
	{ m_metro.setNotes(notes); }
inline void Sequencer::setCountNotes(const std::vector<std::string> notes)
	{ m_countin.setNotes(notes); }

/* class Sequencer::TickHandler */

inline Sequencer::TickHandler::TickHandler() : m_index(0), m_delta(-1)
	{ }

inline Sequencer::TickHandler::~TickHandler()
	{ clearEvents(); }

inline void Sequencer::TickHandler::addEvent(const TICK_EVENT& ev)
	{ m_events.push_back(ev); }

inline int Sequencer::TickHandler::length() const
	{ return (int)m_events.size(); }

inline void Sequencer::TickHandler::reset()
	{ m_index = 0; m_delta = -1; }

/* class Sequencer::Tracks */

inline void Sequencer::Tracks::removeAllTracks()
	{ clear(); }

inline void Sequencer::Tracks::reset()
{
	for (auto it = begin(); it != end(); it++) {
		it->reset();
	}
}

inline std::string Sequencer::Tracks::advance(Sequencer* seq, int ticks)
{
	seq->m_metroticks = ticks;

	std::string msg;
	for (auto it = begin(); it != end(); it++) {
		msg += it->advance(seq, ticks);
	}
	return msg;
}

/* class Sequencer::Measures */

inline Sequencer::Measures::Measures() : m_index(0)
	{ setTimeSignature(0, 4, 2, 24); }

inline void Sequencer::Measures::clear()
{
	m_index = 0;
	m_sections.erase(m_sections.begin() + 1, m_sections.end());
}

inline void Sequencer::Measures::setTimeSignature(int ticks, int nn, int dd, int cc)
{
	if (nn != 0) {
		m_sections.push_back(SEQ_POSITION(ticks, nn, dd, cc));
	}
}

inline int Sequencer::Measures::maxticks() const
	{ return m_sections.back().ticks; }
inline int Sequencer::Measures::maxbeats() const
	{ return m_sections.back().beats; }

inline void Sequencer::Measures::locate(int ticks)
{
	if (ticks < m_sections[m_index].ticks) { m_index = 0; }
	while ((m_index < (int)m_sections.size() - 1) && (ticks >= m_sections[m_index + 1].ticks)) {
		m_index++;
	}
}
inline const SEQ_POSITION& Sequencer::Measures::currentSection() const
	{ return m_sections[m_index]; }

inline const SEQ_POSITION& Sequencer::Measures::findSection(std::function<bool(std::vector<SEQ_POSITION>::const_reverse_iterator)> condition) const
{
	for (auto it = m_sections.rbegin(), end = m_sections.rend(); it != end; it++) {
		if (condition(it)) { return *it; }
	}
	return m_sections[0];
}

/* class Sequencer::PendingEvents */

inline void Sequencer::PendingEvents::clearBuffer()
{
	memset(m_An, 0xff, sizeof(m_An));
	memset(m_Bn, 0xff, sizeof(m_Bn));
	memset(m_En, 0xff, sizeof(m_En));
}

#endif /* __SEQUENCER_H__ */
