import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '14px',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 18px 40px rgba(94, 183, 136, 0.14)'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
