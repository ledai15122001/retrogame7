import { CSSProperties, ReactNode, useMemo } from 'react';
import { useInView } from '@/hooks';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}

export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.12 });
  const Tag = as as 'div';
  const style = useMemo<CSSProperties>(
    () => ({ transitionDelay: `${delay}ms` }),
    [delay]
  );
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
