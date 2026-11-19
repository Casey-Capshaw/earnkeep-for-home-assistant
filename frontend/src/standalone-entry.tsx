// EarnKeep - Standalone SPA entry point
// Used for development and standalone browser access outside Home Assistant.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StandaloneHTTPClient } from './api/standalone-http';
import { useStore } from './store';

const params = new URLSearchParams(window.location.search);
const baseUrl = params.get('ha_url') || 'http://localhost:8123';
const token = params.get('token') || '';

const api = new StandaloneHTTPClient(baseUrl, token);
useStore.getState().setApi(api);
useStore.getState().loadData();

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
