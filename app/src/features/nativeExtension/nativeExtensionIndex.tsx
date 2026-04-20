import { Box } from '@mui/material';
import { BatteryDemo } from './batteryDemo';
import { CalculateDemo } from './calculateDemo';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';

export const NativeExtensionIndex = () => {
  const insets = useSafeAreaInsets();
  return (
    <Box
      pt={16}
      pl={16 + insets.left}
      pr={16 + insets.right}
      pb={16 + insets.bottom}
    >
      <CalculateDemo />
      <BatteryDemo />
    </Box>
  );
};
