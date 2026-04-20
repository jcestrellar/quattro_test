import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quattro } from '../../functions/quattro/quattro';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';

export const CalculateDemo = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOpened, setAlertOpened] = useState(false);
  const [valueA, setValueA] = useState('3');
  const [valueB, setValueB] = useState('4');

  useEffect(() => {
    const unsubscribeEventAlert = Quattro.extention.calc.onEventAlert(
      (message: string) => {
        setAlertMessage(message);
        setAlertOpened(true);
      }
    );

    return () => {
      unsubscribeEventAlert();
    };
  }, []);

  return (
    <>
      <Accordion sx={{ px: 12 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography component='span'>Calc</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pb: 12 }}>
          <Stack gap={16}>
            <Typography>
              {t(
                'Performs the native extensions included as samples in Quattro. Performs multiplication and string passing'
              )}
            </Typography>
            <Stack direction={'row'} alignItems={'center'} gap={8}>
              <TextField
                label={t('Multiplier A')}
                size='small'
                inputMode='numeric'
                value={valueA}
                onChange={(e) => setValueA(e.target.value)}
              />
              <Typography aria-hidden>✕</Typography>
              <TextField
                label={t('Multiplier B')}
                size='small'
                inputMode='numeric'
                value={valueB}
                onChange={(e) => setValueB(e.target.value)}
              />
            </Stack>
            <Stack direction={'row'} alignItems={'center'}>
              <Button
                onClick={() => {
                  function mulitple(): string {
                    const a = Number(valueA);
                    const b = Number(valueB);

                    if (isNaN(Number(a)) || isNaN(Number(b))) {
                      return 'NaN';
                    } else {
                      const res = Quattro.extention.calc.multiple(a, b);
                      return res;
                    }
                  }

                  Quattro.extention.calc.alert(mulitple());
                }}
              >
                {t('Display calculation results')}
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Snackbar
        sx={{ ml: insets.left, mb: insets.bottom }}
        open={alertOpened}
        autoHideDuration={5000}
        onClose={() => setAlertOpened(false)}
        message={alertMessage}
      />
    </>
  );
};
