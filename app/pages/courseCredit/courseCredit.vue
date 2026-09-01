<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">通选课统计</text>
			</view>
			<text class="header-subtitle">{{ heroSubtitle }}</text>
		</view>

		<view class="page-content">
			<!-- 汇总数据 -->
			<view v-if="creditParsed && hasAnyCourses" class="stat-row">
				<view class="stat-block">
					<text class="stat-number">{{ categoryCount }}</text>
					<text class="stat-label">课程类别</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-block">
					<text class="stat-number">{{ totalCourseCount }}</text>
					<text class="stat-label">课程总数</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-block">
					<text class="stat-number">{{ electiveCreditTotal }}</text>
					<text class="stat-label">累计学分</text>
				</view>
			</view>

			<!-- 分类明细 -->
			<template v-if="creditParsed && hasAnyCourses">
				<view
					v-for="cat in creditSummaryList"
					:key="cat.name"
					class="category-card"
				>
					<!-- 类别头 -->
					<view class="cat-header" @tap="toggleCategory(cat.name)">
						<view class="cat-header-left">
							<view class="cat-indicator"></view>
							<view class="cat-info">
								<text class="cat-name">{{ cat.name }}</text>
								<text class="cat-meta">{{ cat.courseCount }} 门 · 已修 {{ cat.finishedCredit }} · 在修 {{ cat.studyingCredit }}</text>
							</view>
						</view>
						<text class="cat-toggle" :class="{ 'cat-toggle-open': expandedCategories[cat.name] }">&#8250;</text>
					</view>

					<!-- 展开的课程列表 -->
					<view v-if="expandedCategories[cat.name] && getCategoryCourses(cat.name).length" class="cat-courses">
						<view
							v-for="(course, idx) in getCategoryCourses(cat.name)"
							:key="idx"
							class="course-row"
						>
							<text class="course-name">{{ course.courseName || '' }}</text>
							<view class="course-right">
								<text class="course-credit">{{ course.credit || '—' }}分</text>
								<text class="course-score" :class="getScoreClass(course.score)">{{ course.score || '—' }}</text>
							</view>
						</view>
					</view>
				</view>
			</template>

			<!-- 空状态 -->
			<view v-if="!creditParsed || !hasAnyCourses" class="empty-wrap">
				<module-state
					icon="·"
					title="暂无学分类别成绩数据"
					:description="emptyDescription"
					:action-text="showLoginAction ? '去登录' : ''"
					@action="goLogin"
				/>
			</view>
		</view>
	</view>
</template>

<script>
import { getAppGlobal } from '@/utils/appGlobalStorage.js'
import ModuleState from '@/components/course_module/module-state.vue'

export default {
	components: { ModuleState },
	data() {
		return {
			creditParsed: null,
			isLoggedIn: false,
			expandedCategories: {}
		}
	},
	computed: {
		heroSubtitle() {
			if (!this.hasAnyCourses) return '从教务系统同步的通选课学分，包含已修与在修课程。'
			return `从教务系统同步的通选课学分，包含已修与在修课程。`
		},
		hasAnyCourses() {
			if (!this.creditParsed || typeof this.creditParsed !== 'object') return false
			for (const key of Object.keys(this.creditParsed)) {
				const data = this.creditParsed[key]
				if (data && data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
					return true
				}
			}
			return false
		},
		totalCourseCount() {
			if (!this.creditParsed || typeof this.creditParsed !== 'object') return 0
			let total = 0
			for (const key of Object.keys(this.creditParsed)) {
				const data = this.creditParsed[key]
				if (data && Array.isArray(data.courses)) total += data.courses.length
			}
			return total
		},
		categoryCount() {
			return this.creditSummaryList.length
		},
		electiveCreditTotal() {
			if (!this.creditParsed || typeof this.creditParsed !== 'object') return '—'
			let total = 0
			let hasValue = false
			for (const key of Object.keys(this.creditParsed)) {
				const data = this.creditParsed[key]
				if (!data || typeof data !== 'object') continue
				const finished = this.parseCreditValue(data.count)
				const studying = this.parseCreditValue(data.studying)
				if (finished != null) { total += finished; hasValue = true }
				if (studying != null) { total += studying; hasValue = true }
			}
			if (!hasValue) return '—'
			return Math.abs(total - Math.round(total)) < 0.001 ? String(Math.round(total)) : total.toFixed(1)
		},
		creditSummaryList() {
			if (!this.creditParsed || typeof this.creditParsed !== 'object') return []
			return Object.keys(this.creditParsed)
				.map(name => {
					const data = this.creditParsed[name] || {}
					const finished = this.parseCreditValue(data.count)
					const studying = this.parseCreditValue(data.studying)
					const courseCount = Array.isArray(data.courses) ? data.courses.length : 0
					return {
						name,
						courseCount,
						finishedCredit: finished == null ? '—' : (Math.abs(finished - Math.round(finished)) < 0.001 ? String(Math.round(finished)) : finished.toFixed(1)),
						studyingCredit: studying == null ? '—' : (Math.abs(studying - Math.round(studying)) < 0.001 ? String(Math.round(studying)) : studying.toFixed(1))
					}
				})
				.filter(item => item.courseCount > 0)
		},
		showLoginAction() {
			return !this.isLoggedIn
		},
		emptyDescription() {
			if (!this.isLoggedIn) {
				return '请先在登录页完成教务登录，登录成功后将自动拉取学分类别成绩。'
			}
			if (this.creditParsed && !this.hasAnyCourses) {
				return '当前学分信息已同步，但还没有可展示的课程明细。'
			}
			return '暂无学分类别成绩数据，请稍后重试。'
		}
	},
	onLoad() {
		this.syncFromGlobal()
	},
	onShow() {
		this.syncFromGlobal()
	},
	methods: {
		parseCreditValue(value) {
			if (value == null || value === '') return null
			const parsed = Number(value)
			return Number.isNaN(parsed) ? null : parsed
		},
		isCreditStorageEmpty() {
			const cookie = getAppGlobal('globalCookie') || uni.getStorageSync('loginCookie') || ''
			if (cookie && cookie.length > 10) return false
			const parsed = getAppGlobal('globalCreditParsed')
			if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return false
			return true
		},
		syncFromGlobal() {
			const app = getApp()
			if (!app || !app.globalData) return
			this.creditParsed = app.globalData.globalCreditParsed || getAppGlobal('globalCreditParsed') || null
			const cookie = app.globalData.globalCookie || getAppGlobal('globalCookie') || ''
			this.isLoggedIn = !!(cookie && (cookie.indexOf('JSESSIONID=') !== -1 || cookie.length > 10))
		},
		toggleCategory(name) {
			this.expandedCategories = {
				...this.expandedCategories,
				[name]: !this.expandedCategories[name]
			}
		},
		getCategoryCourses(name) {
			if (!this.creditParsed || !this.creditParsed[name]) return []
			const data = this.creditParsed[name]
			return Array.isArray(data.courses) ? data.courses : []
		},
		getScoreClass(score) {
			if (!score || score === '—') return ''
			const num = parseFloat(score)
			if (isNaN(num)) return ''
			if (num >= 90) return 'score-high'
			if (num >= 80) return 'score-good'
			if (num >= 60) return 'score-pass'
			return 'score-low'
		},
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.switchTab({ url: '/pages/index/index' })
			}
		},
		goLogin() {
			const loginUrl = '/pages/login/login?from=courseCredit'
			if (this.isCreditStorageEmpty()) {
				uni.reLaunch({ url: loginUrl })
			} else {
				uni.navigateTo({ url: loginUrl })
			}
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
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
	border-bottom: 1rpx solid var(--color-border);
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
.header-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rpx 16rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	align-self: center;
}
.header-badge-text {
	font-size: 24rpx;
	line-height: 1.2;
	font-weight: 700;
	color: var(--color-brand);
}
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 24rpx 32rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== 汇总数据条 ===== */
.stat-row {
	display: flex;
	align-items: center;
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	padding: 28rpx 0;
	margin-bottom: 24rpx;
}
.stat-block {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
}
.stat-number {
	font-size: 44rpx;
	font-weight: 700;
	color: var(--color-text-primary);
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
}
.stat-label {
	font-size: 22rpx;
	color: var(--color-text-secondary);
	font-weight: 500;
}
.stat-divider {
	width: 1rpx;
	height: 48rpx;
	background: var(--color-border);
	flex-shrink: 0;
}

/* ===== 类别卡片 ===== */
.category-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	margin-bottom: 16rpx;
	overflow: hidden;
}
.cat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 28rpx;
}
.cat-header-left {
	display: flex;
	align-items: center;
	gap: 16rpx;
	flex: 1;
	min-width: 0;
}
.cat-indicator {
	width: 6rpx;
	height: 36rpx;
	border-radius: 3rpx;
	background: var(--color-brand);
	flex-shrink: 0;
}
.cat-info {
	flex: 1;
	min-width: 0;
}
.cat-name {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	line-height: 1.35;
}
.cat-meta {
	display: block;
	font-size: 24rpx;
	color: var(--color-text-tertiary);
	margin-top: 4rpx;
	line-height: 1.4;
}
.cat-toggle {
	font-size: 36rpx;
	color: var(--color-text-secondary);
	line-height: 1;
	transform: rotate(90deg);
	transition: transform 0.2s ease;
	flex-shrink: 0;
	margin-left: 12rpx;
}
.cat-toggle-open {
	transform: rotate(270deg);
}

/* ===== 展开的课程列表 ===== */
.cat-courses {
	border-top: 1rpx solid var(--color-border-light);
}
.course-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 28rpx 20rpx 50rpx;
	border-bottom: 1rpx solid var(--color-border-light);
}
.course-row:last-child {
	border-bottom: none;
}
.course-name {
	flex: 1;
	min-width: 0;
	font-size: 26rpx;
	color: var(--color-text-primary);
	line-height: 1.4;
	word-break: break-all;
}
.course-right {
	display: flex;
	align-items: center;
	gap: 20rpx;
	flex-shrink: 0;
	margin-left: 16rpx;
}
.course-credit {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	font-variant-numeric: tabular-nums;
}
.course-score {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--color-text-tertiary);
	min-width: 60rpx;
	text-align: right;
	font-variant-numeric: tabular-nums;
}
.score-high {
	color: var(--color-success);
}
.score-good {
	color: var(--color-brand);
}
.score-pass {
	color: var(--color-text-primary);
}
.score-low {
	color: var(--color-danger);
}

.empty-wrap {
	margin-top: 18rpx;
}
</style>
