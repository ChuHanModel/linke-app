<template>
	<view class="page" :class="themeClass">
		<!-- 标题区 -->
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">林课数据库</text>
				</view>
			<text class="header-subtitle">按课程名或教师名搜索通选课。</text>

			<!-- 搜索栏 -->
			<view class="search-bar">
				<view class="search-field" :class="{ 'search-field-focus': inputFocused }">
					<input
						class="search-input"
						v-model="keyword"
						placeholder="课程名 / 教师名"
						placeholder-class="search-placeholder"
						confirm-type="search"
						@confirm="doSearch"
						@focus="inputFocused = true"
						@blur="inputFocused = false"
					/>
					<text
						v-if="keyword"
						class="search-clear"
						@tap="keyword = ''"
					>✕</text>
				</view>
				<text
					class="search-action"
					:class="{ 'search-action-disabled': loading || !keyword || !keyword.trim() }"
					hover-class="search-action-hover"
					hover-stay-time="80"
					@tap="doSearch"
				>{{ loading ? '搜索中…' : '搜索' }}</text>
			</view>
		</view>

		<view class="page-content">

			<!-- 最近搜索 / 推荐词 chips -->
			<view v-if="recentKeywords.length > 0 && resultList.length === 0 && !loading" class="recent-section">
				<view class="recent-head">
					<text class="recent-title">最近搜索</text>
					<text class="recent-action" @tap="clearRecentKeywords">清空</text>
				</view>
				<view class="recent-list">
					<text
						v-for="item in recentKeywords"
						:key="item"
						class="recent-chip"
						@tap="useRecentKeyword(item)"
					>
						{{ item }}
					</text>
				</view>
			</view>
			<!-- 未登录 -->
			<module-state
				v-if="!userKey && !loading"
				icon="⌁"
				title="登录后可搜索完整课程数据"
				description="完成教务系统登录后，才能查询课程名称、教师、评分和成绩分布。"
				action-text="去登录"
				@action="goLogin"
			/>

			<!-- 加载中骨架屏 -->
			<view v-else-if="loading" class="list-stack">
				<view v-for="idx in 3" :key="'search-skeleton-' + idx" class="skeleton-card">
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

			<!-- 空结果 -->
			<module-state
				v-else-if="searched && resultList.length === 0"
				icon="⌕"
				title="没找到相关课程"
				description="换一个课程名、教师名，或者缩短关键词试试看。"
				secondary-text="比如直接搜老师姓名，往往比搜完整课程名更容易命中。"
			/>

			<!-- 搜索结果 -->
			<view v-else-if="resultList.length > 0">
				<view class="section-head">
					<text class="section-note">"{{ searchedKeyword }}" 共找到 {{ resultList.length }} 门相关课程</text>
				</view>
				<view class="list-stack">
					<course-card
						v-for="(item, index) in resultList"
						:key="item.courseId || index"
						:course="item"
						:show-bookmark="isCourseCollected(item.courseId)"
						@select="goDetail"
					/>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import api from '@/utils/api.js'
import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'
import { fetchCollectionList } from '@/services/course/courseCollectionService.js'
import ModuleState from '@/components/course_module/module-state.vue'
import CourseCard from '@/components/course_module/course-card.vue'

const SEARCH_HISTORY_KEY = 'course_search_recent_keywords'


export default {
	components: { ModuleState, CourseCard },
	data() {
		return {
			keyword: '',
			loading: false,
			searched: false,
			userKey: '',
			resultList: [],
			recentKeywords: [],
			searchedKeyword: '',
			inputFocused: false,
			collectedIds: new Set(),
		}
	},
	onLoad(options) {
		this.resolveUserKey()
		this.loadRecentKeywords()
		if (options && options.keyword) {
			try {
				this.keyword = decodeURIComponent(options.keyword)
			} catch (e) {
				this.keyword = options.keyword
			}
			if (this.keyword && this.keyword.trim()) {
				this.$nextTick(() => {
					this.doSearch()
				})
			}
		}
	},
	watch: {
		keyword(val) {
			if (!val || !val.trim()) {
				this.resultList = []
				this.searched = false
			}
		}
	},
	async onShow() {
		this.resolveUserKey()
		await this.loadCollectedIds()
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
		async doSearch() {
			const kw = (this.keyword || '').trim()
			if (!kw) {
				uni.showToast({ title: '请输入课程名称或上课教师', icon: 'none' })
				return
			}
			if (!this.userKey) {
				uni.showToast({ title: '请先完成登录', icon: 'none' })
				return
			}
			this.loading = true
			this.searched = true
			this.searchedKeyword = kw
			this.resultList = []
			this.saveRecentKeyword(kw)
			try {
				const res = await api.post('App.Course.GetCourseByNameLike', {
					userKey: this.userKey,
					nameLike: kw
				})
				if (Array.isArray(res.list) && res.list.length >= 0) {
					this.resultList = res.list
				} else {
					const byName = res.LessonName || []
					const byTeacher = res.TeacherName || []
					const seen = new Set()
					const list = []
					;[].concat(byName, byTeacher).forEach(c => {
						const id = c.courseId
						if (id && !seen.has(id)) {
							seen.add(id)
							list.push(c)
						}
					})
					this.resultList = list
				}
				if (this.resultList.length > 0) {
					await this.mergeBatchScoreStats()
				}
			} catch (err) {
				console.error('搜索失败:', err)
				uni.showToast({ title: err && (err.message || err) || '搜索失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		loadRecentKeywords() {
			try {
				const rows = uni.getStorageSync(SEARCH_HISTORY_KEY)
				this.recentKeywords = Array.isArray(rows) ? rows.slice(0, 6) : []
			} catch (e) {
				this.recentKeywords = []
			}
		},
		saveRecentKeyword(keyword) {
			const normalized = String(keyword || '').trim()
			if (!normalized) return
			const next = [normalized].concat(this.recentKeywords.filter(item => item !== normalized)).slice(0, 6)
			this.recentKeywords = next
			try {
				uni.setStorageSync(SEARCH_HISTORY_KEY, next)
			} catch (e) {}
		},
		clearRecentKeywords() {
			this.recentKeywords = []
			try {
				uni.removeStorageSync(SEARCH_HISTORY_KEY)
			} catch (e) {}
		},
		useRecentKeyword(keyword) {
			this.keyword = keyword
			this.doSearch()
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
			if (item.lessonName) url += `&lessonName=${encodeURIComponent(item.lessonName)}`
			if (item.teacherName) url += `&teacherName=${encodeURIComponent(item.teacherName)}`
			uni.navigateTo({ url })
		},
		async mergeBatchScoreStats() {
			if (!this.userKey || this.resultList.length === 0) return
			try {
				const courseIds = this.resultList.map(c => c.courseId).filter(Boolean)
				if (courseIds.length === 0) return
				const batch = await post('App.UserScore.GetBatchCourseScoreStats', {
					userKey: this.userKey,
					courseIds: JSON.stringify(courseIds)
				})
				if (batch && typeof batch === 'object') {
					for (const item of this.resultList) {
						const cid = item.courseId
						if (cid && batch[cid] && batch[cid].count > 0) {
							item.scoreStats = batch[cid]
						}
					}
				}
			} catch (e) {
				console.warn('[search] 批量成绩统计失败:', e?.message || e)
			}
		},
		async loadCollectedIds() {
			if (!this.userKey) return
			try {
				const rows = await fetchCollectionList({ userKey: this.userKey })
				const ids = new Set()
				for (const row of rows) {
					if (row.courseId) ids.add(String(row.courseId).trim().toLowerCase())
				}
				this.collectedIds = ids
			} catch (e) {
				console.warn('[search] 加载收藏列表失败:', e?.message || e)
			}
		},
		isCourseCollected(courseId) {
			return this.collectedIds.has(String(courseId || '').trim().toLowerCase())
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

/* ===== 页面标题区（参考收藏页） ===== */
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

/* ===== 搜索栏 ===== */
.search-bar {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-top: 28rpx;
}
.search-field {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12rpx;
	height: 80rpx;
	padding: 0 24rpx;
	background: var(--color-bg-input);
	border-radius: 16rpx;
	border: 2rpx solid var(--color-border);
	transition: border-color 0.2s;
}
.search-field-focus {
	border-color: var(--color-brand);
}
.search-input {
	flex: 1;
	height: 80rpx;
	font-size: 28rpx;
	color: var(--color-text-primary);
	background: transparent;
	border: none;
}
.search-placeholder {
	color: var(--color-text-secondary);
	font-weight: 400;
}
.search-clear {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	flex-shrink: 0;
	padding: 8rpx;
	line-height: 1;
}
.search-action {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-brand);
	flex-shrink: 0;
	padding: 8rpx 4rpx;
	white-space: nowrap;
}
.search-action-hover {
	opacity: 0.6;
}
.search-action-disabled {
	color: var(--color-text-secondary);
}

/* ===== 最近搜索 / 推荐词 ===== */
.recent-section {
	margin-bottom: 28rpx;
}
.recent-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}
.recent-title {
	font-size: 24rpx;
	line-height: 1.2;
	font-weight: 700;
	color: var(--color-text-tertiary);
}
.recent-action {
	font-size: 22rpx;
	color: var(--color-brand);
}
.recent-list {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 16rpx;
}
.recent-chip {
	padding: 10rpx 20rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	border: 1rpx solid var(--color-border);
	font-size: 24rpx;
	color: var(--color-text-tertiary);
}

/* ===== 内容区 ===== */
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 32rpx;
	padding-top: 28rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== 搜索结果区 ===== */
.section-head {
	margin-bottom: 20rpx;
}
.section-note {
	font-size: 24rpx;
	line-height: 1.5;
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
