import { useContext } from 'react';
import { ConfirmContext } from '@/components/ui/confirm-context';

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}