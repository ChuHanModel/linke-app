<template>
	<view class="page" :class="themeClass">
		<!-- 标题区 -->
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">评价工作台</text>
				<view style="flex:1"></view>
				<view v-if="showLoginAction" class="header-action" hover-class="header-action-hover" hover-stay-time="80" @tap="goLogin()">
					<text class="header-action-text">登录</text>
				</view>
			</view>
			<text class="header-subtitle">{{ heroSubtitle }}</text>

			<!-- Tab 下划线切换 -->
			<view class="tab-bar">
				<view
					v-for="item in tabItems"
					:key="item.value"
					class="tab-item"
					:class="{ 'tab-item-active': currentTab === item.value }"
					@tap="currentTab = item.value"
				>
					<text class="tab-item-text">{{ item.label }}</text>
				</view>
			</view>
		</view>

		<view class="page-content">
			<!-- 未登录 -->
			<module-state
				v-if="showLoginAction && !list.length"
				icon="⌁"
				title="登录后可查看待评价课程"
				description="请先完成教务系统登录，登录成功后将自动加载可评价课程并在这里显示。"
				action-text="去登录"
				@action="goLogin"
			/>

			<!-- 加载中骨架屏 -->
			<view v-else-if="loading" class="list-stack">
				<view v-for="idx in 3" :key="'skeleton-' + idx" class="skeleton-card">
					<view class="skeleton-top">
						<view class="skeleton-left">
							<view class="skeleton-line skeleton-line-title"></view>
							<view class="skeleton-line skeleton-line-tag"></view>
						</view>
						<view class="skeleton-status"></view>
					</view>
					<view class="skeleton-line skeleton-line-rating"></view>
					<view class="skeleton-chart"></view>
				</view>
			</view>

			<!-- 空列表 -->
			<module-state
				v-else-if="!list.length"
				icon="◌"
				title="暂无评价课程数据"
				:description="emptyDescription"
			/>

			<template v-else>
				<module-state
					v-if="visibleList.length === 0"
					icon="◌"
					:title="currentTabEmptyText"
				/>

				<view v-else class="list-stack">
					<course-card
						v-for="(course, index) in visibleList"
						:key="(course.md5Hash || course.courseId || '') + index"
						:course="courseForCard(course)"
						:show-bookmark="isCourseCollected(course.md5Hash)"
						@select="() => goDetail(course)"
						@longpress="() => course.isEvaluated ? onLongPressEvaluated(course, index) : undefined"
					/>
				</view>
			</template>
		</view>
	</view>
</template>

<script>
import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { refreshEvaluatedStatus, loadEvaluationData } from '@/utils/evaluationLoader.js'
import { getAppGlobal, setAppGlobal } from '@/utils/appGlobalStorage.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { fetchCollectionList } from '@/services/course/courseCollectionService.js'
import ModuleState from '@/components/course_module/module-state.vue'
import CourseCard from '@/components/course_module/course-card.vue'

export default {
	components: { ModuleState, CourseCard },
	data() {
		return {
			list: [],
			loading: true,
			deletingIndex: -1,
			_lastRefreshTime: 0,
			currentTab: 'todo',
			collectedIds: new Set()
		}
	},
	computed: {
		unevaluatedList() {
			return this.list.filter(c => !c.isEvaluated)
		},
		evaluatedList() {
			return this.list.filter(c => c.isEvaluated)
		},
		tabItems() {
			return [
				{ value: 'todo', label: '待评价', count: this.unevaluatedList.length },
				{ value: 'done', label: '已评价', count: this.evaluatedList.length },
				{ value: 'all', label: '全部', count: this.list.length }
			]
		},
		visibleList() {
			if (this.currentTab === 'done') return this.evaluatedList
			if (this.currentTab === 'all') return this.list
			return this.unevaluatedList
		},
		currentTabLabel() {
			if (this.currentTab === 'done') return '已完成评价'
			if (this.currentTab === 'all') return '全部课程'
			return '优先处理'
		},
		currentTabEmptyText() {
			if (this.currentTab === 'done') return '当前还没有已评价课程'
			if (this.currentTab === 'all') return '当前没有课程可展示'
			return '当前没有待评价课程'
		},
		heroSubtitle() {
			if (!this.list.length) {
				return '管理待评价与已评价课程，持续补全反馈。'
			}
			if (this.unevaluatedList.length === 0) {
				return '所有课程已完成评价，可回看或修改。'
			}
			return `还有 ${this.unevaluatedList.length} 门课程待评价。`
		},
		showLoginAction() {
			return this.storageStatus.userKey || this.storageStatus.loginCookie ? false : true
		},
		emptyDescription() {
			return '当前没有可展示的评价课程，稍后可重新进入或等待同步完成。'
		},
		storageStatus() {
			const userKey = uni.getStorageSync('userKey')
			const loginCookie = uni.getStorageSync('loginCookie')
			const courses = getAppGlobal('evaluatedCourses')
			const arr = Array.isArray(courses) ? courses : []
			return {
				userKey: !!(userKey && String(userKey).length > 0),
				loginCookie: !!(loginCookie && loginCookie.length > 10),
				evaluatedCoursesEmpty: arr.length === 0,
				evaluatedCoursesCount: arr.length
			}
		}
	},
	async onShow() {
		await ensureUserRegistered()
		this.loadCollectedIds()
		const now = Date.now()
		const needFullRefresh = now - this._lastRefreshTime > 5 * 60 * 1000
		const showSkeleton = this.list.length === 0
		if (showSkeleton) this.loading = true
		try {
			if (!this.isEvaluationStorageEmpty()) {
				if (needFullRefresh || this.list.length === 0) {
					try {
						const courses = await refreshEvaluatedStatus()
						this.list = Array.isArray(courses) ? courses : []
					} catch (e) {
						this.loadFromGlobal()
					}
				}
			} else {
				this.loadFromGlobal()
				if (this.list.length === 0) return
			}
			if (this.list.length === 0 && !this.isEvaluationStorageEmpty()) {
				await this.tryLoadEvaluationData()
			}
			if (this.list.length > 0 && needFullRefresh) {
				const ok = await this.enrichCourseStats()
				if (ok) this._lastRefreshTime = Date.now()
			}
		} finally {
			this.loading = false
		}
	},
	methods: {
		async loadCollectedIds() {
			const userKey = this.getUserKey()
			if (!userKey) return
			try {
				const rows = await fetchCollectionList({ userKey })
				const ids = new Set()
				for (const row of rows) {
					if (row.courseId) ids.add(String(row.courseId).trim().toLowerCase())
				}
				this.collectedIds = ids
			} catch (e) {
				console.warn('[evaluateManage] 加载收藏列表失败:', e?.message || e)
			}
		},
		isCourseCollected(courseId) {
			return this.collectedIds.has(String(courseId || '').trim().toLowerCase())
		},
		courseForCard(course) {
			return {
				courseId: course.md5Hash || course.courseId || '',
				lessonName: course.courseName || '',
				teacherName: course.teacherName || '',
				courseType: course.courseType || '',
				starAvgTotal: course.starAvgTotal,
				courseComment: course.courseComment,
				scoreStats: course.scoreStats
			}
		},
		isEvaluationStorageEmpty() {
			const userKey = uni.getStorageSync('userKey')
			if (userKey) return false
			const userId = uni.getStorageSync('userId')
			const userPassword = uni.getStorageSync('userPassword')
			if (userId && userPassword) return false
			const loginCookie = uni.getStorageSync('loginCookie')
			if (loginCookie && loginCookie.length > 10) return false
			return true
		},
		loadFromGlobal() {
			const app = getApp()
			let courses = (app && app.globalData && Array.isArray(app.globalData.evaluatedCourses))
				? app.globalData.evaluatedCourses
				: getAppGlobal('evaluatedCourses')
			if (!Array.isArray(courses)) courses = []
			this.list = courses
			if (courses.length > 0 && app && app.globalData && (!app.globalData.evaluatedCourses || app.globalData.evaluatedCourses.length === 0)) {
				app.globalData.evaluatedCourses = courses
				if (!app.globalData.evaluatedCourseMap) {
					const map = {}
					courses.forEach(c => {
						if (c.md5Hash) map[c.md5Hash] = { courseId: c.md5Hash, isEvaluated: c.isEvaluated, courseName: c.courseName || '', teacherName: c.teacherName || '' }
					})
					app.globalData.evaluatedCourseMap = map
					setAppGlobal('evaluatedCourseMap', map)
				}
			}
		},
		goLogin() {
			const loginUrl = '/pages/login/login?from=evaluateManage'
			if (this.isEvaluationStorageEmpty()) {
				uni.reLaunch({ url: loginUrl })
			} else {
				uni.navigateTo({ url: loginUrl })
			}
		},
		async tryLoadEvaluationData() {
			const cookie = getAppGlobal('globalCookie') || uni.getStorageSync('loginCookie') || ''
			if (!cookie || cookie.length < 10) return
			try {
				const res = await loadEvaluationData(cookie)
				if (res && res.evaluatedCourses && res.evaluatedCourses.length > 0) {
					this.list = res.evaluatedCourses
				}
			} catch (e) {}
		},
		getUserKey() {
			const app = getApp()
			let userKey = uni.getStorageSync('userKey')
			if (!userKey && app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) {
				userKey = app.globalData.userData.userKey
			}
			if (!userKey) {
				const userId = uni.getStorageSync('userId')
				const userPassword = uni.getStorageSync('userPassword')
				if (userId && userPassword) {
					userKey = md5.hexMD5(userId + userPassword)
				}
			}
			return userKey || null
		},
		async enrichCourseStats() {
			const userKey = this.getUserKey()
			if (!userKey || this.list.length === 0) return false
			try {
				const courseIds = this.list.map(c => c.md5Hash).filter(Boolean)
				if (courseIds.length === 0) return
				const batchRes = await post('App.Course.GetCourseByIds', {
					userKey,
					courseIds: JSON.stringify(courseIds)
				})
				const batchList = Array.isArray(batchRes) ? batchRes : (batchRes ? Object.values(batchRes) : [])
				const courseMap = {}
				for (const c of batchList) {
					if (c && c.courseId) courseMap[c.courseId] = c
				}
				this.list = this.list.map(course => {
					const c = courseMap[course.md5Hash]
					return {
						...course,
						courseType: (c && c.courseType) || course.courseType || '',
						scoreAvg: c && c.scoreAvg !== undefined ? c.scoreAvg : null,
						starAvgTotal: c && c.starAvgTotal !== undefined ? c.starAvgTotal : null,
						courseComment: c && c.courseComment !== undefined ? c.courseComment : null
					}
				})
				if (this.list.length > 0) await this.mergeBatchScoreStats()
				return true
			} catch (e) {
				console.warn('批量获取课程统计数据失败:', e?.message || e)
				return false
			}
		},
		async mergeBatchScoreStats() {
			const userKey = this.getUserKey()
			if (!userKey || this.list.length === 0) return
			try {
				const courseIds = this.list.map(c => c.md5Hash || c.courseId).filter(Boolean)
				if (courseIds.length === 0) return
				const batch = await post('App.UserScore.GetBatchCourseScoreStats', {
					userKey,
					courseIds: JSON.stringify(courseIds)
				})
				if (batch && typeof batch === 'object') {
					for (const course of this.list) {
						const cid = course.md5Hash || course.courseId
						if (cid && batch[cid] && batch[cid].count > 0) {
							course.scoreStats = batch[cid]
						}
					}
				}
			} catch (e) {
				console.warn('[evaluateManage] 批量成绩统计失败:', e?.message || e)
			}
		},
		async refreshStatus() {
			if (this.isEvaluationStorageEmpty()) {
				this.loadFromGlobal()
				return
			}
			try {
				const courses = await refreshEvaluatedStatus()
				this.list = Array.isArray(courses) ? courses : []
				if (this.list.length > 0) await this.enrichCourseStats()
			} catch (e) {
				console.error('刷新评价状态失败:', e)
				this.loadFromGlobal()
				if (this.list.length > 0) await this.enrichCourseStats()
			}
		},
		onLongPressEvaluated(course, index) {
			uni.showActionSheet({
				itemList: ['修改', '删除'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.goEditComment(course)
					} else if (res.tapIndex === 1) {
						this.onDeleteComment(course, index)
					}
				}
			})
		},
		goEditComment(course) {
			const courseId = course.md5Hash || ''
			if (!courseId) {
				uni.showToast({ title: '课程信息异常', icon: 'none' })
				return
			}
			const lessonName = (course.courseName || '').trim()
			const teacherName = (course.teacherName || '').trim()
			const parts = ['courseId=' + encodeURIComponent(courseId), 'edit=1']
			if (lessonName) parts.push('courseName=' + encodeURIComponent(lessonName))
			if (teacherName) parts.push('teacherName=' + encodeURIComponent(teacherName))
			uni.navigateTo({
				url: '/pages/evaluateGuide/evaluateGuide?' + parts.join('&'),
				fail: () => {
					uni.showToast({ title: '跳转失败', icon: 'none' })
				}
			})
		},
		markCourseUnevaluated(courseId) {
			const id = String(courseId).trim().toLowerCase()
			if (!id) return
			this.list = this.list.map(c => {
				const cid = (c.md5Hash || '').toLowerCase()
				if (cid === id) return { ...c, isEvaluated: false }
				return c
			})
		},
		onDeleteComment(course, index) {
			const courseId = course.md5Hash || ''
			const name = course.courseName || '该课程'
			if (!courseId) {
				uni.showToast({ title: '课程信息异常', icon: 'none' })
				return
			}
			const userKey = this.getUserKey()
			if (!userKey) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			const courseIdLower = String(courseId).trim().toLowerCase()
			uni.showModal({
				title: '确认删除',
				content: '确定要删除对「' + name + '」的评价吗？删除后可在该课程详情页重新评价。',
				success: async (res) => {
					if (!res.confirm) return
					if (this.deletingIndex >= 0) return
					this.deletingIndex = index
					try {
						await post('App.CourseComment.DeleteComment', {
							userKey,
							courseId: courseIdLower
						})
						this.markCourseUnevaluated(courseId)
						uni.showToast({ title: '已删除' })
						await this.refreshStatus()
					} catch (e) {
						const msg = (typeof e === 'string' ? e : (e && e.message)) || '删除失败'
						if (msg.indexOf('未找到该课程评价') !== -1 || msg.indexOf('CourseComment Not Found') !== -1) {
							this.markCourseUnevaluated(courseId)
							uni.showToast({ title: '已成功删除这条评论。', icon: 'none' })
							await this.refreshStatus()
						} else {
							uni.showToast({ title: msg, icon: 'none', duration: msg.length > 15 ? 3000 : 2000 })
						}
					} finally {
						this.deletingIndex = -1
					}
				}
			})
		},
		goDetail(course) {
			const courseId = course.md5Hash || ''
			if (!courseId) {
				uni.showToast({ title: '课程信息异常', icon: 'none' })
				return
			}
			const app = getApp()
			if (app && app.globalData) {
				app.globalData.evaluatedCourses = this.list
				if (!app.globalData.evaluatedCourseMap) app.globalData.evaluatedCourseMap = {}
				const map = {}
				this.list.forEach(c => {
					if (c.md5Hash) map[c.md5Hash] = c
				})
				app.globalData.evaluatedCourseMap = map
			}
			const lessonName = (course.courseName || '').trim()
			const teacherName = (course.teacherName || '').trim()
			const parts = ['courseId=' + encodeURIComponent(courseId)]
			if (lessonName) parts.push('lessonName=' + encodeURIComponent(lessonName))
			if (teacherName) parts.push('teacherName=' + encodeURIComponent(teacherName))
			uni.navigateTo({
				url: '/pages/courseDetail/courseDetail?' + parts.join('&'),
				fail: () => {
					uni.showToast({ title: '跳转失败', icon: 'none' })
				}
			})
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

/* ===== 页面标题区 ===== */
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx 32rpx 0;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
	border-bottom: 1rpx solid var(--color-border);
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
.header-title-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
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
.header-action {
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
}
.header-action-hover {
	background: rgba(30, 58, 138, 0.06);
}
.header-action-text {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--color-brand);
}
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}

/* ===== Tab 下划线切换 ===== */
.tab-bar {
	display: flex;
	gap: 48rpx;
	margin-top: 28rpx;
}
.tab-item {
	position: relative;
	padding-bottom: 20rpx;
}
.tab-item-text {
	font-size: 30rpx;
	line-height: 1.2;
	font-weight: 600;
	color: var(--color-text-secondary);
}
.tab-item-active .tab-item-text {
	color: var(--color-brand);
	font-weight: 700;
}
.tab-item-active::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 4rpx;
	border-radius: 4rpx;
	background: var(--color-brand);
}

/* ===== 页面内容区 ===== */
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 32rpx;
	padding-top: 28rpx;
	padding-bottom: calc(160rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(160rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== Section 提示 ===== */
.section-head {
	margin-bottom: 20rpx;
}
.section-meta {
	font-size: 22rpx;
	line-height: 1.2;
	color: var(--color-text-secondary);
}

/* ===== 卡片列表（与收藏页一致） ===== */
.list-stack {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

/* ===== 骨架屏（与收藏页一致） ===== */
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
.skeleton-status {
	width: 72rpx;
	height: 32rpx;
	border-radius: 6rpx;
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
.skeleton-line {
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
	border-radius: 999rpx;
}
.skeleton-line-title {
	width: 60%;
	height: 32rpx;
}
.skeleton-line-tag {
	width: 45%;
	height: 24rpx;
	margin-top: 14rpx;
}
.skeleton-line-rating {
	width: 35%;
	height: 28rpx;
	margin-top: 22rpx;
}
.skeleton-chart {
	height: 48rpx;
	border-radius: 12rpx;
	margin-top: 18rpx;
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: 0 0; }
}
</style>
