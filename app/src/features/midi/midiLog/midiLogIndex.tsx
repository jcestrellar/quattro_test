import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MidiLog,
  MidiLogType,
} from '../../../stores/midiCommunication/midiCommunicationSlice';
import { RootState } from '../../../stores/store';

export const MidiLogIndex = () => {
  const { t } = useTranslation();
  const midiLogs = useSelector<RootState, MidiLog[]>(
    (state) => state.midiCommunication.logs
  );

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tableContainerRef.current) {
      // スクロール位置を一番下にする
      tableContainerRef.current.scrollTop =
        tableContainerRef.current.scrollHeight;
    }
  }, []);

  function getTypeText(logType: MidiLogType) {
    switch (logType) {
      case MidiLogType.Send:
        return t('Send');
      case MidiLogType.Receive:
        return t('Receive');
      case MidiLogType.Error:
        return t('Error');
    }
  }

  return (
    <TableContainer
      component={Paper}
      ref={tableContainerRef}
      sx={{ height: '100%', overflowY: 'scroll' }}
    >
      <Table size='small'>
        <TableBody>
          {midiLogs.map((log, index) => (
            <TableRow key={index}>
              <TableCell>{getTypeText(log.type)}</TableCell>
              <TableCell align='left'>{log.message}</TableCell>
              <TableCell align='left'>{log.timestamp}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
