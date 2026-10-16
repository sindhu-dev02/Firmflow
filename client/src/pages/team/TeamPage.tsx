import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTeam } from '@/hooks/useTeam';
import { usersApi, type InvitePayload } from '@/api/users';
import { Plus, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EditMemberModal } from '@/components/team/EditMemberModal';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage, getPlanLimitError } from '@/lib/errors';
import type { TeamMember, TeamResponse } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useConfirm } from '@/hooks/useConfirm';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['employee', 'customer']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function useInviteUser() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: InvitePayload) => usersApi.inviteUser(payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['team'] });
      const previous = queryClient.getQueryData<TeamResponse>(['team']);

      const optimisticMember: TeamMember = {
        id: `optimistic-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        isActive: false
      };

      queryClient.setQueryData<TeamResponse>(['team'], (old) =>
        old ? { ...old, users: [...old.users, optimisticMember] } : old
      );

      return { previous, optimisticId: optimisticMember.id };
    },

    onError: (error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['team'], context.previous);
      }

      const planLimit = getPlanLimitError(error);
      if (planLimit) {
        // The backend's message is already specific ("Your Starter plan
        // allows up to 3 employees…") — just surface it with a way out.
        toast.error(planLimit.message, {
          action: {
            label: 'Upgrade plan',
            onClick: () => navigate('/billing/plans'),
          },
        });
        return;
      }

      toast.error(getErrorMessage(error, 'Could not invite user'));
    },

    onSuccess: (_data, payload) => {
      toast.success(`Invited ${payload.name}`);
    },

    onSettled: () => {
      // Reconcile with the server's real id/shape regardless of outcome
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not delete this member'));
    },
    onSuccess: () => {
      toast.success('Member deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate ? usersApi.reactivateUser(id) : usersApi.deactivateUser(id),

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not update this member'));
    },
    onSuccess: (_data, { activate }) => {
      toast.success(activate ? 'Member reactivated' : 'Member deactivated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function TeamPage() {
  const confirm = useConfirm();
  const { data: allData, isLoading, isError } = useTeam();
  // Customers have their own page, so the Team page shows staff only
  const data = allData
    ? { ...allData, users: allData.users.filter((u) => u.role !== 'customer') }
    : undefined;
  const inviteUser = useInviteUser();
  const toggleStatus = useToggleUserStatus();
  const deleteMember = useDeleteUser();
  const currentUser = useAuthStore((s) => s.user);
  const canManageTeam = currentUser?.role === 'org_owner';
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'employee',
    },
  });

  const onSubmit = (values: InviteFormValues) =>
    inviteUser.mutate(values, {
      onSuccess: () => setFormOpen(false),
    });

  const openForm = () => {
    reset({ name: '', email: '', password: '', role: 'employee' });
    setFormOpen(true);
  };

  if (isLoading) {
    return <PageSkeleton cols={5} />;
  }

  if (isError || !data) {
    return <ErrorState message="Could not load team members." />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Team list */}
      <div>
        <PageHeader
          title="Team"
          description={`${data.users.length} ${data.users.length === 1 ? 'member' : 'members'}`}
          action={
            canManageTeam && (
              <Button type="button" onClick={openForm}>
                <Plus size={16} /> Invite member
              </Button>
            )
          }
        />

        {data.users.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No team members yet"
            description="Invite a teammate to help you manage products and orders."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Status
                  </th>
                  {canManageTeam && (
                    <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {data.users.map((member) => {
                    const isOptimistic = member.id.startsWith('optimistic-');
                    return (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0, backgroundColor: 'hsl(var(--primary) / 0.08)' }}
                        animate={{
                          opacity: isOptimistic ? 0.6 : 1,
                          backgroundColor: 'hsl(var(--primary) / 0)',
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-sm text-foreground">{member.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>
                        <td className="px-4 py-3 text-sm capitalize text-muted-foreground">
                          {member.role.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={member.isActive ? 'text-success' : 'text-muted-foreground'}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {canManageTeam && (
                          <td className="px-4 py-3">
                            {member.role !== 'org_owner' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditing(member)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  isLoading={toggleStatus.isPending}
                                  onClick={async () => {
                                    if (member.isActive) {
                                      const ok = await confirm({
                                        title: `Deactivate ${member.name}?`,
                                        message:
                                          'They will be signed out and cannot log in until you reactivate them. Their seat stays used.',
                                        confirmLabel: 'Deactivate',
                                      });
                                      if (!ok) return;
                                    }
                                    toggleStatus.mutate({ id: member.id, activate: !member.isActive });
                                  }}
                                >
                                  {member.isActive ? 'Deactivate' : 'Reactivate'}
                                </Button>
                                
                                {!member.isActive && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    isLoading={deleteMember.isPending}
                                    onClick={async () => {
                                      const ok = await confirm({
                                        title: `Delete ${member.name}?`,
                                        message:
                                          'This removes them for good and frees up their seat. It cannot be undone.',
                                        confirmLabel: 'Delete member',
                                        tone: 'danger',
                                      });
                                      if (ok) deleteMember.mutate(member.id);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditMemberModal member={editing} onClose={() => setEditing(null)} />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Invite a team member"
        description="They will be asked to choose a new password when they first sign in."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="invite-form" isLoading={inviteUser.isPending}>
              Send invite
            </Button>
          </>
        }
      >
        <form id="invite-form"
          noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <TextField
            label="Temporary password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <SelectField label="Role" {...register('role')}>
            <option value="employee">Employee</option>
          </SelectField>
        </form>
      </Modal>
    </div>
  );
}