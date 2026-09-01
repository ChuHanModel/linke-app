<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">全校通选课概览</text>
			</view>
			<text class="header-subtitle">{{ heroSubtitle }}</text>
		</view>

		<view class="page-content">
			<!-- 加载中：详细进度 + 骨架屏 -->
			<view v-if="loading" class="loading-detail">
				<view class="progress-card">
					<view class="progress-header">
						<view class="progress-header-left">
							<text class="progress-title">正在加载通选课</text>
							<text class="progress-subtitle">{{ loadingHint }}</text>
						</view>
						<text class="progress-percent">{{ loadingProgress }}%</text>
					</view>
					<view class="progress-bar">
						<view class="progress-bar-fill" :style="{ width: loadingProgress + '%' }"></view>
					</view>
					<view class="progress-steps">
						<view
							v-for="step in loadingSteps"
							:key="step.key"
							class="progress-step"
							:class="'progress-step-' + step.status"
						>
							<view class="progress-step-icon">
								<text v-if="step.status === 'done'" class="progress-step-icon-text">✓</text>
								<view v-else-if="step.status === 'active'" class="progress-step-spinner"></view>
								<text v-else-if="step.status === 'error'" class="progress-step-icon-text">✕</text>
								<view v-else class="progress-step-dot"></view>
							</view>
							<view class="progress-step-body">
								<text class="progress-step-label">{{ step.label }}</text>
								<text v-if="step.detail" class="progress-step-detail">{{ step.detail }}</text>
							</view>
						</view>
					</view>
				</view>
				<view class="list-stack">
					<view v-for="idx in 3" :key="'skeleton-' + idx" class="skeleton-card">
						<view class="skeleton-top">
							<view class="skeleton-left">
								<view class="skeleton-line skeleton-line-title"></view>
								<view class="skeleton-line skeleton-line-subtitle"></view>
							</view>
						</view>
						<view class="skeleton-chip-row">
							<view class="skeleton-chip"></view>
							<view class="skeleton-chip"></view>
						</view>
						<view class="skeleton-chart"></view>
					</view>
				</view>
			</view>

			<module-state
				v-else-if="error"
				icon="↻"
				title="课程列表暂时没加载出来"
				:description="error"
				action-text="重新加载"
				@action="loadCourseList"
			/>

			<module-state
				v-else-if="courseList.length === 0"
				icon="◌"
				title="这个学期还没有可浏览的课程"
				description="可以稍后再试，或等课程数据同步完成后回来看看。"
				action-text="重新加载"
				@action="loadCourseList"
			/>

			<view v-else class="list-stack">
				<course-card
					v-for="(course, index) in courseList"
					:key="course.courseId || index"
					:course="course"
					:show-bookmark="isCourseCollected(course.courseId)"
					@select="goCourseDetail"
				/>
			</view>
		</view>
	</view>
</template>

<script>
import { post } from '@/utils/api.js'
import { getAppGlobal } from '@/utils/appGlobalStorage.js'
import { fetchCollectionList } from '@/services/course/courseCollectionService.js'
import ModuleState from '@/components/course_module/module-state.vue'
import CourseCard from '@/components/course_module/course-card.vue'

export default {
	components: { ModuleState, CourseCard },
	data() {
		return {
			loading: true,
			error: '',
			courseList: [],
			latestTerm: '',
			termText: '',
			collectedIds: new Set(),
			loadingProgress: 0,
			loadingHint: '准备中...',
			loadingSteps: [
				{ key: 'term', label: '获取最新学期', status: 'pending', detail: '' },
				{ key: 'list', label: '拉取课程清单', status: 'pending', detail: '' },
				{ key: 'parse', label: '解析课程数据', status: 'pending', detail: '' },
				{ key: 'stats', label: '合并成绩统计', status: 'pending', detail: '' }
			]
		}
	},
	computed: {
		heroSubtitle() {
			if (this.termText) return `${this.termText}，通选课。`
			return '浏览当前学期课程，查看评分与成绩分布。'
		}
	},
	onLoad() {
		console.log('[courseList] 页面加载，开始加载课程列表')
		this.loadCourseList()
		this.loadCollectedIds()
	},
	onShow() {
		this.loadCollectedIds()
	},
	methods: {
		formatTermText(term) {
			if (!term || term === '当前学期') {
				return '当前学期'
			}
			const match = term.match(/^(\d{4})-(\d{4})-(\d)$/)
			if (match) {
				const year1 = match[1]
				const year2 = match[2]
				const semester = match[3]
				const semesterText = semester === '1' ? '第一学期' : (semester === '2' ? '第二学期' : `第${semester}学期`)
				return `${year1}-${year2}学年${semesterText}`
			}
			return term
		},
		async getLatestTermCode() {
			try {
				console.log('[courseList] 从course表获取最新学期')
				const result = await post('App.Course.getLatestTerm', {})
				console.log('[courseList] getLatestTerm返回结果:', result)
				if (result && result.term) {
					const termCode = result.term
					this.termText = this.formatTermText(termCode)
					console.log('[courseList] 获取到最新学期:', termCode)
					return termCode
				}
				console.warn('[courseList] 未获取到学期代码')
				return null
			} catch (e) {
				console.error('[courseList] 获取最新学期代码失败:', e)
				return null
			}
		},
		resetLoadingProgress() {
			this.loadingProgress = 0
			this.loadingHint = '准备中...'
			this.loadingSteps = [
				{ key: 'term', label: '获取最新学期', status: 'pending', detail: '' },
				{ key: 'list', label: '拉取课程清单', status: 'pending', detail: '' },
				{ key: 'parse', label: '解析课程数据', status: 'pending', detail: '' },
				{ key: 'stats', label: '合并成绩统计', status: 'pending', detail: '' }
			]
		},
		setStepStatus(key, status, detail) {
			const step = this.loadingSteps.find(s => s.key === key)
			if (!step) return
			step.status = status
			if (detail !== undefined) step.detail = detail
		},
		setProgress(percent, hint) {
			this.loadingProgress = Math.max(0, Math.min(100, Math.round(percent)))
			if (hint !== undefined) this.loadingHint = hint
		},
		markActiveStepsError() {
			for (const step of this.loadingSteps) {
				if (step.status === 'active') step.status = 'error'
			}
		},
		async loadCourseList() {
			console.log('[courseList] loadCourseList开始执行')
			this.loading = true
			this.error = ''
			this.courseList = []
			this.resetLoadingProgress()
			try {
				// Step 1: 学期信息
				this.setStepStatus('term', 'active')
				this.setProgress(8, '正在获取最新学期...')
				if (!this.latestTerm) {
					console.log('[courseList] 开始获取最新学期代码')
					const latestTermCode = await this.getLatestTermCode()
					if (!latestTermCode) {
						console.error('[courseList] 无法获取最新学期信息')
						this.setStepStatus('term', 'error', '未找到学期数据')
						this.error = '无法获取最新学期信息（course表中暂无数据）'
						this.loading = false
						return
					}
					this.latestTerm = latestTermCode
					console.log('[courseList] 获取到学期代码:', latestTermCode)
				}
				this.setStepStatus('term', 'done', this.termText || this.latestTerm)
				this.setProgress(22, '学期信息就绪')

				// Step 2: 拉取课程清单
				this.setStepStatus('list', 'active')
				this.setProgress(32, '正在拉取课程清单...')
				const params = {
					courseTerm: this.latestTerm,
					limitIndex: 1,
					limitCount: 1000
				}
				console.log('[courseList] 准备获取课程列表，学期:', this.latestTerm)
				const courseData = await post('App.Course.getCourseList', params)
				console.log('[courseList] API返回数据类型:', typeof courseData, '是否为数组:', Array.isArray(courseData))
				console.log('[courseList] API返回数据长度:', Array.isArray(courseData) ? courseData.length : 'N/A')
				this.setStepStatus('list', 'done', '已收到服务器响应')
				this.setProgress(55, '已获取课程数据')

				// Step 3: 解析课程数据
				this.setStepStatus('parse', 'active')
				this.setProgress(62, '正在解析课程数据...')
				let list = []
				if (Array.isArray(courseData)) {
					list = courseData
				} else if (courseData && typeof courseData === 'object' && Array.isArray(courseData.list)) {
					list = courseData.list
				}
				if (list.length > 0) {
					this.courseList = list
					console.log('[courseList] 课程列表加载成功:', this.courseList.length, '门课程')
					this.setStepStatus('parse', 'done', `共 ${list.length} 门课程`)
					this.setProgress(75, `解析完成，共 ${list.length} 门课程`)

					// Step 4: 合并成绩统计
					this.setStepStatus('stats', 'active')
					this.setProgress(85, '正在合并成绩分布...')
					await this.mergeBatchScoreStats()
					this.setStepStatus('stats', 'done', '评分分布已就绪')
					this.setProgress(100, '加载完成')
				} else {
					console.warn('[courseList] 未找到课程数据，学期:', this.latestTerm)
					this.setStepStatus('parse', 'done', '暂无课程')
					this.setStepStatus('stats', 'done', '无需合并')
					this.courseList = []
					this.setProgress(100, '加载完成')
				}
			} catch (e) {
				console.error('[courseList] 加载课程列表失败:', e)
				this.markActiveStepsError()
				this.error = '加载课程列表失败：' + (e.message || e.toString() || '未知错误')
				this.courseList = []
			} finally {
				this.loading = false
				console.log('[courseList] loadCourseList执行完成，loading:', this.loading, 'error:', this.error, 'courseList.length:', this.courseList.length)
			}
		},
		async mergeBatchScoreStats() {
			const userData = getAppGlobal('userData')
			const userKey = (userData && userData.userKey) || uni.getStorageSync('userKey')
			if (!userKey || this.courseList.length === 0) {
				console.log('[courseList] 无 userKey 或列表为空，跳过批量成绩统计')
				return
			}
			try {
				const courseIds = this.courseList.map(c => c.courseId).filter(Boolean)
				if (courseIds.length === 0) return
				const batch = await post('App.UserScore.GetBatchCourseScoreStats', {
					userKey,
					courseIds: JSON.stringify(courseIds)
				})
				if (batch && typeof batch === 'object') {
					for (const course of this.courseList) {
						const cid = (course.courseId || '').trim().toLowerCase()
						if (cid && batch[cid] && batch[cid].count > 0) {
							course.scoreStats = batch[cid]
						}
					}
					console.log('[courseList] 批量成绩统计合并完成')
				}
			} catch (e) {
				console.warn('[courseList] 批量成绩统计失败，列表仍展示:', e?.message || e)
			}
		},
		goCourseDetail(course) {
			const courseId = course.courseId
			if (!courseId) return
			const app = getApp()
			if (app && app.globalData) {
				if (!app.globalData.courseDetailPreload) app.globalData.courseDetailPreload = {}
				app.globalData.courseDetailPreload[courseId] = { ...course }
			}
			let url = `/pages/courseDetail/courseDetail?courseId=${encodeURIComponent(courseId)}`
			if (course.lessonName) url += `&lessonName=${encodeURIComponent(course.lessonName)}`
			if (course.teacherName) url += `&teacherName=${encodeURIComponent(course.teacherName)}`
			uni.navigateTo({ url })
		},
		async loadCollectedIds() {
			const userData = getAppGlobal('userData')
			const userKey = (userData && userData.userKey) || uni.getStorageSync('userKey')
			if (!userKey) return
			try {
				const rows = await fetchCollectionList({ userKey })
				const ids = new Set()
				for (const row of rows) {
					if (row.courseId) ids.add(String(row.courseId).trim().toLowerCase())
				}
				this.collectedIds = ids
			} catch (e) {
				console.warn('[courseList] 加载收藏列表失败:', e?.message || e)
			}
		},
		isCourseCollected(courseId) {
			return this.collectedIds.has(String(courseId || '').trim().toLowerCase())
		},
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.switchTab({ url: '/pages/index/index' })
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
	padding: 32rpx;
	padding-top: 28rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
}
.list-stack {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}
.loading-detail {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}
.progress-card {
	padding: 32rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border-light);
	border-radius: 24rpx;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}
.progress-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
}
.progress-header-left {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	min-width: 0;
}
.progress-title {
	font-size: 32rpx;
	font-weight: 700;
	line-height: 1.3;
	color: var(--color-text-primary);
}
.progress-subtitle {
	font-size: 24rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
}
.progress-percent {
	font-size: 44rpx;
	font-weight: 800;
	line-height: 1;
	color: var(--color-brand);
	font-feature-settings: 'tnum';
	flex-shrink: 0;
}
.progress-bar {
	margin-top: 22rpx;
	width: 100%;
	height: 10rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	overflow: hidden;
}
.progress-bar-fill {
	height: 100%;
	background: var(--color-brand);
	border-radius: 999rpx;
	transition: width 0.35s ease;
}
.progress-steps {
	margin-top: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}
.progress-step {
	display: flex;
	align-items: center;
	gap: 18rpx;
}
.progress-step-icon {
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
	flex-shrink: 0;
	background: var(--color-bg-tag);
	color: var(--color-text-tertiary);
}
.progress-step-icon-text {
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1;
	color: inherit;
}
.progress-step-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 999rpx;
	background: var(--color-text-tertiary);
	opacity: 0.45;
}
.progress-step-spinner {
	width: 24rpx;
	height: 24rpx;
	border-radius: 999rpx;
	border: 3rpx solid rgba(30, 58, 138, 0.18);
	border-top-color: var(--color-brand);
	animation: progress-spin 0.9s linear infinite;
}
.progress-step-body {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}
.progress-step-label {
	font-size: 26rpx;
	line-height: 1.3;
	color: var(--color-text-tertiary);
	font-weight: 500;
}
.progress-step-detail {
	font-size: 22rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
	opacity: 0.85;
}
.progress-step-done .progress-step-icon {
	background: rgba(30, 58, 138, 0.12);
	color: var(--color-brand);
}
.progress-step-done .progress-step-label {
	color: var(--color-text-primary);
}
.progress-step-active .progress-step-icon {
	background: rgba(30, 58, 138, 0.08);
}
.progress-step-active .progress-step-label {
	color: var(--color-text-primary);
	font-weight: 600;
}
.progress-step-error .progress-step-icon {
	background: rgba(220, 38, 38, 0.12);
	color: #dc2626;
}
.progress-step-error .progress-step-label {
	color: #dc2626;
}
@keyframes progress-spin {
	to { transform: rotate(360deg); }
}
.skeleton-card {
	padding: 32rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border-light);
	border-radius: 24rpx;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}
.skeleton-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
}
.skeleton-left {
	flex: 1;
}
.skeleton-line,
.skeleton-chip,
.skeleton-chart {
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
.skeleton-line {
	height: 24rpx;
	border-radius: 999rpx;
}
.skeleton-line-title {
	width: 60%;
	height: 32rpx;
}
.skeleton-line-subtitle {
	width: 45%;
	height: 24rpx;
	margin-top: 14rpx;
}
.skeleton-chip-row {
	display: flex;
	gap: 14rpx;
	margin-top: 20rpx;
}
.skeleton-chip {
	flex: 1;
	height: 28rpx;
	border-radius: 999rpx;
}
.skeleton-chart {
	height: 48rpx;
	border-radius: 12rpx;
	margin-top: 18rpx;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: 0 0; }
}
</style>
