<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">{{ contributor ? contributor.name : '' }}</text>
			</view>
		</view>

		<view v-if="contributor" class="page-content">
			<!-- 头像与基本信息 -->
			<view class="profile-hero">
				<view class="profile-avatar">
					<text class="avatar-letter">{{ contributor.name[0] }}</text>
				</view>
				<text class="profile-name">{{ contributor.name }}</text>
				<text class="profile-role">{{ contributor.role }}</text>
			</view>

			<!-- 个人简介 -->
			<view v-if="contributor.bio" class="section-card">
				<text class="section-title">个人简介</text>
				<text class="section-text">{{ contributor.bio }}</text>
			</view>

			<!-- 贡献内容 -->
			<view v-if="contributor.contributions && contributor.contributions.length" class="section-card">
				<text class="section-title">贡献内容</text>
				<view class="contribution-list">
					<view v-for="(item, idx) in contributor.contributions" :key="idx" class="contribution-item">
						<view class="contribution-dot"></view>
						<text class="contribution-text">{{ item }}</text>
					</view>
				</view>
			</view>

			<!-- 联系方式 -->
			<view v-if="contributor.links && contributor.links.length" class="section-card">
				<text class="section-title">联系方式</text>
				<view class="link-list">
					<view
						v-for="(link, idx) in contributor.links"
						:key="idx"
						class="link-item"
						hover-class="link-item-hover"
						hover-stay-time="80"
						@tap="openLink(link)"
					>
						<view class="link-icon-wrap">
							<text class="link-icon">{{ linkIcon(link.type) }}</text>
						</view>
						<text class="link-label">{{ link.label }}</text>
						<text class="link-arrow">&#8250;</text>
					</view>
				</view>
			</view>
		</view>

		<view v-else class="page-content empty-content">
			<text class="empty-text">未找到该贡献者信息</text>
		</view>
	</view>
</template>

<script>
import { getContributorById } from '@/utils/contributorsData.js'
import { themeMode } from '@/utils/darkMode.js'

export default {
	data() {
		return {
			contributor: null
		}
	},
	computed: {
		themeClass() {
			return themeMode.value === 'dark' ? 'theme-dark' : ''
		}
	},
	onLoad(options) {
		if (options.id) {
			this.contributor = getContributorById(options.id)
		}
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.navigateTo({ url: '/pages/contributors/contributors' })
		},
		linkIcon(type) {
			const icons = {
				github: '\u{1F4BB}',
				email: '\u{2709}',
				wechat: '\u{1F4AC}',
				website: '\u{1F310}'
			}
			return icons[type] || '\u{1F517}'
		},
		openLink(link) {
			if (link.type === 'email') {
				uni.setClipboardData({
					data: link.url.replace('mailto:', ''),
					success: () => {
						uni.showToast({ title: '邮箱已复制', icon: 'none' })
					}
				})
			} else {
				uni.setClipboardData({
					data: link.url,
					success: () => {
						uni.showToast({ title: '链接已复制', icon: 'none' })
					}
				})
			}
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

/* 头像区 */
.profile-hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40rpx 0 32rpx;
}

.profile-avatar {
	width: 128rpx;
	height: 128rpx;
	border-radius: 50%;
	background: var(--color-brand);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20rpx;
}

.avatar-letter {
	font-size: 52rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.profile-name {
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	line-height: 1.3;
}

.profile-role {
	font-size: 26rpx;
	color: var(--color-text-secondary);
	margin-top: 8rpx;
}

/* 内容卡片 */
.section-card {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border);
	box-shadow: 0 18rpx 60rpx rgba(28, 35, 55, 0.06);
	padding: 28rpx;
	margin-bottom: 24rpx;
}

.section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	margin-bottom: 16rpx;
}

.section-text {
	display: block;
	font-size: 26rpx;
	line-height: 1.7;
	color: var(--color-text-primary);
}

/* 贡献列表 */
.contribution-list {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.contribution-item {
	display: flex;
	align-items: flex-start;
	gap: 14rpx;
}

.contribution-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: var(--color-brand);
	margin-top: 14rpx;
	flex-shrink: 0;
}

.contribution-text {
	font-size: 26rpx;
	line-height: 1.7;
	color: var(--color-text-primary);
}

/* 联系方式 */
.link-list {
	display: flex;
	flex-direction: column;
}

.link-item {
	display: flex;
	align-items: center;
	padding: 16rpx 0;
	gap: 16rpx;
}

.link-item + .link-item {
	border-top: 1rpx solid var(--color-border-light);
}

.link-item-hover {
	opacity: 0.7;
}

.link-icon-wrap {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.link-icon {
	font-size: 32rpx;
}

.link-label {
	flex: 1;
	font-size: 28rpx;
	color: var(--color-text-primary);
}

.link-arrow {
	font-size: 32rpx;
	color: var(--color-text-secondary);
}

/* 空状态 */
.empty-content {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 120rpx;
}

.empty-text {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}
</style>
