import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './lab.css';

createRoot(document.getElementById('lab-root')!).render(<StrictMode><App /></StrictMode>);
