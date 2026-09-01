<template>
	<view class="launch-page" :class="themeClass"></view>
</template>

<script>
import { getStoredSession } from '@/services/auth/loginFlowService.js'
import { getDefaultTabPath } from '@/utils/defaultLaunchTab.js'

export default {
	onLoad() {
		const session = getStoredSession()
		if (session.loginCookie && session.userKey) {
			// 已登录：跳转到用户设置的默认页（通选课或课程表）
			uni.switchTab({ url: getDefaultTabPath() })
		} else {
			// 未登录：跳转到登录页
			uni.redirectTo({ url: '/pages/login/login' })
		}
	}
}
</script>

<style scoped>
.launch-page {
	background: var(--color-bg-page-alt);
	width: 100vw;
	height: 100vh;
}
</style>
