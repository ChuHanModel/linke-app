export class AppRequestError extends Error {
  constructor(message, options = {}) {
    super(message || '请求失败')
    this.name = 'AppRequestError'
    this.code = options.code || 'REQUEST_ERROR'
    this.retryable = !!options.retryable
    this.cause = options.cause
    this.details = options.details
  }
}

export function normalizeError(error, fallbackMessage = '请求失败') {
  if (error instanceof AppRequestError) return error
  const message = error && (error.message || error.errMsg || error) ? String(error.message || error.errMsg || error) : fallbackMessage
  return new AppRequestError(message, {
    cause: error,
    retryable: /timeout|网络|network|abort|tls/i.test(message)
  })
}

export function isRetryableRequestError(error) {
  if (!error) return false
  if (error instanceof AppRequestError) return !!error.retryable
  const message = String(error.message || error.errMsg || error || '')
  return /timeout|网络|network|abort|tls/i.test(message)
}
