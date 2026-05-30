import { FRAUD } from '../../data';
import { SEV_STYLE } from './Pills';

export function ScoreBar({ score }: { score: number }) {
  const sev = FRAUD.sevOf(score);
  const c = SEV_STYLE[sev]?.c || "var(--low)";
  return (
    <div className="score-cell">
      <div className="score-bar"><i style={{ width: score * 100 + "%", background: c }}></i></div>
      <span className="score-num" style={{ color: c }}>{score.toFixed(2)}</span>
    </div>
  );
}
