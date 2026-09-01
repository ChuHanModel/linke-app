<template>
	<view class="page" :class="themeClass" :style="{ minHeight: pageMinHeight + 'px' }">
		<!-- 顶部标题区 -->
		<view class="user-section">
			<text class="user-name">个人中心</text>
		</view>

		<view class="page-content">
			<view class="menu-card">
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="goJwEnhancedWebview">
					<view class="menu-main">
						<text class="menu-label">教务增强试验</text>
						<text class="menu-desc">验证 HBuilder WebView 注入能力</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-divider" />
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="goSettings">
					<view class="menu-main">
						<text class="menu-label">设置</text>
						<text class="menu-desc">深色模式、启动页</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-divider" />
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="goFeedback">
					<view class="menu-main">
						<text class="menu-label">与开发者交流</text>
						<text class="menu-desc">反馈问题、提出建议</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
			</view>

			<view class="menu-card">
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="goGuide">
					<text class="menu-label menu-label-flex">使用说明</text>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-divider" />
				<view class="menu-item" hover-class="menu-item-hover" hover-stay-time="80" @tap="goAbout">
					<text class="menu-label menu-label-flex">关于林课</text>
					<text class="menu-arrow">›</text>
				</view>
			</view>

			<view class="logout-card" hover-class="logout-card-hover" hover-stay-time="80" @tap="handleLogout">
				<text class="logout-text">退出登录</text>
			</view>
		</view>

		<app-tab-bar currentTab="/pages/me/me" />
	</view>
</template>

<script>
import { clearSessionKeepCredentials, getUserType } from '@/services/auth/sessionService.js'
import { getLocalVersion } from '@/services/app/updateService.js'
import { ensureAuthenticatedPage } from '@/utils/authGuard.js'

export default {
	data() {
		return {
			userId: '',
			userType: 0,
			appVersion: getLocalVersion().version,
			pageMinHeight: (() => { try { const s = uni.getSystemInfoSync(); return s.screenHeight || s.windowHeight || 0 } catch(e) { return 0 } })()
		}
	},
	onLoad() {
		if (!ensureAuthenticatedPage('me')) return
		uni.hideTabBar({
			animation: false,
			success: () => this.calcPageHeight()
		})
	},
	onShow() {
		if (!ensureAuthenticatedPage('me')) return
		uni.hideTabBar({
			animation: false,
			success: () => this.calcPageHeight()
		})
		this.loadUserInfo()
	},
	methods: {
		calcPageHeight() {
			try {
				const sys = uni.getSystemInfoSync()
				if (sys && sys.windowHeight) {
					this.pageMinHeight = sys.windowHeight
				}
			} catch (e) {}
		},
		loadUserInfo() {
			const app = getApp()
			const userData = (app && app.globalData && app.globalData.userData) || {}
			this.userId = userData.userId || uni.getStorageSync('userId') || ''
			this.userType = getUserType()
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/settings' })
		},
		goJwEnhancedWebview() {
			uni.navigateTo({ url: '/pages/jwEnhancedWebview/jwEnhancedWebview' })
		},
		goGuide() {
			uni.navigateTo({ url: '/pages/guide/guide' })
		},
		goFeedback() {
			uni.navigateTo({ url: '/pages/feedback/feedback' })
		},
		goAbout() {
			uni.navigateTo({ url: '/pages/about/about' })
		},
		handleLogout() {
			uni.showModal({
				title: '退出登录',
				content: '确定要退出当前账号吗？退出后会保留你的学号和密码，下次直接点登录即可。',
				success: (res) => {
					if (res.confirm) {
						// 保留账号密码，方便用户下次登录直接用预填的表单
						// 如果想彻底清空，去登录页底部点"清除本地数据"
						clearSessionKeepCredentials()
						uni.reLaunch({ url: '/pages/login/login?from=logout' })
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.page {
	background: var(--color-bg-page);
	box-sizing: border-box;
}

/* ===== 用户区 ===== */
.user-section {
	background: var(--color-bg-card);
	padding: 40rpx 40rpx 36rpx;
	padding-top: calc(40rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(40rpx + env(safe-area-inset-top, 0px));
}
.user-name {
	display: block;
	font-size: 48rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	line-height: 1.2;
}

/* ===== 内容区 ===== */
.page-content {
	padding: 28rpx 32rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== 菜单卡片 ===== */
.menu-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	overflow: hidden;
	margin-bottom: 24rpx;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 28rpx 28rpx;
}

.menu-item-hover {
	background: var(--color-bg-hover);
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
	gap: 8rpx;
}

.menu-label {
	font-size: 28rpx;
	font-weight: 500;
	color: var(--color-text-primary);
	line-height: 1.3;
}

.menu-label-flex {
	flex: 1;
}

.menu-desc {
	font-size: 22rpx;
	color: var(--color-text-secondary);
	line-height: 1.3;
}

.menu-arrow {
	font-size: 36rpx;
	color: var(--color-text-secondary);
	line-height: 1;
	flex-shrink: 0;
	margin-left: 16rpx;
}

/* ===== 退出登录 ===== */
.logout-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	padding: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.logout-card-hover {
	background: var(--color-bg-hover);
}
.logout-text {
	font-size: 28rpx;
	font-weight: 500;
	color: var(--color-danger);
}
</style>
