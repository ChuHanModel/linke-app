import { APP_SERVICES } from '@/constants/services.js'
import { postJson } from '@/repositories/appApi.js'
import { JW_BASE_URL, extractCookie, requestJwHttp } from '@/repositories/jwHttp.js'

export async function getCaptchaSeedSession() {
  const res = await requestJwHttp(
    `${JW_BASE_URL}/Logon.do?method=logon&flag=sess`,
    'POST',
    null,
    {
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
      Accept: '*/*',
      Host: 'jw.sdufe.edu.cn',
      Connection: 'keep-alive',
      Cookie: ''
    },
    'text',
    { errorMessage: '获取会话种子失败' }
  )
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  const parts = String(body || '').trim().split('#')
  if (parts.length < 2) {
    throw new Error('获取会话种子失败')
  }
  const cookieHeader = extractCookie(res.header)
  if (!cookieHeader) {
    throw new Error('获取 Cookie 失败')
  }
  return {
    seedScode: parts[0] || '',
    seedSxh: parts[1] || '',
    cookieHeader
  }
}

export async function fetchCaptchaImage(cookieHeader) {
  const res = await requestJwHttp(
    `${JW_BASE_URL}/verifycode.servlet`,
    'GET',
    null,
    {
      Cookie: cookieHeader,
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
      Accept: '*/*',
      Host: 'jw.sdufe.edu.cn',
      Connection: 'keep-alive'
    },
    'arraybuffer',
    { errorMessage: '获取验证码失败' }
  )
  if (!res || !res.data) throw new Error('验证码响应为空')
  const base64 = uni.arrayBufferToBase64(res.data)
  return {
    base64,
    imageUrl: `data:image/jpeg;base64,${base64}`
  }
}

export async function recognizeCaptchaImage(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Base64数据无效')
  }
  const pureBase64 = imageBase64.includes(',') ? (imageBase64.split(',')[1] || imageBase64) : imageBase64
  return postJson(APP_SERVICES.captchaRecognize, { image_base64: pureBase64 })
}

export async function initializeCaptchaSession() {
  const session = await getCaptchaSeedSession()
  const captcha = await fetchCaptchaImage(session.cookieHeader)
  return {
    ...session,
    captchaBase64: captcha.base64,
    captchaImg: captcha.imageUrl
  }
}
