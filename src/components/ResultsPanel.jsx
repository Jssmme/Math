import { useRef, useEffect, useCallback, useState } from 'react'

const LINE_HEIGHT = 26

export default function ResultsPanel({ results, lines, scrollTop, onScrollTopChange }) {
  const listRef = useRef(null)

  // Sync scroll from editor
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = scrollTop
  }, [scrollTop])

  const handleScroll = useCallback(() => {
    if (listRef.current) onScrollTopChange(listRef.current.scrollTop)
  }, [onScrollTopChange])

  return (
    <div style={styles.panel}>
      <div ref={listRef} style={styles.list} onScroll={handleScroll}>
        <div style={styles.inner}>
          {results.map((r, i) => (
            <ResultRow key={i} result={r} line={lines?.[i] ?? ''} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultRow({ result, line }) {
  const [copied, setCopied] = useState('') // '' | 'value' | 'line'

  /** Extract a clean numeric string from the result, preferring raw value */
  function rawValue() {
    if (typeof result.raw === 'number' && isFinite(result.raw)) {
      return String(result.raw)
    }
    if (!result.display) return ''
    return result.display.replace(/[^\d.\-+eE]/g, '')
  }

  const copyValue = useCallback(() => {
    const plain = rawValue()
    if (!plain) return
    navigator.clipboard.writeText(plain).catch(() => {})
    setCopied('value')
    setTimeout(() => setCopied(''), 900)
  }, [result.raw, result.display])

  const copyLine = useCallback(() => {
    if (!line || !result.display) return
    const value = rawValue()
    const expr = line.trim().replace(/^#\s*|^\/\/\s*/, '')
    navigator.clipboard.writeText(`${expr} = ${value}`).catch(() => {})
    setCopied('line')
    setTimeout(() => setCopied(''), 900)
  }, [line, result.raw, result.display])

  // Distinguish click from dblclick
  const clickRef = useRef(0)
  const handleClick = useCallback(() => {
    clickRef.current++
    if (clickRef.current === 1) {
      setTimeout(() => {
        if (clickRef.current === 1) copyValue()
        clickRef.current = 0
      }, 250)
    }
  }, [copyValue])

  const handleDblClick = useCallback(() => {
    clickRef.current = 0
    copyLine()
  }, [copyLine])

  const rowBase = {
    height: LINE_HEIGHT,
    lineHeight: `${LINE_HEIGHT}px`,
    padding: '0 14px',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }

  if (result.kind === 'loading') {
    return <div style={{ ...rowBase, color: 'var(--text-muted)', fontSize: 11 }}>计算中…</div>
  }
  if (result.kind === 'empty') {
    return <div style={{ ...rowBase }} />
  }
  if (result.kind === 'comment') {
    return <div style={{ ...rowBase, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)', fontSize: 12 }} />
  }
  if (result.kind === 'error') {
    return (
      <div style={{ ...rowBase, color: 'var(--text-error)', fontSize: 11, textOverflow: 'ellipsis' }} title={result.message}>
        {result.message}
      </div>
    )
  }
  if (result.kind === 'currency_unknown') {
    return (
      <div style={{ ...rowBase, color: 'var(--text-muted)', fontSize: 11 }}>
        未知货币
      </div>
    )
  }

  // value / date / currency — clickable, with copied indicator on the left
  const copiedLabel = copied === 'line' ? '已复制算式 ✓' : '已复制 ✓'

  return (
    <div
      style={{
        ...rowBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: copied ? 'space-between' : 'flex-end',
        cursor: 'pointer',
        borderRadius: 4,
        transition: 'background 0.1s',
      }}
      title="单击复制数值，双击复制算式=结果"
      onClick={handleClick}
      onDoubleClick={handleDblClick}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* 左侧：已复制提示，仅在复制后显示 */}
      {copied && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {copiedLabel}
        </span>
      )}
      {/* 结果值 */}
      <span style={{ color: 'var(--text-accent)', textAlign: 'right' }}>
        {result.display}
      </span>
    </div>
  )
}

const styles = {
  panel: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-result)',
  },
  list: {
    flex: '1 1 0',
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  inner: {
    paddingTop: 12,
  },
}