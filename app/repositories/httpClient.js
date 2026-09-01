import { AppRequestError, normalizeError } from '@/repositories/error.js'

export function request(options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header || {},
      dataType: options.dataType || 'text',
      responseType: options.responseType || 'text',
      withCredentials: options.withCredentials === true,
      timeout: options.timeout || 15000,
      success: resolve,
      fail(error) {
        reject(normalizeError(error, options.errorMessage || '网络错误'))
      }
    })
  })
}

export function ensureSuccessResponse(res, options = {}) {
  if (!res) {
    throw new AppRequestError(options.errorMessage || '响应为空', { code: 'EMPTY_RESPONSE' })
  }
  if (options.acceptStatus && options.acceptStatus.includes(res.statusCode)) return res
  if (typeof res.statusCode === 'number' && res.statusCode >= 400) {
    let message = ''
    try {
      const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      message = (body && (body.msg || (body.data && body.data.error))) || ''
    } catch (_) {}
    throw new AppRequestError(message || options.errorMessage || `请求失败(${res.statusCode})`, {
      code: 'HTTP_ERROR',
      details: res
    })
  }
  return res
}
