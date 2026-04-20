//
// @(#)XExtSamplePlayer.h
//
// Copyright 2022 Roland Corporation. All rights reserved.
//

#ifndef __EXT_SAMPLE_PLAYER_H__
#define __EXT_SAMPLE_PLAYER_H__

#include "win10/Audio/SamplePlayer.h"

class ExtSamplePlayer : public SamplePlayer
{
  public:
	ExtSamplePlayer();
	virtual ~ExtSamplePlayer();

	void speed(float rate);
	float speed() const;
	void pitch(float cent);
	float pitch() const;

	CStringW control(LPCWSTR params);

  private:
	void init(const WAVEFORMATEX* pwfe);
	void term();
	void reset();
	int render(BYTE* buffer, int length);
};

inline void ExtSamplePlayer::speed(float rate)
{
	if (0.5f <= rate && rate <= 2.0f) {
		SamplePlayer::speed(rate);
	}
}
inline float ExtSamplePlayer::speed() const
	{ return SamplePlayer::speed(); }

inline void ExtSamplePlayer::pitch(float cent)
{
	if (-2400 <= cent && cent <= 2400) {
		SamplePlayer::pitch(cent);
	}
}
inline float ExtSamplePlayer::pitch() const
	{ return SamplePlayer::pitch(); }

inline CStringW ExtSamplePlayer::control(LPCWSTR params)
	{ return L""; }

#endif /* __EXT_SAMPLE_PLAYER_H__ */
