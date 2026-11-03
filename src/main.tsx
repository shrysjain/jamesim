import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(<><App />{import.meta.env.PROD && <Analytics />}</>);
