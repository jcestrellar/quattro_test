import {
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Switch,
} from '@mui/material';
import { ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { CustomDialog } from '../../components/customDialog';
import { Quattro } from '../../functions/quattro/quattro';
import { StorageKey } from '../../functions/quattro/quattroApp/storageKey';
import { SystemDevice } from '../../functions/systemDevice';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import {
  AppearanceMode,
  AppLanguage,
  setAppearanceMode,
  setLanguage,
  setOptin,
  setWebMidiEnabled,
} from '../../stores/preference/preferenceSlice';
import { AppDispatch, RootState } from '../../stores/store';

const PreferenceSelectDialog = ({
  opened,
  title,
  value,
  items,
  onChange,
  onClose,
}: {
  opened: boolean;
  title: string;
  value: string;
  items: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <CustomDialog
      opened={opened}
      titleText={title}
      slotProps={{
        dialog: {
          slotProps: {
            paper: {
              sx: {
                width: '80%',
              },
            },
          },
        },
      }}
      content={
        <RadioGroup
          value={value}
          onChange={(e) => {
            onChange(e);
            onClose();
          }}
        >
          {items.map((item) => (
            <FormControlLabel
              key={item}
              value={item}
              control={<Radio />}
              label={item}
              onClick={() => {
                if (item === value) onClose();
              }}
            />
          ))}
        </RadioGroup>
      }
      negativeButton={{
        title: t('Cancel'),
        onClick: () => {
          onClose();
        },
      }}
      onClose={onClose}
    />
  );
};

const LanguageListItem = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [opened, setOpened] = useState(false);
  const language = useSelector<RootState, AppLanguage>(
    (state) => state.preference.language
  );
  const { t } = useTranslation();

  const Languages = {
    ja: {
      value: AppLanguage.Jp,
      text: '日本語',
    },
    en: {
      value: AppLanguage.En,
      text: 'English',
    },
  };

  return (
    <>
      <ListItemButton onClick={() => setOpened(true)}>
        <ListItemText
          primary={t('App Language')}
          secondary={
            Object.values(Languages).find(
              (appLanguage) => appLanguage.value === language
            )?.text ?? ''
          }
        />
      </ListItemButton>
      <PreferenceSelectDialog
        opened={opened}
        title={t('Select App language')}
        value={
          Object.values(Languages).find(
            (appLanguage) => appLanguage.value === language
          )?.text ?? ''
        }
        items={Object.values(Languages).map((item) => item.text)}
        onClose={() => setOpened(false)}
        onChange={(e) => {
          const newLanguage = Object.values(Languages).find(
            (value) => value.text === e.target.value
          );
          if (newLanguage) {
            dispatch(setLanguage(newLanguage.value as AppLanguage));
            Quattro.app.setStorage2(StorageKey.AppLanguage, newLanguage.value);
          }
        }}
      />
    </>
  );
};

const AppearanceModeListItem = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [opened, setOpened] = useState(false);
  const appearanceMode = useSelector<RootState, AppearanceMode>(
    (state) => state.preference.appearance
  );
  const { t } = useTranslation();

  const Appearances = {
    light: {
      value: AppearanceMode.Light,
      text: t('Light'),
    },
    dark: {
      value: AppearanceMode.Dark,
      text: t('Dark'),
    },
    system: {
      value: AppearanceMode.System,
      text: t('Follow System'),
    },
  };

  return (
    <>
      <ListItemButton onClick={() => setOpened(true)}>
        <ListItemText
          primary={t('App Appearance')}
          secondary={
            Object.values(Appearances).find(
              (appearance) => appearance.value === appearanceMode
            )?.text ?? ''
          }
        />
      </ListItemButton>
      <PreferenceSelectDialog
        opened={opened}
        title={t('Select App appearance')}
        value={
          Object.values(Appearances).find(
            (appearance) => appearance.value === appearanceMode
          )?.text ?? ''
        }
        items={Object.values(Appearances).map((item) => item.text)}
        onClose={() => setOpened(false)}
        onChange={(e) => {
          const newAppearance = Object.values(Appearances).find(
            (value) => value.text === e.target.value
          );
          if (newAppearance) {
            dispatch(setAppearanceMode(newAppearance.value));
            Quattro.app.setStorage2(
              StorageKey.AppearanceMode,
              newAppearance.value
            );
          }
        }}
      />
    </>
  );
};

const OptinListItem = () => {
  const dispatch = useDispatch<AppDispatch>();
  const optin = useSelector<RootState, boolean>(
    (state) => state.preference.optin
  );
  const { t } = useTranslation();

  return (
    <>
      <ListItem>
        <ListItemText
          id='optin-label'
          primary={t('Allow collection of usage data')}
          secondary={''}
        ></ListItemText>
        <Switch
          checked={optin}
          onChange={(_, checked) => {
            dispatch(setOptin(checked));
            Quattro.app.setStorage2(StorageKey.Optin, checked.toString());
          }}
          aria-labelledby='optin-label'
        />
      </ListItem>
    </>
  );
};

const WebMidiEnabledListItem = () => {
  const dispatch = useDispatch<AppDispatch>();
  const enabled = useSelector<RootState, boolean>(
    (state) => state.preference.webMidiEnabled
  );
  const { t } = useTranslation();

  return (
    <>
      <ListItem>
        <ListItemText
          id='web-midi-enabled-label'
          primary={t('Enable Web MIDI (Debug)')}
          secondary={t(
            'Enables connection to MIDI devices using the Web MIDI API in Chrome during development'
          )}
        ></ListItemText>
        <Switch
          checked={enabled}
          onChange={(_, checked) => {
            dispatch(setWebMidiEnabled(checked));
            Quattro.app.setStorage2(
              StorageKey.WebMidiEnabled,
              checked.toString()
            );
          }}
          aria-labelledby='web-midi-enabled-label'
        />
      </ListItem>
    </>
  );
};

export const PreferenceIndex = () => {
  const insets = useSafeAreaInsets();

  return (
    <List sx={{ pb: insets.bottom + 16 }}>
      <LanguageListItem />
      <AppearanceModeListItem />
      <OptinListItem />
      {SystemDevice.isRunningOnQuattro ? null : <WebMidiEnabledListItem />}
    </List>
  );
};
