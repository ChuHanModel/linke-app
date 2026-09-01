<template>
	<view class="page" :class="themeClass" :style="{ minHeight: pageMinHeight + 'px' }">
		<view class="hero">
			<view class="hero-copy">
				<view class="page-title">{{ greetingText }}，{{ userName }}</view>
				<view class="date-term">{{ currentDateText }} · {{ formattedLatestTerm || termStatusText }}</view>
			</view>
		</view>

		<view class="section-block section-block-plain">
			<view class="section-head">
				<text class="section-title">林课数据库</text>
				<view class="section-meta">
					<text class="section-meta-label">收录</text>
					<text class="section-meta-value">{{ formattedTotalCourseCount }}</text>
					<text class="section-meta-label">门课程</text>
				</view>
			</view>
			<view class="search-entry" @tap="goSearch">
				<view class="search-icon">
					<view class="search-icon-circle"></view>
					<view class="search-icon-handle"></view>
				</view>
				<text class="search-entry-text">前往检索课程、教师</text>
				<text class="search-entry-arrow">›</text>
			</view>
			<view class="tag-row" :style="tagsAdjusting ? 'visibility:hidden' : ''">
	
				<view
					v-for="(item, i) in homeSearchTags"
					:key="`${item.type || 'tag'}-${item.keyword}-${i}`"
					class="tag"
					@tap="goSearchWithKeyword(item.keyword)"
				>
					<text class="tag-text">{{ item.keyword }}</text>
				</view>
				<view class="tag tag-refresh" @tap="loadRandomTags">
					<text class="tag-refresh-icon">↻</text>
					<text class="tag-text">换一换</text>
				</view>
			</view>
		</view>

		<!-- ========== 骨架屏（数据加载中） ========== -->
		<template v-if="pageLoading">
			<view class="section-block section-card skel-card">
				<view class="skel-head">
					<view class="skeleton-line" style="width: 40%; height: 34rpx;"></view>
					<view class="skeleton-line" style="width: 55%; height: 24rpx; margin-top: 12rpx;"></view>
				</view>
				<view class="skel-row" v-for="i in 2" :key="'sn-' + i">
					<view class="skeleton-line" style="width: 75%; height: 28rpx;"></view>
					<view class="skel-row-meta">
						<view class="skeleton-line" style="width: 56rpx; height: 26rpx; border-radius: 6rpx;"></view>
						<view class="skeleton-line" style="width: 100rpx; height: 22rpx;"></view>
					</view>
				</view>
			</view>

			<view class="section-block section-card skel-card">
				<view class="skel-head-row">
					<view>
						<view class="skeleton-line" style="width: 50%; height: 34rpx;"></view>
						<view class="skeleton-line" style="width: 40%; height: 24rpx; margin-top: 12rpx;"></view>
					</view>
					<view style="text-align: right;">
						<view class="skeleton-line" style="width: 80rpx; height: 48rpx; margin-left: auto;"></view>
						<view class="skeleton-line" style="width: 120rpx; height: 22rpx; margin-top: 8rpx; margin-left: auto;"></view>
					</view>
				</view>
				<view class="skeleton-line" style="width: 100%; height: 80rpx; border-radius: 16rpx; margin-top: 24rpx;"></view>
			</view>

			<view class="summary-grid">
				<view class="summary-card" v-for="i in 3" :key="'ss-' + i">
					<view>
						<view class="skeleton-line" style="width: 60rpx; height: 48rpx; margin: 0 auto;"></view>
						<view class="skeleton-line" style="width: 80rpx; height: 22rpx; margin: 12rpx auto 0;"></view>
					</view>
				</view>
			</view>
		</template>

		<!-- ========== 实际内容（加载完成） ========== -->
		<template v-else>
			<view class="section-block section-card notice-card">
				<view class="notice-head">
					<view>
						<text class="section-title">教务通知</text>
						<text class="notice-head-sub">来自学校教务处的最新公告</text>
					</view>
					<view class="section-link" @tap.stop="goJwNoticeList">查看全部 ›</view>
				</view>
				<view class="notice-list">
					<view
						v-for="(item, index) in homeNoticeItems"
						:key="`${item.tag}-${index}`"
						class="notice-item"
						:class="{ 'notice-item-last': index === homeNoticeItems.length - 1 }"
						@tap="goJwNoticeList"
					>
						<text class="notice-item-title">{{ item.title }}</text>
						<view class="notice-item-meta">
							<text class="notice-item-badge">{{ item.tag }}</text>
							<text class="notice-item-date">{{ item.date }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="section-block section-card overview-card">
				<view class="overview-head">
					<view>
						<text class="section-title">全校通选课概览</text>
						<text class="overview-subtitle">{{ formattedLatestTerm || termStatusText }}</text>
					</view>
					<view class="overview-count-wrap">
						<text v-if="courseListLoading" class="overview-count overview-count-loading">--</text>
						<text v-else class="overview-count">{{ courseCount }}</text>
						<text class="overview-count-unit">{{ courseListError ? '加载失败' : '门在选课程' }}</text>
					</view>
				</view>
				<view v-if="courseListError" class="overview-error">{{ courseListError }}</view>
				<view class="overview-button" @tap="goCourseList">
					<text class="overview-button-text">查看完整课程列表</text>
				</view>
			</view>

			<view class="summary-grid">
				<view class="summary-card" @tap="goCollection">
					<view>
						<text class="summary-value summary-value-primary">{{ collectionCount !== null ? collectionCount : '—' }}</text>
						<text class="summary-label">我的收藏</text>
					</view>
				</view>
				<view class="summary-card" @tap="goEvaluate">
					<view>
						<text class="summary-value summary-value-warning">{{ !evaluatePendingLoading && evaluatePendingCount !== null ? evaluatePendingCount : '—' }}</text>
						<text class="summary-label">待评价</text>
					</view>
				</view>
				<view class="summary-card" @tap="goCourseCredit">
					<view>
						<text class="summary-value summary-value-success">{{ electiveCreditTotal !== null ? electiveCreditTotal : '—' }}</text>
						<text class="summary-label">已获学分</text>
					</view>
				</view>
			</view>
		</template>

		<!-- ========== 首次加载遮罩（绝对定位盖住整页内容，拦截点击避免数据未就绪时触发 bug） ========== -->
		<view
			v-if="loadingOverlayVisible"
			class="loading-overlay"
			@touchmove.stop.prevent
			@tap.stop
			catchtouchmove="true"
		>
			<view class="loading-card">
				<view class="loading-spinner"></view>
				<text class="loading-title">正在准备你的林课数据</text>
				<text class="loading-subtitle">{{ homeLoadingCurrentLabel }}</text>
				<view class="loading-progress-track">
					<view class="loading-progress-bar" :style="{ width: homeLoadingPercent + '%' }"></view>
				</view>
				<text class="loading-progress-text">{{ homeLoadingDoneCount }} / {{ homeLoadingTotalCount }} 项已完成</text>
				<view class="loading-step-list">
					<view
						v-for="item in homeLoadingItems"
						:key="item.key"
						class="loading-step"
						:class="'loading-step-' + item.status"
					>
						<view class="loading-step-icon">
							<text v-if="item.status === 'done'" class="loading-step-icon-text">✓</text>
							<view v-else-if="item.status === 'running'" class="loading-step-spinner"></view>
							<text v-else-if="item.status === 'error'" class="loading-step-icon-text">✕</text>
							<view v-else class="loading-step-dot"></view>
						</view>
						<view class="loading-step-body">
							<text class="loading-step-label">{{ item.label }}</text>
							<text v-if="item.detail" class="loading-step-detail">{{ item.detail }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<app-tab-bar currentTab="/pages/index/index" />
	</view>
</template>

<script>
import { createHomePageState, homePageComputed, homePageMethods } from '@/composables/useHomePage.js'
import { ensureAuthenticatedPage } from '@/utils/authGuard.js'

export default {
	data() {
		let initHeight = 0
		try { const s = uni.getSystemInfoSync(); initHeight = s.screenHeight || s.windowHeight || 0 } catch(e) {}
		return {
			...createHomePageState(),
			pageMinHeight: initHeight
		}
	},
	computed: homePageComputed,
	onLoad() {
		if (!ensureAuthenticatedPage('index')) return
		uni.hideTabBar({
			animation: false,
			success: () => this.calcPageHeight()
		})
		this.setupHomePageInitialState()
	},
	onShow() {
		if (!ensureAuthenticatedPage('index')) return
		uni.hideTabBar({
			animation: false,
			success: () => this.calcPageHeight()
		})
		this.refreshHomePageOnShow()
	},
	onUnload() {
		if (typeof this.stopPostLoginSyncPolling === 'function') {
			this.stopPostLoginSyncPolling()
		}
	},
	methods: {
		...homePageMethods,
		calcPageHeight() {
			try {
				const sys = uni.getSystemInfoSync()
				if (sys && sys.windowHeight) {
					this.pageMinHeight = sys.windowHeight
				}
			} catch (e) {}
		}
	}
}
</script>

<style scoped>
.page {
	padding: 28rpx 26rpx 56rpx;
	padding-top: calc(28rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(28rpx + env(safe-area-inset-top, 0px));
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
	background: var(--color-bg-page-alt);
	box-sizing: border-box;
}

.hero {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 26rpx;
}

.hero-copy {
	flex: 1;
}

.page-title {
	font-size: 52rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	line-height: 1.2;
	margin-bottom: 10rpx;
}

.date-term {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
	line-height: 1.45;
}

.section-block {
	margin-bottom: 28rpx;
}

.section-card,
.summary-card {
	background: var(--color-bg-card);
	border-radius: 26rpx;
	border: 1rpx solid var(--color-border);
}

.section-card {
	padding: 28rpx;
}

.section-head {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: 24rpx;
	margin-bottom: 14rpx;
}

.section-head-tight {
	align-items: center;
}

.section-title-wrap {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-text-section);
}

.section-title-icon {
	width: 34rpx;
	height: 34rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	font-weight: 700;
	color: var(--color-brand);
	background: var(--color-brand-bg);
}

.section-meta {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-wrap: wrap;
}

.section-meta-label {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
	line-height: 1.2;
}

.section-meta-value {
	font-size: 24rpx;
	font-weight: 700;
	color: var(--color-brand);
	font-family: "DIN Alternate", "Avenir Next", "Helvetica Neue", sans-serif;
	line-height: 1.2;
}

.section-link {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--color-brand);
}

.search-entry {
	height: 76rpx;
	padding: 0 24rpx;
	border-radius: 22rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 18rpx;
}

.search-icon {
	position: relative;
	width: 28rpx;
	height: 28rpx;
}

.search-icon-circle {
	position: absolute;
	left: 0;
	top: 0;
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	border: 3rpx solid var(--color-text-secondary);
}

.search-icon-handle {
	position: absolute;
	right: 0;
	bottom: 2rpx;
	width: 11rpx;
	height: 3rpx;
	background: var(--color-text-secondary);
	transform: rotate(45deg);
	border-radius: 999rpx;
}

.search-entry-text {
	flex: 1;
	font-size: 27rpx;
	color: var(--color-text-secondary);
	line-height: 1.3;
}

.search-entry-arrow {
	font-size: 34rpx;
	line-height: 1;
	color: var(--color-text-secondary);
}

.tag-row {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	overflow: hidden;
	gap: 12rpx;
}

.tag {
	height: 48rpx;
	padding: 0 20rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	display: flex;
	align-items: center;
	justify-content: center;
	white-space: nowrap;
	flex-shrink: 0;
}

.tag-text {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
}

.tag-refresh {
	gap: 10rpx;
	padding: 0 18rpx;
	flex-shrink: 0;
}

.tag-refresh .tag-text {
	color: var(--color-brand);
}

.tag-refresh-icon {
	font-size: 22rpx;
	color: var(--color-brand);
}

.notice-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 8rpx;
}

.notice-head-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}

.notice-list {
	overflow: hidden;
}

.notice-item {
	padding: 20rpx 0;
	border-bottom: 1rpx solid var(--color-border-light);
}

.notice-item-last {
	border-bottom: none;
	padding-bottom: 4rpx;
}

.notice-item-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--color-text-heading);
	line-height: 1.5;
	margin-bottom: 10rpx;
}

.notice-item-meta {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.notice-item-badge {
	height: 34rpx;
	padding: 0 14rpx;
	border-radius: 8rpx;
	background: var(--color-bg-tag);
	font-size: 20rpx;
	font-weight: 600;
	color: var(--color-brand);
	line-height: 34rpx;
}

.notice-item-date {
	font-size: 22rpx;
	color: var(--color-text-secondary);
}

/* ========== 骨架屏 ========== */
.skeleton-line {
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 50%, var(--color-skeleton-from) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 8rpx;
}

@keyframes shimmer {
	0% { background-position: 200% 0; }
	100% { background-position: -200% 0; }
}

.skel-card {
	padding: 28rpx;
}

.skel-head {
	margin-bottom: 28rpx;
}

.skel-head-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.skel-row {
	padding: 20rpx 0;
	border-bottom: 1rpx solid var(--color-border-light);
}

.skel-row:last-child {
	border-bottom: none;
}

.skel-row-meta {
	display: flex;
	gap: 12rpx;
	margin-top: 14rpx;
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 18rpx;
	margin-bottom: 28rpx;
}

.summary-card {
	padding: 26rpx 12rpx 22rpx;
	text-align: center;
}

.summary-value {
	display: block;
	font-size: 48rpx;
	font-weight: 700;
	line-height: 1;
	margin-bottom: 12rpx;
	font-family: "DIN Alternate", "Avenir Next", "Helvetica Neue", sans-serif;
}

.summary-value-primary {
	color: var(--color-brand);
}

.summary-value-warning {
	color: var(--color-warning);
}

.summary-value-success {
	color: var(--color-success);
}

.summary-label {
	display: block;
	font-size: 23rpx;
	color: var(--color-text-secondary);
}

.overview-card {
	padding-bottom: 24rpx;
}

.overview-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 24rpx;
}

.overview-subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}

.overview-count-wrap {
	text-align: right;
}

.overview-count {
	display: block;
	font-size: 56rpx;
	font-weight: 700;
	line-height: 1;
	color: var(--color-brand);
	font-family: "DIN Alternate", "Avenir Next", "Helvetica Neue", sans-serif;
}

.overview-count-loading {
	color: var(--color-text-secondary);
}

.overview-count-unit {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: var(--color-text-secondary);
}

.overview-error {
	margin-bottom: 18rpx;
	font-size: 24rpx;
	color: var(--color-danger);
}

.overview-button {
	height: 84rpx;
	border-radius: 14rpx;
	background: var(--color-bg-secondary);
	border: 1rpx solid var(--color-border);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
}

.overview-button-text {
	font-size: 27rpx;
	font-weight: 600;
	color: var(--color-brand);
}

.overview-button-icon {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.88);
}

/* ========== 首次加载遮罩 ========== */
.loading-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 500;
	background: var(--color-bg-page-alt);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 56rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
	box-sizing: border-box;
	animation: overlay-fade-in 0.2s ease-out;
}

@keyframes overlay-fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}

.loading-card {
	width: 100%;
	max-width: 560rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	border-radius: 28rpx;
	padding: 56rpx 44rpx 44rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.loading-spinner {
	width: 72rpx;
	height: 72rpx;
	border: 5rpx solid var(--color-border);
	border-top-color: var(--color-brand);
	border-radius: 50%;
	margin-bottom: 32rpx;
	animation: overlay-spin 0.8s linear infinite;
}

@keyframes overlay-spin {
	to { transform: rotate(360deg); }
}

.loading-title {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	letter-spacing: -0.5rpx;
	margin-bottom: 14rpx;
	text-align: center;
}

.loading-subtitle {
	font-size: 25rpx;
	color: var(--color-text-secondary);
	line-height: 1.5;
	margin-bottom: 36rpx;
	text-align: center;
	min-height: 38rpx;
}

.loading-progress-track {
	width: 100%;
	height: 10rpx;
	background: var(--color-border-light);
	border-radius: 999rpx;
	overflow: hidden;
	margin-bottom: 16rpx;
}

.loading-progress-bar {
	height: 100%;
	background: var(--color-brand);
	border-radius: 999rpx;
	transition: width 0.35s ease-out;
}

.loading-progress-text {
	font-size: 23rpx;
	color: var(--color-text-tertiary);
	font-family: "DIN Alternate", "Avenir Next", "Helvetica Neue", sans-serif;
}

.loading-step-list {
	margin-top: 32rpx;
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	align-self: stretch;
}

.loading-step {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.loading-step-icon {
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
	flex-shrink: 0;
	background: var(--color-border-light);
	color: var(--color-text-tertiary);
}

.loading-step-icon-text {
	font-size: 22rpx;
	font-weight: 700;
	line-height: 1;
	color: inherit;
}

.loading-step-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 999rpx;
	background: var(--color-text-tertiary);
	opacity: 0.45;
}

.loading-step-spinner {
	width: 22rpx;
	height: 22rpx;
	border-radius: 999rpx;
	border: 3rpx solid var(--color-border-light);
	border-top-color: var(--color-brand);
	animation: overlay-spin 0.9s linear infinite;
}

.loading-step-body {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}

.loading-step-label {
	font-size: 25rpx;
	line-height: 1.3;
	color: var(--color-text-tertiary);
	font-weight: 500;
}

.loading-step-detail {
	font-size: 21rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
	opacity: 0.85;
	white-space: normal;
	word-break: break-all;
}

.loading-step-done .loading-step-icon {
	background: rgba(30, 58, 138, 0.12);
	color: var(--color-brand);
}

.loading-step-done .loading-step-label {
	color: var(--color-text-heading);
}

.loading-step-running .loading-step-icon {
	background: rgba(30, 58, 138, 0.08);
}

.loading-step-running .loading-step-label {
	color: var(--color-text-heading);
	font-weight: 600;
}

.loading-step-error .loading-step-icon {
	background: rgba(220, 38, 38, 0.12);
	color: #dc2626;
}

.loading-step-error .loading-step-label {
	color: #dc2626;
}
</style>
