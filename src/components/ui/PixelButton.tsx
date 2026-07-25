import { forwardRef, ButtonHTMLAttributes, useCallback, useMemo } from 'react';
import { sound } from '@/utils/sound';

type Variant = 'gold' | 'pink' | 'cyan' | 'purple' | 'ghost';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  silent?: boolean;
}

const variantClass: Record<Variant, string> = {
  gold: '',
  pink: 'pixel-btn-pink',
  cyan: 'pixel-btn-cyan',
  purple: 'pixel-btn-purple',
  ghost: 'pixel-btn-ghost',
};

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  function PixelButton({ variant = 'gold', silent, className, children, onClick, ...rest }, ref) {
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!silent) sound.tap();
        onClick?.(e);
      },
      [silent, onClick]
    );

    const handleMouseEnter = useCallback(() => {
      if (!silent) sound.tap();
    }, [silent]);

    const cls = useMemo(
      () => `pixel-btn ${variantClass[variant]} ${className ?? ''}`,
      [variant, className]
    );

    return (
      <button
        ref={ref}
        className={cls}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
