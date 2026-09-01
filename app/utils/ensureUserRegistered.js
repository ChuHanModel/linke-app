/**
 * userKey = md5(账号+密码)，前端、后端算法一致。
 * 但后端会用 userKey 查 user 表，表里没有对应用户就报「用户密钥错误」，
 * 所以必须先调 RegisterWithCookie 把当前用户写进 user 表。
 * 本方法：若已教务登录（有 loginCookie + userId + userPassword）则调一次 RegisterWithCookie，幂等。
 */
import { post } from '@/utils/api.js'

let registeredInSession = false

export async function ensureUserRegistered() {
	if (registeredInSession) return true
	try {
		const loginCookie = uni.getStorageSync('loginCookie')
		const userId = uni.getStorageSync('userId')
		const userPassword = uni.getStorageSync('userPassword')
		if (!loginCookie || !userId || !userPassword) return
		const res = await post('App.User.RegisterWithCookie', {
			userId,
			userPassword,
			userCookie: loginCookie
		}, {
			dedupeKey: `user_register:${String(userId).trim()}`,
			retryCount: 2,
			retryDelay: 500
		})
		if (res && res.userKey) {
			uni.setStorageSync('userKey', res.userKey)
			const app = getApp()
			if (app && app.globalData && app.globalData.userData) {
				app.globalData.userData.userKey = res.userKey
			}
			console.log('ensureUserRegistered: 已同步 userKey（md5(账号+密码)）')
			registeredInSession = true
			return true
		}
		return false
	} catch (e) {
		const msg = (e && (e.message || e)) ? String(e.message || e) : ''
		console.warn('ensureUserRegistered: RegisterWithCookie 失败，后续可能报用户密钥错误', msg, e)
		return false
	}
}
