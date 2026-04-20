import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { LinkifiedText } from '../../components/linkifiedText';
import { Quattro } from '../../functions/quattro/quattro';
import { SystemDevice } from '../../functions/systemDevice';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { AppLanguage } from '../../stores/preference/preferenceSlice';
import { RootState } from '../../stores/store';

export const TermsOfUseIndex = () => {
  const [termsOfUseText, setTermsOfUseText] = useState('');
  const language = useSelector<RootState>((state) => state.preference.language);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      let textFileName: string;
      switch (language) {
        case AppLanguage.En:
          textFileName = 'terms_en.txt';
          break;
        case AppLanguage.Jp:
          textFileName = 'terms_ja.txt';
          break;
        default:
          textFileName = 'terms_en.txt';
          break;
      }

      const currentPath = SystemDevice.currentIndexPath;
      const filePath = `${currentPath}/assets/${textFileName}`;
      const text = await Quattro.fs.readString(filePath);

      setTermsOfUseText(text);
    })();
  }, [language]);

  return (
    <Box
      width={'100%'}
      pt={16}
      pl={16 + insets.left}
      pr={16 + insets.right}
      pb={16 + insets.bottom}
      whiteSpace={'pre-line'}
      overflow={'scroll'}
    >
      <Typography variant='body2'>
        <LinkifiedText text={termsOfUseText} />
      </Typography>
    </Box>
  );
};
