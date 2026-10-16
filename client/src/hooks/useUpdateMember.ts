import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, type UpdateMemberPayload } from '@/api/users';
import { getErrorMessage } from '@/lib/errors';

// Used by the Team page and the Customers page
export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMemberPayload }) =>
      usersApi.updateMember(id, payload),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save the changes')),
    onSuccess: () => toast.success('Details updated'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}