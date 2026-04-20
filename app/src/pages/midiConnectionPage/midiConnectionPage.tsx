import { Box, Stack } from '@mui/material';
import { MidiLogIndex } from '../../features/midi/midiLog/midiLogIndex';
import { MidiSendIndex } from '../../features/midi/midiSend/midiSendIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { useIsLandscape } from '../../hooks/useIsLandecape';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';

// 画面向きに応じて、レイアウトを変更する
export const MidiCommunicationPage = () => {
  const isLandscape = useIsLandscape();
  const insets = useSafeAreaInsets();
  const appBarHeight = useAppBarHeight();

  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <Stack
        direction={isLandscape ? 'row' : 'column'}
        width={'100%'}
        height={'100%'}
        pl={insets.left}
        pr={insets.right}
      >
        <Box
          overflow={isLandscape ? 'auto' : 'none'}
          minWidth={isLandscape ? 280 : undefined}
          pt={16}
          pb={isLandscape ? insets.bottom : 0}
        >
          <MidiSendIndex />
        </Box>
        <Box
          flexGrow={1}
          minHeight={isLandscape ? undefined : '30%'}
          minWidth={isLandscape ? '30%' : undefined}
          overflow={'auto'}
        >
          <MidiLogIndex />
        </Box>
      </Stack>
    </Box>
  );
};
