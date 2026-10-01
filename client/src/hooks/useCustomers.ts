import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usersApi } from '@/api/users';
import { getErrorMessage, getPlanLimitError } from '@/lib/errors';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: usersApi.listCustomers,
  });
}

// Anything that changes a customer should refresh the customer list,
// the team list (used by the Orders form) and the dashboard numbers.
function useRefreshCustomers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useAddCustomer() {
  const refresh = useRefreshCustomers();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: { name: string; email: string; password: string }) =>
      usersApi.inviteUser({ ...payload, role: 'customer' }),
    onError: (error) => {
      const planLimit = getPlanLimitError(error);
      if (planLimit) {
        toast.error(planLimit.message, {
          action: { label: 'Upgrade plan', onClick: () => navigate('/billing/plans') },
        });
        return;
      }
      toast.error(getErrorMessage(error, 'Could not add customer'));
    },
    onSuccess: (_d, payload) => toast.success(`Added ${payload.name}`),
    onSettled: refresh,
  });
}

export function useToggleCustomer() {
  const refresh = useRefreshCustomers();
  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate ? usersApi.reactivateUser(id) : usersApi.deactivateUser(id),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update this customer')),
    onSuccess: (_d, { activate }) =>
      toast.success(activate ? 'Customer reactivated' : 'Customer deactivated'),
    onSettled: refresh,
  });
}

export function useDeleteCustomer() {
  const refresh = useRefreshCustomers();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete this customer')),
    onSuccess: () => toast.success('Customer deleted'),
    onSettled: refresh,
  });
}