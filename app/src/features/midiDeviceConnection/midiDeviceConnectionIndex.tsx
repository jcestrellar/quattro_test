import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Quattro } from '../../functions/quattro/quattro';
import { QuattroMidiEndpoint } from '../../functions/quattro/quattroMidi/quattroMidiTypes';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import {
  connectMidiEndpoints,
  disconnectMidiEndpoints,
  MidiDevice,
} from '../../stores/midiDevice/midiDeviceSlice';
import { AppDispatch, RootState } from '../../stores/store';

export const MidiDeviceConnectionIndex = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [inputEndpoints, setInputEndPoints] = useState<QuattroMidiEndpoint[]>(
    Quattro.midi.inputEndpoints()
  );
  const [outputEndpoints, setOutputEndPoints] = useState<QuattroMidiEndpoint[]>(
    Quattro.midi.outputEndpoints()
  );
  const activeDevice = useSelector<RootState, MidiDevice | undefined>(
    (state) => state.midiDevice.activeMidiDevice
  );

  useEffect(() => {
    const unsbscribeEventChanged = Quattro.midi.onEventChanged(() => {
      setInputEndPoints(Quattro.midi.inputEndpoints());
      setOutputEndPoints(Quattro.midi.outputEndpoints());
    });
    return () => {
      unsbscribeEventChanged();
    };
  }, []);

  return (
    <>
      <Box pl={20 + insets.left} pr={20 + insets.right} py={16}>
        <Typography variant='body2' fontWeight={'bold'} color='primary'>
          {t('Connectable devices')}
        </Typography>
      </Box>
      <List>
        {inputEndpoints.map((inputEndpoint) => {
          const sanitizeName = (name: string) =>
            name.replace(/\bIN\b|\bOUT\b/gi, '').trim();

          // Output を検出
          const outputEndpoint = outputEndpoints.find((output) => {
            // 1. MIDIEndpointIndexKey が同じ
            if (
              output.MIDIEndpointIndexKey === inputEndpoint.MIDIEndpointIndexKey
            )
              return true;

            // 2. "IN" と "OUT" を除いた Name が同じ
            const inputName = sanitizeName(
              inputEndpoint.MIDIEntityNameKey || ''
            );
            const outputName = sanitizeName(output.MIDIEntityNameKey || '');
            return inputName === outputName;
          });

          // Output が検出できなければ表示しない
          if (!outputEndpoint) return;

          const exitsActiveDevice = activeDevice ? true : false;
          const isCurrentActive =
            activeDevice?.inputEndpoints?.[0]?.MIDIEndpointIndexKey ===
            inputEndpoint.MIDIEndpointIndexKey;

          return (
            <ListItem
              aria-live='polite'
              disablePadding
              key={inputEndpoint.MIDIEndpointUIDKey}
            >
              <ListItemButton
                disabled={exitsActiveDevice && !isCurrentActive}
                onClick={() => {
                  if (activeDevice) {
                    dispatch(
                      disconnectMidiEndpoints({
                        input: [inputEndpoint],
                        output: [outputEndpoint],
                      })
                    );
                  } else {
                    dispatch(
                      connectMidiEndpoints({
                        input: [inputEndpoint],
                        output: [outputEndpoint],
                      })
                    );
                  }
                }}
              >
                <ListItemText
                  primary={sanitizeName(inputEndpoint.MIDIEntityNameKey)}
                  secondary={
                    isCurrentActive ? t('Connected') : t('Not Connected')
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );
};
