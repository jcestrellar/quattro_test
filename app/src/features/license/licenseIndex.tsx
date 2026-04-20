import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { Quattro } from '../../functions/quattro/quattro';
import { SystemDevice } from '../../functions/systemDevice';
import { LinkifiedText } from '../../components/linkifiedText';

export const LicenseIndex = () => {
  const [licenseText, setLicenseText] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const currentPath = SystemDevice.currentIndexPath;
      const filePath = `${currentPath}/assets/license.txt`;

      const text = await Quattro.fs.readString(filePath);

      setLicenseText(text);
    })();
  }, []);

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
        <LinkifiedText text={licenseText} />
      </Typography>
    </Box>
  );
};
