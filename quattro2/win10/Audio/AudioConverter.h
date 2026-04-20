//
// @(#)AudioConverter.h
//
// Copyright 2022 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_CONVERTER_H__
#define __AUDIO_CONVERTER_H__

#include <windows.h>
#include <mmsystem.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <atlstr.h>
#include <vector>

class AudioConverter
{
  public:
	static bool format(LPCTSTR file, WAVEFORMATEX* pwfe, float* duration);
	static bool convert(LPCTSTR in, LPCTSTR out, const WAVEFORMATEX* pwfe);
	static bool split(LPCTSTR in, const std::vector<CString>& outs);
	static bool reverse(LPCTSTR in, LPCTSTR out);

	class WAVFileIO {
	  public:
		WAVFileIO();
		~WAVFileIO();
		HRESULT open(LPCTSTR in);
		HRESULT create(LPCTSTR out, const WAVEFORMATEX* pwfe);
		HRESULT close();
		LONG read(char* buf, LONG buflen);
		LONG write(const char* buf, LONG buflen);
		const WAVEFORMATEX* format() const;
	  private:
		HMMIO m_hmmio;
		MMCKINFO m_mmckRiff;
		MMCKINFO m_mmckFmt;
		MMCKINFO m_mmckData;
		WAVEFORMATEX m_wfe;
	};

};

inline AudioConverter::WAVFileIO::WAVFileIO() : m_hmmio(NULL)
	{ memset(&m_wfe, 0, sizeof(WAVEFORMATEX)); }
inline AudioConverter::WAVFileIO::~WAVFileIO()
	{ close(); }
inline const WAVEFORMATEX* AudioConverter::WAVFileIO::format() const
	{ return &m_wfe; }

#endif /* __AUDIO_CONVERTER_H__ */
