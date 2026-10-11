import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing');

const reactRoot = createRoot(root);
// Vite removes this import (and its sample data) from production bundles.
if (import.meta.env.DEV && window.location.hash === '#design-preview') {
  void import('./dev/DesignPreview').then(({ DesignPreview }) => {
    reactRoot.render(<StrictMode><DesignPreview /></StrictMode>);
  });
} else {
  reactRoot.render(<StrictMode><App /></StrictMode>);
}
