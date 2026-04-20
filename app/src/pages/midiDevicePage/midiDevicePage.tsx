import { Box } from '@mui/material';
import { BleConnectionIndex } from '../../features/bleMidiDeviceConnection/bleMidiDeviceConnectionIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { OsType, SystemDevice } from '../../functions/systemDevice';
import { MidiDeviceConnectionIndex } from '../../features/midiDeviceConnection/midiDeviceConnectionIndex';

export const MidiDevicePage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      {SystemDevice.os === OsType.Windows ||
      SystemDevice.os === OsType.Mac ||
      !SystemDevice.isRunningOnQuattro ? (
        <MidiDeviceConnectionIndex />
      ) : (
        <BleConnectionIndex />
      )}
    </Box>
  );
};
