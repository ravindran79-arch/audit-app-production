import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // This line connects to your App.js code

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
