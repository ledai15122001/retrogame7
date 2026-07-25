import { memo, useMemo } from 'react';

/**
 * Grid-based pixel art renderer.
 * Each sprite is defined as an array of equal-length strings.
 * Each character maps to a color via the `palette` map.
 * ' ' or '.' = transparent.
 *
 * Renders crisp SVG <rect>s with shape-rendering: crispEdges.
 * The rect list is memoized on (grid, palette, pixel, scale) so identical
 * sprites skip re-computation across re-renders.
 */
export interface PixelSpriteProps {
  grid: string[];
  palette: Record<string, string>;
  /** pixel size in px at 1x scale (scales with `scale`) */
  pixel?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const BASE_STYLE: React.CSSProperties = { imageRendering: 'pixelated', display: 'block' };

export const PixelSprite = memo(function PixelSprite({
  grid,
  palette,
  pixel = 4,
  scale = 1,
  className,
  style,
  title,
}: PixelSpriteProps) {
  const px = pixel * scale;
  const w = grid[0]?.length ?? 0;
  const h = grid.length;

  const rects = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let y = 0; y < h; y++) {
      const row = grid[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (!ch || ch === ' ' || ch === '.') continue;
        const color = palette[ch];
        if (!color) continue;
        out.push(
          <rect
            key={`${x}-${y}`}
            x={x * px}
            y={y * px}
            width={px}
            height={px}
            fill={color}
          />
        );
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, palette, pixel, scale]);

  const svgStyle = useMemo(
    () => (style ? { ...BASE_STYLE, ...style } : BASE_STYLE),
    [style]
  );

  return (
    <svg
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w * px} ${h * px}`}
      className={className}
      style={svgStyle}
      shapeRendering="crispEdges"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      {rects}
    </svg>
  );
});
