/*
 * @(#)AudioVolume.cpp
 *
 * Copyright 2022 Roland Corporation, Japan. All rights reserved.
 */

#include "AudioVolume.h"

float AudioVolume::convert(float gain)
{
	if (gain <= 0.0f) return 0.0f;
	if (gain >= 1.0f) return 1.0f;
	return (float)pow(gain, 1.75f);
}

RMSAvaragePower::RMSAvaragePower(int bufNum) : m_sampleRate(44100.0f), m_reset(false)
{
	m_maxpos = (bufNum > 0) ? bufNum : 1;
	m_bufFrames.resize(m_maxpos * kNumOfChannels);
	m_bufValues.resize(m_maxpos * kNumOfChannels);
	clear();
}

void RMSAvaragePower::clear()
{
	m_curpos = 0;
	std::fill(m_bufFrames.begin(), m_bufFrames.end(), 0);
	std::fill(m_bufValues.begin(), m_bufValues.end(), 0.0f);
	for (int channel = 0; channel < kNumOfChannels; channel++) {
		m_frames[channel] = 0;
		m_values[channel] = 0.0f;
		m_lastValues[channel] = 0.0f;
	}
}

void RMSAvaragePower::config(float sampleRate)
{
	if (sampleRate > 0.0f) {
		clear();
		m_sampleRate = sampleRate;
	}
}

void RMSAvaragePower::set(int channel, float value)
{
	if (channel < kNumOfChannels) {
		m_bufValues[(m_maxpos * channel) + m_curpos] += (value * value);
	}
}

void RMSAvaragePower::update(int frames)
{
	for (int channel = 0; channel < kNumOfChannels; channel++) {
		m_bufFrames[(m_maxpos * channel) + m_curpos] = frames;
	}
	if (++m_curpos >= m_maxpos) {
		m_curpos = 0;
	}
	for (int channel = 0; channel < kNumOfChannels; channel++) {
		if (m_reset) { m_frames[channel] = 0; m_values[channel] = 0; }
		m_frames[channel] += m_bufFrames[(m_maxpos * channel) + m_curpos];
		m_values[channel] += m_bufValues[(m_maxpos * channel) + m_curpos];
		m_bufFrames[(m_maxpos * channel) + m_curpos] = 0;
		m_bufValues[(m_maxpos * channel) + m_curpos] = 0.0f;
	}
	m_reset = false;
}

float RMSAvaragePower::get(int channel) const
{
	float avaragePower = 0.0f;
	if (channel < kNumOfChannels) {
		if (m_frames[channel] > 0) {
			avaragePower = (float)sqrt(m_values[channel] / m_frames[channel]);
			if (avaragePower < m_lastValues[channel]) {
				float coef = (float)(1 - exp((m_frames[channel] / m_sampleRate) * (-6)));
				m_lastValues[channel] += ((avaragePower - m_lastValues[channel]) * coef);
				avaragePower = max(0, m_lastValues[channel]);
			} else {
				m_lastValues[channel] = avaragePower;
			}
			m_reset = true;
		}
	}
	return avaragePower;
}
