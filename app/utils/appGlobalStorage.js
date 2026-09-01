/**
 * 与 login 登录成功后写入的 app 全局变量同步到本地存储，并支持「先读 globalData，没有再读本地」。
 * - 写入：setAppGlobal(key, value) 同时写入 app.globalData 与 uni 本地存储
 * - 读取：getAppGlobal(key) 优先返回 app.globalData[key]，没有则从本地存储取
 * - 启动恢复：restoreToGlobalData() 在 App.onLaunch 中调用，把本地存储恢复到 globalData
 */

const STORAGE_PREFIX = 'app_global_'

/**
 * 从本地存储取出的值可能是 JSON 字符串（部分平台行为），统一规范为对象/数组/原始值
 */
function normalizeStorageValue(v) {
	if (v === undefined || v === null || v === '') return v
	if (typeof v === 'string') {
		const t = v.trim()
		if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
			try {
				return JSON.parse(v)
			} catch (e) {}
		}
	}
	return v
}

/** 需要持久化到本地的 globalData 键名（与 login/loaders 写入的保持一致） */
const PERSIST_KEYS = [
	'globalCookie',
	'userData',
	'globalScheduleTerm',
	'globalSchedulePyfaTermList',
	'globalScheduleCache',
	'globalScheduleStartWeek',
	'globalScheduleEndWeek',
	'globalScheduleCurrentWeek',
	'globalScheduleGrid',
	'globalScheduleIsHoliday',
	'globalTermStartDate',
	'globalTermEndDate',
	'globalJwTermList',
	'evaluatedCourses',
	'evaluatedCourseMap',
	'allCourses',
	'evaluatedCourseIds',
	'globalCreditParsed'
]

/**
 * 写入 app 全局变量并同步到本地存储
 * @param {string} key - globalData 的键名（如 'globalCookie', 'userData'）
 * @param {*} value - 任意可序列化值（对象会 JSON 存，取时需同构）
 */
function setAppGlobal(key, value) {
	try {
		const app = getApp()
		if (app && app.globalData && key) {
			app.globalData[key] = value
		}
	} catch (e) {
		// getApp 可能尚未就绪
	}
	try {
		const storageKey = STORAGE_PREFIX + key
		if (value === undefined || value === null) {
			uni.removeStorageSync(storageKey)
		} else {
			uni.setStorageSync(storageKey, value)
		}
	} catch (e) {
		console.warn('appGlobalStorage setAppGlobal 写入本地失败:', key, e)
	}
}

/**
 * 读取：优先 app.globalData[key]，没有再从本地存储取（其他页面用此方法则自动带本地回退）
 * @param {string} key - globalData 的键名
 * @returns {*} 值或 undefined
 */
function getAppGlobal(key) {
	try {
		const app = getApp()
		if (app && app.globalData && app.globalData[key] !== undefined && app.globalData[key] !== null) {
			return app.globalData[key]
		}
	} catch (e) {}
	try {
		const v = uni.getStorageSync(STORAGE_PREFIX + key)
		const normalized = normalizeStorageValue(v)
		return normalized !== undefined && normalized !== null ? normalized : undefined
	} catch (e) {
		return undefined
	}
}

/**
 * 将本地存储中已保存的全局变量恢复到 app.globalData（在 App.onLaunch 中调用）
 */
function restoreToGlobalData() {
	try {
		const app = getApp()
		if (!app || !app.globalData) return
		for (const key of PERSIST_KEYS) {
			try {
				const v = uni.getStorageSync(STORAGE_PREFIX + key)
				const normalized = normalizeStorageValue(v)
				// 仅在有值时恢复，避免未写入的 key 被平台返回 '' 而覆盖初始值；支持存储值为 JSON 字符串的平台
				if (normalized !== undefined && normalized !== null && (normalized !== '' || (typeof normalized === 'object' && normalized !== null))) {
					app.globalData[key] = normalized
				}
			} catch (e) {}
		}
	} catch (e) {
		console.warn('appGlobalStorage restoreToGlobalData 失败:', e)
	}
}

/**
 * 清除所有持久化的全局变量（登出时可选调用，与 me 页清空 globalData 配合）
 */
function clearAppGlobalStorage() {
	try {
		for (const key of PERSIST_KEYS) {
			uni.removeStorageSync(STORAGE_PREFIX + key)
		}
	} catch (e) {
		console.warn('appGlobalStorage clearAppGlobalStorage 失败:', e)
	}
}

export default {
	setAppGlobal,
	getAppGlobal,
	restoreToGlobalData,
	clearAppGlobalStorage,
	PERSIST_KEYS,
	STORAGE_PREFIX
}

export { setAppGlobal, getAppGlobal, restoreToGlobalData, clearAppGlobalStorage, PERSIST_KEYS, STORAGE_PREFIX }
