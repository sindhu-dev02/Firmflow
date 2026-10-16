import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useCreateOrganization } from '@/hooks/useOrganization';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import type { AxiosError } from 'axios';
import type { ApiErrorPayload } from '@/types';

const orgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
});

type OrgFormValues = z.infer<typeof orgSchema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CreateOrganizationPage() {
  const createOrg = useCreateOrganization();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrgFormValues>({ resolver: zodResolver(orgSchema) });

  const slug = watch('slug');
  const onSubmit = (values: OrgFormValues) => createOrg.mutate(values);
  const apiError = createOrg.error as AxiosError<ApiErrorPayload> | null;
  const firstName = user?.name?.trim().split(' ')[0];

  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title={firstName ? `Almost there, ${firstName}` : 'Almost there'}
      subtitle="Name your organization. You'll be its owner and can invite your team afterwards."
      footer={
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          Sign out
        </button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <TextField
          label="Organization name"
          autoFocus
          placeholder="e.g. Kavya Stationers"
          error={errors.name?.message}
          {...register('name', {
            onChange: (e) => setValue('slug', slugify(e.target.value), { shouldValidate: false }),
          })}
        />
        <TextField
          label="URL slug"
          hint={`Your workspace will be called /${slug || 'your-organization'}`}
          error={errors.slug?.message}
          {...register('slug')}
        />

        {apiError && (
          <p className="text-sm text-destructive">
            {apiError.response?.data?.message ?? 'Could not create organization.'}
          </p>
        )}

        <Button type="submit" size="lg" isLoading={createOrg.isPending} className="mt-2">
          Create organization
        </Button>
      </form>
    </AuthShell>
  );
}