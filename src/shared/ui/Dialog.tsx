import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, title, onClose, children, className = '' }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className={`ui-dialog__panel ${className}`.trim()}>
        <header className="ui-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button className="ui-button ui-button--ghost ui-dialog__close" type="button" aria-label="Закрыть диалог" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
