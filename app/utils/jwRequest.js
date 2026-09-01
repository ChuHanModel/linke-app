/**
 * 教务请求统一封装：无 Cookie 提示、登录过期时自动重登一次并重试，密码错误时清理会话并抛出
 */
import { isJwLoginExpired } from '@/utils/jwLoginExpired.js'
import { autoLoginJw } from '@/utils/jwAutoLogin.js'
import { setAppGlobal } from '@/utils/appGlobalStorage.js'

/**
 * 规范化 Cookie 头（与各 loader 保持一致）
 */
export function getCookieHeader(cookieHeader) {
	if (!cookieHeader) return ''
	if (typeof cookieHeader !== 'string') return ''
	if (cookieHeader.indexOf('JSESSIONID=') === 0) return cookieHeader
	return 'JSESSIONID=' + cookieHeader
}

/**
 * 清除教务登录态，使各页一致显示「未登录」
 */
export function clearJwSession() {
	uni.removeStorageSync('userPassword')
	uni.removeStorageSync('loginCookie')
	setAppGlobal('globalCookie', '')
	try {
		const app = getApp()
		if (app && app.globalData) app.globalData.globalCookie = ''
	} catch (e) {}
}

/**
 * 发起教务请求；若返回为登录页则尝试自动登录后重试一次
 * @param {string} cookie - 当前 Cookie（可为空，则直接抛「请先完成教务登录」）
 * @param {string} url - 请求 URL
 * @param {string} method - GET / POST
 * @param {string|object|null} data - 请求体
 * @param {object} extraHeaders - 额外请求头（不含 Cookie，由本函数统一设置）
 * @param {string} responseType - 可选，如 'arraybuffer'
 * @param {function} onProgress - 可选，自动登录时的进度回调 (msg) => {}
 * @returns {Promise<{ data, statusCode, header }>}
 */
export function requestJw(cookie, url, method, data, extraHeaders = {}, responseType, onProgress) {
	const normalized = getCookieHeader(cookie)
	if (!normalized) throw new Error('请先完成教务登录')

	const header = { ...extraHeaders, Cookie: normalized }

	function doRequest(useCookie) {
		const h = useCookie ? { ...extraHeaders, Cookie: getCookieHeader(useCookie) } : header
		return new Promise((resolve, reject) => {
			uni.request({
				url,
				method,
				data,
				header: h,
				dataType: 'text',
				responseType: responseType || 'text',
				withCredentials: false,
				timeout: 20000,
				success: resolve,
				fail: reject
			})
		})
	}

	return doRequest(cookie).then(res => {
		const html = (res && res.data != null) ? (typeof res.data === 'string' ? res.data : '') : ''
		if (!isJwLoginExpired(html)) return res

		// 返回的是登录页 → 尝试自动重新登录并重试一次
		return Promise.resolve()
			.then(() => autoLoginJw({ onProgress: onProgress || (() => {}), maxRetries: 3 }))
			.then(newCookie => {
				return doRequest(newCookie).then(retryRes => {
					const retryHtml = (retryRes && retryRes.data != null) ? (typeof retryRes.data === 'string' ? retryRes.data : '') : ''
					if (isJwLoginExpired(retryHtml)) throw new Error('登录已过期，请重新登录')
					return retryRes
				})
			})
			.catch(err => {
				const isPasswordError = !!(err && (err.isPasswordError || (err.message && (err.message.indexOf('密码错误') !== -1 || err.message.indexOf('账号或密码错误') !== -1))))
				if (isPasswordError) {
					clearJwSession()
					const e = new Error(err.message || '密码已更改，请重新登录')
					e.isPasswordError = true
					throw e
				}
				throw new Error(err.message || '登录已过期，请重新登录')
			})
	})
}
