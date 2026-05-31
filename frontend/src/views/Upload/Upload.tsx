import { useState, useRef } from 'react';
import { Icon } from '../../components';

interface UploadProps {
  onAnalyze: (file: File) => void;
}

export function Upload({ onAnalyze }: UploadProps) {
  const [drag, setDrag] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STEPS = ["Parsing transactions.csv…", "Building per-card baselines…", "Detecting cross-card signals…", "Scoring & tuning threshold…"];

  function handleFile(file: File) {
    if (!file) return;
    setRunning(true);
    setStep(0);
    
    // Step through the pipeline UI for effect
    let s = 0;
    const iv = setInterval(() => {
      s++; setStep(s);
      if (s >= STEPS.length) clearInterval(iv);
    }, 650);
    
    // Trigger actual analysis immediately with the uploaded file
    onAnalyze(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <div className="upload-stage" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {!running ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className={"dropzone" + (drag ? " drag" : "")}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}>
              <div style={{ width: 56, height: 56, margin: "0 auto 18px", borderRadius: 14, background: "var(--accent-soft)", border: "1px solid var(--accent-line)", display: "grid", placeItems: "center" }}>
                <Icon name="upload" size={26} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Drop transactions.csv</div>
              <div style={{ color: "var(--text-3)", marginTop: 6, fontSize: 13 }}>or click to browse · CSV up to 50 MB</div>
            </div>
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <Icon name="pulse" size={15} /> Select file
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ width: 460, padding: 28 }}>
            <div className="sec-label" style={{ marginBottom: 18 }}><Icon name="pulse" size={13} /> Detection pipeline</div>
            {STEPS.map((s, i) => (
              <div className="flex" key={i} style={{ alignItems: "center", gap: 11, padding: "8px 0", opacity: i <= step ? 1 : 0.35 }}>
                <div style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center",
                  background: i < step ? "var(--low-bg)" : i === step ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                  border: "1px solid " + (i < step ? "rgba(56,192,138,0.3)" : "var(--border)") }}>
                  {i < step ? <Icon name="check" size={13} style={{ color: "var(--low)" }} />
                    : i === step ? <div className="typing-dots" style={{ transform: "scale(0.6)" }}><i></i><i></i><i></i></div>
                    : <span style={{ color: "var(--text-4)", fontSize: 11 }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 13, color: i <= step ? "var(--text)" : "var(--text-3)" }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
