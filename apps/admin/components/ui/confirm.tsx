'use client';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog } from './dialog';
import { Button } from './button';

interface ConfirmOpts {
  title: string;
  body?: ReactNode;
  confirm?: string;
  danger?: boolean;
}

const Ctx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

/** `await confirm({...})` — every destructive action names the object it affects. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((r) => (resolver.current = r));
  }, []);
  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => close(false)}
        size="sm"
        title={opts?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {opts?.confirm ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="text-[13.5px] leading-relaxed text-fg-muted">{opts?.body}</div>
      </Dialog>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
