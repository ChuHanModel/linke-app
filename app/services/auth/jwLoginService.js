import { JW_BASE_URL, requestJwHttp, toFormDataCustom } from '@/repositories/jwHttp.js'

export function computeEncoded(account, password, seedScode, seedSxh) {
  if (!account || !password || !seedScode || !seedSxh) return ''
  let scode = seedScode
  const code = `${account}%%%${password}`
  let encoded = ''
  for (let i = 0; i < code.length; i++) {
    if (i < 20) {
      const n = parseInt(seedSxh.substring(i, i + 1), 10)
      const take = Number.isNaN(n) ? 0 : n
      encoded += code.substring(i, i + 1) + scode.substring(0, take)
      scode = scode.substring(take, scode.length)
    } else {
      encoded += code.substring(i, code.length)
      break
    }
  }
  return encoded
}

export async function submitJwLogin({ account, password, captcha, cookieHeader, seedScode, seedSxh }) {
  if (!cookieHeader) throw new Error('缺少 Cookie，请先获取会话种子')
  const encoded = computeEncoded(account, password, seedScode, seedSxh)
  if (!encoded) throw new Error('登录参数计算失败，请重试')
  const res = await requestJwHttp(
    `${JW_BASE_URL}/Logon.do?method=logon`,
    'POST',
    toFormDataCustom([
      ['userAccount', account, true],
      ['userPassword', password, true],
      ['RANDOMCODE', captcha, true],
      ['encoded', encoded, true]
    ]),
    {
      Origin: JW_BASE_URL,
      Referer: `${JW_BASE_URL}/`,
      Cookie: cookieHeader,
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
      Host: 'jw.sdufe.edu.cn',
      Connection: 'keep-alive'
    },
    'text',
    { errorMessage: '登录失败' }
  )
  const responseBody = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  if (responseBody.indexOf('验证码错误') !== -1) {
    const error = new Error('验证码错误')
    error.isCaptchaError = true
    throw error
  }
  if (responseBody.indexOf('密码错误') !== -1) {
    const error = new Error('账号或密码错误')
    error.isPasswordError = true
    throw error
  }
  return res
}

export async function fetchJwProfile(cookieHeader) {
  const res = await requestJwHttp(
    `${JW_BASE_URL}/jsxsd/framework/xsMain_new.jsp`,
    'GET',
    null,
    {
      Cookie: cookieHeader,
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
      Accept: '*/*',
      Host: 'jw.sdufe.edu.cn',
      Connection: 'keep-alive'
    },
    'text',
    { errorMessage: '获取个人主页失败' }
  )
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
}

export function parseUserData(html) {
  if (!html || typeof html !== 'string') {
    return { user: { name: '', unit: '', discipline: '', class: '' } }
  }
  const nameMatch = html.match(/<span class="blue f16 b">(.*?)<\/span>/)
  const name = nameMatch ? nameMatch[1] : ''
  const userMatches = html.matchAll(/middletopdwxxcont">(.*?)<\/div>/g)
  const userData = Array.from(userMatches).map(match => match[1])
  if (userData.length < 3) {
    return { user: { name: name || '', unit: '', discipline: '', class: '' } }
  }
  return {
    user: {
      name: name || '',
      unit: userData[0] || '',
      discipline: userData[1] || '',
      class: userData[2] || ''
    }
  }
}
