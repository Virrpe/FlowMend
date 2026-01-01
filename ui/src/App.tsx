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


export function App() {
  const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY || '';
  const searchParams = new URLSearchParams(window.location.search);
  const queryHost = searchParams.get('host') || '';
  let host = queryHost || sessionStorage.getItem('persistentShopifyHost') || '';
  if (queryHost) {
    sessionStorage.setItem('persistentShopifyHost', queryHost);
  }
  console.log('Loaded API key:', apiKey ? '[present]' : 'MISSING');
  console.log('Host param:', host ? host : 'MISSING');
  if (!apiKey || !host) {
    console.error('AppBridge config missing: API key or host param. Set VITE_SHOPIFY_API_KEY in ui/.env and access with ?host=yourshop.myshopify.com');
    return <div>Error: App configuration missing! Check console.</div>;
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