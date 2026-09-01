import { createSSRApp } from 'vue'
import App from './App.vue'
import { themeMode, applyNativeBackground } from '@/utils/darkMode.js'

// 页面路径 → 浅色模式背景色映射（深色模式统一 #0F1117）
const PAGE_BG_MAP = {
	'pages/index/index': '#f3f5f9',
	'pages/form/form': '#ffffff'
}
const DEFAULT_LIGHT_BG = '#F8FAFC'

function applyBgToWebview(p) {
	if (!p || !p.$getAppWebview) return
	const wv = p.$getAppWebview()
	if (!wv) return
	let bg
	if (themeMode.value === 'dark') {
		bg = '#0F1117'
	} else {
		const route = p.route || ''
		bg = PAGE_BG_MAP[route] || DEFAULT_LIGHT_BG
	}
	wv.setStyle({ background: bg, backgroundColorTop: bg, backgroundColorBottom: bg })
}

function setCurrentPageBg() {
	// #ifdef APP-PLUS
	try {
		const pages = getCurrentPages()
		const p = pages[pages.length - 1]
		applyBgToWebview(p)
		// 延迟重试，确保 webview 切换完成后也生效
		setTimeout(() => {
			try {
				const pages2 = getCurrentPages()
				const p2 = pages2[pages2.length - 1]
				applyBgToWebview(p2)
			} catch (e) {}
		}, 50)
	} catch (e) {}
	// #endif
}

export function createApp() {
	const app = createSSRApp(App)

	app.mixin({
		computed: {
			themeClass() {
				return themeMode.value === 'dark' ? 'theme-dark' : ''
			}
		},
		onLoad() {
			setCurrentPageBg()
		},
		onShow() {
			setCurrentPageBg()
		}
	})

	return {
		app
	}
}