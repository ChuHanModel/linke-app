/**
 * 日志工具 - 将 console.log 输出同时保存到文件
 * 使用异步批量写入，避免阻塞 UI 线程
 */

let fs = null
try {
  fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
} catch (e) {}

// 日志文件路径（延迟到 init 时确定，避免模块加载时 uni.env 未就绪）
let LOG_DIR = ''
let LOG_FILE = null

function resolveLogPaths() {
  if (LOG_DIR) return // 已解析过
  try {
    LOG_DIR = `${uni.env.USER_DATA_PATH}/logs`
    LOG_FILE = `${LOG_DIR}/app_debug_${new Date().toISOString().split('T')[0]}.log`
  } catch (e) {
    LOG_DIR = ''
    LOG_FILE = null
  }
  // #ifdef H5
  LOG_FILE = null // H5 平台不写文件
  // #endif
}

// 异步写入队列
let _logBuffer = []
let _flushTimer = null
const FLUSH_INTERVAL = 2000 // 每 2 秒批量写入一次
const BUFFER_LIMIT = 50     // 缓冲超过 50 条立即写入

function initLogDir() {
  resolveLogPaths()
  if (!fs || !LOG_DIR) return
  try {
    try { fs.accessSync(LOG_DIR) } catch (e) { fs.mkdirSync(LOG_DIR, true) }
  } catch (e) {}
}

function flushBuffer() {
  if (!fs || !LOG_FILE || _logBuffer.length === 0) return
  const batch = _logBuffer.join('')
  _logBuffer = []
  try {
    fs.appendFile({
      filePath: LOG_FILE,
      data: batch,
      encoding: 'utf8',
      fail() {}
    })
  } catch (e) {}
}

function scheduleFlush() {
  if (_flushTimer) return
  _flushTimer = setTimeout(() => {
    _flushTimer = null
    flushBuffer()
  }, FLUSH_INTERVAL)
}

function queueWrite(level, args) {
  if (!LOG_FILE) resolveLogPaths()
  if (!fs || !LOG_FILE) return
  try {
    const timestamp = new Date().toISOString()
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg) } catch (e) { return String(arg) }
      }
      return String(arg)
    }).join(' ')
    _logBuffer.push(`[${timestamp}] [${level}] ${message}\n`)
    if (_logBuffer.length >= BUFFER_LIMIT) {
      flushBuffer()
    } else {
      scheduleFlush()
    }
  } catch (e) {}
}

// 保存原始的 console 方法
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
}

console.log = function(...args) {
  originalConsole.log.apply(console, args)
  queueWrite('LOG', args)
}

console.warn = function(...args) {
  originalConsole.warn.apply(console, args)
  queueWrite('WARN', args)
}

console.error = function(...args) {
  originalConsole.error.apply(console, args)
  queueWrite('ERROR', args)
}

console.info = function(...args) {
  originalConsole.info.apply(console, args)
  queueWrite('INFO', args)
}

console.debug = function(...args) {
  originalConsole.debug.apply(console, args)
  queueWrite('DEBUG', args)
}

export default {
  LOG_FILE,
  LOG_DIR,
  getLogFile() { return LOG_FILE },
  readLogs() {
    if (!fs) return Promise.reject('文件系统不可用')
    return new Promise((resolve, reject) => {
      try { resolve(fs.readFileSync(LOG_FILE, 'utf8')) } catch (e) { reject(e) }
    })
  },
  clearLogs() {
    if (!fs) return Promise.resolve()
    return new Promise((resolve, reject) => {
      try { fs.writeFileSync(LOG_FILE, '', 'utf8'); resolve() } catch (e) { reject(e) }
    })
  },
  flush() { flushBuffer() },
  init() {
    initLogDir()
    console.log('[Logger] 日志系统已初始化，日志文件:', LOG_FILE)
  }
}
