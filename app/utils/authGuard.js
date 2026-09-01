import { hasStoredSession } from '@/services/auth/sessionService.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'

function buildLoginUrl(from) {
  const source = String(from || '').trim()
  return source ? `${JW_LOGIN_PAGE}?from=${encodeURIComponent(source)}` : JW_LOGIN_PAGE
}

export function ensureAuthenticatedPage(from = '') {
  if (hasStoredSession()) return true
  uni.reLaunch({ url: buildLoginUrl(from) })
  return false
}
