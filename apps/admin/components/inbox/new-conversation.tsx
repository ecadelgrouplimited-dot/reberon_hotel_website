'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, post } from '@/lib/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SelectInput, TextArea, TextInput } from '@/components/ui/field';

/** Until the WhatsApp Cloud API is connected, staff log phone/WhatsApp chats here. */
export function NewConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', channel: 'WHATSAPP', intent: 'STAY', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const router = useRouter();
  const m = useMutation({
    mutationFn: () => post<{ id: string }>('/conversations', { ...f, phone: f.phone || undefined, email: f.email || undefined }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation logged');
      onClose();
      setF({ name: '', phone: '', email: '', channel: 'WHATSAPP', intent: 'STAY', message: '' });
      router.push(`/inbox/${c.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fieldErrors());
      toast.error(e instanceof ApiError ? e.message : 'Could not save');
    },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log a conversation"
      description="A WhatsApp chat or phone call that should not live only in someone's phone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Save to inbox</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Name" required value={f.name} onChange={set('name')} error={errors.name} wrapClassName="sm:col-span-2" />
        <TextInput label="Phone" value={f.phone} onChange={set('phone')} error={errors.phone} placeholder="07xx…" />
        <TextInput label="Email" value={f.email} onChange={set('email')} error={errors.email} />
        <SelectInput label="Came in by" value={f.channel} onChange={set('channel')}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="PHONE">Phone call</option>
          <option value="EMAIL">Email</option>
        </SelectInput>
        <SelectInput label="About" value={f.intent} onChange={set('intent')}>
          <option value="STAY">A stay</option>
          <option value="EVENT">Event / hall</option>
          <option value="GROUP">Group</option>
          <option value="GENERAL">General</option>
        </SelectInput>
        <TextArea label="What they said" required value={f.message} onChange={set('message')} error={errors.message} wrapClassName="sm:col-span-2" rows={4} />
      </div>
    </Dialog>
  );
}
