import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';

// Virtuosoでアイテムを表示するためのコンポーネント
// 画像が読み込まれていない場合、Skelton を表示する
const VirtuosoItem = ({
  imageUrl,
  loading,
  title,
  text,
}: {
  imageUrl: string | undefined;
  loading: boolean;
  title: string;
  text: string;
}) => {
  return (
    <Card sx={{ maxWidth: 345, m: 8, width: '100%' }}>
      <>
        {loading ? (
          <Box p={12}>
            <Skeleton variant='rectangular' width={80} height={80} />
          </Box>
        ) : (
          <CardMedia
            component={'img'}
            sx={{ m: 12, width: 80, height: 80, objectFit: 'fill' }}
            image={imageUrl}
            alt=''
          />
        )}
        <CardContent sx={{ minHeight: 140 }}>
          {loading ? (
            <Stack height={'100%'}>
              <Skeleton
                variant='text'
                width={'100%'}
                sx={{ fontSize: '2rem' }}
              />
              <Skeleton
                variant='text'
                width={'100%'}
                sx={{ fontSize: '1rem' }}
              />
              <Skeleton
                variant='text'
                width={'70%'}
                sx={{ fontSize: '1rem' }}
              />
            </Stack>
          ) : (
            <>
              <Typography gutterBottom variant='h5' component='div'>
                {title}
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {text}
              </Typography>
            </>
          )}
        </CardContent>
      </>
    </Card>
  );
};

interface ProductData {
  id: string;
  imageUrl: string;
  author: string;
  explanation: string;
}

enum DataAcquisitionState {
  Idle,
  Fetching,
  Failed,
  Completed,
}

export const VirtualScrollIndex = () => {
  const [dataLength, setDataLength] = useState(10);
  const [images, setImages] = useState<ProductData[]>([]);
  const [fetchErrorAlertOpened, setFetchErrorAlertOpened] = useState(false);
  const [dataAcquisitionState, setDataAcquisitionState] =
    useState<DataAcquisitionState>(DataAcquisitionState.Idle);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Blob URL で画像をキャッシュ
  // サンプルとして Component 側で記述しているが、Redux-Saga や Redux-Thunk で管理すると良い
  const fetchAndCacheImages = async () => {
    try {
      setDataAcquisitionState(DataAcquisitionState.Fetching);
      interface ResponseJson {
        id: string;
        author: string;
        width: number;
        height: number;
        url: string;
        download_url: string;
      }
      const response = await fetch(
        `https://picsum.photos/v2/list?page=10&limit=5`
      );
      const dataList: ResponseJson[] = await response.json();

      // 画像を並列で非同期に取得して処理する
      Promise.all(
        dataList.map(async (data): Promise<ProductData> => {
          const res = await fetch(data.download_url);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);

          const exception = `${data.id} ${data.width} ${data.height} ${data.url} ${data.download_url} `;
          return {
            id: data.id,
            author: data.author,
            imageUrl: blobUrl,
            explanation: exception,
          };
        })
      )
        .then((newImages) => {
          setImages(newImages);
          setDataAcquisitionState(DataAcquisitionState.Completed);
        })
        .catch((e) => {
          // 1 つでもデータの取得に失敗した場合、エラーとする
          setDataAcquisitionState(DataAcquisitionState.Failed);
          setFetchErrorAlertOpened(true);
          setImages([]);
          console.error(e);
        });
    } catch (e) {
      setDataAcquisitionState(DataAcquisitionState.Failed);
      setFetchErrorAlertOpened(true);
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAndCacheImages();
  }, []);

  const loadMore = useCallback(() => {
    return setTimeout(() => {
      setDataLength((dataLength) => dataLength + 10);
    }, 500);
  }, [setDataLength]);

  return (
    <Box width={'100%'} height={'100%'} pl={insets.left} pr={insets.right}>
      <Virtuoso
        style={{ height: '100%' }}
        totalCount={dataLength}
        endReached={loadMore} // 終端に達したときの処理
        components={{
          Header,
          Footer,
        }}
        itemContent={(index) => {
          return (
            <Stack width='100%' direction='row' justifyContent='center'>
              <VirtuosoItem
                imageUrl={images[index % images.length]?.imageUrl}
                loading={
                  dataAcquisitionState !== DataAcquisitionState.Completed
                }
                title={images[index % images.length]?.author}
                text={images[index % images.length]?.explanation}
              />
            </Stack>
          );
        }}
      />
      <Snackbar
        sx={{ ml: insets.left, mb: insets.bottom }}
        open={fetchErrorAlertOpened}
        autoHideDuration={6000}
        onClose={() => setFetchErrorAlertOpened(false)}
      >
        <Alert
          onClose={() => setFetchErrorAlertOpened(false)}
          severity='error'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {t('Failed to retrieve data')}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ヘッダーコンポーネント（AppBarの高さを設定）
const Header = () => {
  const appBarHeight = useAppBarHeight();
  return <Box height={appBarHeight} />;
};

// フッターコンポーネント（読み込み中メッセージを表示）
const Footer = () => {
  return (
    <Stack
      width={'100%'}
      direction={'row'}
      sx={{
        padding: 16,
        justifyContent: 'center',
      }}
    >
      Loading...
    </Stack>
  );
};
