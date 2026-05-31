import type { ReactNode } from 'react';

interface Token {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  content: string;
  linkUrl?: string;
  children?: Token[];
}

function parseInlineMarkdown(text: string): ReactNode[] {
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

  const renderTokens = (tokens: Token[], parentKey: string = ''): ReactNode[] => {
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
            <strong key={key} style={{ color: 'var(--text)', fontWeight: 700 }}>
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

export function parseMarkdownLinks(text: string): { title: string; url: string }[] {
  if (!text) return [];
  const links: { title: string; url: string }[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!links.some(l => l.url === match![2])) {
      links.push({
        title: match[1],
        url: match[2]
      });
    }
  }
  return links;
}

export function parseMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLanguage = '';
  
  let inList = false;
  let listItems: ReactNode[] = [];
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

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
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

    if (trimmed === '') {
      flushList(i);
      flushBlockquote(i);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ color: 'var(--text)', fontSize: 16, fontWeight: 800, margin: '12px 0 6px 0', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{parseInlineMarkdown(trimmed.substring(2))}</h1>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ color: 'var(--text)', fontSize: 14.5, fontWeight: 700, margin: '10px 0 5px 0' }}>{parseInlineMarkdown(trimmed.substring(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, margin: '8px 0 4px 0' }}>{parseInlineMarkdown(trimmed.substring(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(<h4 key={i} style={{ color: 'var(--text)', fontSize: 12, fontWeight: 700, margin: '6px 0 3px 0' }}>{parseInlineMarkdown(trimmed.substring(5))}</h4>);
      continue;
    }

    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      elements.push(<hr key={i} style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />);
      continue;
    }

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
