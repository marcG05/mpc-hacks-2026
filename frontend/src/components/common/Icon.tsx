import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, stroke = 1.8, className = "", style = {} }: IconProps) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, className, style };
  const paths: Record<string, ReactNode> = {
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/></>,
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list:   <><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/></>,
    upload: <><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
    bell:   <><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></>,
    refresh:<><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/></>,
    calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>,
    sparkle:<><path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6L12 3z"/><path d="M19 14l.7 2 .3 0 1.3.7-1.3.7-.7 2-.7-2-1.3-.7 1.3-.7z" opacity=".7"/></>,
    trend:  <><path d="M3 17l6-6 4 4 7-7"/><path d="M17 7h4v4"/></>,
    device: <><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/></>,
    network:<><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4M10.2 17.2L6.6 9M13.8 17.2L17.4 9"/></>,
    tag:    <><path d="M3 11l8-8 9 9-8 8-9-9z"/><circle cx="8" cy="8" r="1.3"/></>,
    globe:  <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>,
    bolt:   <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    probe:  <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    clock:  <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    swap:   <><path d="M7 10l-3 3 3 3M4 13h12M17 14l3-3-3-3M20 11H8"/></>,
    arrowUp:<><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowDown:<><path d="M12 5v14M5 12l7 7 7-7"/></>,
    arrowRight:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowUpRight:<><path d="M7 17L17 7M8 7h9v9"/></>,
    openExternal:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></>,
    close:  <><path d="M18 6L6 18M6 6l12 12"/></>,
    send:   <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></>,
    block:  <><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></>,
    check:  <><path d="M20 6L9 17l-5-5"/></>,
    escalate:<><path d="M12 19V6M6 12l6-6 6 6"/></>,
    flag:   <><path d="M4 21V4M4 4h13l-2 4 2 4H4"/></>,
    note:   <><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/></>,
    freeze: <><path d="M12 2v20M4 7l16 10M20 7L4 17M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3"/></>,
    chevron:<><path d="M9 6l6 6-6 6"/></>,
    dot:    <><circle cx="12" cy="12" r="3"/></>,
    user:   <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>,
    history:<><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v3.5h3.5"/><path d="M12 7v5l3 2"/></>,
    info:   <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    pulse:  <><path d="M3 12h4l2 6 4-14 2 8h6"/></>,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  };
  return <svg {...p}>{paths[name] || paths.dot}</svg>;
}
