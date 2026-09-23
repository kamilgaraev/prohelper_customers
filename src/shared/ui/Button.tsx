import { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ className = '', variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ${className}`.trim()} type={type} {...props} />;
}
