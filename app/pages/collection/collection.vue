<template>
	<view class="page" :class="themeClass">
		<!-- 标题区：白色背景，顶到最上 -->
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">我的收藏</text>
				<view v-if="userKey && !loading" class="header-badge">
					<text class="header-badge-text">{{ list.length }}</text>
				</view>
			</view>
			<text class="header-subtitle">已收藏的通选课程。</text>
		</view>
		<view class="page-content">

			<!-- 未登录 -->
			<module-state
				v-if="!userKey && !loading"
				icon="⌁"
				title="登录后可查看你收藏的课程"
				description="先完成教务系统登录，系统才知道你的收藏列表。"
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
						<view class="skeleton-bookmark"></view>
					</view>
					<view class="skeleton-line skeleton-line-rating"></view>
					<view class="skeleton-chart"></view>
				</view>
			</view>

			<!-- 空列表 -->
			<module-state
				v-else-if="list.length === 0"
				icon="♡"
				title="你还没有收藏课程"
				description="可以在课程详情页点击收藏，之后会自动出现在这里。"
			/>

			<!-- 收藏列表 -->
			<view v-else class="list-stack">
				<course-card
					v-for="(item, index) in list"
					:key="item.courseId + '-' + index"
					:course="item"
					:show-bookmark="true"
					@select="goDetail"
				/>
			</view>
		</view>
	</view>
</template>

<script>
import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'
import { fetchCollectionList, consumeCollectionListDirtyFlag } from '@/services/course/courseCollectionService.js'
import ModuleState from '@/components/course_module/module-state.vue'
import CourseCard from '@/components/course_module/course-card.vue'
export default {
	components: { ModuleState, CourseCard },
	data() {
		return {
			userKey: '',
			loading: false,
			list: [],
			hasLoaded: false,
			refreshing: false,
			lastLoadedUserKey: ''
		}
	},
	async onLoad() {
		await ensureUserRegistered()
		this.resolveUserKey()
	},
	async onShow() {
		const prevUserKey = this.userKey
		this.resolveUserKey()
		if (!this.userKey) {
			this.loading = false
			this.list = []
			this.hasLoaded = false
			this.refreshing = false
			this.lastLoadedUserKey = ''
			return
		}
		const userChanged = !!prevUserKey && prevUserKey !== this.userKey
		if (!this.hasLoaded || userChanged) {
			await this.loadList({
				showLoading: true,
				resetList: userChanged || this.list.length === 0,
				forceRefresh: userChanged,
				showError: true
			})
			return
		}
		if (consumeCollectionListDirtyFlag()) {
			await this.loadList({
				showLoading: false,
				resetList: false,
				forceRefresh: true,
				showError: false
			})
		}
	},
	methods: {
		resolveUserKey() {
			const app = getApp()
			if (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) {
				this.userKey = app.globalData.userData.userKey
				return
			}
			try {
				const key = uni.getStorageSync('userKey')
				if (key) {
					this.userKey = key
					return
				}
			} catch (e) {}
			const userId = uni.getStorageSync('userId')
			const userPassword = uni.getStorageSync('userPassword')
			if (userId && userPassword) {
				this.userKey = md5.hexMD5(userId + userPassword)
			}
		},
		async loadList(options = {}) {
			if (!this.userKey || this.refreshing) return
			const {
				showLoading = true,
				resetList = true,
				forceRefresh = false,
				showError = true
			} = options
			this.refreshing = true
			if (showLoading) this.loading = true
			if (resetList) this.list = []
			try {
				const rows = await fetchCollectionList({
					userKey: this.userKey,
					forceRefresh
				})
				if (rows.length === 0) {
					this.list = []
					this.hasLoaded = true
					this.lastLoadedUserKey = this.userKey
					this.loading = false
					return
				}
				const courseIds = rows.map(r => r.courseId).filter(Boolean)
				let courseMap = {}
				try {
					const batchRes = await post('App.Course.GetCourseByIds', {
						userKey: this.userKey,
						courseIds: JSON.stringify(courseIds)
					})
					const batchList = Array.isArray(batchRes) ? batchRes : (batchRes ? Object.values(batchRes) : [])
					for (const c of batchList) {
						if (c && c.courseId) courseMap[c.courseId] = c
					}
				} catch (e) {
					console.warn('批量课程接口失败，降级逐个查询:', e?.message || e)
				}
				this.list = courseIds.map(cid => {
					const c = courseMap[cid]
					return {
						courseId: cid,
						lessonName: (c && (c.lessonName || c._lessonName)) || '课程信息暂无',
						courseName: (c && (c.lessonName || c._lessonName)) || '课程信息暂无',
						teacherName: (c && (c.teacherName || c._teacherName)) || '',
						lessonCredit: (c && (c.lessonCredit || c._lessonCredit)) || '',
						courseType: (c && c.courseType) || '',
						scoreAvg: c && c.scoreAvg !== undefined ? c.scoreAvg : null,
						starAvgTotal: c && c.starAvgTotal !== undefined ? c.starAvgTotal : null,
						courseComment: c && c.courseComment !== undefined ? c.courseComment : null
					}
				})
				if (this.list.length > 0) {
					await this.mergeBatchScoreStats()
				}
				this.hasLoaded = true
				this.lastLoadedUserKey = this.userKey
			} catch (err) {
				console.error('加载收藏失败:', err, '| code:', err?.code, '| details:', JSON.stringify(err?.details || null))
				if (!showError) {
					try {
						const app = getApp()
						if (app && app.globalData) app.globalData.collectionListDirty = true
					} catch (e) {}
				}
				if (showError) {
					uni.showToast({ title: (err && (err.message || err)) || '加载失败', icon: 'none' })
				}
			} finally {
				this.loading = false
				this.refreshing = false
			}
		},
		goDetail(item) {
			const courseId = item.courseId
			if (!courseId) return
			const app = getApp()
			if (app && app.globalData) {
				if (!app.globalData.courseDetailPreload) app.globalData.courseDetailPreload = {}
				app.globalData.courseDetailPreload[courseId] = { ...item }
			}
			let url = `/pages/courseDetail/courseDetail?courseId=${encodeURIComponent(courseId)}`
			const lessonName = item.lessonName || item.courseName
			const teacherName = item.teacherName
			if (lessonName && lessonName !== '课程信息暂无') url += `&lessonName=${encodeURIComponent(lessonName)}`
			if (teacherName) url += `&teacherName=${encodeURIComponent(teacherName)}`
			uni.navigateTo({ url })
		},
		async mergeBatchScoreStats() {
			if (!this.userKey || this.list.length === 0) return
			try {
				const courseIds = this.list.map(c => c.courseId).filter(Boolean)
				if (courseIds.length === 0) return
				const batch = await post('App.UserScore.GetBatchCourseScoreStats', {
					userKey: this.userKey,
					courseIds: JSON.stringify(courseIds)
				})
				if (batch && typeof batch === 'object') {
					for (const item of this.list) {
						const cid = item.courseId
						if (cid && batch[cid] && batch[cid].count > 0) {
							item.scoreStats = batch[cid]
						}
					}
				}
			} catch (e) {
				console.warn('[collection] 批量成绩统计失败:', e?.message || e)
			}
		},
		goLogin() {
			uni.navigateTo({ url: JW_LOGIN_PAGE })
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
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 32rpx;
	padding-top: 28rpx;
	padding-bottom: calc(160rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(160rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== 页面标题区 ===== */
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
	border-bottom: none;
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
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}

/* ===== 卡片列表 ===== */
.list-stack {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

/* ===== 骨架屏 ===== */
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
.skeleton-bookmark {
	width: 40rpx;
	height: 48rpx;
	border-radius: 8rpx;
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
