let mathPromise = null
let math = null

export function isMathReady() {
  return math !== null
}

export function ensureMath() {
  if (math) return Promise.resolve(math)
  if (!mathPromise) {
    mathPromise = import('mathjs').then(({ create, all }) => {
      math = create(all)
      return math
    })
  }
  return mathPromise
}

// ── Currency ──────────────────────────────────────────────────────────────────

const CURRENCY_NAMES = {
  '人民币': 'CNY', '美元': 'USD', '欧元': 'EUR', '日元': 'JPY', '英镑': 'GBP',
  '港币': 'HKD', '港元': 'HKD', '韩元': 'KRW', '澳元': 'AUD', '加元': 'CAD',
  '泰铢': 'THB', '新加坡元': 'SGD', '瑞士法郎': 'CHF', '印度卢比': 'INR',
}

// Normalize currency aliases in line before regex matching
function normalizeCurrencyNames(line) {
  let out = line
  for (const [cn, code] of Object.entries(CURRENCY_NAMES)) {
    out = out.replace(new RegExp(cn, 'g'), code)
  }
  return out
}

// Pattern: <amount> <FROM> to|转|换 <TO>
const CURRENCY_RE = /^([\d,_]+(?:\.\d+)?)\s+([A-Z]{3})\s+(?:to|转|换|→)\s+([A-Z]{3})$/i

export function parseCurrencyLine(rawLine, rates) {
  const line = normalizeCurrencyNames(rawLine.trim()).toUpperCase()
  const m = line.match(CURRENCY_RE)
  if (!m) return null

  const amount = parseFloat(m[1].replace(/[,_]/g, ''))
  const from = m[2]
  const to = m[3]

  if (!rates[from] || !rates[to]) {
    return { type: 'currency_unknown', from, to }
  }

  // All rates are relative to USD base
  const inUSD = amount / rates[from]
  const result = inUSD * rates[to]
  return { type: 'currency', amount, from, to, result }
}

// ── Date ──────────────────────────────────────────────────────────────────────

const DATE_DIFF_RE =
  /(?:今天|today|今日)\s*(?:距离?|到|至|~|→)?\s*(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/i
const DATE_DIFF_RE2 =
  /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})\s*(?:距离?|到|至|~|→)?\s*(?:今天|today|今日)/i
const DATE_ADD_RE = /(?:今天|today)\s*([\+\-－＋])\s*(\d+)\s*(天|days?)/i

function startOfDay(d) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}

function formatDate(d) {
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

export function parseDateLine(line) {
  const trimmed = line.trim()

  // "today + N days" / "today - N days"
  const addM = trimmed.match(DATE_ADD_RE)
  if (addM) {
    const sign = ['+', '＋'].includes(addM[1]) ? 1 : -1
    const days = parseInt(addM[2]) * sign
    const result = startOfDay(new Date())
    result.setDate(result.getDate() + days)
    return { type: 'date', display: formatDate(result) }
  }

  // "今天 距 2027-01-01" or reverse
  const diffM = trimmed.match(DATE_DIFF_RE) || trimmed.match(DATE_DIFF_RE2)
  if (diffM) {
    const target = startOfDay(new Date(parseInt(diffM[1]), parseInt(diffM[2]) - 1, parseInt(diffM[3])))
    const today = startOfDay(new Date())
    const diff = Math.round((target - today) / 86_400_000)
    const abs = Math.abs(diff)
    const label = diff > 0 ? `还有 ${abs} 天` : diff < 0 ? `已过去 ${abs} 天` : '就是今天'
    return { type: 'date', display: label }
  }

  // "today" / "今天" bare keyword
  if (/^(?:today|今天|今日)$/i.test(trimmed)) {
    return { type: 'date', display: formatDate(startOfDay(new Date())) }
  }

  // ISO 日期格式支持 "2027-01-01" (轻量替代 chrono-node)
  const isoM = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)
  if (isoM) {
    const d = startOfDay(new Date(+isoM[1], +isoM[2]-1, +isoM[3]))
    if (!isNaN(d.getTime())) return { type: 'date', display: formatDate(d) }
  }

  return null
}

// ── Unit alias normalization ───────────────────────────────────────────────────

const UNIT_ALIASES = {
  '公斤': 'kg', '千克': 'kg', '斤': '500g', '克': 'g', '毫克': 'mg',
  '公里': 'km', '千米': 'km', '米': 'm', '厘米': 'cm', '毫米': 'mm',
  '英里': 'mile', '英尺': 'ft', '英寸': 'inch', '码': 'yd',
  '磅': 'lb', '盎司': 'oz',
  '升': 'liter', '毫升': 'ml',
  '摄氏度': 'degC', '华氏度': 'degF', '开尔文': 'K',
  '平方米': 'm^2', '平方公里': 'km^2', '平方英尺': 'ft^2', '亩': '666.67 m^2',
  '转': 'to', '换': 'to', '换算成': 'to', '转换成': 'to',
}

function normalizeUnits(line) {
  let out = line
  for (const [cn, en] of Object.entries(UNIT_ALIASES)) {
    out = out.replace(new RegExp(cn, 'g'), en)
  }
  return out
}

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatNumber(n) {
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞'
  if (Number.isInteger(n)) return n.toLocaleString('zh-CN')
  // Trim floating point noise
  const s = parseFloat(n.toPrecision(12))
  if (Math.abs(s) < 1e-10 && n !== 0) return '≈ 0'
  return s.toLocaleString('zh-CN', { maximumFractionDigits: 8 })
}

// ── Chinese identifier support ────────────────────────────────────────────────
// mathjs does not support Unicode/Chinese characters as identifiers.
// We transparently map them to ASCII-safe aliases before evaluation.

const CN_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]*/g

let _cnCounter = 0
/** @type {Map<string, string>} Chinese name → safe alias */
const _cnMap = new Map()

function _resetCnMap() {
  _cnMap.clear()
  _cnCounter = 0
}

/**
 * Replace all Chinese identifier tokens in a line with safe ASCII aliases.
 * Returns { text, hadCn } where `hadCn` indicates if any substitution occurred.
 */
function _substituteCn(line) {
  let hadCn = false
  const out = line.replace(CN_RE, (match) => {
    // Skip if starts with a digit (not a valid identifier anyway)
    if (/^\d/.test(match)) return match
    hadCn = true
    if (!_cnMap.has(match)) {
      _cnMap.set(match, `__cn${_cnCounter++}`)
    }
    return _cnMap.get(match)
  })
  return { text: out, hadCn }
}

/**
 * After mathjs evaluation, copy alias values back to Chinese-named keys in scope.
 */
function _syncCnScope(scope) {
  for (const [cn, alias] of _cnMap) {
    if (alias in scope) {
      scope[cn] = scope[alias]
    }
  }
}

// ── Main evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluate a single line.
 * Returns one of:
 *   { kind: 'empty' }
 *   { kind: 'comment', text }
 *   { kind: 'value', display, raw }        — raw is numeric or null
 *   { kind: 'date', display }
 *   { kind: 'currency', display }
 *   { kind: 'currency_unknown', from, to }
 *   { kind: 'error', message }
 */
export function evaluateLine(line, scope, rates) {
  const trimmed = line.trim()
  if (!trimmed) return { kind: 'empty' }
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return { kind: 'comment', text: trimmed.slice(1).trim() }
  }

  // Date
  const dateResult = parseDateLine(trimmed)
  if (dateResult) return { kind: 'date', display: dateResult.display }

  // Currency
  const currResult = parseCurrencyLine(trimmed, rates)
  if (currResult) {
    if (currResult.type === 'currency_unknown') {
      return { kind: 'currency_unknown', from: currResult.from, to: currResult.to }
    }
    const { result, to, amount, from } = currResult
    const display = result >= 1000
      ? result.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : result.toFixed(4).replace(/\.?0+$/, '')
    return { kind: 'currency', display: `${display} ${to}` }
  }

  // Math (with unit normalization + Chinese identifier substitution)
  const normalized = normalizeUnits(trimmed)
  const sub = _substituteCn(normalized)

  // If expression ends with a trailing operator (user is mid-typing), strip it
  const cleaned = sub.text.replace(/[\+\-\*\/\^]\s*$/, '')

  try {
    const result = math.evaluate(cleaned, scope)
    if (sub.hadCn) _syncCnScope(scope)
    if (result === undefined || result === null) return { kind: 'empty' }

    if (typeof result === 'number') {
      return { kind: 'value', display: formatNumber(result), raw: result }
    }
    if (typeof result === 'boolean') {
      return { kind: 'value', display: result ? 'true' : 'false', raw: null }
    }
    if (result && result.constructor?.name === 'Unit') {
      const str = result.toString()
      // Try to extract numeric part for sum
      let raw = null
      try { raw = result.toNumber() } catch (_) {}
      return { kind: 'value', display: str, raw }
    }
    if (result && typeof result.isMatrix !== 'undefined' && result.isMatrix) {
      const flat = result.toArray().flat()
      return { kind: 'value', display: '[' + flat.map(formatNumber).join(', ') + ']', raw: null }
    }
    return { kind: 'value', display: String(result), raw: null }
  } catch (e) {
    const msg = (e.message || '').split('\n')[0]
    // Suppress unhelpful "Undefined symbol" for plain variable assignments
    if (msg.includes('Undefined symbol') && trimmed.includes('=')) return { kind: 'empty' }
    return { kind: 'error', message: msg.slice(0, 60) }
  }
}

/**
 * Evaluate all lines, returning an array of results.
 * Also computes the running sum of all numeric values.
 */
export function evaluateAll(text, rates) {
  _resetCnMap()
  const lines = text.split('\n')
  const scope = {}

  const builtins = { '作者邮箱': 'jssmme@gmail.com', '版本号': '1.1' }
  for (const [cn, val] of Object.entries(builtins)) {
    const alias = `__cn${_cnCounter++}`
    _cnMap.set(cn, alias)
    scope[alias] = val
    scope[cn] = val
  }

  if (!math) {
    return {
      results: lines.map(() => ({ kind: 'loading' })),
      sum: null,
      lineCount: lines.length,
      lines,
    }
  }

  const results = lines.map(line => evaluateLine(line, scope, rates))
  const numericValues = results
    .filter(r => r.kind === 'value' && typeof r.raw === 'number' && isFinite(r.raw))
    .map(r => r.raw)
  const sum = numericValues.length > 1 ? numericValues.reduce((a, b) => a + b, 0) : null
  return { results, sum, lineCount: lines.length, lines }
}