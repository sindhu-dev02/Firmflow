import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/ui/PasswordField';
import { Button } from '@/components/ui/Button';
import { useChangePassword, useLogout } from '@/hooks/useAuth';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const changePassword = useChangePassword();
  const logout = useLogout();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => changePassword.mutate(values.newPassword);

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Your account was created with a temporary password. Pick one that only you know."
      footer={
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          Sign out instead
        </button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          autoFocus
          hint="At least 8 characters"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Button type="submit" size="lg" isLoading={changePassword.isPending} className="mt-2">
          Save and continue
        </Button>
      </form>
    </AuthShell>
  );
}