export function sigColorVar(color: string) {
  return ({ critical: "var(--critical)", high: "var(--high)", medium: "var(--medium)", low: "var(--low)" } as Record<string, string>)[color] || "var(--accent)";
}

export function sigBgVar(color: string) {
  return ({ critical: "var(--critical-bg)", high: "var(--high-bg)", medium: "var(--medium-bg)", low: "var(--low-bg)" } as Record<string, string>)[color] || "var(--accent-soft)";
}
