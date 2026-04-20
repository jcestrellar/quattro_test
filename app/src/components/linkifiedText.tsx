import { OpenInNew } from '@mui/icons-material';
import { Quattro } from '../functions/quattro/quattro';
import { useTranslation } from 'react-i18next';

/**
 * テキスト中の URL を検出し、リンクとしてレンダリングする。
 * それ以外の部分は通常のテキストとして表示する。
 */
export const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s,;!?(){}<>（）]+)/g;

  const { t } = useTranslation();

  return (
    <>
      {text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              aria-label={`${part}(${t('External Link')})`}
              href={'#'}
              key={index}
              onClick={(event) => {
                event.preventDefault(); // デフォルトのリンク動作を防ぐ

                Quattro.fs.exec(part);
              }}
            >
              {part}
              <OpenInNew
                fontSize='small'
                sx={{ verticalAlign: 'middle', p: 2 }}
              />
            </a>
          );
        }
        return part;
      })}
    </>
  );
};
