import { Typography } from '@mui/material';
import { Quattro } from '../../functions/quattro/quattro';

export const AboutIndex = () => {
  function appVersiontText() {
    const version = Quattro.app.version();
    if (!version) {
      return '';
    }

    const versionText = `${version.name} (${version.code})`;
    return versionText;
  }

  return <Typography>アプリのバージョン: {appVersiontText()}</Typography>;
};
