import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@app/App';
import { AppProviders } from '@app/providers/AppProviders';

import './index.css';

const savedTheme = window.localStorage.getItem('customer-theme');
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verification-required',
];
const isAuthRoute = authRoutes.includes(window.location.pathname) || window.location.pathname.startsWith('/invitations/');
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
document.documentElement.dataset.theme = isAuthRoute
  ? (prefersDark ? 'dark' : 'light')
  : (savedTheme === 'dark' ? 'dark' : 'light');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);

