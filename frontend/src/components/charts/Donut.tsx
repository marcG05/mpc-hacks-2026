export function Donut({ data, size = 150, thickness = 18 }: { data: {value: number, color: string}[], size?: number, thickness?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.value / Math.max(1, total)) * circ;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
            strokeWidth={thickness} strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset} strokeLinecap="butt" />
        );
        offset += len;
        return seg;
      })}
    </svg>
  );
}
