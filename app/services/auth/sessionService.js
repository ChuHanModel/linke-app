import md5 from '@/utils/md5.js'
import { setAppGlobal, clearAppGlobalStorage } from '@/utils/appGlobalStorage.js'

function updateAppUserData(patch = {}) {
  try {
    const app = getApp()
    if (!app || !app.globalData) return
    if (!app.globalData.userData) app.globalData.userData = {}
    app.globalData.userData = {
      ...app.globalData.userData,
      ...patch
    }
  } catch (e) {}
}

export function computeUserKey(userId, userPassword) {
  if (!userId || !userPassword) return ''
  return md5.hexMD5(String(userId) + String(userPassword))
}

export function getStoredSession() {
  const loginCookie = uni.getStorageSync('loginCookie')
  const userId = uni.getStorageSync('userId')
  const userPassword = uni.getStorageSync('userPassword')
  const userInfo = uni.getStorageSync('userInfo')
  const userKey = uni.getStorageSync('userKey') || computeUserKey(userId, userPassword)
  const userType = uni.getStorageSync('userType') || 0
  return { loginCookie, userId, userPassword, userInfo, userKey, userType }
}

export function hasStoredSession() {
  const loginCookie = uni.getStorageSync('loginCookie')
  const storedUserKey = uni.getStorageSync('userKey')
  const isLoggedIn = uni.getStorageSync('isLoggedIn')
  return !!(isLoggedIn && loginCookie && storedUserKey)
}

export function persistLoginSession({ cookieHeader, userId, userPassword, userInfo, userKey, userType }) {
  const finalUserKey = userKey || computeUserKey(userId, userPassword)
  uni.setStorageSync('isLoggedIn', true)
  uni.setStorageSync('loginCookie', cookieHeader || '')
  uni.setStorageSync('userId', userId || '')
  uni.setStorageSync('userPassword', userPassword || '')
  if (userInfo) uni.setStorageSync('userInfo', userInfo)
  if (finalUserKey) uni.setStorageSync('userKey', finalUserKey)
  if (userType) uni.setStorageSync('userType', userType)
  setAppGlobal('globalCookie', cookieHeader || '')
  updateAppUserData({
    userId: userId || '',
    userPassword: userPassword || '',
    userKey: finalUserKey || '',
    userInfo: userInfo || '',
    userType: userType || 1
  })
  return finalUserKey
}

export function persistCookie(cookieHeader) {
  if (!cookieHeader) return
  uni.setStorageSync('loginCookie', cookieHeader)
  setAppGlobal('globalCookie', cookieHeader)
  try {
    const app = getApp()
    if (app && app.globalData) app.globalData.globalCookie = cookieHeader
  } catch (e) {}
}

export function clearSession() {
  uni.removeStorageSync('isLoggedIn')
  uni.removeStorageSync('loginCookie')
  uni.removeStorageSync('userId')
  uni.removeStorageSync('userPassword')
  uni.removeStorageSync('userKey')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('userType')
  setAppGlobal('globalCookie', '')
  clearAppGlobalStorage()
  updateAppUserData({
    userId: '',
    userPassword: '',
    userKey: '',
    userInfo: '',
    userType: 0
  })
}

/**
 * 清除登录态但保留账号密码。
 * 用于 wgt 更新后强制重新登录的场景：把 loginCookie / userKey / userInfo / 缓存的课表
 * 等业务状态全部清掉，但保留 userId 和 userPassword，这样用户打开登录页时表单会自动
 * 预填好账号和密码，直接点登录就能重新登录（验证码会自动识别），体验比"全清"温和。
 */
export function clearSessionKeepCredentials() {
  uni.removeStorageSync('isLoggedIn')
  uni.removeStorageSync('loginCookie')
  uni.removeStorageSync('userKey')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('userType')
  // 注意：不动 userId 和 userPassword
  setAppGlobal('globalCookie', '')
  clearAppGlobalStorage()
  updateAppUserData({
    userKey: '',
    userInfo: '',
    userType: 0
  })
}

/**
 * 彻底清空本地所有存储（含账号密码、缓存、调试标记等），回到首次安装状态。
 * 用于登录页的"一键清除本地用户信息"按钮。
 */
export function clearAllUserData() {
  try {
    uni.clearStorageSync()
  } catch (e) {
    // 兜底：如果 clearStorageSync 不支持，降级到单独 removeStorageSync 关键 key
    console.warn('clearAllUserData: uni.clearStorageSync 失败，降级清理', e)
    clearSession()
  }
  setAppGlobal('globalCookie', '')
  updateAppUserData({
    userId: '',
    userPassword: '',
    userKey: '',
    userInfo: '',
    userType: 0
  })
}

export function getUserType() {
  return uni.getStorageSync('userType') || 0
}

export function isJwUser() {
  return getUserType() === 1
}
