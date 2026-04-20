/*
 * @(#)AudioVolume.h
 *
 * Copyright 2022 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __AUDIO_VOLUME_H__
#define __AUDIO_VOLUME_H__

#include <windows.h>
#include <math.h>
#include <vector>
#include <algorithm>

class AudioVolume
{
  public:
	static float convert(float gain);
};

class RMSAvaragePower
{
  public:
	RMSAvaragePower(int bufNum);

	int channels() const;

	void clear();
	void config(float sampleRate);
	void set(int channel, float value);
	void update(int frames);
	float get(int channel) const;

  private:
	enum { kNumOfChannels = 2 };

	float m_sampleRate;

	int m_maxpos;
	int m_curpos;
	std::vector<int> m_bufFrames;
	std::vector<float> m_bufValues;

	int m_frames[kNumOfChannels];
	float m_values[kNumOfChannels];
	mutable float m_lastValues[kNumOfChannels];
	mutable bool m_reset;
};

/* Inline function declarations */

inline int RMSAvaragePower::channels() const
	{ return kNumOfChannels; }

#endif /* __AUDIO_VOLUME_H__ */
