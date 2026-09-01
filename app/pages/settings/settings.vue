<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">设置</text>
			</view>
		</view>

		<view class="page-content">
			<view class="menu-card">
				<view class="menu-item menu-item-switch">
					<text class="menu-label">深色模式</text>
					<switch :checked="darkModeOn" @change="onDarkModeChange" color="#1E3A8A" />
				</view>
			</view>

			<view class="menu-card">
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="setLaunchTab('index')">
					<view class="menu-main">
						<text class="menu-label">通选课</text>
						<text class="menu-desc">启动后显示通选课页面</text>
					</view>
					<text class="menu-check" :class="{ 'menu-check-hidden': launchTab !== 'index' }">✓</text>
				</view>
				<view class="menu-divider" />
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="setLaunchTab('form')">
					<view class="menu-main">
						<text class="menu-label">课程表</text>
						<text class="menu-desc">启动后显示课程表页面</text>
					</view>
					<text class="menu-check" :class="{ 'menu-check-hidden': launchTab !== 'form' }">✓</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getDefaultLaunchTab, setDefaultLaunchTab } from '@/utils/defaultLaunchTab.js'
import { isDark, setDarkMode } from '@/utils/darkMode.js'

export default {
	data() {
		return {
			launchTab: 'index',
			darkModeOn: false
		}
	},
	onLoad() {
		this.darkModeOn = isDark()
	},
	onShow() {
		this.launchTab = getDefaultLaunchTab()
		this.darkModeOn = isDark()
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/me/me' })
		},
		onDarkModeChange(e) {
			const value = e.detail.value
			this.darkModeOn = value
			setDarkMode(value ? 'dark' : 'light')
		},
		setLaunchTab(value) {
			if (this.launchTab === value) return
			setDefaultLaunchTab(value)
			this.launchTab = value
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	min-height: 100dvh;
	background: var(--color-bg-page);
	box-sizing: border-box;
}

/* ===== 标题区 ===== */
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
}
.header-title-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}
.header-back {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
	flex-shrink: 0;
}
.header-back-hover {
	background: rgba(30, 58, 138, 0.06);
}
.header-back-arrow {
	width: 16rpx;
	height: 16rpx;
	border-left: 4rpx solid var(--color-brand);
	border-bottom: 4rpx solid var(--color-brand);
	transform: rotate(45deg);
	margin-left: 4rpx;
}
.header-title {
	font-size: 48rpx;
	line-height: 1.2;
	font-weight: 800;
	color: var(--color-brand);
}

.page-content {
	padding: 24rpx 32rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.menu-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	overflow: hidden;
}

.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx;
}
.menu-item-hover {
	background: var(--color-bg-hover);
}
.menu-item-switch {
	justify-content: space-between;
}

.menu-divider {
	height: 1rpx;
	background: var(--color-border-light);
	margin: 0 28rpx;
}

.menu-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.menu-label {
	font-size: 28rpx;
	font-weight: 500;
	color: var(--color-text-primary);
}

.menu-desc {
	font-size: 22rpx;
	color: var(--color-text-secondary);
	line-height: 1.3;
}

.menu-check {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-brand);
	flex-shrink: 0;
	margin-left: 16rpx;
}
.menu-check-hidden {
	visibility: hidden;
}
</style>
