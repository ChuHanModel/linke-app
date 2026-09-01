import md5 from '@/utils/md5.js'
import { request, ensureSuccessResponse } from '@/repositories/httpClient.js'
import { AppRequestError, normalizeError, isRetryableRequestError } from '@/repositories/error.js'

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.linketeam.com/Api/public/index.php'
  : 'https://api.linketeam.com/Api/public/index.php'  // 真机调试也用生产API（原值: http://localhost:8088/Api/public/index.php）
const SIGN_KEY = 'Linke'
const REQUEST_CACHE_STORAGE_PREFIX = 'app_api_cache_'
const requestMemoryCache = new Map()
const inFlightRequests = new Map()

function generateSign(service) {
  const signTime = Math.floor(Date.now() / 1000)
  const signMain = md5.hexMD5(SIGN_KEY + service + signTime)
  return { signMain, signTime }
}

function stableStringify(value) {
  if (value === null || value === undefined) return String(value)
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function cloneValue(value) {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    return value
  }
}

function buildDefaultRequestIdentity(service, method, options, isJson) {
  return stableStringify({
    service,
    method,
    json: isJson,
    data: options.data || {},
    header: options.header || {}
  })
}

function buildCacheStorageKey(rawKey) {
  return REQUEST_CACHE_STORAGE_PREFIX + md5.hexMD5(String(rawKey))
}

function readMemoryCacheEntry(rawKey, allowExpired = false) {
  const cached = requestMemoryCache.get(rawKey)
  if (!cached) return null
  if (!allowExpired && cached.expiresAt <= Date.now()) {
    requestMemoryCache.delete(rawKey)
    return null
  }
  return cached
}

function readMemoryCache(rawKey) {
  const cached = readMemoryCacheEntry(rawKey)
  if (!cached) return null
  return cloneValue(cached.value)
}

function readStorageCacheEntry(rawKey, allowExpired = false) {
  try {
    const cached = uni.getStorageSync(buildCacheStorageKey(rawKey))
    if (!cached || typeof cached !== 'object') return null
    if (!cached.expiresAt || (!allowExpired && cached.expiresAt <= Date.now())) {
      uni.removeStorageSync(buildCacheStorageKey(rawKey))
      return null
    }
    requestMemoryCache.set(rawKey, cached)
    return cached
  } catch (error) {
    return null
  }
}

function readStorageCache(rawKey) {
  const cached = readStorageCacheEntry(rawKey)
  if (!cached) return null
  return cloneValue(cached.value)
}

function writeRequestCache(rawKey, value, ttl, persist = true) {
  if (!rawKey || !ttl || ttl <= 0) return
  const payload = {
    value: cloneValue(value),
    expiresAt: Date.now() + ttl
  }
  requestMemoryCache.set(rawKey, payload)
  if (!persist) return
  try {
    uni.setStorageSync(buildCacheStorageKey(rawKey), payload)
  } catch (error) {}
}

function resolveRequestControl(service, method, options, isJson) {
  const identity = buildDefaultRequestIdentity(service, method, options, isJson)
  const cacheTTL = Number(options.cacheTTL) > 0 ? Number(options.cacheTTL) : 0
  const cacheKey = cacheTTL > 0 ? String(options.cacheKey || identity) : ''
  const dedupeEnabled = options.dedupe === true || !!options.dedupeKey || !!cacheKey
  return {
    cacheTTL,
    cacheKey,
    cachePersist: options.cachePersist !== false,
    dedupeKey: dedupeEnabled ? String(options.dedupeKey || cacheKey || identity) : ''
  }
}

function toFormUrlEncoded(obj) {
  if (obj == null || typeof obj !== 'object') return ''
  return Object.keys(obj)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key] == null ? '' : String(obj[key])))
    .join('&')
}

function normalizePhalApiInnerData(body) {
  let inner = body && body.data !== undefined ? body.data : body
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const keys = Object.keys(inner)
    if (keys.length === 0) return []
    if (keys.every(key => /^\d+$/.test(key))) {
      return keys.map(key => inner[key])
    }
  }
  return inner
}

function normalizeAppApiBody(rawBody) {
  if (rawBody && typeof rawBody === 'object') return rawBody
  if (typeof rawBody !== 'string') {
    throw new AppRequestError('服务器返回了错误响应，请检查PHP错误日志', {
      code: 'INVALID_BODY',
      details: rawBody
    })
  }
  try {
    return JSON.parse(rawBody)
  } catch (error) {
    throw new AppRequestError('服务器返回了错误响应，请检查PHP错误日志', {
      code: 'INVALID_BODY',
      cause: error,
      details: rawBody
    })
  }
}

async function requestAppApi(service, options = {}) {
  const { signMain, signTime } = generateSign(service)
  const url = `${BASE_URL}?service=${encodeURIComponent(service)}&signMain=${signMain}&signTime=${signTime}`
  const method = options.method || 'POST'
  const isJson = options.json === true
  const control = resolveRequestControl(service, method, options, isJson)
  const data = isJson ? JSON.stringify(options.data || {}) : (method === 'POST' ? toFormUrlEncoded(options.data || {}) : (options.data || {}))
  const headers = isJson
    ? { 'Content-Type': 'application/json;charset=utf-8', ...(options.header || {}) }
    : { 'content-type': 'application/x-www-form-urlencoded', ...(options.header || {}) }

  if (control.cacheKey) {
    const cached = readMemoryCache(control.cacheKey) || readStorageCache(control.cacheKey)
    if (cached !== null) return cached
  }

  const staleCachedEntry = control.cacheKey && options.staleCacheOnError
    ? (readMemoryCacheEntry(control.cacheKey, true) || readStorageCacheEntry(control.cacheKey, true))
    : null

  if (control.dedupeKey && inFlightRequests.has(control.dedupeKey)) {
    return inFlightRequests.get(control.dedupeKey).then(result => cloneValue(result))
  }

  const executeRequest = async () => {
    const res = ensureSuccessResponse(await request({
      url,
      method,
      data,
      header: headers,
      timeout: options.timeout || 15000,
      dataType: options.dataType || 'json',
      responseType: options.responseType || 'text',
      errorMessage: options.errorMessage || 'API网络请求失败'
    }), { errorMessage: options.errorMessage || 'API响应异常' })

    const body = normalizeAppApiBody(res.data)
    if (body && body.ret == 200) {
      const result = isJson ? body.data : normalizePhalApiInnerData(body)
      if (control.cacheKey) {
        writeRequestCache(control.cacheKey, result, control.cacheTTL, control.cachePersist)
      }
      return result
    }

    const errorMessage = body?.data?.error || body?.msg || '请求失败'
    throw new AppRequestError(errorMessage, {
      code: 'API_ERROR',
      details: body
    })
  }

  const executeRequestWithRetry = async () => {
    const retryCount = Number(options.retryCount) > 0 ? Number(options.retryCount) : 0
    const retryDelay = Number(options.retryDelay) > 0 ? Number(options.retryDelay) : 400
    let attempt = 0

    while (true) {
      try {
        return await executeRequest()
      } catch (error) {
        if (attempt >= retryCount || !isRetryableRequestError(error)) {
          if (staleCachedEntry) {
            return cloneValue(staleCachedEntry.value)
          }
          throw error
        }
        attempt += 1
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }
  }

  if (!control.dedupeKey) {
    return executeRequestWithRetry()
  }

  const inFlight = executeRequestWithRetry().finally(() => {
    inFlightRequests.delete(control.dedupeKey)
  })
  inFlightRequests.set(control.dedupeKey, inFlight)
  return inFlight.then(result => cloneValue(result))
}

/**
 * 2026-05-17 安全审查 T2：删除 1.0.7 的 userId 自动注入。它存在 solely 为了
 * 配合后端已删除的「userKey 查不到时按 userId fallback 认证」自愈链路；
 * 该链路可导致账号接管（错误 userKey + 受害者 userId 即可接管），前后端同步移除。
 */

export async function get(service, data = {}, options = {}) {
  return requestAppApi(service, { ...options, method: 'GET', data })
}

export async function post(service, data = {}, options = {}) {
  return requestAppApi(service, { ...options, method: 'POST', data })
}

export async function postJson(service, data = {}, options = {}) {
  return requestAppApi(service, { ...options, method: 'POST', data, json: true })
}

export function uploadFile(service, filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    const { signMain, signTime } = generateSign(service)
    const url = `${BASE_URL}?service=${encodeURIComponent(service)}&signMain=${signMain}&signTime=${signTime}`
    uni.uploadFile({
      url,
      filePath,
      name: 'userAvatar',
      formData,
      success(res) {
        try {
          const body = JSON.parse(res.data)
          if (body.ret == 200) {
            resolve(body.data)
            return
          }
          reject(new AppRequestError(body.msg || '上传失败', { code: 'UPLOAD_ERROR', details: body }))
        } catch (error) {
          reject(normalizeError(error, '响应解析失败'))
        }
      },
      fail(error) {
        reject(normalizeError(error, '上传失败'))
      }
    })
  })
}

export function resource() {
  return BASE_URL + '/resource'
}

export function invalidateRequestCache(cacheKey) {
  if (!cacheKey) return
  const rawKey = String(cacheKey)
  requestMemoryCache.delete(rawKey)
  try {
    uni.removeStorageSync(buildCacheStorageKey(rawKey))
  } catch (error) {}
}

export { BASE_URL as APP_API_BASE_URL }
