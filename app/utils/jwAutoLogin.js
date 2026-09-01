/**
 * 教务系统自动登录工具
 * 当 Cookie 过期时，自动使用本地保存的账号密码重新登录
 */

import { postJson } from './api.js'
import { setAppGlobal } from './appGlobalStorage.js'

const BASE_URL = 'http://jw.sdufe.edu.cn'
const DEFAULT_MAX_RETRIES = 3

/**
 * 从响应头中提取 Cookie
 */
function extractCookie(header) {
	if (!header) return ''
	const setCookie = getHeader(header, 'set-cookie')
	if (!setCookie) return ''
	const list = Array.isArray(setCookie) ? setCookie : [setCookie]
	const cookies = []
	for (let i = 0; i < list.length; i++) {
		const pair = String(list[i]).split(';')[0]
		if (pair) cookies.push(pair.trim())
	}
	return cookies.join('; ')
}

/**
 * 获取响应头（不区分大小写）
 */
function getHeader(header, key) {
	if (!header) return ''
	if (header[key]) return header[key]
	const lower = key.toLowerCase()
	const keys = Object.keys(header)
	for (let i = 0; i < keys.length; i++) {
		if (keys[i].toLowerCase() === lower) return header[keys[i]]
	}
	return ''
}

/**
 * HTTP 请求封装
 */
function request(url, method, data, header, responseType) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method,
			data,
			header: header || {},
			dataType: 'text',
			responseType: responseType || 'text',
			withCredentials: false,
			timeout: 15000,
			success: resolve,
			fail: reject
		})
	})
}

/**
 * 计算加密密码
 */
function computeEncoded(account, password, seedScode, seedSxh) {
	if (!account || !password || !seedScode || !seedSxh) return ''
	let scode = seedScode
	const sxh = seedSxh
	const code = `${account}%%%${password}`
	let encoded = ''
	for (let i = 0; i < code.length; i++) {
		if (i < 20) {
			const n = parseInt(sxh.substring(i, i + 1), 10)
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

/**
 * 将键值对转换为表单数据
 */
function toFormDataCustom(pairs) {
	return pairs
		.map(([key, value, encode]) => {
			const k = encodeURIComponent(key)
			const v = encode ? encodeURIComponent(value) : String(value)
			return `${k}=${v}`
		})
		.join('&')
}

/**
 * 使用 ddddocr 识别验证码
 */
async function recognizeCaptcha(imageBase64) {
	if (!imageBase64 || typeof imageBase64 !== 'string') {
		throw new Error('Base64数据无效')
	}
	let pureBase64 = imageBase64
	if (pureBase64.includes(',')) {
		pureBase64 = pureBase64.split(',')[1] || pureBase64
	}
	const res = await postJson('App.Captcha.Recognize', { image_base64: pureBase64 })
	if (res.result) {
		return (res.result || '').toLowerCase()
	}
	if (res.error) {
		throw new Error(res.error)
	}
	throw new Error('识别失败：未知错误')
}

/**
 * Step 1: 获取会话种子和 Cookie
 */
async function step1GetSeed() {
	const url = `${BASE_URL}/Logon.do?method=logon&flag=sess`
	const headers = {
		'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
		Accept: '*/*',
		Host: 'jw.sdufe.edu.cn',
		Connection: 'keep-alive',
		Cookie: ''
	}
	const res = await request(url, 'POST', null, headers)
	const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
	const parts = body.trim().split('#')
	if (parts.length < 2) {
		throw new Error('获取会话种子失败')
	}
	const seedScode = parts[0] || ''
	const seedSxh = parts[1] || ''
	const cookieHeader = extractCookie(res.header)
	if (!cookieHeader) {
		throw new Error('获取 Cookie 失败')
	}
	return { seedScode, seedSxh, cookieHeader }
}

/**
 * Step 2: 获取验证码
 */
async function step2FetchCaptcha(cookieHeader) {
	if (!cookieHeader) {
		throw new Error('缺少 Cookie，请先获取会话种子')
	}
	const url = `${BASE_URL}/verifycode.servlet`
	const headers = {
		Cookie: cookieHeader,
		'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
		Accept: '*/*',
		Host: 'jw.sdufe.edu.cn',
		Connection: 'keep-alive'
	}
	const res = await request(url, 'GET', null, headers, 'arraybuffer')
	if (!res || !res.data) {
		throw new Error('验证码响应为空')
	}
	const base64 = uni.arrayBufferToBase64(res.data)
	return base64
}

/**
 * Step 3: 提交登录
 */
async function step3Login(account, password, captcha, cookieHeader, seedScode, seedSxh) {
	if (!cookieHeader) {
		throw new Error('缺少 Cookie，请先获取会话种子')
	}
	const encoded = computeEncoded(account, password, seedScode, seedSxh)
	if (!encoded) {
		throw new Error('登录参数计算失败，请重试')
	}
	const url = `${BASE_URL}/Logon.do?method=logon`
	const headers = {
		Origin: BASE_URL,
		Referer: `${BASE_URL}/`,
		Cookie: cookieHeader,
		'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
		'Content-Type': 'application/x-www-form-urlencoded',
		Accept: '*/*',
		Host: 'jw.sdufe.edu.cn',
		Connection: 'keep-alive'
	}
	const body = toFormDataCustom([
		['userAccount', account, true],
		['userPassword', password, true],
		['RANDOMCODE', captcha, true],
		['encoded', encoded, true]
	])
	const res = await request(url, 'POST', body, headers)
	const responseBody = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
	if (responseBody && typeof responseBody === 'string') {
		if (responseBody.indexOf('验证码错误') !== -1) {
			const e = new Error('验证码错误')
			e.isCaptchaError = true
			throw e
		}
		if (responseBody.indexOf('密码错误') !== -1) {
			const e = new Error('账号或密码错误')
			e.isPasswordError = true
			throw e
		}
	}
}

/**
 * Step 4: 获取个人主页确认登录成功
 */
async function step4FetchProfile(cookieHeader) {
	if (!cookieHeader) {
		throw new Error('缺少 Cookie，请先完成登录')
	}
	const url = `${BASE_URL}/jsxsd/framework/xsMain_new.jsp`
	const headers = {
		Cookie: cookieHeader,
		'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
		Accept: '*/*',
		Host: 'jw.sdufe.edu.cn',
		Connection: 'keep-alive'
	}
	const res = await request(url, 'GET', null, headers)
	const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
	// 检查是否登录成功（个人主页应包含特定内容，而不是登录页）
	if (html.includes('用户登录') || html.includes('请先登录') || (html.length < 5000 && html.includes('</html>'))) {
		throw new Error('登录失败：返回登录页面')
	}
	return html
}

/**
 * 自动登录教务系统
 * @param {Object} options - 配置选项
 * @param {Function} options.onProgress - 进度回调，如 (msg) => {}
 * @param {number} options.maxRetries - 验证码识别最大重试次数，默认3
 * @returns {Promise<string>} 返回登录后的 Cookie
 * @throws {Error} 登录失败时抛出错误
 */
export async function autoLoginJw(options = {}) {
	const { onProgress = () => {}, maxRetries = DEFAULT_MAX_RETRIES } = options
	
	// 从本地存储读取账号密码
	const userId = uni.getStorageSync('userId')
	const userPassword = uni.getStorageSync('userPassword')
	
	if (!userId || !userPassword) {
		throw new Error('未找到保存的账号密码，请先手动登录')
	}
	
	onProgress('正在获取会话种子...')
	const { seedScode, seedSxh, cookieHeader: initialCookie } = await step1GetSeed()
	
	let cookieHeader = initialCookie
	let attemptCount = 0
	let lastError = null
	
	while (attemptCount < maxRetries) {
		try {
			attemptCount++
			if (attemptCount > 1) {
				onProgress(`正在刷新验证码并重新识别（第${attemptCount}次）...`)
				// 重新获取验证码需要重新获取种子和 Cookie
				const seedResult = await step1GetSeed()
				cookieHeader = seedResult.cookieHeader
			} else {
				onProgress('正在获取验证码...')
			}
			
			const captchaBase64 = await step2FetchCaptcha(cookieHeader)
			
			onProgress('正在识别验证码...')
			let captcha
			try {
				captcha = await recognizeCaptcha(captchaBase64)
			} catch (err) {
				onProgress('验证码识别失败，正在重试...')
				if (attemptCount < maxRetries) {
					await new Promise(r => setTimeout(r, 500))
					continue
				}
				throw new Error(`验证码识别失败：${err.message || '未知错误'}`)
			}
			
			if (!captcha) {
				if (attemptCount < maxRetries) {
					await new Promise(r => setTimeout(r, 500))
					continue
				}
				throw new Error('验证码识别结果为空')
			}
			
			onProgress(`正在登录${attemptCount > 1 ? `（第${attemptCount}次尝试）` : ''}...`)
			try {
				await step3Login(userId, userPassword, captcha, cookieHeader, seedScode, seedSxh)
			} catch (err) {
				if (err.isCaptchaError && attemptCount < maxRetries) {
					lastError = err
					await new Promise(r => setTimeout(r, 500))
					continue
				}
				throw err
			}
			
			onProgress('正在确认登录状态...')
			await step4FetchProfile(cookieHeader)
			
			// 登录成功，更新全局 Cookie
			const app = getApp()
			if (app && app.globalData) {
				app.globalData.globalCookie = cookieHeader
			}
			setAppGlobal('globalCookie', cookieHeader)
			uni.setStorageSync('loginCookie', cookieHeader)
			
			onProgress('登录成功')
			return cookieHeader
			
		} catch (err) {
			lastError = err
			if (err.isCaptchaError && attemptCount < maxRetries) {
				// 验证码错误，继续重试
				continue
			}
			// 其他错误或达到最大重试次数，抛出错误
			if (attemptCount >= maxRetries && err.isCaptchaError) {
				throw new Error(`验证码识别失败，已重试${maxRetries}次`)
			}
			throw err
		}
	}
	
	// 达到最大重试次数
	if (lastError) {
		throw lastError
	}
	throw new Error(`登录失败，已重试${maxRetries}次`)
}
