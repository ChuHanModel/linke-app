/** 启动后默认进入的 tab：index 首页 / form 课程表 */

const STORAGE_KEY = 'defaultLaunchTab'
const VALID_VALUES = ['index', 'form']

export function getDefaultLaunchTab() {
	try {
		const v = uni.getStorageSync(STORAGE_KEY)
		return VALID_VALUES.includes(v) ? v : 'index'
	} catch (e) {
		return 'index'
	}
}

export function getDefaultTabPath() {
	const tab = getDefaultLaunchTab()
	return tab === 'form' ? '/pages/form/form' : '/pages/index/index'
}

export function setDefaultLaunchTab(value) {
	if (!VALID_VALUES.includes(value)) value = 'index'
	uni.setStorageSync(STORAGE_KEY, value)
}
