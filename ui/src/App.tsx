/**
 * FlowMend Admin UI - Main App Component
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';

import { NavigationFrame } from './components/NavigationFrame';
import { Dashboard } from './pages/Dashboard';
import { Runs } from './pages/Runs';
import { RunDetail } from './pages/RunDetail';
import { Templates } from './pages/Templates';
import { Settings } from './pages/Settings';


export function App() {
  const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY || '';
  if (!apiKey) {
    console.error('AppBridgeError: VITE_SHOPIFY_API_KEY env var missing. Set in Railway web service vars.');
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const host = params.get('host') || '';
    if (!host) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem' }}>
          <h2>Missing host parameter</h2>
          <p>Open FlowMend from Shopify Admin Apps list.</p>
          <p>Current URL: {window.location.href}</p>
        </div>
      );
    }
    const appBridgeConfig = {
      apiKey,
      host,
      forceRedirect: true,
    };
    return (
      <html>
        <head><title>Config Error</title></head>
        <body style="font-family:sans-serif; padding:2rem; text-align:center;">
          <h1>App Configuration Error</h1>
          <p>Missing <code>VITE_SHOPIFY_API_KEY</code>. Add to Railway "web" service environment variables (same as SHOPIFY_API_KEY).</p>
        </body>
      </html>
    );
  }
  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider i18n={{}}>
        <BrowserRouter basename="/app">
          <NavigationFrame>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </NavigationFrame>
        </BrowserRouter>
      </AppProvider>
    </AppBridgeProvider>
  );
}