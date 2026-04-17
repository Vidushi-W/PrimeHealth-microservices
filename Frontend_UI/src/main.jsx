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
            borderRadius: '16px',
            border: '1px solid #d7e4ee',
            background: 'linear-gradient(180deg, #ffffff, #f4f9ff)',
            color: '#183246',
            boxShadow: '0 16px 34px rgba(14, 60, 92, 0.16)'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
