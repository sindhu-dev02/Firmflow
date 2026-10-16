import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useUpdateMember } from '@/hooks/useUpdateMember';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

interface EditMemberModalProps {
  // the person being edited; null = window closed
  member: { id: string; name: string; email: string } | null;
  onClose: () => void;
}

export function EditMemberModal({ member, onClose }: EditMemberModalProps) {
  const update = useUpdateMember();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Fill the form each time a different person is opened
  useEffect(() => {
    if (member) reset({ name: member.name, email: member.email });
  }, [member, reset]);

  const onSubmit = (values: FormValues) => {
    if (!member) return;
    const payload: { name?: string; email?: string } = {};
    if (values.name !== member.name) payload.name = values.name;
    if (values.email.toLowerCase() !== member.email.toLowerCase()) payload.email = values.email;

    // nothing changed: just close
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: member.id, payload }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      title="Edit details"
      description={
        member ? (
          <>
            Change the name or email of{' '}
            <strong className="text-foreground">{member.name}</strong>. The email is what they use
            to sign in.
          </>
        ) : undefined
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-member-form" isLoading={update.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-member-form"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </form>
    </Modal>
  );
}