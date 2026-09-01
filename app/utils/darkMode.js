/** 深色模式管理 */
import { ref } from 'vue'

const STORAGE_KEY = 'darkMode'

function readStored() {
	try {
		return uni.getStorageSync(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
	} catch (e) {
		return 'light'
	}
}

export const themeMode = ref(readStored())

export function isDark() {
	return themeMode.value === 'dark'
}

export function setDarkMode(value) {
	const mode = (value === 'dark' || value === true) ? 'dark' : 'light'
	themeMode.value = mode
	uni.setStorageSync(STORAGE_KEY, mode)
	// 立即更新所有已打开页面的原生 webview 背景色
	applyNativeBackground()
}

/** 更新所有已打开页面的原生 webview 背景色（解决 overscroll 漏底色） */
export function applyNativeBackground() {
	// #ifdef APP-PLUS
	try {
		const dark = themeMode.value === 'dark'
		const bg = dark ? '#0F1117' : '#F8FAFC'
		const allPages = getCurrentPages()
		for (const p of allPages) {
			if (p && p.$getAppWebview) {
				const wv = p.$getAppWebview()
				if (wv) wv.setStyle({ background: bg, backgroundColorTop: bg, backgroundColorBottom: bg })
			}
		}
		// 切换系统状态栏文字颜色：深色模式用浅色文字，浅色模式用深色文字
		plus.navigator.setStatusBarStyle(dark ? 'light' : 'dark')
	} catch (e) {}
	// #endif
}

export function toggleDarkMode() {
	setDarkMode(isDark() ? 'light' : 'dark')
}
