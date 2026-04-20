import { useEffect, useState } from 'react';
import { MidiRecorder } from './midiRecorder';

// hh:mm:ss フォーマット関数
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

type Props = {
  recorder: MidiRecorder;
};

export const MidiRecordingTimeDisplay = ({ recorder }: Props) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const unsubscribe = recorder.onElapsedTimeChange(setElapsedTime);
    return () => unsubscribe();
  }, [recorder]);

  return <code>{formatTime(elapsedTime)}</code>;
};
