import { useEffect, useRef, useState } from 'react';
import type { Bar } from './types';

/** Lightweight canvas candlesticks with SMA overlays and a tap-to-read crosshair. */
export function Chart({ bars }: { bars: Bar[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv || !bars.length) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      const g = cv.getContext('2d')!; g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const css = getComputedStyle(cv), col = (n: string) => css.getPropertyValue(n).trim();
      const padR = 52, padT = 28, padB = 22, ch = H - padT - padB, cw = W - padR - 8;
      const lo = Math.min(...bars.map(b => b.low)), hi = Math.max(...bars.map(b => b.high));
      const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * ch;
      const step = cw / bars.length;
      g.strokeStyle = col('--line'); g.lineWidth = 0.5; g.fillStyle = col('--ink3'); g.font = '11px -apple-system, BlinkMacSystemFont, Inter, sans-serif'; g.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, yy = y(v); g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke(); g.fillText(v.toFixed(v > 100 ? 0 : 1), W - padR + 6, yy + 3); }
      const up = col('--up'), dn = col('--down');
      bars.forEach((b, i) => {
        const x = 4 + i * step + step / 2, c = b.close >= b.open ? up : dn;
        g.strokeStyle = c; g.fillStyle = c;
        g.beginPath(); g.moveTo(x, y(b.high)); g.lineTo(x, y(b.low)); g.stroke();
        const top = y(Math.max(b.open, b.close)), h = Math.max(1, Math.abs(y(b.open) - y(b.close)));
        g.fillRect(x - step * 0.36, top, step * 0.72, h);
      });
      g.save(); g.beginPath(); g.rect(0, padT, W - padR, ch); g.clip();
      (['sma_50', 'sma_200'] as const).forEach((k, j) => {
        g.beginPath(); g.lineWidth = 1.5; g.strokeStyle = j ? col('--ink2') : col('--accent'); let on = false;
        bars.forEach((b, i) => { const v = b[k]; if (v == null) { on = false; return; } const x = 4 + i * step + step / 2; on ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); on = true; });
        g.stroke();
      });
      g.restore();
      if (hover != null) {
        const x = 4 + hover * step + step / 2; g.strokeStyle = col('--line2'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, padT); g.lineTo(x, H - padB); g.stroke(); g.setLineDash([]);
      }
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(cv);
    return () => ro.disconnect();
  }, [bars, hover]);

  const pick = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - 4) / (r.width - 60)) * bars.length - 0.5);
    setHover(Math.max(0, Math.min(bars.length - 1, i)));
  };
  const b = bars[hover ?? bars.length - 1];
  return (
    <div className="chartbox">
      <canvas ref={ref} onPointerDown={pick} onPointerMove={e => e.buttons && pick(e)} aria-label="Price chart" role="img" />
      {b && <div className="legend num">{b.date} · O {b.open.toFixed(1)} H {b.high.toFixed(1)} L {b.low.toFixed(1)} C {b.close.toFixed(1)}</div>}
    </div>
  );
}
