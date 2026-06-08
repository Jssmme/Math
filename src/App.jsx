import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import ResultsPanel from './components/ResultsPanel'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import { useRates } from './hooks/useRates'
import { evaluateAll } from './utils/evaluator'

const DEFAULT_TEXT = `作者邮箱
版本号
# 基础计算
x = 3
y = x + 2
z = x * 4 + y

# 单位换算
100 kg to lb
36.6 degC to degF
1 mile to km

# 日期计算
today + 1天
今天距2027-01-01还有多少天

# 汇率换算（实时）
1000 USD to CNY
100 HKD to CNY
`

const MIN_WIDTH = 400
const MIN_HEIGHT = 400
const MIN_PANE = 100

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [cursor, setCursor] = useState({ line: 1, col: 1 })
  const [editorScrollTop, setEditorScrollTop] = useState(0)
  const taRef = useRef(null)

  const { rates, status: rateStatus, updatedAt: rateUpdatedAt, refreshRates, flash: rateFlash } = useRates()

  const { results, sum } = useMemo(
    () => evaluateAll(text, rates),
    [text, rates]
  )

  const lines = text.split('\n')
  const lineCount = lines.length
  const numericCount = results.filter(
    r => r.kind === 'value' && typeof r.raw === 'number' && isFinite(r.raw)
  ).length

  // Cursor position tracking
  const handleEditorChange = useCallback((newText) => {
    setText(newText)
  }, [])

  // We need the textarea ref forwarded from Editor — simplest: keep a local ref here
  // and pass a setter down
  const handleCursorUpdate = useCallback((selStart, val) => {
    const before = val.slice(0, selStart)
    const linesSoFar = before.split('\n')
    setCursor({ line: linesSoFar.length, col: linesSoFar[linesSoFar.length - 1].length + 1 })
  }, [])

  // Insert snippet at focused position — we need access to the textarea
  // Use a ref provided by Editor via an imperative handle pattern
  const editorActionRef = useRef(null)

  const insertAtCursor = useCallback((snippet) => {
    const action = editorActionRef.current
    if (!action) return
    action.insert(snippet)
  }, [])

  const insertSum = useCallback(() => {
    // Collect variable names from lines that have assignments
    const varNames = lines
      .map(l => l.match(/^([a-zA-Z\u4e00-\u9fa5_][\w\u4e00-\u9fa5]*)\s*=/))
      .filter(Boolean)
      .map(m => m[1])
    const snippet = varNames.length > 1 ? varNames.join(' + ') : 'sum(a, b, c)'
    insertAtCursor(snippet)
  }, [lines, insertAtCursor])

  const clearAll = useCallback(() => {
    setText('')
  }, [])

  const splitRef = useRef(null)
  const [dividerPos, setDividerPos] = useState(380) // px from left of body — left 244 + divider 6 + right 150 = 400

  // Drag state
  const dragging = useRef(false)

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startPos = dividerPos
    const bodyRect = e.currentTarget.parentElement.getBoundingClientRect()

    const onMove = (ev) => {
      if (!dragging.current) return
      const dx = ev.clientX - startX
      const totalW = bodyRect.width
      const newPos = Math.max(MIN_PANE, Math.min(totalW - MIN_PANE - 6, (startPos ?? totalW - 150) + dx))
      setDividerPos(newPos)
    }
    const onUp = () => { dragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [dividerPos])

  const leftFlex = dividerPos !== null ? `0 0 ${dividerPos}px` : '1 1 0'
  const rightFlex = dividerPos !== null ? '1 1 0' : undefined

  return (
    <div style={styles.root}>
      <div style={styles.app}>
        <Toolbar
          onInsert={insertAtCursor}
          onClear={clearAll}
          onSumInsert={insertSum}
          rateStatus={rateStatus}
          rateUpdatedAt={rateUpdatedAt}
          onRateRefresh={refreshRates}
          rateFlash={rateFlash}
        />

        <div style={styles.body}>
          {/* Editor pane */}
          <div style={{ ...styles.editorWrapper, flex: leftFlex, minWidth: 0 }}>
            <EditorPane
              text={text}
              lineCount={lineCount}
              scrollTop={editorScrollTop}
              onChange={handleEditorChange}
              onCursorChange={handleCursorUpdate}
              onScrollTop={setEditorScrollTop}
              actionRef={editorActionRef}
            />
          </div>

          {/* Divider */}
          <div
            style={styles.divider}
            onMouseDown={onDividerMouseDown}
          />

          {/* Results pane */}
          <div style={{
            flex: rightFlex ?? '0 0 150px',
            minWidth: 0,
            display: 'flex',
          }}>
            <ResultsPanel
              results={results}
              lines={lines}
              scrollTop={editorScrollTop}
              onScrollTopChange={setEditorScrollTop}
            />
          </div>
        </div>

        <StatusBar
          cursorLine={cursor.line}
          cursorCol={cursor.col}
          lineCount={lineCount}
          numericCount={numericCount}
          sum={sum}
        />
      </div>
    </div>
  )
}

/**
 * EditorPane wraps Editor with the imperative insert action exposed via actionRef.
 * This avoids prop-drilling a ref all the way through Editor internals.
 */
function EditorPane({ text, lineCount, scrollTop, onChange, onCursorChange, onScrollTop, actionRef }) {
  const taRef = useRef(null)

  // Expose insert() to parent via actionRef
  useEffect(() => {
    actionRef.current = {
      insert(snippet) {
        const ta = taRef.current
        if (!ta) return
        const s = ta.selectionStart
        const e = ta.selectionEnd
        const next = ta.value.slice(0, s) + snippet + ta.value.slice(e)
        onChange(next)
        requestAnimationFrame(() => {
          ta.focus()
          ta.selectionStart = ta.selectionEnd = s + snippet.length
        })
      },
    }
  }, [actionRef, onChange])

  // Sync textarea scrollTop when prop changes (results panel scrolled)
  // Only set when difference > 1px to avoid feedback loop
  useEffect(() => {
    const ta = taRef.current
    if (ta && Math.abs(ta.scrollTop - scrollTop) > 1) {
      ta.scrollTop = scrollTop
    }
  }, [scrollTop])

  const handleKeyUp = useCallback((e) => {
    onCursorChange(e.target.selectionStart, e.target.value)
  }, [onCursorChange])

  const handleClick = useCallback((e) => {
    onCursorChange(e.target.selectionStart, e.target.value)
  }, [onCursorChange])

  const handleScroll = useCallback((e) => {
    onScrollTop(e.target.scrollTop)
  }, [onScrollTop])

  return (
    <div style={styles.editorOuter}>
      {/* Gutter */}
      <GutterSync taRef={taRef} lineCount={lineCount} />

      {/* Textarea — the real fix: height: 100%, flex: 1 */}
      <textarea
        ref={taRef}
        value={text}
        onChange={e => onChange(e.target.value)}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onScroll={handleScroll}
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault()
            const s = e.target.selectionStart
            const next = e.target.value.slice(0, s) + '  ' + e.target.value.slice(e.target.selectionEnd)
            onChange(next)
            requestAnimationFrame(() => {
              if (taRef.current) {
                taRef.current.selectionStart = taRef.current.selectionEnd = s + 2
              }
            })
          }
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={styles.textarea}
        placeholder={"输入表达式，每行一个\n示例：\n  x = 150\n  100 kg to lb\n  today + 90天\n  1000 USD to CNY"}
      />
    </div>
  )
}

/** Renders line numbers, synced to textarea scroll */
function GutterSync({ taRef, lineCount }) {
  const gutterRef = useRef(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    const sync = () => {
      if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
    }
    ta.addEventListener('scroll', sync, { passive: true })
    return () => ta.removeEventListener('scroll', sync)
  }, [taRef])

  return (
    <div ref={gutterRef} style={styles.gutter} aria-hidden="true">
      <div style={styles.gutterInner}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} style={styles.lineNum}>{i + 1}</div>
        ))}
      </div>
    </div>
  )
}

const LINE_H = 26

const styles = {
  root: {
    height: '100%',
    background: 'var(--bg-app)',
  },
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 10,
    border: '1px solid var(--border)',
    overflow: 'hidden',
    background: 'var(--bg-panel)',
    position: 'relative',
  },
  body: {
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    overflow: 'hidden',
  },
  divider: {
    width: 6,
    flexShrink: 0,
    cursor: 'col-resize',
    background: 'transparent',
    position: 'relative',
    zIndex: 1,
    transition: 'background 0.15s',
  },
  editorWrapper: {
    display: 'flex',
    overflow: 'hidden',
  },
  editorOuter: {
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    overflow: 'hidden',
  },
  gutter: {
    width: 44,
    flexShrink: 0,
    overflowY: 'hidden',
    background: 'var(--bg-toolbar)',
    borderRight: '1px solid var(--border-light)',
  },
  gutterInner: {
    paddingTop: 12,
  },
  lineNum: {
    height: LINE_H,
    lineHeight: `${LINE_H}px`,
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 12,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    userSelect: 'none',
  },
  textarea: {
    flex: '1 1 0',
    minHeight: 0,
    // No fixed height — fills the flex container completely
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: '12px 16px',
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    lineHeight: `${LINE_H}px`,
    background: 'transparent',
    color: 'var(--text-primary)',
    caretColor: 'var(--accent)',
    overflowY: 'auto',
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  },
}
