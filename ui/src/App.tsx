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
  const location = useLocation();
  const host = new URLSearchParams(location.search).get('host') || '';
  if (!apiKey || !host) {
    return (
      <div className="p-8 text-center">
        <h1>Missing configuration</h1>
        <p>{!apiKey ? 'Missing VITE_SHOPIFY_API_KEY' : 'Missing host query param; open app from Shopify Admin'}</p>
      </div>
    );
  }
  const appBridgeConfig = {
    apiKey,
    host,
    forceRedirect: true,
  };
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