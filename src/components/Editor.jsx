import { useRef, useEffect, useCallback } from 'react'

const LINE_HEIGHT = 26   // must match CSS --line-height
const GUTTER_W   = 44   // must match CSS --gutter-w

/**
 * The editor pane.
 *
 * Layout fix vs. the demo:
 *   The textarea is placed inside a wrapper that is `flex: 1; min-height: 0`.
 *   The textarea itself is `width: 100%; height: 100%` so it fills the flex cell.
 *   Line numbers are an absolutely-positioned overlay that scrolls in sync.
 *
 * We use a plain <textarea> (not contenteditable) for reliable cursor behaviour.
 */
export default function Editor({ value, onChange, lineCount }) {
  const taRef      = useRef(null)
  const gutterRef  = useRef(null)

  // Sync gutter scroll with textarea scroll
  const syncScroll = useCallback(() => {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop
    }
  }, [])

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.addEventListener('scroll', syncScroll, { passive: true })
    return () => ta.removeEventListener('scroll', syncScroll)
  }, [syncScroll])

  // Tab → 2 spaces
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const { selectionStart: s, selectionEnd: end } = e.target
      const next = e.target.value.slice(0, s) + '  ' + e.target.value.slice(end)
      onChange(next)
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        if (taRef.current) {
          taRef.current.selectionStart = taRef.current.selectionEnd = s + 2
        }
      })
    }
  }, [onChange])

  const lineNums = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <div style={styles.editorWrapper}>
      {/* Gutter — absolutely positioned, scrolls via JS */}
      <div ref={gutterRef} style={styles.gutter} aria-hidden="true">
        {lineNums.map(n => (
          <div key={n} style={styles.lineNum}>{n}</div>
        ))}
      </div>

      {/* Textarea fills remaining width, full height */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={styles.textarea}
        placeholder={"输入表达式，每行一个\n\n示例：\n  月薪 = 15000\n  年收入 = 月薪 * 12\n  100 kg to lb\n  today + 90天\n  1000 USD to CNY"}
      />
    </div>
  )
}

const styles = {
  editorWrapper: {
    position: 'relative',
    flex: '1 1 0',        // ← fills the flex column, allows shrink
    minHeight: 0,         // ← essential: prevents flex child from overflowing
    display: 'flex',
    overflow: 'hidden',
  },
  gutter: {
    width: GUTTER_W,
    flexShrink: 0,
    overflowY: 'hidden',   // scrolled via JS, not by user
    paddingTop: 12,
    background: 'var(--bg-toolbar)',
    borderRight: '1px solid var(--border-light)',
    userSelect: 'none',
  },
  lineNum: {
    height: LINE_HEIGHT,
    lineHeight: `${LINE_HEIGHT}px`,
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 12,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  textarea: {
    flex: 1,
    height: '100%',        // ← fill the flex cell height
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: `12px 16px`,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    lineHeight: `${LINE_HEIGHT}px`,
    background: 'transparent',
    color: 'var(--text-primary)',
    caretColor: 'var(--accent)',
    overflowY: 'auto',
    overflowX: 'auto',
    whiteSpace: 'pre',     // preserve indentation, no word-wrap
  },
}
