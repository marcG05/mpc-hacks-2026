import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, SevTag, Sparkline, sigColorVar, sigBgVar } from '../../components';
import type { Transaction } from '../../types';
import { fetchMapToken, fetchChatResponse } from '../../services/api';
import { FRAUD } from '../../data';

interface Token {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  content: string;
  linkUrl?: string;
  children?: Token[];
}

interface EscalatedReport {
  txId: string;
  amount: number;
  timestamp: string;
  notes: string;
  unableToDetermine: boolean;
  department: string;
  assignee: string;
  audioMemo?: string;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokenize = (str: string): Token[] => {
    const tokens: Token[] = [];
    let idx = 0;

    while (idx < str.length) {
      const codeRegex = /`([^`]+)`/g;
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const boldRegex = /(\*\*|__)(.*?)\1/g;
      const italicRegex = /(\*|_)(.*?)\1/g;

      codeRegex.lastIndex = idx;
      linkRegex.lastIndex = idx;
      boldRegex.lastIndex = idx;
      italicRegex.lastIndex = idx;

      const codeMatch = codeRegex.exec(str);
      const linkMatch = linkRegex.exec(str);
      const boldMatch = boldRegex.exec(str);
      const italicMatch = italicRegex.exec(str);

      let closest: { type: 'code' | 'link' | 'bold' | 'italic'; index: number; length: number; match: RegExpExecArray } | null = null;

      if (codeMatch) {
        closest = { type: 'code', index: codeMatch.index, length: codeMatch[0].length, match: codeMatch };
      }
      if (linkMatch && (!closest || linkMatch.index < closest.index)) {
        closest = { type: 'link', index: linkMatch.index, length: linkMatch[0].length, match: linkMatch };
      }
      if (boldMatch && (!closest || boldMatch.index < closest.index)) {
        closest = { type: 'bold', index: boldMatch.index, length: boldMatch[0].length, match: boldMatch };
      }
      if (italicMatch && (!closest || italicMatch.index < closest.index)) {
        closest = { type: 'italic', index: italicMatch.index, length: italicMatch[0].length, match: italicMatch };
      }

      if (!closest) {
        tokens.push({ type: 'text', content: str.substring(idx) });
        break;
      }

      const matchStart = closest.index;
      const matchLength = closest.length;
      const m = closest.match;

      if (matchStart > idx) {
        tokens.push({ type: 'text', content: str.substring(idx, matchStart) });
      }

      if (closest.type === 'code') {
        tokens.push({ type: 'code', content: m[1] });
      } else if (closest.type === 'link') {
        tokens.push({ type: 'link', content: m[1], linkUrl: m[2] });
      } else if (closest.type === 'bold') {
        tokens.push({ type: 'bold', content: m[2], children: tokenize(m[2]) });
      } else if (closest.type === 'italic') {
        tokens.push({ type: 'italic', content: m[2], children: tokenize(m[2]) });
      }

      idx = matchStart + matchLength;
    }

    return tokens;
  };

  const renderTokens = (tokens: Token[], parentKey: string = ''): React.ReactNode[] => {
    return tokens.map((token, i) => {
      const key = `${parentKey}-${token.type}-${i}`;
      switch (token.type) {
        case 'text':
          return token.content;
        case 'code':
          return (
            <code 
              key={key} 
              className="mono"
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                padding: '2px 5px', 
                borderRadius: 4, 
                fontFamily: 'var(--mono)', 
                fontSize: '0.9em', 
                color: 'var(--accent-hi)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              {token.content}
            </code>
          );
        case 'link':
          return (
            <a 
              key={key} 
              href={token.linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: 'var(--accent-hi)', 
                textDecoration: 'underline',
                fontWeight: 500
              }}
            >
              {token.content}
            </a>
          );
        case 'bold':
          return (
            <strong key={key} style={{ color: '#fff', fontWeight: 700 }}>
              {token.children ? renderTokens(token.children, key) : token.content}
            </strong>
          );
        case 'italic':
          return (
            <em key={key} style={{ fontStyle: 'italic', opacity: 0.95 }}>
              {token.children ? renderTokens(token.children, key) : token.content}
            </em>
          );
        default:
          return null;
      }
    });
  };

  return renderTokens(tokenize(text));
}

function getExternalResourceLink(text: string): { title: string; url: string } | null {
  const t = (text || '').toLowerCase();
  if (t.includes('isolation forest') || t.includes('anomaly detection') || t.includes('unsupervised')) {
    return {
      title: 'Isolation Forest Anomaly Detection (Section: Algorithm Details)',
      url: 'https://en.wikipedia.org/wiki/Isolation_forest#Algorithm'
    };
  }
  if (t.includes('vpn') || t.includes('proxy') || t.includes('tor network') || t.includes('tor browser')) {
    return {
      title: 'W3C IP & VPN Proxy Identification (Section 3.2: Privacy & Routing)',
      url: 'https://www.w3.org/TR/by-origin/#privacy-considerations'
    };
  }
  if (t.includes('bin') || t.includes('bank identification') || t.includes('issuer')) {
    return {
      title: 'ISO Payment Card BIN Standards (Section: Scope & Account Range)',
      url: 'https://www.iso.org/standard/74737.html#section-scope'
    };
  }
  if (t.includes('chargeback') || t.includes('visa') || t.includes('mastercard') || t.includes('card rules')) {
    return {
      title: 'Visa Core Rules & Product Standards (Section: Dispute & Triage Rules)',
      url: 'https://usa.visa.com/support/consumer/visa-rules.html#rules-by-region'
    };
  }
  if (t.includes('soc') || t.includes('sop') || t.includes('escalate') || t.includes('triage') || t.includes('nist')) {
    return {
      title: 'NIST Incident Handling Guidelines (Section 3.2: Severity & Triage)',
      url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=44'
    };
  }
  return null;
}

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLanguage = '';
  
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushList = (key: string | number) => {
    if (!inList) return;
    const currentListItems = [...listItems];
    const currentListType = listType;
    if (currentListType === 'ul') {
      elements.push(
        <ul key={`ul-${key}`} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {currentListItems}
        </ul>
      );
    } else if (currentListType === 'ol') {
      elements.push(
        <ol key={`ol-${key}`} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {currentListItems}
        </ol>
      );
    }
    inList = false;
    listItems = [];
    listType = null;
  };

  const flushBlockquote = (key: string | number) => {
    if (!inBlockquote) return;
    const qLines = [...blockquoteLines];
    elements.push(
      <blockquote 
        key={`bq-${key}`} 
        style={{ 
          borderLeft: '3px solid var(--accent)', 
          background: 'var(--surface-3)', 
          padding: '6px 12px', 
          margin: '6px 0', 
          color: 'var(--text-2)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontStyle: 'italic'
        }}
      >
        {parseMarkdown(qLines.join('\n'))}
      </blockquote>
    );
    inBlockquote = false;
    blockquoteLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Handle Code Block tags
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <pre 
            key={`code-${i}`} 
            style={{ 
              background: 'var(--surface-3)', 
              border: '1px solid var(--border)', 
              padding: '10px 14px', 
              borderRadius: 'var(--radius-sm)', 
              overflowX: 'auto', 
              fontFamily: 'var(--mono)', 
              fontSize: '11.5px', 
              color: 'var(--accent-hi)',
              margin: '8px 0',
              lineHeight: 1.4
            }}
          >
            <code className={codeLanguage ? `language-${codeLanguage}` : undefined}>{codeText}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeLanguage = '';
      } else {
        // Start of code block
        flushList(i);
        flushBlockquote(i);
        inCodeBlock = true;
        codeLanguage = trimmed.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Handle Blockquote
    if (trimmed.startsWith('>')) {
      flushList(i);
      if (!inBlockquote) {
        inBlockquote = true;
      }
      blockquoteLines.push(line.replace(/^\s*>\s?/, ''));
      continue;
    } else if (inBlockquote) {
      if (trimmed === '') {
        flushBlockquote(i);
      } else {
        blockquoteLines.push(line);
        continue;
      }
    }

    // 3. Handle Lists
    const bulletMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      flushBlockquote(i);
      const isNumbered = /^\d+\./.test(bulletMatch[2]);
      const currentListType = isNumbered ? 'ol' : 'ul';
      const content = bulletMatch[3];

      if (inList && listType !== currentListType) {
        flushList(i);
      }

      if (!inList) {
        inList = true;
        listType = currentListType;
      }

      listItems.push(
        <li key={`li-${i}-${listItems.length}`} style={{ listStyleType: isNumbered ? 'decimal' : 'disc', color: 'var(--text)', marginLeft: 12 }}>
          {parseInlineMarkdown(content)}
        </li>
      );
      continue;
    } else {
      if (trimmed === '' && inList) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.trim().match(/^([-*•]|\d+\.)\s+/)) {
          flushList(i);
        }
      } else if (trimmed !== '') {
        flushList(i);
      }
    }

    // 4. Empty Line / Paragraph Break
    if (trimmed === '') {
      flushList(i);
      flushBlockquote(i);
      continue;
    }

    // 5. Headings
    if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: '12px 0 6px 0', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{parseInlineMarkdown(trimmed.substring(2))}</h1>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ color: '#fff', fontSize: 14.5, fontWeight: 700, margin: '10px 0 5px 0' }}>{parseInlineMarkdown(trimmed.substring(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '8px 0 4px 0' }}>{parseInlineMarkdown(trimmed.substring(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(<h4 key={i} style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: '6px 0 3px 0' }}>{parseInlineMarkdown(trimmed.substring(5))}</h4>);
      continue;
    }

    // 6. Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      elements.push(<hr key={i} style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />);
      continue;
    }

    // Default: paragraph
    elements.push(
      <p key={i} style={{ margin: '6px 0', lineHeight: 1.5, color: 'var(--text)' }}>
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList(lines.length);
  flushBlockquote(lines.length);

  return elements;
}

const COUNTRY_LNL: Record<string, [number, number]> = {
  US: [-100, 40],
  CA: [-95, 60],
  GB: [-2, 54],
  DE: [10, 51],
  FR: [2, 46],
  CN: [104, 35],
  JP: [138, 36],
  BR: [-52, -14],
  IN: [78, 20],
  RU: [105, 61],
  AU: [133, -25],
  ZA: [25, -30],
  MX: [-102, 23],
  IT: [12, 41],
  ES: [-3, 40],
  NL: [5, 52],
  SG: [103, 1],
};

function getCountryLngLat(code: string): [number, number] {
  return COUNTRY_LNL[code.toUpperCase()] || [-100, 40];
}

interface MapboxMapProps {
  originCountry: string;
  destCountry: string;
}

export function MapboxMap({ originCountry, destCountry }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    async function getToken() {
      try {
        const res = await fetchMapToken();
        if (res.token) {
          setToken(res.token);
        }
      } catch (e) {
        console.error('Failed to load map token:', e);
      }
    }
    getToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    if ((window as any).mapboxgl) {
      setLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, [token]);

  useEffect(() => {
    if (!loaded || !token || !mapContainerRef.current) return;

    const mapboxgl = (window as any).mapboxgl;
    mapboxgl.accessToken = token;

    const origin = getCountryLngLat(originCountry);
    const dest = getCountryLngLat(destCountry);
    
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(origin);
    bounds.extend(dest);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      bounds: bounds,
      fitBoundsOptions: { padding: 40, maxZoom: 5 }
    });

    mapRef.current = map;

    map.on('load', () => {
      new mapboxgl.Marker({ color: '#38c08a' })
        .setLngLat(origin)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4>Cardholder Home</h4><p>${originCountry}</p>`))
        .addTo(map);

      new mapboxgl.Marker({ color: '#f0616d' })
        .setLngLat(dest)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4>Merchant Store</h4><p>${destCountry}</p>`))
        .addTo(map);

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [origin, dest]
          }
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f0616d',
          'line-width': 2.5,
          'line-dasharray': [2, 2]
        }
      });
    });

    return () => {
      map.remove();
    };
  }, [loaded, token, originCountry, destCountry]);

  if (!token) {
    return (
      <div style={{ height: 180, display: 'grid', placeItems: 'center', background: '#090e1a', color: 'var(--text-3)', fontSize: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        No Mapbox token found in environment.
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ height: 180, display: 'grid', placeItems: 'center', background: '#090e1a', color: 'var(--text-3)', fontSize: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="flex" style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="refresh" className="spin" size={16} />
          <span>Loading map client...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: 180, width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}
    />
  );
}


interface AIHubProps {
  txns: Transaction[];
  initialSelectedTx?: Transaction | null;
  onAction: (action: string, tx: Transaction) => void;
}

type TabKey = 'amount' | 'location' | 'device' | 'card' | 'signals' | 'time';

const COUNTRY_COORDS: Record<string, { x: number; y: number; name: string }> = {
  US: { x: 100, y: 55, name: 'United States' },
  CA: { x: 90, y: 40, name: 'Canada' },
  GB: { x: 230, y: 42, name: 'United Kingdom' },
  DE: { x: 248, y: 44, name: 'Germany' },
  FR: { x: 238, y: 48, name: 'France' },
  CN: { x: 380, y: 65, name: 'China' },
  JP: { x: 420, y: 60, name: 'Japan' },
  BR: { x: 160, y: 110, name: 'Brazil' },
  IN: { x: 335, y: 72, name: 'India' },
  RU: { x: 320, y: 40, name: 'Russia' },
  AU: { x: 420, y: 118, name: 'Australia' },
  ZA: { x: 260, y: 115, name: 'South Africa' },
  MX: { x: 110, y: 70, name: 'Mexico' },
  IT: { x: 250, y: 52, name: 'Italy' },
  ES: { x: 230, y: 54, name: 'Spain' },
  NL: { x: 242, y: 40, name: 'Netherlands' },
  SG: { x: 375, y: 88, name: 'Singapore' },
};

function getCountryCoord(code: string) {
  return COUNTRY_COORDS[code.toUpperCase()] || { x: 250, y: 70, name: code };
}

export function AIHub({ txns, initialSelectedTx, onAction }: AIHubProps) {
  // 1. Filter queue for transactions that are flagged or in review
  const triageQueue = useMemo(() => {
    return txns.filter(t => t.status === 'flagged' || t.status === 'review');
  }, [txns]);

  // 2. Currently selected transaction state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Sync selected transaction if it changes externally
  useEffect(() => {
    if (initialSelectedTx) {
      setSelectedTx(initialSelectedTx);
    } else if (triageQueue.length > 0 && !selectedTx) {
      setSelectedTx(triageQueue[0]);
    }
  }, [initialSelectedTx, triageQueue, selectedTx]);

  // Always keep selectedTx updated with the live status from txns array
  const activeTx = useMemo(() => {
    if (!selectedTx) return null;
    return txns.find(t => t.id === selectedTx.id) || selectedTx;
  }, [txns, selectedTx]);

  // 3. Active panel context tab state
  const [activeTab, setActiveTab] = useState<TabKey>('signals');

  // Expanded signal details card index state
  const [expandedSignalKey, setExpandedSignalKey] = useState<string | null>(null);

  // 4. Chat messaging states
  const [msgs, setMsgs] = useState<{ role: 'me' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // 5. Sidebar and Escalation Triage States
  const [sidebarTab, setSidebarTab] = useState<'queue' | 'escalated'>('queue');
  const [isEscalationFormOpen, setIsEscalationFormOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<EscalatedReport | null>(null);
  const [escalationNotes, setEscalationNotes] = useState('');
  const [unableToDetermine, setUnableToDetermine] = useState(true);
  const [escalationDept, setEscalationDept] = useState('Payments Compliance');
  const [escalationAssignee, setEscalationAssignee] = useState('Marcus Aurelius (L2 Lead)');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const [escalatedReports, setEscalatedReports] = useState<EscalatedReport[]>(() => {
    try {
      const saved = localStorage.getItem('escalated_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('escalated_reports', JSON.stringify(escalatedReports));
    } catch (e) {
      console.error(e);
    }
  }, [escalatedReports]);

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
      setHasRecording(false);
    }
  };

  const handleConfirmEscalation = () => {
    if (!activeTx) return;
    
    const report: EscalatedReport = {
      txId: activeTx.id,
      amount: activeTx.amount,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      notes: escalationNotes,
      unableToDetermine: unableToDetermine,
      department: escalationDept,
      assignee: escalationAssignee,
      audioMemo: hasRecording ? 'voice_memo_12s.mp3' : undefined
    };

    setEscalatedReports(prev => [report, ...prev]);
    setIsEscalationFormOpen(false);
    setSidebarTab('escalated');
    onAction("escalate", activeTx);
  };

  // Keyboard Shortcuts (Alt + Shift + A/B/E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey) {
        const key = e.key.toUpperCase();
        if (key === 'A') {
          e.preventDefault();
          if (activeTx) {
            onAction("clear", activeTx);
          }
        } else if (key === 'B') {
          e.preventDefault();
          if (activeTx) {
            onAction("block", activeTx);
          }
        } else if (key === 'E') {
          e.preventDefault();
          if (activeTx) {
            setEscalationNotes('');
            setUnableToDetermine(true);
            setHasRecording(false);
            setIsRecording(false);
            setIsEscalationFormOpen(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTx, onAction]);

  // Initialize/Reset chat when transaction changes
  useEffect(() => {
    if (!activeTx) return;
    setMsgs([
      {
        role: 'ai',
        text: `Hi Lucas. I've initiated analysis on transaction **${activeTx.id}**. \n\nYou can select the metadata fields in the top context card or ask me to open specific diagnostic panels to begin triage.`
      }
    ]);
    setActiveTab('signals');
    setExpandedSignalKey(null);
  }, [activeTx?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  const handleAsk = async (q: string) => {
    if (!q.trim() || !activeTx) return;
    
    setMsgs(prev => [...prev, { role: 'me', text: q }]);
    setInput('');
    setThinking(true);

    const ql = q.toLowerCase();
    
    // Auto-switch tabs based on keywords
    if (/why|flag|reason|signal|trigger/.test(ql)) {
      setActiveTab('signals');
    } 
    else if (/location|map|country|cross-border|where/.test(ql)) {
      setActiveTab('location');
    } 
    else if (/device|ip|shared|network|device-farm|reuse/.test(ql)) {
      setActiveTab('device');
    } 
    else if (/history|card|spending|median|average|previous/.test(ql)) {
      setActiveTab('card');
    } 
    else if (/amount|cost|score|breakdown|pricing|price|discrepancy/.test(ql)) {
      setActiveTab('amount');
    }

    try {
      const res = await fetchChatResponse({
        tx: activeTx,
        history: msgs,
        message: q
      });
      setThinking(false);
      if (res && res.response) {
        setMsgs(prev => [...prev, { role: 'ai', text: res.response }]);
        
        // Auto-switch tabs based on AI response keywords
        const rl = res.response.toLowerCase();
        if (/map|location|geographic|route/i.test(rl)) {
          setActiveTab('location');
        } else if (/card history|historical|baseline|spending/i.test(rl)) {
          setActiveTab('card');
        } else if (/device|ip|shared/i.test(rl)) {
          setActiveTab('device');
        } else if (/signals|triggered|rule/i.test(rl)) {
          setActiveTab('signals');
        } else if (/amount|pricing|price|cost|score/i.test(rl)) {
          setActiveTab('amount');
        }
      } else {
        setMsgs(prev => [...prev, { role: 'ai', text: 'Error: Empty response from Copilot.' }]);
      }
    } catch (e: any) {
      console.error('Gemini chat failed:', e);
      setThinking(false);
      setMsgs(prev => [...prev, { role: 'ai', text: `Failed to generate response: ${e.message}` }]);
    }
  };

  // Render Dynamic Panel Content
  const renderRightPanel = () => {
    if (!activeTx) return null;

    switch (activeTab) {
      case 'signals':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="pulse" size={13} /> {FRAUD.FRAUD_TYPES[activeTx.type] || 'Active Signals'} ({activeTx.signals.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTx.signals.map((s, i) => (
                <div 
                  key={s.key || i}
                  className="signal" 
                  onClick={() => setExpandedSignalKey(expandedSignalKey === s.key ? null : s.key)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 8, 
                    background: expandedSignalKey === s.key ? 'var(--surface-3)' : 'var(--surface-2)', 
                    padding: 12, 
                    borderRadius: 'var(--radius-sm)', 
                    border: expandedSignalKey === s.key ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
                    <div className="signal-ico" style={{ display: 'grid', placeItems: 'center', background: sigBgVar(s.color), color: sigColorVar(s.color), width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}>
                      <Icon name={s.icon} size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-1)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.detail}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--critical)' }}>+{s.weight.toFixed(1)}</div>
                  </div>

                  {/* Expanded Signal Details & Audit Recommendations */}
                  {expandedSignalKey === s.key && (
                    <div style={{ 
                      padding: '8px 10px', 
                      background: 'var(--surface-hi)', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: 11.5, 
                      color: 'var(--text-2)',
                      borderTop: '1px solid var(--border)',
                      lineHeight: 1.45,
                      marginTop: 4,
                      animation: 'fadeIn 0.2s ease'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="info" size={11} style={{ color: 'var(--accent-hi)' }} />
                        Investigation Protocol:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {s.name === 'Amount Anomaly' && (
                          <>
                            <div>• Check if cardholder has purchased high-value items in this category before.</div>
                            <div>• Contact customer to verify sudden deviation from typical ${activeTx.cardMedian} spend.</div>
                          </>
                        )}
                        {s.name === 'Geographic Mismatch' && (
                          <>
                            <div>• Review login IPs to see if traveler notice was posted.</div>
                            <div>• Check time difference: transaction occurred in different timezone.</div>
                          </>
                        )}
                        {s.name === 'Velocity Spike' && (
                          <>
                            <div>• Multiple cards checked out in quick succession. Indicates automated script.</div>
                            <div>• Flag associated session tokens.</div>
                          </>
                        )}
                        {s.name === 'Device Reuse' && (
                          <>
                            <div>• Device fingerprinted is associated with dynamic cards list.</div>
                            <div>• Decline all transactions matching hardware hash.</div>
                          </>
                        )}
                        {s.name === 'Card-Testing Pattern' && (
                          <>
                            <div>• Low value test charge followed by a high value charge.</div>
                            <div>• Block card immediately and notify issuer bank.</div>
                          </>
                        )}
                        {!['Amount Anomaly', 'Geographic Mismatch', 'Velocity Spike', 'Device Reuse', 'Card-Testing Pattern'].includes(s.name) && (
                          <>
                            <div>• Audit transaction payload against rule configuration.</div>
                            <div>• Examine network hops and card dispute records.</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {activeTx.signals.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>No explicit rule signals fired. Scoring driven by Isolation Forest.</div>
              )}
            </div>
          </div>
        );

      case 'location': {
        const origin = getCountryCoord(activeTx.country);
        const dest = getCountryCoord(activeTx.merchantCountry);
        const isCrossBorder = activeTx.country !== activeTx.merchantCountry;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="globe" size={13} /> Geographic Routing</div>
            
            {/* Interactive Mapbox Map */}
            <MapboxMap originCountry={activeTx.country} destCountry={activeTx.merchantCountry} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Cardholder Base</span>
                <span style={{ fontWeight: 600 }}>{origin.name} ({activeTx.country})</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Merchant Location</span>
                <span style={{ fontWeight: 600 }}>{dest.name} ({activeTx.merchantCountry})</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Cross-border Mismatch</span>
                <span className="mono" style={{ color: isCrossBorder ? 'var(--critical)' : 'var(--low)', fontWeight: 600 }}>
                  {isCrossBorder ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Transit Distance</span>
                <span className="mono" style={{ fontWeight: 600 }}>{isCrossBorder ? '3,840 miles' : '0 miles (Local)'}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'device':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="device" size={13} /> Infrastructure & Network</div>
            
            <div style={{ background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Shared Device Fingerprint (last 24h)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--critical)' }}>
                  <div className="flex between">
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{activeTx.device || 'dev_9f42x'}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--critical)' }}>Used by 3 cards</span>
                  </div>
                </div>
                <div style={{ padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--medium)' }}>
                  <div className="flex between">
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{activeTx.ip || '184.22.91.4'}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--medium)' }}>VPN / Proxy proxy</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-2)' }}>Other cards on this IP:</div>
              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_83912903</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--critical)' }}>$840 (Blocked)</span>
                </div>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_48291041</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--medium)' }}>$220 (Review)</span>
                </div>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_28103940</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--low)' }}>$12 (Cleared)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'card':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="history" size={13} /> Cardholder Spending History</div>
            
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex between" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Last 22 Transactions</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>Median: ${activeTx.cardMedian.toFixed(2)}</span>
              </div>
              <div style={{ padding: '8px 0', display: 'grid', placeItems: 'center' }}>
                <Sparkline data={activeTx.history} w={280} h={50} color="var(--accent)" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Charge</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>${activeTx.amount.toFixed(2)}</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Z-Score Dev</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>+3.4 standard dev</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Avg Category Spend</span>
                <span className="mono" style={{ fontWeight: 600 }}>${(activeTx.cardMedian * 0.8).toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case 'amount':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="trend" size={13} /> Risk Score Contribution</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex between" style={{ fontSize: 12, marginBottom: 6 }}>
                  <span>Engine Split Ensemble</span>
                  <span className="mono" style={{ fontWeight: 600 }}>60% Rules / 40% Isolation Forest</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                  <i style={{ width: '60%', background: 'var(--accent)' }} title="Rules"></i>
                  <i style={{ width: '40%', background: 'var(--violet)' }} title="Anomaly Model"></i>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Signal Influence Weight
                </div>
                {activeTx.signals.map((s, i) => (
                  <div className="brk-row" key={i} style={{ marginBottom: 10 }}>
                    <div className="brk-name" style={{ width: 140, fontSize: 12 }} title={s.name}>{s.name}</div>
                    <div className="brk-bar"><i style={{ width: Math.min(100, s.weight / 2.5 * 100) + "%", background: sigColorVar(s.color) }}></i></div>
                    <div className="brk-val">{s.weight.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'time':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="clock" size={13} /> Velocity & Timestamp Analysis</div>
            
            <div style={{ background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
              <div className="flex between" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={15} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Overnight window</span>
                </div>
                <span className="mono" style={{ fontSize: 12, color: 'var(--medium)' }}>{activeTx.time}</span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
                This charge was processed at local time **{activeTx.time}**. Based on history for this card, the owner has a 97% probability of sleeping during this hour.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, marginTop: 4 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>15-Min Velocity</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>3 transactions</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>1-Hour Velocity</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>6 transactions</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Merchant Category Velocity</span>
                <span className="mono" style={{ fontWeight: 600 }}>Suspicious burst (Electronics)</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="content fade-in" style={{ height: 'calc(100vh - 60px)', display: 'grid', gridTemplateColumns: '260px 1fr 420px', gap: 14, padding: '0 14px 14px 14px', overflow: 'hidden' }}>
      
      {/* 1. Left triage queue sidebar */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ padding: '12px 0 8px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <button 
            onClick={() => setSidebarTab('queue')}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: sidebarTab === 'queue' ? 'var(--accent)' : 'var(--text-3)',
              fontWeight: sidebarTab === 'queue' ? 700 : 500,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 2px',
              borderBottom: sidebarTab === 'queue' ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            <Icon name="layers" size={12} /> Queue ({triageQueue.length})
          </button>
          <button 
            onClick={() => setSidebarTab('escalated')}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: sidebarTab === 'escalated' ? 'var(--accent)' : 'var(--text-3)',
              fontWeight: sidebarTab === 'escalated' ? 700 : 500,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 2px',
              borderBottom: sidebarTab === 'escalated' ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            <Icon name="escalate" size={12} /> Escalated ({escalatedReports.length})
          </button>
        </div>
        
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
          {sidebarTab === 'queue' ? (
            <>
              {triageQueue.map(t => {
                const isActive = activeTx && t.id === activeTx.id;
                return (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTx(t)}
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'var(--surface-3)' : 'var(--surface-2)',
                      border: isActive ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s, border-color 0.15s'
                    }}
                  >
                    <div className="flex between" style={{ marginBottom: 4 }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}>{t.id}</span>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: t.score >= 0.8 ? 'var(--critical)' : 'var(--high)' }}>
                        {(t.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex between" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
                      <span className="mono">${t.amount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              {triageQueue.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                  <Icon name="check" size={28} style={{ color: 'var(--low)', marginBottom: 8, opacity: 0.5 }} />
                  <div>Queue is clean</div>
                </div>
              )}
            </>
          ) : (
            <>
              {escalatedReports.map((r, idx) => (
                <div 
                  key={r.txId + '-' + idx}
                  onClick={() => setViewingReport(r)}
                  style={{
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div className="flex between" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, color: 'var(--text-2)' }}>{r.txId}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--critical)' }}>
                      ${r.amount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{r.assignee.split(' ')[0]} ({r.department.split(' ')[0]})</span>
                    <span style={{ fontSize: 9, background: 'rgba(233,138,69,0.1)', color: 'var(--medium)', padding: '1px 4px', borderRadius: 2 }}>Escalated</span>
                  </div>
                </div>
              ))}
              {escalatedReports.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                  <Icon name="info" size={24} style={{ color: 'var(--text-4)', marginBottom: 8, opacity: 0.5 }} />
                  <div>No escalated cases yet</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Middle AI Investigation Chat Arena (Combined 38% height context + 62% height chat) */}
      {activeTx ? (
        <div style={{ display: 'grid', gridTemplateRows: '38% 62%', height: '100%', overflow: 'hidden', padding: '0 8px' }}>
          
          {/* Combined Transaction Card & Chip Grid Selector (Row 1: 38%) */}
          <div className="card" style={{ 
            height: 'calc(100% - 10px)', 
            margin: '5px 0', 
            padding: '14px 16px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            background: 'var(--surface)', 
            border: '1px solid var(--border-hi)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden'
          }}>
            {/* Header info & Key Metrics Details Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>${activeTx.amount.toFixed(2)}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{activeTx.id}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginTop: 4 }}>{activeTx.merchant}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <SevTag score={activeTx.score} />
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{(activeTx.score * 100).toFixed(0)}% Risk</span>
                </div>
              </div>

              {/* Enhanced Transaction Key Metrics Row */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: 8, 
                padding: '10px 12px', 
                background: 'var(--surface-2)', 
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{activeTx.customer}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Channel</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>{activeTx.channel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Card Baseline</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }} className="mono">${activeTx.cardMedian} med</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pattern Type</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-hi)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={FRAUD.FRAUD_TYPES[activeTx.type] || activeTx.type}>
                    {FRAUD.FRAUD_TYPES[activeTx.type] || activeTx.type}
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Chips inside the same card */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '6px 8px', 
              marginTop: 10 
            }}>
              {[
                { tab: 'amount', label: 'Amount', icon: 'trend', value: `$${activeTx.amount}` },
                { tab: 'location', label: 'Geographic', icon: 'globe', value: `${activeTx.country} ➔ ${activeTx.merchantCountry}` },
                { tab: 'device', label: 'Device ID', icon: 'device', value: activeTx.device ? activeTx.device.slice(0, 10) : 'None' },
                { tab: 'card', label: 'Payment Card', icon: 'history', value: activeTx.card ? activeTx.card.slice(0, 12) : 'None' },
                { tab: 'signals', label: FRAUD.FRAUD_TYPES[activeTx.type] || 'Trigger Rules', icon: 'pulse', value: `${activeTx.signals.length} Fired` },
                { tab: 'time', label: 'Timestamp', icon: 'clock', value: activeTx.time }
              ].map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <button 
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab as TabKey)}
                    className="chip"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: '5px 8px', 
                      background: isActive ? 'var(--accent-soft)' : 'var(--surface-2)', 
                      border: isActive ? '1px solid var(--accent-line)' : '1px solid var(--border)', 
                      color: isActive ? 'var(--accent-hi)' : 'var(--text-2)', 
                      borderRadius: 'var(--radius-sm)', 
                      cursor: 'pointer',
                      textAlign: 'left',
                      height: 42
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: isActive ? 'var(--accent-hi)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      <Icon name={item.icon} size={9} />
                      {item.label}
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', marginTop: 2 }}>
                      {item.value}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat scrolling viewport + Input Area (Row 2: 70%) */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', overflow: 'hidden', padding: '10px 0 0 0' }}>
            
            {/* Scrollable messages area */}
            <div className="chat-msgs" ref={chatRef} style={{ overflowY: 'auto', padding: '0 4px 12px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {msgs.map((m, i) => (
                <div className={`msg ${m.role === 'me' ? 'me' : ''}`} key={i} style={{ display: 'flex', gap: 10, justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start' }}>
                  {m.role !== 'me' && (
                    <div className="msg-ava ai" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon name="sparkle" size={12} style={{ color: 'var(--accent-hi)' }} />
                    </div>
                  )}
                  <div 
                    className="msg-bubble" 
                    style={{ 
                      maxWidth: '85%', 
                      background: m.role === 'me' ? 'var(--accent)' : 'var(--surface-2)', 
                      color: m.role === 'me' ? '#fff' : 'var(--text)', 
                      padding: '8px 12px', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: 12.5, 
                      lineHeight: 1.5,
                      border: m.role === 'me' ? 'none' : '1px solid var(--border)',
                      whiteSpace: 'normal'
                    }}
                  >
                    {parseMarkdown(m.text)}

                    {/* Dynamic Reference / Reading Widget if AI refers to external/general knowledge */}
                    {m.role === 'ai' && getExternalResourceLink(m.text) && (() => {
                      const refLink = getExternalResourceLink(m.text);
                      return (
                        <div style={{
                          marginTop: 10,
                          padding: '8px 10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <Icon name="arrowUpRight" size={11} style={{ color: 'var(--accent-hi)', flexShrink: 0 }} />
                            <span style={{ fontSize: 10.5, color: 'var(--text-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              Ref: <strong>{refLink?.title}</strong>
                            </span>
                          </div>
                          <a 
                            href={refLink?.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mono"
                            style={{ 
                              fontSize: 10, 
                              color: 'var(--accent-hi)', 
                              textDecoration: 'underline',
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            Read Guide
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                  {m.role === 'me' && (
                    <div className="msg-ava user" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--border-hi)', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                      LM
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="msg" style={{ display: 'flex', gap: 10 }}>
                  <div className="msg-ava ai" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="sparkle" size={12} style={{ color: 'var(--accent-hi)' }} />
                  </div>
                  <div className="typing-dots" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></i>
                    <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></i>
                    <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></i>
                  </div>
                </div>
              )}
            </div>

            {/* Controls panel */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 4px 0 4px', background: 'var(--bg)' }}>
              
              {/* Suggestions */}
              {msgs.length <= 2 && !thinking && (
                <div className="chat-suggest" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div className="suggest-chip" onClick={() => handleAsk("Why was this flagged?")}>Why was this flagged?</div>
                  <div className="suggest-chip" onClick={() => handleAsk("Show locations on map")}>Show map</div>
                  <div className="suggest-chip" onClick={() => handleAsk("Compare to historical card baseline")}>Check card history</div>
                  <div className="suggest-chip" onClick={() => handleAsk("Verify device or IP association")}>Any related devices?</div>
                </div>
              )}

              {/* Chat form */}
              <form className="chat-input" onSubmit={(e) => { e.preventDefault(); handleAsk(input); }} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', marginBottom: 12 }}>
                <Icon name="sparkle" size={15} style={{ color: 'var(--text-3)', marginRight: 8 }} />
                <input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder={`Ask Copilot about ${activeTx.id}...`}
                  style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 13 }}
                />
                <button 
                  className="send-btn" 
                  type="submit" 
                  disabled={!input.trim()}
                  style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: input.trim() ? 'var(--accent-hi)' : 'var(--text-4)' }}
                >
                  <Icon name="send" size={14} />
                </button>
              </form>

              {/* Action Buttons */}
              <div className="aip-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingBottom: 6 }}>
                <button 
                  className={`act-btn danger ${activeTx.status === 'blocked' ? 'active' : ''}`} 
                  onClick={() => onAction("block", activeTx)}
                  style={{ opacity: activeTx.status === 'blocked' ? 1 : 0.8 }}
                  title="Block Transaction (Alt+Shift+B)"
                >
                  <Icon name="block" size={14} /> Block (Alt+Shift+B)
                </button>
                <button 
                  className={`act-btn ok ${activeTx.status === 'cleared' ? 'active' : ''}`} 
                  onClick={() => onAction("clear", activeTx)}
                  style={{ opacity: activeTx.status === 'cleared' ? 1 : 0.8 }}
                  title="Approve Transaction (Alt+Shift+A)"
                >
                  <Icon name="check" size={14} /> Approve (Alt+Shift+A)
                </button>
                <button 
                  className={`act-btn warn ${activeTx.status === 'escalated' ? 'active' : ''}`} 
                  onClick={() => {
                    setEscalationNotes('');
                    setUnableToDetermine(true);
                    setHasRecording(false);
                    setIsRecording(false);
                    setIsEscalationFormOpen(true);
                  }}
                  style={{ opacity: activeTx.status === 'escalated' ? 1 : 0.8 }}
                  title="Escalate Transaction (Alt+Shift+E)"
                >
                  <Icon name="escalate" size={14} /> Escalate (Alt+Shift+E)
                </button>
                <button 
                  className={`act-btn ${activeTx.status === 'false_positive' ? 'active' : ''}`} 
                  onClick={() => onAction("false_positive", activeTx)}
                  style={{ opacity: activeTx.status === 'false_positive' ? 1 : 0.8 }}
                >
                  <Icon name="close" size={14} /> FP Flag
                </button>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', height: '100%', color: 'var(--text-3)' }}>
          <div>
            <Icon name="shield" size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>No transactions selected for analysis.</div>
          </div>
        </div>
      )}

      {/* 3. Right column: Dynamic panel (Larger width 420px) */}
      {activeTx ? (
        <div style={{ height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--border)', paddingLeft: 12, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 14 }}>
          {/* Quick tab filters at top */}
          <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Dynamic Panel</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['signals', 'location', 'device', 'card', 'time'] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-3)',
                    padding: '2px 4px'
                  }}
                  title={`Switch to ${tab}`}
                >
                  <Icon 
                    name={
                      tab === 'signals' ? 'pulse' :
                      tab === 'location' ? 'globe' :
                      tab === 'device' ? 'device' :
                      tab === 'card' ? 'history' : 'clock'
                    } 
                    size={14} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', paddingBottom: 16 }}>
            {renderRightPanel()}
          </div>
        </div>
      ) : (
        <div style={{ borderLeft: '1px solid var(--border)' }}></div>
      )}

      {/* Create Escalation Report Modal */}
      {isEscalationFormOpen && activeTx && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 500,
            background: 'var(--surface)',
            border: '1px solid var(--border-hi)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="escalate" size={16} style={{ color: 'var(--accent-hi)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  Escalate Transaction Triage Package
                </h3>
              </div>
              <button 
                onClick={() => setIsEscalationFormOpen(false)}
                style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer' }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{activeTx.id}</span>
                  <span style={{ fontWeight: 600, color: 'var(--critical)' }}>${activeTx.amount.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                  Merchant: {activeTx.merchant} · Category: {activeTx.category}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Triage Assessment Notes</label>
                <textarea 
                  value={escalationNotes}
                  onChange={(e) => setEscalationNotes(e.target.value)}
                  placeholder="Describe what you found sketchy or suspicious about this transaction..."
                  style={{
                    width: '100%',
                    height: 90,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 10,
                    color: '#fff',
                    fontSize: 12.5,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox"
                  checked={unableToDetermine}
                  onChange={(e) => setUnableToDetermine(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Unable to determine final solution (Requires L2 senior review)
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Assign Department</label>
                  <select
                    value={escalationDept}
                    onChange={(e) => setEscalationDept(e.target.value)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  >
                    <option value="Payments Compliance">Payments Compliance</option>
                    <option value="Chargeback Operations">Chargeback Operations</option>
                    <option value="Identity Verification Desk">Identity Verification Desk</option>
                    <option value="Security Engineering">Security Engineering</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Assign Team Lead</label>
                  <select
                    value={escalationAssignee}
                    onChange={(e) => setEscalationAssignee(e.target.value)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  >
                    <option value="Marcus Aurelius (L2 Lead)">Marcus Aurelius (L2 Lead)</option>
                    <option value="Sarah Jenkins (Senior Compliance)">Sarah Jenkins (Senior Compliance)</option>
                    <option value="David Vance (Risk Operations Manager)">David Vance (Risk Operations Manager)</option>
                    <option value="Ellen Ripley (Fraud Lead)">Ellen Ripley (Fraud Lead)</option>
                  </select>
                </div>
              </div>

              <div style={{
                padding: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Triage Voice Memo</span>
                  {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="dot" style={{ width: 6, height: 6, background: 'var(--critical)', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--critical)' }}>Recording...</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={handleToggleRecording}
                    style={{
                      background: isRecording ? 'var(--critical)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + (isRecording ? 'var(--critical)' : 'var(--border)'),
                      color: isRecording ? '#fff' : 'var(--text-2)',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {isRecording ? <div style={{ width: 10, height: 10, background: '#fff', borderRadius: 2 }}></div> : <span style={{ width: 10, height: 10, background: 'var(--critical)', borderRadius: '50%' }}></span>}
                  </button>

                  <div style={{ flex: 1, height: 20, display: 'flex', alignItems: 'center', gap: 2 }}>
                    {isRecording ? (
                      Array.from({ length: 15 }).map((_, i) => {
                        const h = Math.floor(Math.random() * 16) + 4;
                        return (
                          <i key={i} style={{ flex: 1, height: h, background: 'var(--accent)', borderRadius: 1 }} />
                        );
                      })
                    ) : hasRecording ? (
                      <span style={{ fontSize: 11, color: 'var(--low)' }}>Voice Memo Saved (0:12s)</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>No voice memo attached</span>
                    )}
                  </div>

                  {hasRecording && !isRecording && (
                    <button
                      onClick={() => setHasRecording(false)}
                      style={{ background: 'transparent', border: 0, color: 'var(--critical)', cursor: 'pointer', fontSize: 11 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: 'var(--surface-2)'
            }}>
              <button 
                onClick={() => setIsEscalationFormOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmEscalation}
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--accent)', borderColor: 'var(--accent-line)', color: '#fff' }}
              >
                Submit & Dispatch Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Escalated Report Modal */}
      {viewingReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 550,
            background: 'var(--surface)',
            border: '1px solid var(--border-hi)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="escalate" size={16} style={{ color: 'var(--accent-hi)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  Escalation Dispatch Triage Package
                </h3>
              </div>
              <button 
                onClick={() => setViewingReport(null)}
                style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer' }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
              <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{viewingReport.txId}</span>
                  <span style={{ fontWeight: 700, color: 'var(--critical)', fontSize: 14 }}>${viewingReport.amount.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Merchant: {activeTx?.merchant || 'Associated Merchant'} · Category: {activeTx?.category || 'Category'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Dispatched: {viewingReport.timestamp}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Assigned Department</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{viewingReport.department}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Assigned Owner</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-hi)' }}>{viewingReport.assignee}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(233,138,69,0.05)', border: '1px solid rgba(233,138,69,0.15)', borderRadius: 'var(--radius-sm)' }}>
                <Icon name="info" size={14} style={{ color: 'var(--medium)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {viewingReport.unableToDetermine ? (
                    <strong>L2 Action Required: Analyst unable to determine final solution.</strong>
                  ) : (
                    'Analyst Escalated for Standard Review.'
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>Analyst Insight Notes:</div>
                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  color: 'var(--text-2)',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                  minHeight: 60
                }}>
                  {viewingReport.notes || '(No notes attached)'}
                </div>
              </div>

              {viewingReport.audioMemo && (
                <div style={{
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="freeze" size={14} style={{ color: 'var(--accent-hi)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Triage Voice Memo (0:12s)</span>
                  </div>
                  <button
                    style={{
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent-line)',
                      color: 'var(--accent-hi)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    onClick={() => alert("Playing triage voice memo...")}
                  >
                    Play
                  </button>
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--surface-2)'
            }}>
              <button 
                onClick={() => setViewingReport(null)}
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--accent)', borderColor: 'var(--accent-line)', color: '#fff' }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
