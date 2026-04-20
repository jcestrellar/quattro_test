import { Box, Stack } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router';
import { MyAppBar } from '../../components/myAppBar';
import {
  NavigationDirection,
  useNavigationDirection,
} from '../../hooks/useNavigationDirection';
import { useSystemReducedMotion } from '../../hooks/useSystemReducedMotion';

export const RootPage = () => {
  const location = useLocation();
  const element = useOutlet();
  const direction = useNavigationDirection(location.key);
  const reduceMotion = useSystemReducedMotion();

  return (
    <Box width='100vw' height='100vh' id='root'>
      <Stack width='100%' height='100%'>
        <MyAppBar />
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={location.pathname}
            initial={{
              opacity: 0,
              x: direction === NavigationDirection.Forward ? 20 : -20,
            }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            style={{ width: '100%', height: '100%' }}
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </Stack>
    </Box>
  );
};
