import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.tsx';
import './functions/multilingual/i18n.ts';
import { Quattro } from './functions/quattro/quattro.ts';
import { store } from './stores/store.ts';
import { HashRouter } from 'react-router';

Quattro.event.start();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>
);
