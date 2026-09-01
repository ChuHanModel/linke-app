<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">关于林课</text>
			</view>
		</view>

		<view class="page-content">
		<view class="menu-card">
			<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="handleCheckUpdate">
				<text class="menu-label">检查更新</text>
				<view v-if="checking" class="menu-loading">
					<view class="spinner"></view>
				</view>
				<text v-else class="menu-arrow">›</text>
			</view>
			<text class="version-hint">当前版本 v{{ appVersion }}</text>
			<view class="menu-divider"></view>
			<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="openLegalModal('user')">
				<text class="menu-label">用户协议</text>
				<text class="menu-arrow">›</text>
			</view>
			<view class="menu-divider"></view>
			<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="openLegalModal('privacy')">
				<text class="menu-label">隐私政策</text>
				<text class="menu-arrow">›</text>
			</view>
		</view>
		</view>

		<view v-if="showLegalModal" class="legal-modal-mask" @tap="closeLegalModal">
			<view class="legal-modal" @tap.stop>
				<view class="legal-handle-wrap">
					<view class="legal-handle"></view>
				</view>
				<view class="legal-modal-header">
					<text class="legal-title">{{ currentLegal.title }}</text>
					<text class="legal-date">生效日期：{{ currentLegal.effectiveDate }}</text>
				</view>
				<scroll-view class="legal-scroll" scroll-y :show-scrollbar="false">
					<text class="legal-intro">{{ currentLegal.intro }}</text>
					<view v-for="section in currentLegal.sections" :key="section.title" class="legal-section">
						<text class="legal-section-title">{{ section.title }}</text>
						<text v-for="paragraph in section.paragraphs" :key="paragraph" class="legal-section-text">
							{{ paragraph }}
						</text>
					</view>
					<view class="legal-bottom-spacer"></view>
				</scroll-view>
				<view class="legal-close-bar" @tap="closeLegalModal">
					<text class="legal-close-text">关闭</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { LEGAL_CONTENT } from '@/utils/legalContent.js'
import { getLocalVersion, checkUpdate } from '@/services/app/updateService.js'

export default {
	data() {
		return {
			activeLegalType: 'user',
			showLegalModal: false,
			appVersion: getLocalVersion().version,
			checking: false
		}
	},
	computed: {
		currentLegal() {
			return LEGAL_CONTENT[this.activeLegalType] || LEGAL_CONTENT.user
		}
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/me/me' })
		},
		openLegalModal(type) {
			this.activeLegalType = type
			this.showLegalModal = true
		},
		closeLegalModal() {
			this.showLegalModal = false
		},
		async handleCheckUpdate() {
			if (this.checking) return
			this.checking = true
			try {
				await checkUpdate({ silent: false })
			} finally {
				this.checking = false
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
.version-hint {
	display: block;
	padding: 8rpx 28rpx 18rpx;
	font-size: 22rpx;
	color: var(--color-text-secondary);
}

.page-content {
	padding: 24rpx 32rpx;
}

.menu-card {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border);
	box-shadow: 0 18rpx 60rpx rgba(28, 35, 55, 0.06);
	overflow: hidden;
}

.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx 28rpx;
}

.menu-item-hover {
	background: var(--color-bg-hover);
}

.menu-divider {
	height: 1rpx;
	background: var(--color-border-light);
	margin: 0 28rpx;
}

.menu-label {
	font-size: 30rpx;
	font-weight: 500;
	color: var(--color-text-heading);
}

.menu-arrow {
	font-size: 32rpx;
	color: var(--color-text-secondary);
}

.menu-loading {
	display: flex;
	align-items: center;
}

.spinner {
	width: 32rpx;
	height: 32rpx;
	border: 3rpx solid var(--color-border);
	border-top-color: var(--color-brand);
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.legal-modal-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 220;
	background: rgba(15, 23, 42, 0.18);
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.legal-modal {
	width: 100%;
	max-height: 76vh;
	background: var(--color-bg-card);
	border-radius: 28rpx 28rpx 0 0;
	overflow: hidden;
	box-shadow: 0 -8rpx 32rpx rgba(15, 23, 42, 0.10);
	padding-bottom: constant(safe-area-inset-bottom, 0px);
	padding-bottom: env(safe-area-inset-bottom, 0px);
}

.legal-handle-wrap {
	display: flex;
	justify-content: center;
	padding: 14rpx 0 8rpx;
}

.legal-handle {
	width: 52rpx;
	height: 6rpx;
	border-radius: 3rpx;
	background: var(--color-border);
}

.legal-modal-header {
	padding: 10rpx 28rpx 18rpx;
	border-bottom: 1rpx solid var(--color-border);
}

.legal-scroll {
	max-height: calc(76vh - 200rpx);
	padding: 8rpx 28rpx 0;
	box-sizing: border-box;
}

.legal-bottom-spacer {
	height: 32rpx;
}

.legal-close-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 28rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
	border-top: 1rpx solid var(--color-border);
}

.legal-close-text {
	font-size: 30rpx;
	font-weight: 600;
	color: var(--color-brand);
}

.legal-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: var(--color-text-heading);
}

.legal-date {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}

.legal-intro {
	display: block;
	margin-top: 18rpx;
	font-size: 27rpx;
	line-height: 1.75;
	color: var(--color-text-tertiary);
}

.legal-section {
	padding-top: 24rpx;
}

.legal-section-title {
	display: block;
	margin-bottom: 12rpx;
	font-size: 29rpx;
	font-weight: 600;
	color: var(--color-text-heading);
}

.legal-section-text {
	display: block;
	font-size: 26rpx;
	line-height: 1.8;
	color: var(--color-text-tertiary);
}

.legal-section-text + .legal-section-text {
	margin-top: 10rpx;
}

</style>
