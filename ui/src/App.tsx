/**
 * FlowMend Admin UI - Main App Component
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';

import { NavigationFrame } from './components/NavigationFrame';
import { Dashboard } from './pages/Dashboard';
import { Runs } from './pages/Runs';
import { RunDetail } from './pages/RunDetail';
import { Templates } from './pages/Templates';
import { Settings } from './pages/Settings';

// Get host and shop from URL params (embedded app context)
const params = new URLSearchParams(window.location.search);
const host = params.get('host') || '';
const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY || '';

const appBridgeConfig = {
  apiKey,
  host,
  forceRedirect: true,
};

export function App() {
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
