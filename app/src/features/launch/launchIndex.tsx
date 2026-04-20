import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Quattro } from '../../functions/quattro/quattro';
import { StorageKey } from '../../functions/quattro/quattroApp/storageKey';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { RouteMap } from '../../routes';
import { TermsOfUseIndex } from '../termsOfUse/termsOfUseIndex';
import { LaunchView } from './launchView';

enum LaunchFlowState {
  Initialize,
  TermsOfUse,
  Completed,
}

export const LaunchIndex = () => {
  const navigate = useNavigate();
  const [launchFlowState, setLaunchFlowState] = useState(
    LaunchFlowState.Initialize
  );

  useEffect(() => {
    if (launchFlowState === LaunchFlowState.Completed) {
      navigate(`/${RouteMap.root.path}/${RouteMap.home.path}`, {
        replace: true,
      });
    }
  }, [launchFlowState, navigate]);

  const handleLaunchViewClose = useCallback(() => {
    const agreed = Quattro.app.storage2(StorageKey.AgreedToTerms) === 'true';
    if (agreed) {
      setLaunchFlowState(LaunchFlowState.Completed);
    } else {
      setLaunchFlowState(LaunchFlowState.TermsOfUse);
    }
  }, []);

  return (
    <>
      <LaunchView
        opened={launchFlowState === LaunchFlowState.Initialize}
        onClose={handleLaunchViewClose}
      />
      <TermsOfUseView
        opened={launchFlowState === LaunchFlowState.TermsOfUse}
        onAgree={() => {
          Quattro.app.setStorage2(StorageKey.AgreedToTerms, true);
          setLaunchFlowState(LaunchFlowState.Completed);
        }}
      />
    </>
  );
};

const TermsOfUseView = ({
  opened,
  onAgree,
}: {
  opened: boolean;
  onAgree: () => void;
}) => {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Dialog
        fullScreen
        open={opened}
        slotProps={{
          paper: {
            sx: {
              pt: insets.top,
              pb: insets.bottom,
              pl: insets.left,
              pr: insets.right,
            },
          },
        }}
        transitionDuration={{ enter: 1000, exit: 1000 }}
      >
        <DialogTitle>{t('Terms of use')}</DialogTitle>
        <DialogContent>
          <TermsOfUseIndex />
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                name='agree'
                color='primary'
              />
            }
            label={t('I agree')}
          />
          <Button
            fullWidth
            variant='contained'
            onClick={onAgree}
            disabled={!agreed}
            autoFocus
          >
            {t('Next')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
