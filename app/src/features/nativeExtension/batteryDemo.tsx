import { Bolt, ExpandMore, QuestionMark } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Fade,
  Stack,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quattro } from '../../functions/quattro/quattro';
import { BatteryState } from '../../functions/quattro/quattroExtensions/quattroBattery/quattroBatteryTypes';

// バッテリー状態を視覚化
const BatteryIndicator = ({
  level,
  batteryWidth,
  batteryHeight,
  charging,
  disabled = false,
}: {
  level: number; // 0.0 ~ 1.0
  batteryWidth: number;
  batteryHeight: number;
  charging: boolean;
  disabled?: boolean;
}) => {
  const theme = useTheme();

  function batteryGradient() {
    if (level < 0.2) {
      return 'linear-gradient(to right, #ff0000, #ff6666)'; // 赤系
    } else if (level < 0.5) {
      return 'linear-gradient(to right, #ffcc00, #ffff66)'; // 黄色系
    } else {
      return 'linear-gradient(to right, #00cc00, #66ff66)'; // 緑系
    }
  }

  return (
    <>
      <Stack direction={'row'} alignItems={'center'}>
        <Box
          width={batteryWidth}
          height={batteryHeight}
          bgcolor={theme.palette.background.default}
          border={2}
          borderColor={theme.palette.text.secondary}
          borderRadius={1}
          display={'flex'}
          alignItems={'center'}
          p={2}
          position={'relative'}
        >
          <Box
            width={level}
            height={1}
            sx={{
              background: batteryGradient(),
            }}
            borderRadius={0}
            display={'flex'}
            justifyContent={'center'}
            alignItems={'center'}
          ></Box>
          <Fade in={charging} timeout={400}>
            <Box
              width={42}
              height={42}
              position={'absolute'}
              top={0}
              bottom={0}
              left={0}
              right={0}
              margin={'auto'}
            >
              <Bolt sx={{ fontSize: 42, color: theme.palette.text.primary }} />
            </Box>
          </Fade>
          <Fade in={disabled} timeout={400}>
            <Box
              width={42}
              height={42}
              position={'absolute'}
              top={0}
              bottom={0}
              left={0}
              right={0}
              margin={'auto'}
            >
              <QuestionMark
                sx={{ fontSize: 42, color: theme.palette.text.primary }}
              />
            </Box>
          </Fade>
        </Box>
        <Box
          width={batteryHeight / 10}
          height={batteryHeight / 5}
          bgcolor={theme.palette.text.secondary}
        />
      </Stack>
    </>
  );
};

export const BatteryDemo = () => {
  const { t } = useTranslation();
  const [batteryMonitoringEnabled, setBatteryMonitoringEnabled] =
    useState(false);
  const [batteryLevel, setBatteryLevel] = useState(0); // 0.0〜1.0 or -1.0
  const [batteryState, setBatteryState] = useState<BatteryState>(
    BatteryState.Unknown
  );

  useEffect(() => {
    const unsubscribeEventBatteryLevelChanged =
      Quattro.extention.battery.onEventBatteryLevelChanged((level: number) => {
        setBatteryLevel(level);
      });

    const unsubscribeEventBatteryStateChanged =
      Quattro.extention.battery.onEventBatteryStateChanged(
        (state: BatteryState) => {
          setBatteryState(state);
        }
      );

    return () => {
      unsubscribeEventBatteryLevelChanged();
      unsubscribeEventBatteryStateChanged();
    };
  }, []);

  useEffect(() => {
    Quattro.extention.battery.setMonitoringEnabled(batteryMonitoringEnabled);

    // NOTE:
    // この箇所では意図的に useEffect 内で同期的に setState を呼び出している。
    // react-hooks/set-state-in-effect のルールは、同期的な setState が
    // 再レンダリングの連鎖を引き起こす可能性があるため警告を出す。
    //
    // しかし BatteryLevel / BatteryState は、バッテリー監視の ON/OFF に応じて
    // 即時に最新値へ更新する必要がある。
    // また、Quattro API は監視を有効化した直後の初期値イベントを送らないため、
    // コールバックを受け取る前に自前で値を取得する必要がある。
    // そのため本箇所ではルールを無効化して同期的な更新を行っている。
    if (batteryMonitoringEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBatteryLevel(Quattro.extention.battery.value());
      setBatteryState(Quattro.extention.battery.state());
    } else {
      setBatteryLevel(-1);
      setBatteryState(BatteryState.Unknown);
    }
  }, [batteryMonitoringEnabled]);

  function getLevelText(level: number) {
    if (level == -1) {
      return '---';
    } else {
      return `${(batteryLevel * 100).toFixed(1)} %`;
    }
  }

  function getStateText(state: BatteryState) {
    let text;
    switch (state) {
      case BatteryState.Charging:
        text = t('Charging');
        break;
      case BatteryState.NotCharging:
        text = t('Not Charging');
        break;
      case BatteryState.Full:
        text = t('Full');
        break;
      case BatteryState.Unknown:
        text = '---';
        break;
      default:
        text = `${t('Unknown Error')} ${state}`;
        break;
    }

    return text;
  }

  return (
    <Accordion sx={{ px: 12 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography component='span'>Battery</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pb: 12 }}>
        <Stack gap={8}>
          <Typography>
            {t(
              'Executes native extensions. Performs battery status acquisition'
            )}
          </Typography>
          <Stack direction='row' alignItems={'center'} gap={16}>
            <Typography>{t('Enable battery information retrieval')}</Typography>
            <Switch
              checked={batteryMonitoringEnabled}
              onChange={(e, checked) => {
                setBatteryMonitoringEnabled(checked);
              }}
            />
          </Stack>
          <Typography>{`${t('Battery Level')}: ${getLevelText(batteryLevel)}`}</Typography>
          <Typography>{`${t('Battery State')}: ${getStateText(batteryState)}`}</Typography>

          {/* ネイティブから取得した値を基に、バッテリー状態を視覚化 */}
          <BatteryIndicator
            level={batteryLevel}
            batteryWidth={140}
            batteryHeight={50}
            charging={
              batteryState === BatteryState.Charging ||
              batteryState === BatteryState.Full
            }
            disabled={batteryState === BatteryState.Unknown}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
