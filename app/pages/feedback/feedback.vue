<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">与开发者交流</text>
			</view>
			<text class="header-subtitle">加入 QQ 群，反馈问题或提出建议。</text>
		</view>

		<view class="page-content">
			<image class="qr-image" src="/static/images/qq-group.jpg" mode="widthFix" />

			<view class="action-row">
				<view class="action-btn action-btn-primary" hover-class="action-btn-primary-hover" hover-stay-time="80" @tap="copyGroupId">
					<text class="action-btn-text action-btn-text-primary">复制群号</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/me/me' })
		},
		copyGroupId() {
			uni.setClipboardData({
				data: '529323248',
				success() {
					uni.showToast({ title: '群号已复制', icon: 'none' })
				}
			})
		}
	}
}
</script>

<style scoped>
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
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}

.page {
	min-height: 100vh;
	min-height: 100dvh;
	background: var(--color-bg-page);
	box-sizing: border-box;
}

.page-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48rpx 56rpx 80rpx;
}

.qr-image {
	width: 520rpx;
	border-radius: 24rpx;
}

.action-row {
	display: flex;
	gap: 24rpx;
	margin-top: 56rpx;
	width: 100%;
	box-sizing: border-box;
}

.action-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 92rpx;
	border-radius: 18rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
}

.action-btn-primary {
	background: var(--color-brand);
	border-color: var(--color-brand);
}

.action-btn-primary-hover {
	opacity: 0.85;
}

.action-btn-text {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--color-text-primary);
}

.action-btn-text-primary {
	color: #FFFFFF;
}


</style>
