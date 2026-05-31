import { Icon } from '../../../components';

const generateHistory22 = (tx: any) => {
  const points: number[] = [];
  let seed = 0;
  for (let i = 0; i < tx.card.length; i++) {
    seed += tx.card.charCodeAt(i);
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 21; i++) {
    const factor = 0.5 + random() * 1.1; // between 0.5 and 1.6
    const value = tx.cardMedian * factor;
    points.push(value);
  }
  points.push(tx.amount);
  return points;
};

export function CurveGraph({ tx }: { tx: any }) {
  const data = generateHistory22(tx);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const paddingY = 28;
  const h = 230; // total height of chart
  const w = 530; // total width of chart (fills the panel space)

  // Map to points
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - paddingY - ((v - min) / rng) * (h - 2 * paddingY);
    return { x, y, value: v };
  });

  // Calculate Bezier curve path
  let curveD = '';
  if (pts.length > 0) {
    curveD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      curveD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const fillD = curveD + ` L ${w} ${h} L 0 ${h} Z`;
  const gradId = "curve-grad-" + tx.id;

  // Horizontal grid values (spaced out)
  const gridLinesY = [
    min,
    min + rng * 0.25,
    min + rng * 0.5,
    min + rng * 0.75,
    max
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: h, background: 'var(--surface-3)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Background SVG Grid & Curve */}
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Draw horizontal grid lines */}
        {gridLinesY.map((v, idx) => {
          const y = h - paddingY - ((v - min) / rng) * (h - 2 * paddingY);
          return (
            <line 
              key={idx} 
              x1="0" 
              y1={y} 
              x2={w} 
              y2={y} 
              stroke="var(--border)" 
              strokeWidth="0.8" 
              strokeDasharray="4 4" 
            />
          );
        })}

        {/* Draw vertical grid lines */}
        {Array.from({ length: 11 }).map((_, idx) => {
          const x = (w / 10) * idx;
          return (
            <line 
              key={idx} 
              x1={x} 
              y1="0" 
              x2={x} 
              y2={h} 
              stroke="var(--border)" 
              strokeWidth="0.8" 
              strokeDasharray="4 4" 
            />
          );
        })}

        {/* Under-curve gradient fill */}
        <path d={fillD} fill={`url(#${gradId})`} />

        {/* Curve Stroke */}
        <path 
          d={curveD} 
          fill="none" 
          stroke="var(--accent)" 
          strokeWidth="2.5" 
          strokeLinejoin="round" 
          strokeLinecap="round" 
        />

        {/* Median spending line */}
        {(() => {
          const yMed = h - paddingY - ((tx.cardMedian - min) / rng) * (h - 2 * paddingY);
          return (
            <line 
              x1="0" 
              y1={yMed} 
              x2={w} 
              y2={yMed} 
              stroke="var(--medium)" 
              strokeWidth="1.2" 
              strokeDasharray="6 3" 
            />
          );
        })()}

        {/* Highlighting dots for historical points */}
        {pts.map((p, idx) => {
          const isLast = idx === pts.length - 1;
          return (
            <circle 
              key={idx} 
              cx={p.x} 
              cy={p.y} 
              r={isLast ? "4" : "1.8"} 
              fill={isLast ? "var(--critical)" : "var(--accent)"} 
              stroke={isLast ? "#fff" : "none"}
              strokeWidth={isLast ? "1.5" : "0"}
            />
          );
        })}
      </svg>

      {/* Overlay texts directly on top of the graph */}
      <div style={{ position: 'absolute', inset: 0, padding: '12px 14px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Top Text Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="history" size={12} style={{ color: 'var(--accent)' }} />
              Last 22 Transactions Card Baseline
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
              Cubic-bezier spline interpolation
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--medium)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              Median: ${tx.cardMedian.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Bottom Text Row & Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-2)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              Avg Deviation: +3.4 Std Dev
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--critical)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(220,38,38,0.1)' }}>
              Current Charge: ${tx.amount.toFixed(2)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
