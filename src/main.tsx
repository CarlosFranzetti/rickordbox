import { Buffer } from 'buffer';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && !(window as typeof window & { Buffer?: typeof Buffer }).Buffer) {
  (window as typeof window & { Buffer?: typeof Buffer }).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(<App />);
