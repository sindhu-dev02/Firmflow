import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import '@/api/axios';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'bg-card! text-foreground! border-border!',
            description: 'text-muted-foreground!',
            actionButton: 'bg-primary! text-primary-foreground!',
            cancelButton: 'bg-muted! text-muted-foreground!',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);