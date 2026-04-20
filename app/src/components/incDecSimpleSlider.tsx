import { Add, Remove } from '@mui/icons-material';
import { IconButton, Slider, SliderProps, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const IncDecSimpleSlider = ({
  onDecrement,
  onIncrement,
  disabled = false,
  slotProps = {},
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  disabled?: boolean;
  slotProps?: {
    slider?: SliderProps;
  };
}) => {
  const { t } = useTranslation();

  return (
    <Stack direction={'row'} alignItems={'center'} gap={16}>
      <IconButton
        aria-label={t('Decrease value')}
        disabled={disabled}
        onClick={() => {
          onDecrement();
        }}
      >
        <Remove />
      </IconButton>
      <Slider disabled={disabled} {...slotProps?.slider} />
      <IconButton
        aria-label={t('Increase value')}
        disabled={disabled}
        onClick={() => {
          onIncrement();
        }}
      >
        <Add />
      </IconButton>
    </Stack>
  );
};
