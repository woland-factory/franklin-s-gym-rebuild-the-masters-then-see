import { useEffect, useRef, useState } from "react";
import { dateLabel } from "../lib/attempts";
import styles from "./TrendChart.module.css";

export interface TrendPoint {
  date: number; // epoch ms, for the hover title
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[]; // time-ascending
  yMin: number;
  yMax: number;
  yTicks: number[]; // e.g. [0, 50, 100] or [-3, 0, 3]
  formatValue: (v: number) => string; // "78%" or "+1"
  zeroEmphasis?: boolean; // stronger gridline at y=0
  ariaLabel: string; // one-sentence summary, built by the caller
}

const HEIGHT = 140;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const DEFAULT_WIDTH = 320;

// One reusable single-series line chart, hand-rolled inline SVG with no chart
// library. The two ledger metrics live on two separate charts, each with one y
// axis and one series. Width comes from measuring the container so axis text
// stays at native size and readable at 390px.
export function TrendChart({
  points,
  yMin,
  yMax,
  yTicks,
  formatValue,
  zeroEmphasis = false,
  ariaLabel,
}: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const span = yMax - yMin;

  const xAt = (i: number) =>
    points.length <= 1 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (i / (points.length - 1)) * plotW;
  const yAt = (v: number) => PAD_TOP + (span === 0 ? plotH / 2 : ((yMax - v) / span) * plotH);

  const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value), point: p }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <div className={styles.container} ref={containerRef}>
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className={styles.svg}
      >
        {yTicks.map((tick) => {
          const y = yAt(tick);
          const emphasized = zeroEmphasis && tick === 0;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={y}
                y2={y}
                className={emphasized ? styles.zeroLine : styles.gridLine}
              />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" className={styles.tickLabel}>
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {coords.length >= 2 && <polyline points={linePoints} className={styles.line} />}

        {coords.map((c, i) => (
          <circle key={`dot-${i}`} cx={c.x} cy={c.y} r={4} className={styles.dot}>
            <title>
              {dateLabel(c.point.date)}. {formatValue(c.point.value)}
            </title>
          </circle>
        ))}

        {last && (
          <text
            x={Math.min(last.x, width - PAD_RIGHT)}
            y={Math.max(PAD_TOP + 10, last.y - 10)}
            textAnchor="end"
            className={styles.valueLabel}
            data-testid="trend-value"
          >
            {formatValue(last.point.value)}
          </text>
        )}

        {points.length >= 1 && (
          <text x={PAD_LEFT} y={HEIGHT - 6} textAnchor="start" className={styles.axisLabel}>
            {dateLabel(points[0].date)}
          </text>
        )}
        {points.length >= 2 && (
          <text
            x={width - PAD_RIGHT}
            y={HEIGHT - 6}
            textAnchor="end"
            className={styles.axisLabel}
          >
            {dateLabel(points[points.length - 1].date)}
          </text>
        )}
      </svg>
    </div>
  );
}
