import '@pixi/layout';
import '@pixi/layout/react';

import { Box, Stack } from '@mui/material';
import { LayoutContainer } from '@pixi/layout/components';
import { Application, extend, useApplication } from '@pixi/react';
import { Container } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { SpikeWaveDemo } from './noiseWaveDemo';
import { PixiPad } from './pixiPad';
import { VelocityStepMeter } from './velocityMeter';

extend({
  Container,
  LayoutContainer,
});

const LayoutResizer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const layoutRef = useRef<Container>(null);
  const { app } = useApplication();

  useEffect(() => {
    // app.renderer が初期化されていない場合は何もしない
    if (!app || !app.renderer) return;

    const handleResize = () => {
      if (layoutRef.current) {
        layoutRef.current.layout = {
          width: app.screen.width,
          height: app.screen.height,
        };
      }
    };

    app.renderer.on('resize', handleResize);
    handleResize(); // 初回実行

    return () => {
      app.renderer?.off('resize', handleResize);
    };
  }, [app]);

  return (
    <pixiContainer ref={layoutRef} layout={{}}>
      {children}
    </pixiContainer>
  );
};

export const FriendJamDemoIndex = () => {
  const parentRef = useRef(null);
  const audioRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);

  return (
    <Box ref={parentRef} width={'100%'} height={'100%'}>
      <Stack
        position={'absolute'}
        width={'100%'}
        direction='row'
        spacing={2}
        justifyContent={'center'}
        py={18}
      >
        <audio ref={audioRef} src='assets/rock-free.mp3' controls>
          Your browser does not support the
          <code>audio</code> element.
        </audio>
      </Stack>
      <Application
        resizeTo={parentRef}
        resolution={window.devicePixelRatio || 1}
        autoDensity
        background={'#303030'}
      >
        <LayoutResizer>
          <layoutContainer
            layout={{
              width: '100%',
              flexDirection: 'row',
            }}
          >
            <layoutContainer
              layout={{
                width: 80,
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <layoutContainer layout={{ width: 50, height: 280 }}>
                <VelocityStepMeter
                  barCount={18}
                  width={50}
                  totalHeight={280}
                  noteNumbers={[
                    0x1a, 0x26, 0x28, 0x2a, 0x2b, 0x2d, 0x2e, 0x30, 0x31, 0x33,
                    0x37, 0x39, 0x3b,
                  ]}
                  activeColor={0xff8a00}
                />
              </layoutContainer>
            </layoutContainer>
            <layoutContainer
              layout={{
                flexGrow: 1,
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 12,
                gap: 16,
              }}
            >
              {/* <layoutContainer layout={{ backgroundColor: '#00ff00' }} > */}

              <layoutContainer
                layout={{
                  width: 480,
                  height: 60,
                  flexDirection: 'column',
                  backgroundColor: '#202020',
                }}
              >
                <SpikeWaveDemo
                  width={480}
                  height={60}
                  durationMs={180000} // 上限3分
                  stepPx={1}
                  lineWidth={1}
                  colorUp={0xffe066}
                  colorDown={0xff8a00}
                  baselineRatio={0.4}
                  showProgress={true}
                  progressHeight={6}
                  progressColor={0xffa500}
                  mediaRef={audioRef} // ★ 音声と同期
                  followMedia={true} // ★ メディアの再生/停止/シークに従う
                />
              </layoutContainer>
              <layoutContainer
                layout={{
                  width: 480,
                  height: 180,
                  flexDirection: 'column',
                }}
              >
                <PixiPad
                  x={0}
                  y={100}
                  title={'HH'}
                  noteNumbers={[0x1a, 0x2a, 0x2e]}
                />
                <PixiPad
                  x={100}
                  y={100}
                  title={'SN'}
                  noteNumbers={[0x26, 0x28]}
                />
                <PixiPad x={100} y={0} title='HT' noteNumbers={[0x30]} />
                <PixiPad x={200} y={50} title='BD' noteNumbers={[0x24]} />
                <PixiPad x={300} y={0} title='LT' noteNumbers={[0x2d]} />
                <PixiPad x={300} y={100} title='FT' noteNumbers={[0x2b]} />
                <PixiPad x={0} y={0} title='CR1' noteNumbers={[0x31, 0x37]} />
                <PixiPad x={400} y={0} title='CR2' noteNumbers={[0x39]} />
                <PixiPad
                  x={400}
                  y={100}
                  title='RC'
                  noteNumbers={[0x33, 0x3b]}
                />
              </layoutContainer>
            </layoutContainer>
            <layoutContainer
              layout={{
                width: 80,
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <layoutContainer layout={{ width: 50, height: 280 }}>
                <VelocityStepMeter
                  barCount={18}
                  width={50}
                  totalHeight={280}
                  noteNumbers={[0x24]}
                  activeColor={0xff8a00}
                />
              </layoutContainer>
            </layoutContainer>
          </layoutContainer>
        </LayoutResizer>
      </Application>
    </Box>
  );
};
