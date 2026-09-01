<template>
	<view class="page" :class="themeClass">
		<web-view v-if="url" :src="url" @error="onError"></web-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			url: ''
		}
	},
	onLoad(options) {
		const title = options.title ? decodeURIComponent(options.title) : ''
		if (title) {
			uni.setNavigationBarTitle({ title })
		}
		const u = options.url || options.u || ''
		this.url = decodeURIComponent(u)
		if (!this.url || (!this.url.startsWith('http://') && !this.url.startsWith('https://'))) {
			uni.showToast({ title: '链接无效', icon: 'none' })
		}
	},
	methods: {
		onError(e) {
			uni.showToast({ title: '加载失败', icon: 'none' })
		}
	}
}
</script>

<style scoped>
.page { width: 100%; height: 100vh; }
</style>
