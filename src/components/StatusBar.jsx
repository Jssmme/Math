import { formatNumber } from '../utils/evaluator'

export default function StatusBar({ cursorLine, cursorCol, lineCount, numericCount, sum }) {
  const avg = sum !== null && numericCount > 0 ? sum / numericCount : null

  return (
    <div style={styles.bar}>
      <span>行 {cursorLine}，列 {cursorCol}</span>
      <span style={styles.sep} />
      <span>{lineCount} 行</span>

      <div style={styles.right}>
        {numericCount > 0 && (
          <>
            <span>计数 {numericCount}</span>
            <span style={styles.sep} />
            <span>求和 {sum !== null ? formatNumber(sum) : '-'}</span>
            <span style={styles.sep} />
            <span>平均 {avg !== null ? formatNumber(avg) : '-'}</span>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  bar: {
    height: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-toolbar)',
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)',
  },
  sep: {
    display: 'inline-block',
    width: 1,
    height: 10,
    background: 'var(--border)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
}
