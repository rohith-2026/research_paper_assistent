import { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function Loader({ size = 'md', text, className }: LoaderProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div className={clsx('loading-spinner', sizeClass)} />
      {text && <p className="text-sm text-white/60">{text}</p>}
    </div>
  );
}
