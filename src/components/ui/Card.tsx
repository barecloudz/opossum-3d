interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl
        ${paddingStyles[padding]}
        ${hover ? 'transition-all hover:border-[var(--color-primary)]/50 hover:shadow-neon-sm' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
