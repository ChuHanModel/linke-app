import { post } from '@/repositories/appApi.js'
import { APP_SERVICES } from '@/constants/services.js'

const STORAGE_KEY = 'login_test_config_snapshot'
const FORCE_RELOGIN_STORAGE_KEY = 'login_test_force_relogin_window'

function safeGetStorage(key) {
  try {
    return uni.getStorageSync(key)
  } catch (e) {
    return ''
  }
}

function safeSetStorage(key, value) {
  try {
    uni.setStorageSync(key, value)
  } catch (e) {}
}

function parseWindowTime(value) {
  if (!value) return 0
  if (typeof value === 'number') return value * 1000
  const text = String(value).replace(' ', 'T')
  const ts = Date.parse(text)
  return Number.isFinite(ts) ? ts : 0
}

function getApproxServerNow(config) {
  if (!config || !config.serverTime || !config.receivedAt) return Date.now()
  return Number(config.serverTime) * 1000 + (Date.now() - Number(config.receivedAt))
}

export function saveLoginTestConfig(loginTest) {
  if (!loginTest || typeof loginTest !== 'object') return
  safeSetStorage(STORAGE_KEY, {
    ...loginTest,
    receivedAt: Date.now()
  })
}

export function getLoginTestConfig() {
  const config = safeGetStorage(STORAGE_KEY)
  return config && typeof config === 'object' ? config : null
}

export async function refreshLoginTestConfig() {
  const platform = (() => {
    try {
      return uni.getSystemInfoSync().platform === 'ios' ? 'ios' : 'android'
    } catch (e) {
      return 'android'
    }
  })()
  const config = await post(APP_SERVICES.loginTestConfig, { platform }, { timeout: 8000 })
  saveLoginTestConfig(config)
  return config
}

function isLoginTestWindowActive(config = getLoginTestConfig()) {
  if (!config || !config.config || !config.active) return false
  if (config.activeForPlatform === false) return false
  const detail = config.config
  if (!detail.enabled) return false
  const now = getApproxServerNow(config)
  const startAt = parseWindowTime(detail.startAt)
  const endAt = parseWindowTime(detail.endAt)
  if (!startAt || !endAt || startAt > endAt) return false
  return now >= startAt && now <= endAt
}

export function isLoginTestActive(config = getLoginTestConfig()) {
  if (!isLoginTestWindowActive(config)) return false
  const detail = config && config.config ? config.config : {}
  return detail.receiveData !== false
}

export function isLoginTestForceReloginActive(config = getLoginTestConfig()) {
  if (!isLoginTestWindowActive(config)) return false
  const detail = config && config.config ? config.config : {}
  return detail.forceRelogin === true
}

export function getLoginTestForceReloginWindowKey(config = getLoginTestConfig()) {
  if (!config || !config.config) return ''
  const detail = config.config
  return [
    'login-test-force-relogin',
    config.platform || '',
    detail.startAt || '',
    detail.endAt || ''
  ].join(':')
}

export function hasHandledLoginTestForceRelogin(config = getLoginTestConfig()) {
  const key = getLoginTestForceReloginWindowKey(config)
  if (!key) return false
  const marker = safeGetStorage(FORCE_RELOGIN_STORAGE_KEY)
  return !!(marker && typeof marker === 'object' && marker.key === key)
}

export function markLoginTestForceReloginHandled(config = getLoginTestConfig(), meta = {}) {
  const key = getLoginTestForceReloginWindowKey(config)
  if (!key) return
  safeSetStorage(FORCE_RELOGIN_STORAGE_KEY, {
    key,
    at: Date.now(),
    serverTimeText: config && config.serverTimeText,
    ...meta
  })
}

export function buildLoginTestPayload({ stage, attemptId, page, form, captchaSession, pageState, result, error }) {
  const config = getLoginTestConfig()
  const captureFullData = !(config && config.config && config.config.captureFullData === false)
  const payload = {
    marker: 'LINKE_FULL_LOGIN_DEBUG_2026_05_15',
    stage,
    attemptId,
    capturedAt: new Date().toISOString(),
    page,
    manifestVersion: typeof __MANIFEST_VERSION__ !== 'undefined' ? __MANIFEST_VERSION__ : null,
    form,
    captchaSession,
    pageState,
    result: result || null,
    error: error || null,
    storage: {
      isLoggedIn: safeGetStorage('isLoggedIn'),
      userId: safeGetStorage('userId'),
      userPassword: safeGetStorage('userPassword'),
      loginCookie: safeGetStorage('loginCookie'),
      userKey: safeGetStorage('userKey'),
      userInfo: safeGetStorage('userInfo'),
      userType: safeGetStorage('userType'),
      globalCookie: safeGetStorage('globalCookie'),
      lastSeenVersionCode: safeGetStorage('lastSeenVersionCode'),
      wgtUpdateForceLogout: safeGetStorage('_wgtUpdateForceLogout'),
      loginTestConfigSnapshot: getLoginTestConfig()
    },
    systemInfo: (() => {
      try {
        return uni.getSystemInfoSync()
      } catch (e) {
        return null
      }
    })()
  }
  if (captureFullData) return payload
  return redactSensitivePayload(payload)
}

function redactSensitivePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload))
  if (clone.form) {
    clone.form.password = '[redacted]'
    clone.form.captcha = '[redacted]'
  }
  if (clone.captchaSession) {
    clone.captchaSession.cookieHeader = '[redacted]'
    clone.captchaSession.captchaImg = '[redacted]'
    clone.captchaSession.captchaBase64 = '[redacted]'
    clone.captchaSession.ddddocrResult = '[redacted]'
  }
  if (clone.result) {
    clone.result.cookieHeader = '[redacted]'
    clone.result.userKey = '[redacted]'
  }
  if (clone.storage) {
    clone.storage.userPassword = '[redacted]'
    clone.storage.loginCookie = '[redacted]'
    clone.storage.userKey = '[redacted]'
    clone.storage.globalCookie = '[redacted]'
  }
  return clone
}

export async function reportLoginTestPayload(payload) {
  const config = getLoginTestConfig()
  if (!isLoginTestActive(config)) return { skipped: true, reason: 'inactive' }

  try {
    const res = await post(APP_SERVICES.loginTestReport, {
      payload: JSON.stringify(payload),
      clientMeta: JSON.stringify({
        marker: payload && payload.marker,
        stage: payload && payload.stage,
        attemptId: payload && payload.attemptId,
        capturedAt: payload && payload.capturedAt
      })
    }, {
      timeout: 12000,
      retryCount: 1,
      retryDelay: 500
    })
    console.warn('[login-test] report sent:', res)
    return res
  } catch (e) {
    console.warn('[login-test] report failed:', e && (e.message || e))
    return { skipped: false, error: e && (e.message || e) }
  }
}
