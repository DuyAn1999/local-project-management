import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' };

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props} />;
}
