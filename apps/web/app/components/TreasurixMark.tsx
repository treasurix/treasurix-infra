type TreasurixMarkProps = {
  className?: string;
  size?: number;
  /** Outer frame stroke — overview uses gold `#c9a84c` */
  stroke?: string;
  /** Inner diamond fill */
  fill?: string;
};

/**
 * SVG of the Cloak Integration Overview nav mark: 28×28 diamond frame,
 * 1.5px stroke, 10×10 filled center (both rotated 45° like the HTML/CSS).
 */
export function TreasurixMark({
  className = "",
  size = 28,
  stroke = "#c9a84c",
  fill = "#c9a84c",
}: TreasurixMarkProps) {
  const s = size;
  const strokeW = 1.5 * (s / 28);
  const inner = 10 * (s / 28);
  const c = s / 2;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <title>Treasurix</title>
      <g transform={`translate(${c} ${c}) rotate(45)`}>
        <rect
          x={-(s - strokeW) / 2}
          y={-(s - strokeW) / 2}
          width={s - strokeW}
          height={s - strokeW}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
        />
        <rect x={-inner / 2} y={-inner / 2} width={inner} height={inner} fill={fill} />
      </g>
    </svg>
  );
}
