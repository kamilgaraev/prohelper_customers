import { cloneElement, HTMLAttributes, isValidElement, ReactNode } from 'react';

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children, className = '', ...props }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? htmlFor,
        'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })
    : children;

  return (
    <div className={`ui-field ${className}`.trim()} {...props}>
      <label className="ui-field__label" htmlFor={htmlFor}>{label}</label>
      {control}
      {hint ? <span className="ui-field__hint" id={hintId}>{hint}</span> : null}
      {error ? <span className="ui-field__error" id={errorId} role="alert">{error}</span> : null}
    </div>
  );
}
