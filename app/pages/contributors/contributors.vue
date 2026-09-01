<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">开发贡献者</text>
			</view>
		</view>

		<view class="page-content">
			<view class="contributor-list">
				<view
					v-for="(item, index) in contributors"
					:key="item.id"
					class="contributor-item"
					hover-class="contributor-item-hover"
					hover-stay-time="80"
					@tap="goProfile(item.id)"
				>
					<view class="contributor-avatar">
						<text class="avatar-letter">{{ item.name[0] }}</text>
					</view>
					<view class="contributor-info">
						<text class="contributor-name">{{ item.name }}</text>
						<text class="contributor-role">{{ item.role }}</text>
					</view>
					<text class="contributor-arrow">&#8250;</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { CONTRIBUTORS } from '@/utils/contributorsData.js'
import { themeMode } from '@/utils/darkMode.js'

export default {
	data() {
		return {
			contributors: CONTRIBUTORS
		}
	},
	computed: {
		themeClass() {
			return themeMode.value === 'dark' ? 'theme-dark' : ''
		}
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.navigateTo({ url: '/pages/about/about' })
		},
		goProfile(id) {
			uni.navigateTo({ url: `/pages/contributorProfile/contributorProfile?id=${id}` })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	min-height: 100dvh;
	background-color: var(--color-bg-page);
}

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
.header-back-hover { background: rgba(30, 58, 138, 0.06); }
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
}

.contributor-list {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border);
	box-shadow: 0 18rpx 60rpx rgba(28, 35, 55, 0.06);
	overflow: hidden;
}

.contributor-item {
	display: flex;
	align-items: center;
	padding: 28rpx;
	gap: 24rpx;
}

.contributor-item + .contributor-item {
	border-top: 1rpx solid var(--color-border-light);
}

.contributor-item-hover {
	background: var(--color-bg-hover);
}

.contributor-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: var(--color-brand);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.avatar-letter {
	font-size: 30rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.contributor-info {
	flex: 1;
	min-width: 0;
}

.contributor-name {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: var(--color-text-heading);
	line-height: 1.4;
}

.contributor-role {
	display: block;
	font-size: 24rpx;
	color: var(--color-text-secondary);
	margin-top: 4rpx;
}

.contributor-arrow {
	font-size: 32rpx;
	color: var(--color-text-secondary);
	flex-shrink: 0;
}
</style>
