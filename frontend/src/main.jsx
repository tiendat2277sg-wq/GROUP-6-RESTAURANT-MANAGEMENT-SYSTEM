import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import '@/styles/shared/app.css';
import { LanguageProvider } from './core/i18n/LanguageProvider.jsx';
import App from './App.jsx';
import { AuthProvider } from '@/features/auth/context/AuthContext';

createRoot(document.getElementById('root')).render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
);
