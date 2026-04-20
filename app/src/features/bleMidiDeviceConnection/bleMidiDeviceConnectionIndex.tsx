import { Bluetooth } from '@mui/icons-material';
import {
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { QuattroMidiBleDeviceState } from '../../functions/quattro/quattroMidi/quattroMidiTypes';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import {
  connectBleMidiDevice,
  disconnectBleMidiDevice,
  startScanBleMidiDevice,
  stopScanBleMidiDevice,
} from '../../stores/midiDevice/midiDeviceSlice';
import { AppDispatch, RootState } from '../../stores/store';
import { BluetoothPermissionMonitor } from './bluetoothPermissionMonitor';

export const BleConnectionIndex = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const discoveredDevices = useSelector(
    (state: RootState) => state.midiDevice.discoveredBleMidiDevices
  );
  const activeDevice = useSelector(
    (state: RootState) => state.midiDevice.activeMidiDevice
  );
  const scanning = useSelector((state: RootState) => state.midiDevice.scanning);

  useEffect(() => {
    dispatch(startScanBleMidiDevice());

    return () => {
      dispatch(stopScanBleMidiDevice());
    };
  }, [dispatch]);

  function deviceConnectionStateText(state: QuattroMidiBleDeviceState) {
    switch (state) {
      case QuattroMidiBleDeviceState.Connected:
        return t('Connected');
      case QuattroMidiBleDeviceState.Connecting:
        return t('Connecting');
      case QuattroMidiBleDeviceState.Disconnecting:
        return t('Disconnecting');
      case QuattroMidiBleDeviceState.Disconnected:
        return t('Not Connected');
      default:
        return t('');
    }
    return '';
  }

  return (
    <>
      <BluetoothPermissionMonitor />
      <Stack
        pl={20 + insets.left}
        pr={20 + insets.right}
        py={16}
        direction={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
        <Stack direction={'row'} alignItems={'center'} gap={8}>
          <Bluetooth
            sx={(theme) => ({
              fontSize: theme.typography.pxToRem(18),
              color: theme.palette.primary.main,
            })}
          />
          <Typography variant='body2' fontWeight={'bold'} color='primary'>
            {t('Connectable devices')}
          </Typography>
        </Stack>
        <CircularProgress
          aria-label={t('Searching devices')}
          size={16}
          sx={{ visibility: scanning ? 'visible' : 'hidden' }}
        />
      </Stack>
      <List>
        {discoveredDevices.map((device) => {
          return (
            <ListItem aria-live='polite' disablePadding>
              <ListItemButton
                onClick={() => {
                  switch (device.state) {
                    case QuattroMidiBleDeviceState.Disconnected:
                      dispatch(connectBleMidiDevice(device.id));
                      break;
                    case QuattroMidiBleDeviceState.Connected:
                      dispatch(disconnectBleMidiDevice(device.id));
                      break;
                    case QuattroMidiBleDeviceState.Connecting:
                    case QuattroMidiBleDeviceState.Disconnecting:
                    default:
                      break;
                  }
                }}
              >
                <ListItemText
                  sx={{
                    pl: insets.left,
                    pr: insets.right,
                  }}
                  primary={device.name}
                  secondary={deviceConnectionStateText(
                    activeDevice?.id === device.id
                      ? activeDevice.state
                      : device.state
                  )}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );
};
