import { getDefaultTabPath } from '@/utils/defaultLaunchTab.js'
import { fetchJwProfile, parseUserData, submitJwLogin } from '@/services/auth/jwLoginService.js'
import { initializeCaptchaSession, recognizeCaptchaImage } from '@/services/auth/captchaService.js'
import { computeUserKey, persistLoginSession } from '@/services/auth/sessionService.js'
import { ensureRegisteredSession, registerUserWithCookie, startPostLoginSync, syncScoresInBackground } from '@/services/sync/postLoginSyncService.js'
import { isJwLoginExpired } from '@/utils/jwLoginExpired.js'

function buildLoginValidationError(message = '登录状态校验失败，请重试') {
  const error = new Error(message)
  error.isPasswordError = true
  return error
}

function isJwLoginPageHtml(html) {
  if (typeof html !== 'string') return false
  const hasCaptchaField = html.indexOf('RANDOMCODE') !== -1
  const hasLoginInput = html.indexOf('userAccount') !== -1 || html.indexOf('userPassword') !== -1
  return hasCaptchaField && hasLoginInput
}

function hasAuthenticatedProfileMarkers(html, userInfo) {
  if (typeof html !== 'string') return false
  if (html.indexOf('middletopdwxxcont') !== -1) return true
  if (html.indexOf('blue f16 b') !== -1) return true
  if (html.indexOf('main_text main_color') !== -1) return true
  return !!(
    userInfo &&
    userInfo.user &&
    (userInfo.user.name || userInfo.user.unit || userInfo.user.discipline || userInfo.user.class)
  )
}

export async function createCaptchaState() {
  const session = await initializeCaptchaSession()
  return {
    cookieHeader: session.cookieHeader,
    seedScode: session.seedScode,
    seedSxh: session.seedSxh,
    captchaImg: session.captchaImg,
    captchaBase64: session.captchaBase64
  }
}

export async function recognizeCaptcha(base64) {
  return recognizeCaptchaImage(base64)
}

export async function executeLoginFlow(context = {}) {
  const {
    account,
    password,
    captcha,
    cookieHeader,
    seedScode,
    seedSxh,
    maxCaptchaRetries = 3,
    onProgress = () => {},
    refreshCaptcha = null
  } = context

  if (!account || !password || !captcha) throw new Error('请先填写学号、密码和验证码')
  if (!cookieHeader || !seedScode || !seedSxh) throw new Error('验证码已失效，请先刷新验证码')

  let attemptCount = 0
  let activeCaptcha = String(captcha || '').toLowerCase()
  let activeCookie = cookieHeader
  let activeSeedScode = seedScode
  let activeSeedSxh = seedSxh

  while (attemptCount < maxCaptchaRetries) {
    try {
      attemptCount++
      onProgress(`正在登录${attemptCount > 1 ? `（第${attemptCount}次尝试）` : ''}...`)
      await submitJwLogin({
        account,
        password,
        captcha: activeCaptcha,
        cookieHeader: activeCookie,
        seedScode: activeSeedScode,
        seedSxh: activeSeedSxh
      })
      const html = await fetchJwProfile(activeCookie)
      // 1.0.6 / 1.0.8 修复：JW 偶发的"假登录成功"
      //
      // 症状：用户输错密码点登录 → 第一次报"密码错误"是对的；但同样的错密码再点
      // 一次居然就"登录成功"了。
      //
      // 根因：submitJwLogin 只检查响应里有没有"密码错误"字样，没有就当成功。但
      // JW 在某些边界状态（连续两次错误密码、session 状态机被搞糊涂）会返回
      // 不含错误字样的响应（可能是 302 或别的格式），submitJwLogin 错误地认为
      // 登录成功，但实际上 cookie 并没有真正登录。后续 fetchJwProfile 拿这个
      // 没登录的 cookie 去请求时，JW 会返回登录页 HTML 而不是真正的用户主页，
      // parseUserData 从登录页 HTML 里解析不出用户名，但流程还是继续走完，
      // persistLoginSession 把假登录态写入了本地。
      //
      // 修复：通过登录表单的特征字段（RANDOMCODE 验证码字段名 + userAccount/
      // userPassword 输入框名）检测 fetchJwProfile 是否返回了登录页 HTML。
      // 这两个字段同时出现，几乎只可能是登录页本身。
      if (typeof html === 'string' && (isJwLoginPageHtml(html) || isJwLoginExpired(html))) {
        console.warn('[login] fetchJwProfile 返回了未登录页面，判定为假登录成功并拒绝落本地登录态')
        throw buildLoginValidationError('账号、密码或验证码错误，请重试')
      }
      const userInfo = parseUserData(html)
      if (!hasAuthenticatedProfileMarkers(html, userInfo)) {
        console.warn('[login] fetchJwProfile 未命中任何已登录主页特征，按登录失败处理。HTML 长度:', typeof html === 'string' ? html.length : 'N/A')
        throw buildLoginValidationError('教务登录状态校验失败，请刷新验证码后重试')
      }
      const userKey = computeUserKey(account, password)
      persistLoginSession({
        cookieHeader: activeCookie,
        userId: account,
        userPassword: password,
        userInfo,
        userKey,
        userType: 1
      })
      const registeredUserKey = await registerUserWithCookie({
        userId: account,
        userPassword: password,
        userCookie: activeCookie,
        userInfo
      }).catch(err => {
        console.error('autoRegisterUser 失败:', err)
        return ''
      })
      if (!registeredUserKey) {
        await ensureRegisteredSession()
      }
      const stableUserKey = uni.getStorageSync('userKey') || registeredUserKey || userKey
      if (stableUserKey) uni.setStorageSync('userKey', stableUserKey)
      onProgress('登录成功，后台同步中...')
      startPostLoginSync({ cookieHeader: activeCookie }).catch(err => console.warn('登录后后台同步失败:', err))
      syncScoresInBackground(stableUserKey)
      return {
        userInfo,
        cookieHeader: activeCookie,
        userKey: stableUserKey,
        redirectPath: getDefaultTabPath()
      }
    } catch (error) {
      if (error && error.isCaptchaError && attemptCount < maxCaptchaRetries && typeof refreshCaptcha === 'function') {
        onProgress(`验证码错误，正在刷新并重新识别（第${attemptCount + 1}次）...`)
        const refreshed = await refreshCaptcha()
        if (!refreshed) continue
        activeCookie = refreshed.cookieHeader || activeCookie
        activeSeedScode = refreshed.seedScode || activeSeedScode
        activeSeedSxh = refreshed.seedSxh || activeSeedSxh
        activeCaptcha = refreshed.captcha || activeCaptcha
        continue
      }
      throw error
    }
  }

  throw new Error(`验证码识别失败，已重试${maxCaptchaRetries}次`)
}
