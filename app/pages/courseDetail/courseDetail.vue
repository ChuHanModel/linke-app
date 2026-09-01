<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<template v-if="courseData">
					<text class="header-title">{{ courseData.lessonName || courseData.courseName || '课程详情' }}</text>
				</template>
				<template v-else-if="loading">
					<view class="skeleton-header-title sk-shimmer"></view>
				</template>
				<template v-else>
					<text class="header-title">课程详情</text>
				</template>
			</view>
			<view v-if="courseData" class="header-meta-row">
				<text class="header-subtitle">{{ courseData.teacherName || '暂无授课教师' }}</text>
				<text
					class="header-tag"
					:class="{
						'header-tag-done': courseData.isEvaluated,
						'header-tag-view': !courseData.hasEvaluationPermission
					}"
				>
					{{ !courseData.hasEvaluationPermission ? '仅浏览' : (courseData.isEvaluated ? '已评价' : '待评价') }}
				</text>
			</view>
			<view v-else-if="loading" class="header-meta-row">
				<view class="skeleton-header-sub sk-shimmer"></view>
			</view>
		</view>

		<view class="content">

			<!-- Skeleton: Full Page -->
			<view v-if="loading" class="skeleton-body">
				<!-- Skeleton: Facts Card -->
				<view class="skeleton-section">
					<view class="skeleton-section-title sk-shimmer"></view>
					<view class="skeleton-card">
						<view v-for="idx in 5" :key="'sk-fact-' + idx" class="skeleton-fact-row">
							<view class="skeleton-fact-label sk-shimmer"></view>
							<view class="skeleton-fact-value sk-shimmer"></view>
						</view>
					</view>
				</view>
				<!-- Skeleton: Score Section -->
				<view class="skeleton-section">
					<view class="skeleton-section-title sk-shimmer"></view>
					<view class="skeleton-card">
						<view class="skeleton-chart-bar sk-shimmer"></view>
						<view class="skeleton-chip-row">
							<view class="skeleton-chip sk-shimmer"></view>
							<view class="skeleton-chip sk-shimmer"></view>
							<view class="skeleton-chip sk-shimmer"></view>
						</view>
					</view>
				</view>
				<!-- Skeleton: Review Section -->
				<view class="skeleton-section">
					<view class="skeleton-section-title sk-shimmer"></view>
					<view class="skeleton-card">
						<view v-for="idx in 2" :key="'sk-review-' + idx" class="skeleton-review">
							<view class="skeleton-review-head">
								<view class="skeleton-avatar sk-shimmer"></view>
								<view class="skeleton-review-meta">
									<view class="skeleton-review-name sk-shimmer"></view>
									<view class="skeleton-review-stars sk-shimmer"></view>
								</view>
							</view>
							<view class="skeleton-review-body sk-shimmer"></view>
							<view class="skeleton-review-body skeleton-review-body-short sk-shimmer"></view>
						</view>
					</view>
				</view>
			</view>

			<!-- Error State -->
			<view v-else-if="errorMessage" class="state-panel state-panel-error">
				<text class="error-text">{{ errorMessage }}</text>
			</view>

			<template v-if="courseData && !loading && !errorMessage">
				<!-- Course Facts Section: Skeleton -->
				<view v-if="!detailLoaded" class="section">
					<view class="skeleton-section-title sk-shimmer"></view>
					<view class="skeleton-card">
						<view v-for="idx in 6" :key="'sk-fact-full-' + idx" class="skeleton-fact-row">
							<view class="skeleton-fact-label sk-shimmer"></view>
							<view class="skeleton-fact-value sk-shimmer"></view>
						</view>
					</view>
				</view>
				<!-- Course Facts Section: Real -->
					<view v-else class="section">
						<view class="section-head">
							<view class="section-title-wrap">
								<text class="section-title">基本信息</text>
							</view>
							<view v-if="availableTerms.length > 1" class="section-meta-chip term-meta-chip" @tap="showTermPicker">
								<text class="section-meta-chip-label">学期（点击切换）</text>
								<text class="section-meta-chip-value">{{ availableTerms[selectedTermIndex] }}</text>
								<text class="term-meta-chip-arrow">▾</text>
							</view>
							<view v-else-if="availableTerms.length === 1" class="section-meta-chip term-meta-chip">
								<text class="section-meta-chip-label">学期</text>
								<text class="section-meta-chip-value">{{ availableTerms[0] }}</text>
							</view>
						</view>
					<view class="card facts-card">
							<view class="fact-row">
								<text class="fact-label">校区</text>
								<text class="fact-value">{{ courseData.lessonCampus || '—' }}</text>
							</view>
							<view class="fact-row">
								<text class="fact-label">学院</text>
								<text class="fact-value">{{ courseData.lessonCollege || '—' }}</text>
							</view>
							<view class="fact-row">
								<text class="fact-label">学分</text>
								<text class="fact-value">{{ courseData.lessonCredit || '—' }}</text>
							</view>
							<view class="fact-row">
								<text class="fact-label">周次</text>
								<text class="fact-value">{{ courseData.lessonWeek || '—' }}</text>
							</view>
							<view class="fact-row">
								<text class="fact-label">时间</text>
								<text class="fact-value">{{ courseData.lessonTime || '—' }}</text>
							</view>
							<view class="fact-row">
								<text class="fact-label">地点</text>
								<text class="fact-value">{{ courseData.lessonLocation || '—' }}</text>
							</view>
					</view>
				</view>

				<!-- Score & Comment Loading Skeleton -->
				<view v-if="scoreStatsLoading || commentsLoading" class="skeleton-score-comment">
					<!-- Skeleton: Score Section -->
					<view class="skeleton-section">
						<view class="skeleton-section-title sk-shimmer"></view>
						<view class="skeleton-card">
							<view class="skeleton-chart-bar sk-shimmer"></view>
							<view class="skeleton-chip-row">
								<view class="skeleton-chip sk-shimmer"></view>
								<view class="skeleton-chip sk-shimmer"></view>
								<view class="skeleton-chip sk-shimmer"></view>
							</view>
						</view>
					</view>
					<!-- Skeleton: Review Section -->
					<view class="skeleton-section">
						<view class="skeleton-section-title sk-shimmer"></view>
						<view class="skeleton-card">
							<view v-for="idx in 2" :key="'sk-review-sc-' + idx" class="skeleton-review">
								<view class="skeleton-review-head">
									<view class="skeleton-avatar sk-shimmer"></view>
									<view class="skeleton-review-meta">
										<view class="skeleton-review-name sk-shimmer"></view>
										<view class="skeleton-review-stars sk-shimmer"></view>
									</view>
								</view>
								<view class="skeleton-review-body sk-shimmer"></view>
								<view class="skeleton-review-body skeleton-review-body-short sk-shimmer"></view>
							</view>
						</view>
					</view>
				</view>
				<view v-else-if="!showScoreCommentBlock" class="state-panel state-panel-compact">
					<text class="state-text">暂无成绩分布与评价数据</text>
				</view>
				<template v-else>
						<!-- Score Distribution Section -->
						<view class="section">
							<view class="section-head">
								<view class="section-title-wrap">
									<text class="section-title">成绩分布</text>
								</view>
								<view class="section-meta-chip">
								<text class="section-meta-chip-value">{{ scoreCountText }}</text>
								<text class="section-meta-chip-label">样本参考</text>
							</view>
						</view>
						<CourseDetailScoreSection :score-stats="scoreStats" :loading="false" />
					</view>

						<!-- Rating & Review Section -->
						<view class="section">
							<view class="section-head">
								<view class="section-title-wrap">
									<text class="section-title">评分与评价</text>
								</view>
								<view class="section-meta-chip">
								<text class="section-meta-chip-value">{{ commentCountText }}</text>
								<text class="section-meta-chip-label">评价</text>
							</view>
						</view>
						<view class="card review-card">
							<!-- Rating Summary -->
							<view v-if="courseRating && courseRating.starAvgTotal != null" class="rating-summary">
								<view class="rating-overall">
									<text class="rating-score">{{ formatRating(courseRating.starAvgTotal) }}</text>
									<text class="rating-caption">综合评分</text>
								</view>
								<view class="rating-dimensions">
									<view class="rating-dimension">
										<text class="rating-dimension-label">内容价值</text>
										<view class="rating-dimension-track">
											<view class="rating-dimension-fill rating-dimension-fill-primary" :style="{ width: getDimBarWidth(courseRating.starAvg1 != null ? courseRating.starAvg1 : ratingAvgFromComments(1)) + '%' }"></view>
										</view>
										<text class="rating-dimension-value">{{ formatRating(courseRating.starAvg1 != null ? courseRating.starAvg1 : ratingAvgFromComments(1)) }}</text>
									</view>
									<view class="rating-dimension">
										<text class="rating-dimension-label">管理轻松度</text>
										<view class="rating-dimension-track">
											<view class="rating-dimension-fill rating-dimension-fill-warn" :style="{ width: getDimBarWidth(courseRating.starAvg2 != null ? courseRating.starAvg2 : ratingAvgFromComments(2)) + '%' }"></view>
										</view>
										<text class="rating-dimension-value">{{ formatRating(courseRating.starAvg2 != null ? courseRating.starAvg2 : ratingAvgFromComments(2)) }}</text>
									</view>
									<view class="rating-dimension">
										<text class="rating-dimension-label">良师指数</text>
										<view class="rating-dimension-track">
											<view class="rating-dimension-fill rating-dimension-fill-primary" :style="{ width: getDimBarWidth(courseRating.starAvg3 != null ? courseRating.starAvg3 : ratingAvgFromComments(3)) + '%' }"></view>
										</view>
										<text class="rating-dimension-value">{{ formatRating(courseRating.starAvg3 != null ? courseRating.starAvg3 : ratingAvgFromComments(3)) }}</text>
									</view>
								</view>
							</view>

							<!-- Filter Dropdown -->
							<view v-if="comments.length > 0" class="review-toolbar">
								<view class="comment-filter-left">
									<view class="comment-filter-main" @tap="showFilterDropdown = !showFilterDropdown">
										<text class="comment-filter-text">
											{{ commentFilterOptions.find(item => item.value === commentFilter)?.label }}{{ commentFilter !== 'all' ? ' (' + getRangeCount(commentFilter) + ')' : '' }}
										</text>
										<text class="comment-filter-arrow" :class="{ 'comment-filter-arrow-open': showFilterDropdown }">▾</text>
									</view>
									<view v-if="showFilterDropdown" class="comment-filter-dropdown">
										<view
											v-for="item in commentFilterOptions"
											:key="item.value"
											class="comment-filter-dropdown-item"
											:class="{ 'comment-filter-dropdown-item-active': commentFilter === item.value }"
											@tap="onSelectFilter(item.value)"
										>
											<text class="comment-filter-dropdown-text">
												{{ item.label }}{{ item.value !== 'all' ? ' (' + getRangeCount(item.value) + ')' : '' }}
											</text>
										</view>
									</view>
								</view>
								<view class="sort-row">
									<view
										v-for="item in commentSortOptions"
										:key="item.value"
										class="sort-chip"
										:class="{ 'sort-chip-active': commentSort === item.value }"
										@tap="commentSort = item.value"
									>
										<text class="sort-chip-text">{{ item.label }}</text>
									</view>
								</view>
							</view>
							<view v-if="showFilterDropdown" class="filter-dropdown-mask" @tap="showFilterDropdown = false"></view>

							<!-- Empty State -->
							<view v-if="comments.length === 0" class="review-empty">
								<text class="review-empty-title">暂无评价</text>
								<text v-if="courseData.hasEvaluationPermission && !courseData.isEvaluated" class="review-empty-hint">成为第一个评价的人吧</text>
							</view>
							<view v-else-if="filteredComments.length === 0" class="review-empty">
								<text class="review-empty-title">{{ commentFilter === 'all' ? '暂无评论' : '暂无该分数段评论' }}</text>
							</view>

							<!-- Review List -->
							<view v-else class="review-list">
								<view
									v-for="(comment, index) in sortedComments"
									:key="comment.commentId || index"
									class="review-item"
								>
									<view class="review-head">
										<view class="review-user">
											<view class="review-avatar" :class="{ 'review-avatar-primary': isHighComment(comment), 'review-avatar-muted': !isHighComment(comment) }">
												<text class="review-avatar-text">{{ getCommentAvatarText(comment, index) }}</text>
											</view>
											<view class="review-copy">
												<text class="review-name">{{ getCommentDisplayName(comment, index) }}</text>
												<view class="review-meta">
													<view class="review-stars">
														<text
															v-for="starIndex in 5"
															:key="'star-' + index + '-' + starIndex"
															class="review-star"
															:class="{ 'review-star-empty': starIndex > getCommentStarsFilled(comment) }"
														>{{ starIndex <= getCommentStarsFilled(comment) ? '★' : '☆' }}</text>
													</view>
													<text
														v-if="comment.commenterScore != null && comment.commenterScore !== ''"
														class="score-badge"
														:class="{
															'score-badge-success': isHighComment(comment),
															'score-badge-info': !isHighComment(comment)
														}"
													>{{ comment.commenterScore }}分</text>
													<text v-else class="score-badge score-badge-muted">未显示成绩</text>
												</view>
											</view>
										</view>
										<text class="review-date">{{ formatTime(comment.commentTime) }}</text>
									</view>

										<text v-if="comment.commentMessage && comment.commentMessage.trim()" class="review-body">{{ comment.commentMessage }}</text>
									<text v-else class="review-body review-body-empty">该评价暂无文字内容</text>

									<!-- Like Button -->
									<view
										v-if="courseData && courseData.hasEvaluationPermission"
										class="review-like"
										:class="{ 'review-like-active': comment.hasLiked }"
										@tap.stop="onLikeComment(comment)"
									>
										<text class="review-like-icon" :class="{ 'review-like-icon-active': comment.hasLiked }">{{ comment.hasLiked ? '♥' : '♡' }}</text>
										<text v-if="comment.likeCount" class="review-like-count" :class="{ 'review-like-count-active': comment.hasLiked }">{{ comment.likeCount }}</text>
									</view>
								</view>
							</view>

							<!-- View All Button -->
							<view v-if="commentHasMore" class="view-all-button" @tap="loadMoreComments">
								<text class="view-all-text">{{ commentLoadingMore ? '加载中...' : '查看全部评价' }}</text>
							</view>
						</view>
					</view>
				</template>
			</template>
		</view>

		<!-- Bottom Action Bar -->
		<view v-if="courseData && !loading && !errorMessage" class="bottom-bar">
			<button
				class="action-button action-button-secondary"
				:class="{ 'action-button-secondary-active': isCollected, 'action-button-disabled': collectionLoading }"
				:disabled="collectionLoading"
				@tap="toggleCollect"
			>
				<view class="action-button-inner">
					<Icon icon="lucide:heart" class="action-button-icon-el" />
					<text class="action-button-text action-button-text-secondary">{{ collectionLoading ? '处理中...' : (isCollected ? '已收藏' : '收藏') }}</text>
				</view>
			</button>
			<button
				class="action-button action-button-primary"
				:class="{ 'action-button-primary-disabled': !courseData.hasEvaluationPermission || courseData.isEvaluated }"
				:disabled="!courseData.hasEvaluationPermission || courseData.isEvaluated"
				@tap="goEvaluateGuide"
			>
				<view class="action-button-inner">
					<Icon icon="lucide:square-pen" class="action-button-icon-el" />
					<text class="action-button-text">{{ !courseData.hasEvaluationPermission ? '无评价权限' : (courseData.isEvaluated ? '已评价' : '去评价') }}</text>
				</view>
			</button>
		</view>
	</view>
</template>


<script>
import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { refreshEvaluatedStatus } from '@/utils/evaluationLoader.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { Icon } from '@iconify/vue'
import CourseDetailScoreSection from '@/components/course_detail_score_section/course-detail-score-section.vue'
import {
	applyInitialCourseDetailState,
	buildInitialCourseDetailState,
	buildCourseDetailViewModel,
	fetchCourseDetailByTerm,
	fetchCourseTermsByCourseId,
	redirectToCourseDetailLogin,
	resolveEvaluatedCourseInfo,
	resolveCourseDetailUserKey
} from '@/services/course/courseDetailService.js'
import {
	COURSE_COMMENT_PAGE_SIZE,
	fetchCourseCommentCount,
	fetchCourseComments,
	fetchCourseRating,
	likeCourseComment
} from '@/services/course/courseCommentService.js'
import {
	createCourseCollection,
	fetchCollectionStatus,
	removeCourseCollection
} from '@/services/course/courseCollectionService.js'
import {
	buildEmptyScoreStats,
	fetchCourseScoreStats
} from '@/services/course/courseAnalyticsService.js'

export default {
	components: { Icon, CourseDetailScoreSection },
	data() {
		return {
			courseId: '',  // MD5加密的courseId
			lessonName: '',  // 课程名称（用于按 courseId 查不到时的后备查询）
			teacherName: '',  // 教师姓名（用于后备查询）
			courseData: null,
			loading: true,
			errorMessage: '',
			comments: [],  // 课程评论列表
			commentsLoading: true,  // 评论加载状态（初始 true 避免首帧显示空态再闪成内容）
			commentPage: 1,  // 当前评论页码
			commentHasMore: false,  // 是否还有更多评论
			commentLoadingMore: false,  // 加载更多中
			commentFilter: 'all',  // 全部 | high | normal | low
			commentSort: 'likeDesc',  // timeDesc 发布最新 | likeDesc 点赞最多（默认）
			showFilterDropdown: false,  // 控制筛选下拉菜单显示
			scoreStats: null,  // 成绩统计
			scoreStatsLoading: true,  // 成绩统计加载状态（初始 true 避免首帧闪烁）
			isCollected: false,  // 当前课程是否已收藏
			collectionLoading: false,  // 收藏操作加载中
			commentCountDots: '·',  // 评论数加载中动态显示 · / ·· / ···
			commentCountDotsTimer: null,
			commentCountFromApi: null,  // 由 getCommentCount 接口返回的评论数，用于 Tab 显示（与列表可能不同步时仍能显示正确数字）
			availableTerms: [],  // 可用学期列表
			selectedTermIndex: 0,  // 当前选中的学期索引
			courseDataByTerm: {},  // 按学期组织的课程数据
			currentSelectedTerm: null,  // 当前选中的学期（courseTerm）
			detailLoaded: false,   // 是否已加载详细课程信息（多学期、学分/地点等）
			detailLoading: false,   // 课程信息加载状态
			courseRating: null,  // 课程评分统计（从userComment表计算）
			_hasShownOnce: false,   // 是否已展示过（用于 onShow 避免首次重复拉取评论导致闪烁）
			hasPreloadInfo: false,  // 是否已用列表预填过课程信息（有则课程信息区首屏即展示，不显示「加载课程信息中」）
		}
		},
		watch: {
		commentsLoading(loading) {
			if (loading) {
				this.commentCountDots = '·'
				this.commentCountDotsTimer = setInterval(() => {
					this.commentCountDots = this.commentCountDots === '·' ? '··' : this.commentCountDots === '··' ? '···' : '·'
				}, 400)
			} else {
				if (this.commentCountDotsTimer) {
					clearInterval(this.commentCountDotsTimer)
					this.commentCountDotsTimer = null
				}
			}
		}
	},
	onUnload() {
		if (this.commentCountDotsTimer) {
			clearInterval(this.commentCountDotsTimer)
			this.commentCountDotsTimer = null
		}
	},
	async onShow() {
		if (!this.courseId) return
		const isFirstShow = !this._hasShownOnce
		if (isFirstShow) this._hasShownOnce = true
		// 仅在有刷新标记（从评价页返回）或非首次展示时刷新，避免首次进入时与 onLoad 内的 loadComments 重复请求导致闪烁
		let needRefresh = false
		try {
			const flag = uni.getStorageSync('courseDetailRefreshCourseId')
			const idLower = String(this.courseId).trim().toLowerCase()
			if (flag && idLower === String(flag).toLowerCase()) {
				uni.removeStorageSync('courseDetailRefreshCourseId')
				needRefresh = true
			}
		} catch (e) {}
		if (needRefresh || !isFirstShow) {
			await this.refreshEvaluationStatus()
		}
	},
	onLoad(options) {
		const userKey = resolveCourseDetailUserKey()
		if (!userKey) {
			redirectToCourseDetailLogin()
			return
		}

		const initialState = buildInitialCourseDetailState(options)
		if (initialState.valid) {
			applyInitialCourseDetailState(this, initialState)
			this.loading = false
			// 首屏即加载评论、成绩统计、评分统计、收藏状态，供 Tab 显示
			this.loadComments(userKey)
			this.checkCollectionStatus(userKey)
			// 成绩统计可不登录访问，有 courseId 即请求
			this.loadScoreStats(userKey || '')
			this.loadCourseRating()
			// 默认展开：自动加载课程详情（学分、校区、多学期等）
			this.loadDetailThenShow()
		} else {
			this.errorMessage = '缺少课程ID参数'
			this.loading = false
		}
	},
	computed: {
		/** 是否有成绩或评价数据（用于决定是否展示成绩/评价 Tab 区域；加载完成且两者都没有则不展示） */
		showScoreCommentBlock() {
			if (this.scoreStatsLoading || this.commentsLoading) return false
			const hasScore = this.scoreStats && Number(this.scoreStats.count) > 0
			const hasRating = this.courseRating && this.courseRating.starAvgTotal != null
			const hasCommentCount = this.commentCountFromApi != null && Number(this.commentCountFromApi) > 0
			const hasComments = Array.isArray(this.comments) && this.comments.length > 0
			return hasScore || hasRating || hasCommentCount || hasComments
		},
		/** 成绩区块标题括号内显示的人数（加载中显示 ·，与评价一致） */
		scoreCountText() {
			if (this.scoreStatsLoading) return '·'
			if (this.scoreStats && this.scoreStats.count !== undefined && this.scoreStats.count !== null) return this.scoreStats.count + '人'
			return '0人'
		},
		/** Tab「评价」括号内显示的数量（加载中显示 ·，否则为数字+条） */
		commentCountText() {
			if (this.commentsLoading) return this.commentCountDots
			let count = 0
			if (this.commentCountFromApi != null && this.commentCountFromApi !== 0) count = this.commentCountFromApi
			else if (this.comments && this.comments.length > 0) count = this.comments.length
			else if (this.courseRating && this.courseRating.starCount != null && this.courseRating.starCount > 0) count = this.courseRating.starCount
			return count + '条'
		},
		/** 评论筛选选项：全部 + 高分(90+) + 四分档 + 未显示成绩 */
		commentFilterOptions() {
			return [
				{ value: 'all', label: '全部' },
				{ value: 'high', label: '高分' },    // 90-100
				{ value: 'normal', label: '普通' },   // 80-89
				{ value: 'low', label: '低分' },   // 79及以下
				{ value: 'noScore', label: '未显示成绩' }   // 无成绩
			]
		},
		/** 按筛选条件过滤后的评论列表 */
		filteredComments() {
			if (!this.comments || this.comments.length === 0) return []
			if (this.commentFilter === 'all') return this.comments
			if (this.commentFilter === 'noScore') {
				return this.comments.filter(c => {
					const score = c.commenterScore
					return score == null || score === '' || String(score).trim() === ''
				})
			}
			return this.comments.filter(c => this.getCommentScoreRange(c) === this.commentFilter)
		},
		/** 评论排序选项 */
		commentSortOptions() {
			return [
				{ value: 'likeDesc', label: '最热' },
				{ value: 'timeDesc', label: '最新' }
			]
		},
		/** 筛选后再按当前排序规则排序的评论列表 */
		sortedComments() {
			const list = this.filteredComments || []
			if (list.length === 0) return []
			const sort = this.commentSort || 'likeDesc'
			return list.slice().sort((a, b) => {
				if (sort === 'timeDesc') {
					return (b.commentTime || '').localeCompare(a.commentTime || '')
				}
				if (sort === 'likeDesc') {
					const na = a.likeCount != null ? a.likeCount : 0
					const nb = b.likeCount != null ? b.likeCount : 0
					return nb - na
				}
				return 0
			})
		},
		/** 成绩分布图：与 info 一致的顺序（0-59 显示为「不及格」） */
		distributionList() {
			const dist = this.scoreStats && this.scoreStats.distribution
			if (!dist || typeof dist !== 'object') return []
			const orderedRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
			const total = this.scoreStats.count || 0
			const counts = orderedRanges.map(range => Number(dist[range]) || 0)
			const maxCount = Math.max(...counts, 1)
			// 与纵轴 ordinate 一致的 maxTick，使柱高与刻度一一对应
			let step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 5)
			if (step < 1) step = 1
			const maxTick = Math.max(1, Math.ceil(maxCount / step) * step)
			const barMaxRpx = 360
			return orderedRanges.map((range, i) => {
				const count = counts[i]
				const ratio = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
				const barHeightRpx = maxTick > 0 ? Math.round((count / maxTick) * barMaxRpx) : 0
				const label = range === '0-59' ? '不及格' : range
				return { range, count, ratio: ratio + '%', ratioRaw: ratio, barHeightRpx, label }
			})
		},
		/** 纵坐标刻度（含 0，用于等间距网格） */
		ordinate() {
			const list = this.distributionList
			if (!list.length) return []
			const maxCount = Math.max(...list.map(i => i.count), 1)
			let step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 5)
			if (step < 1) step = 1
			const arr = []
			for (let v = Math.ceil(maxCount / step) * step; v >= step; v -= step) arr.push(v)
			arr.push(0) // 补 0，使纵轴 0 与其它刻度等间距
			return arr
		},
		/** 柱体区高度：固定 360rpx 与纵轴区域一致，直方图整体变矮 */
		chartContentHeightRpx() {
			return 360
		},
		/** 纵轴最大刻度值，与 ordinate 顶端一致，用于柱高与刻度线对齐 */
		ordinateMaxTick() {
			const arr = this.ordinate
			return arr && arr.length > 0 ? arr[0] : 1
		},
		/** 从 distribution 推算 Q1（25% 分位），供详情页箱线图使用 */
		computedQ1() {
			const q = this.scoreStatsQuartiles
			return q ? q.q1 : null
		},
		/** 从 distribution 推算 Q3（75% 分位），供详情页箱线图使用 */
		computedQ3() {
			const q = this.scoreStatsQuartiles
			return q ? q.q3 : null
		},
		/** 根据 distribution 与 count 计算 Q1、Q3（区间中点近似） */
		scoreStatsQuartiles() {
			const dist = this.scoreStats && this.scoreStats.distribution
			const total = Number(this.scoreStats && this.scoreStats.count) || 0
			if (!dist || typeof dist !== 'object' || total <= 0) return null
			const orderedRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
			const midpoints = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]
			const counts = orderedRanges.map(range => Number(dist[range]) || 0)
			let cum = 0
			let q1 = null
			let q3 = null
			for (let i = 0; i < counts.length; i++) {
				cum += counts[i]
				if (q1 == null && cum >= total * 0.25) q1 = midpoints[i]
				if (q3 == null && cum >= total * 0.75) q3 = midpoints[i]
				if (q1 != null && q3 != null) break
			}
			if (q1 == null) q1 = midpoints[0]
			if (q3 == null) q3 = midpoints[midpoints.length - 1]
			return { q1, q3 }
		},
		/** 详情页箱线图是否有足够数据（min/max/median + Q1/Q3） */
		hasDetailBoxplotData() {
			if (!this.scoreStats) return false
			const min = this.scoreStats.minScore
			const max = this.scoreStats.maxScore
			const med = this.scoreStats.medianScore
			const q1 = this.computedQ1
			const q3 = this.computedQ3
			return min != null && max != null && med != null && q1 != null && q3 != null
		},
		/** 课程诊断用：总体标准差 σ（API 无则从 distribution 用区间中点近似计算） */
		diagnosisStdDev() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return null
			if (typeof s.stdDev === 'number' && !Number.isNaN(s.stdDev)) return s.stdDev
			const dist = s.distribution
			const total = Number(s.count) || 0
			const mean = Number(s.avgScore)
			if (!dist || typeof dist !== 'object' || total <= 0 || (mean !== mean)) return null
			const orderedRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
			const midpoints = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]
			let sumSq = 0
			for (let i = 0; i < orderedRanges.length; i++) {
				const c = Number(dist[orderedRanges[i]]) || 0
				sumSq += c * (midpoints[i] - mean) ** 2
			}
			const variance = sumSq / total
			return Math.sqrt(variance)
		},
		/**
		 * 多维度成绩诊断（非排他）：优先使用接口返回的 scoreStats.diagnostics（基于全校常模），否则用本地固定阈值兜底
		 * 每项 { conclusion, description, category }，category: 'water' | 'shape' | 'risk' | 'anomaly'
		 */
		diagnostics() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return []
			// 优先使用接口返回的 diagnostics（动态基准线系统）
			if (Array.isArray(s.diagnostics) && s.diagnostics.length > 0) return s.diagnostics
			// 兜底：无基准时用本地固定规则
			return this.diagnosticsFallback
		},
		/** 无接口 diagnostics 时的本地固定阈值诊断（兜底） */
		diagnosticsFallback() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return []
			const mean = Number(s.avgScore)
			const median = Number(s.medianScore)
			const stdDev = this.diagnosisStdDev
			if (mean !== mean || median !== median || stdDev == null) return []

			const list = []
			// 维度 A：水位表现
			if (mean >= 90) {
				list.push({
					conclusion: '高分段集中',
					description: '历史成绩重心处于 90 分以上高位。',
					category: 'water'
				})
			}
			if (mean < 80) {
				list.push({
					conclusion: '整体偏低',
					description: '历史成绩整体水位处于 80 分以下。',
					category: 'water'
				})
			}
			// 维度 B：分布形态
			if (stdDev < 12 && Math.abs(mean - median) <= 3) {
				list.push({
					conclusion: '分布均衡',
					description: '成绩分布呈现显著的中心趋向，大部分样本围绕平均水平分布。',
					category: 'shape'
				})
			}
			if (stdDev > 20) {
				list.push({
					conclusion: '离散度高',
					description: '样本分差较大，成绩分布较为松散，未出现明显的数值集中区间。',
					category: 'shape'
				})
			}
			if (stdDev >= 12 && stdDev <= 18) {
				list.push({
					conclusion: '常态分布',
					description: '成绩分布符合统计学常态曲线，能够客观反映个体表现差异。',
					category: 'shape'
				})
			}
			// 维度 C：特殊波动
			if (median > mean + 5) {
				list.push({
					conclusion: '低分偏移',
					description: '多数样本成绩处于高位，平均分受极少数显著低分样本影响而下移。',
					category: 'anomaly'
				})
			}
			return list
		}
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/index/index' })
		},
		/** 从评价引导页返回时刷新本课评价状态与评论列表 */
		async refreshEvaluationStatus() {
			if (!this.courseId) return
			const idLower = String(this.courseId).trim().toLowerCase()
			try {
				const courses = await refreshEvaluatedStatus()
				const app = getApp()
				const evaluatedIds = (app && app.globalData && app.globalData.evaluatedCourseIds) || []
				let isEvaluated = false
				let hasEvaluationPermission = false
				const course = Array.isArray(courses)
					? courses.find(c => (String(c.md5Hash || '').toLowerCase() === idLower))
					: null
				if (course) {
					hasEvaluationPermission = true
					isEvaluated = !!course.isEvaluated
				} else {
					// 不在选课列表则无评价权限（不论是否在已评价 id 列表）
					hasEvaluationPermission = false
					isEvaluated = false
				}
				if (this.courseData) {
					this.courseData = Object.assign({}, this.courseData, { hasEvaluationPermission, isEvaluated })
				}
				const userKey = this.getUserKeyForDetail()
				if (userKey) await this.loadComments(userKey)
			} catch (e) {
				// 刷新失败保持原状
			}
		},
		getUserKeyForDetail() {
			return resolveCourseDetailUserKey()
		},
		/** 页面加载时拉取课程详情（多学期、学分/地点等），供课程信息模块展示；有列表预填时不显示加载态 */
		async loadDetailThenShow() {
			if (this.detailLoading) return
			if (!this.hasPreloadInfo) this.detailLoading = true
			try {
				await this.loadCourseDetail({ isDetailOnly: true })
				this.detailLoaded = true
			} catch (e) {
				console.warn('加载详细课程信息失败，但标记为已加载以避免重复请求:', e)
				this.detailLoaded = true
			} finally {
				this.detailLoading = false
			}
		},
		/**
		 * 加载课程详情
		 * @param {Object} opts - { isDetailOnly: true } 表示仅加载详情（不占全屏 loading，用 detailLoading）
		 */
		async loadCourseDetail(opts) {
			const isDetailOnly = opts && opts.isDetailOnly
			if (isDetailOnly && !this.hasPreloadInfo) {
				this.detailLoading = true
			} else if (!isDetailOnly) {
				this.loading = true
			}
			this.errorMessage = ''
			
			try {
				const app = getApp()
				const evaluatedInfo = resolveEvaluatedCourseInfo(this.courseId)

				// 确保用户已在后端注册（幂等），防止 userKey 查不到用户
				await ensureUserRegistered()

				// 2. 获取userKey
				let userKey = null
				let userKeySource = ''
				
				// 优先从全局变量获取
				if (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) {
					userKey = app.globalData.userData.userKey
					userKeySource = '全局变量'
					console.log('从全局变量获取userKey:', userKey)
				} else {
					// 从本地存储获取userKey
					try {
						userKey = uni.getStorageSync('userKey')
						if (userKey) {
							userKeySource = '本地存储userKey'
							console.log('从本地存储获取userKey:', userKey)
						}
					} catch (e) {
						console.warn('获取userKey失败:', e)
					}
				}
				
				// 如果找不到userKey，尝试从userId和userPassword重新生成
				if (!userKey) {
					try {
						const userId = uni.getStorageSync('userId')
						const userPassword = uni.getStorageSync('userPassword')
						console.log('尝试从存储获取userId和userPassword:', { userId: userId ? '已找到' : '未找到', userPassword: userPassword ? '已找到' : '未找到' })
						
						if (userId && userPassword) {
							userKey = md5.hexMD5(userId + userPassword)
							userKeySource = '从userId和userPassword重新生成'
							console.log('从userId和userPassword重新生成userKey:', userKey)
						} else {
							console.warn('存储中缺少userId或userPassword，无法生成userKey')
						}
					} catch (e) {
						console.warn('从存储获取userId和userPassword失败:', e)
					}
				}
				
				if (!userKey) {
					console.error('无法获取userKey，所有尝试都失败')
					
					// 检查是否有教务系统登录的Cookie
					const loginCookie = uni.getStorageSync('loginCookie')
					const isLoggedIn = uni.getStorageSync('isLoggedIn')
					
					console.error('调试信息:', {
						hasApp: !!app,
						hasGlobalData: !!(app && app.globalData),
						hasUserData: !!(app && app.globalData && app.globalData.userData),
						hasUserKeyInGlobal: !!(app && app.globalData && app.globalData.userData && app.globalData.userData.userKey),
						hasLoginCookie: !!loginCookie,
						isLoggedIn: isLoggedIn,
						storageKeys: (() => {
							try {
								const info = uni.getStorageInfoSync()
								return info.keys || []
							} catch (e) {
								return []
							}
						})()
					})
					
					// 如果用户通过教务系统登录但没有userKey，提示需要完成用户登录
					if (loginCookie || isLoggedIn) {
						uni.showModal({
							title: '需要完成用户注册',
							content: '检测到您已通过教务系统登录，但查看课程详情需要完成用户注册以获取用户密钥。\n\n请重新进行教务系统登录，系统会自动完成用户注册。',
							showCancel: true,
							cancelText: '取消',
							confirmText: '去登录',
							success: (res) => {
								if (res.confirm) {
									// 跳转到登录页面
									uni.navigateTo({
										url: JW_LOGIN_PAGE,
										fail: () => {
											uni.switchTab({
												url: '/pages/index/index'
											})
										}
									})
								} else {
									uni.navigateBack()
								}
							}
						})
					} else {
						// 完全没有登录
						uni.showModal({
							title: '需要登录',
							content: '查看课程详情需要先完成教务系统登录。\n\n登录成功后，系统会自动完成用户注册。',
							showCancel: true,
							cancelText: '取消',
							confirmText: '去登录',
							success: (res) => {
								if (res.confirm) {
									// 跳转到登录页面
									uni.navigateTo({
										url: JW_LOGIN_PAGE,
										fail: () => {
											uni.switchTab({
												url: '/pages/index/index'
											})
										}
									})
								} else {
									uni.navigateBack()
								}
							}
						})
					}
					
					this.errorMessage = '未找到用户密钥，请先完成教务系统登录'
					this.loading = false
					return
				}
				
				console.log('最终使用的userKey来源:', userKeySource)
				
				// 3. 调用后端API获取课程详情（与 GitHub 旧版一致：不在此处前置同步，仅在 catch 里报用户密钥错误时再注册并重试）
				// 若带 lessonName/teacherName 则按 courseId 查不到时会用课程名+教师名后备查询
				let courseDetail = null
				const apiParams = {
					userKey: userKey,
					courseId: this.courseId
				}
				if (this.lessonName) apiParams.lessonName = this.lessonName
				if (this.teacherName) apiParams.teacherName = this.teacherName
				try {
					const res = await post('App.Course.GetCourseByCourseId', apiParams, { retryCount: 1 })
					if (res && res.length > 0) {
						courseDetail = res[0]
						this.courseData = {
							...this.courseData,
							...buildCourseDetailViewModel(courseDetail, this.courseData, evaluatedInfo)
						}
						this.detailLoaded = true
						this.detailLoading = false
					}
				} catch (err) {
					console.error('通过courseId查询失败:', err, 'details:', err?.details ? JSON.stringify({status: err.details.statusCode, body: typeof err.details.data === 'string' ? err.details.data.substring(0, 300) : err.details.data}) : 'N/A')
					// 与 GitHub 旧版一致：err 可能是接口 reject 的字符串（如「非法请求：用户密钥错误」）
					const errorMsg = (err && err.message) ? err.message : String(err || '')
					const isUserKeyError = (
						errorMsg.indexOf('用户密钥错误') !== -1 ||
						errorMsg.indexOf('UserKey Error') !== -1 ||
						errorMsg.indexOf('用户密钥') !== -1 ||
						(errorMsg.indexOf('非法请求') !== -1 && errorMsg.indexOf('密钥') !== -1)
					)
					if (isUserKeyError) {
						console.warn('检测到 userKey 无效，尝试重新生成或重新注册...')
						
						// 尝试从 userId 和 userPassword 重新生成
						try {
							const userId = uni.getStorageSync('userId')
							const userPassword = uni.getStorageSync('userPassword')
							const loginCookie = uni.getStorageSync('loginCookie')
							
							if (userId && userPassword) {
								const newUserKey = md5.hexMD5(userId + userPassword)
								console.log('重新生成 userKey:', newUserKey)
								
								// 更新全局变量和本地存储
								if (app && app.globalData && app.globalData.userData) {
									app.globalData.userData.userKey = newUserKey
								}
								uni.setStorageSync('userKey', newUserKey)
								
								// 如果后端数据库中还没有用户记录，尝试重新注册
								if (loginCookie) {
									console.log('检测到 loginCookie，尝试重新注册用户...')
									console.log('注册参数:', {
										userId: userId,
										hasUserPassword: !!userPassword,
										hasUserCookie: !!loginCookie,
										userCookieLength: loginCookie ? loginCookie.length : 0,
										userCookiePreview: loginCookie ? loginCookie.substring(0, 50) + '...' : ''
									})
									try {
										console.log('开始调用 App.User.RegisterWithCookie...')
										const registerRes = await post('App.User.RegisterWithCookie', {
											userId: userId,
											userPassword: userPassword,
											userCookie: loginCookie,
											userName: userId  // 使用 userId 作为默认姓名
										})
										console.log('重新注册响应:', registerRes)
										if (registerRes && registerRes.userKey) {
											console.log('重新注册成功，userKey:', registerRes.userKey)
											// 更新 userKey（使用后端返回的，确保一致性）
											if (app && app.globalData && app.globalData.userData) {
												app.globalData.userData.userKey = registerRes.userKey
											}
											uni.setStorageSync('userKey', registerRes.userKey)
											
											// 使用后端返回的 userKey 重试
											console.log('使用后端返回的 userKey 重试查询课程详情...')
											const retryParams2 = { userKey: registerRes.userKey, courseId: this.courseId }
											if (this.lessonName) retryParams2.lessonName = this.lessonName
											if (this.teacherName) retryParams2.teacherName = this.teacherName
											const retryRes2 = await post('App.Course.GetCourseByCourseId', retryParams2)
											if (retryRes2 && retryRes2.length > 0) {
												courseDetail = retryRes2[0]
												console.log('使用后端返回的 userKey 查询成功')
												// 跳出外层 try-catch，直接返回成功结果
												throw { success: true, courseDetail: courseDetail }
											} else {
												console.warn('重新注册后查询课程详情返回空结果')
											}
										} else {
											console.warn('重新注册返回数据异常:', registerRes)
										}
									} catch (registerErr) {
										console.error('重新注册失败:', registerErr)
										console.error('注册错误详情:', {
											message: registerErr && registerErr.message ? registerErr.message : String(registerErr),
											error: registerErr,
											type: typeof registerErr
										})
										// 如果是成功标志，直接返回
										if (registerErr && registerErr.success) {
											courseDetail = registerErr.courseDetail
											throw { success: true, courseDetail: courseDetail }
										}
										// 重新注册失败，可能是网络问题或 loginCookie 已过期
										// 先尝试使用重新生成的 userKey 重试（可能后端已经有记录了）
										console.log('重新注册失败，但尝试使用重新生成的 userKey 重试（可能后端已有记录）...')
									}
								} else {
									// 没有 loginCookie，无法重新注册
									console.warn('没有 loginCookie，无法重新注册')
								}
								
								// 使用新的 userKey 重试
								console.log('使用重新生成的 userKey 重试查询课程详情...')
								const retryParams = { userKey: newUserKey, courseId: this.courseId }
								if (this.lessonName) retryParams.lessonName = this.lessonName
								if (this.teacherName) retryParams.teacherName = this.teacherName
								const retryRes = await post('App.Course.GetCourseByCourseId', retryParams)
								if (retryRes && retryRes.length > 0) {
									courseDetail = retryRes[0]
									console.log('使用重新生成的 userKey 查询成功')
								} else {
									console.warn('使用重新生成的 userKey 查询返回空结果')
									// 如果重新注册也失败了，说明后端数据库中没有用户记录，需要重新登录
									if (!loginCookie) {
										uni.showModal({
											title: '需要先完成教务登录',
											content: '您的账号尚未在本系统注册，无法查看课程详情。\n\n请先通过「教务系统登录」完成一次登录，系统会自动完成注册，之后即可正常使用。',
											showCancel: true,
											cancelText: '取消',
											confirmText: '去登录',
											success: (res) => {
												if (res.confirm) {
													uni.navigateTo({
														url: JW_LOGIN_PAGE,
														fail: () => {
															uni.switchTab({
																url: '/pages/index/index'
															})
														}
													})
												} else {
													uni.navigateBack()
												}
											}
										})
									}
									throw err  // 重试失败，抛出原始错误
								}
							} else {
								// 没有 userId 或 userPassword（例如仅做过校友登录），无法重新注册
								this.errorMessage = (err && err.message) ? err.message : '加载课程详情失败'
								uni.showModal({
									title: '需要先完成教务登录',
									content: '当前无法验证您的身份。请先通过「教务系统登录」完成一次登录，系统会自动完成注册，之后即可查看课程详情。',
									showCancel: true,
									cancelText: '取消',
									confirmText: '去登录',
									success: (res) => {
										if (res.confirm) {
											uni.navigateTo({
												url: JW_LOGIN_PAGE,
												fail: () => { uni.switchTab({ url: '/pages/index/index' }) }
											})
										} else {
											uni.navigateBack()
										}
									}
								})
								throw err
							}
						} catch (retryErr) {
							// 如果是成功标志，直接返回成功结果
							if (retryErr && retryErr.success) {
								courseDetail = retryErr.courseDetail
								// 跳出错误处理，继续执行后续逻辑
							} else {
								console.error('重新生成 userKey 后重试失败:', retryErr)
								throw err  // 抛出原始错误
							}
						}
					} else {
						throw err  // 不是 UserKey 错误，直接抛出
					}
				}
				
				// 4. 获取该课程的所有可用学期列表
				const termsList = await fetchCourseTermsByCourseId({
					userKey,
					courseId: this.courseId,
					fallbackCourseTerm: courseDetail && courseDetail.courseTerm
				})
				
				// 5. 如果有多个学期，获取所有学期的课程数据
				if (termsList.length > 1) {
					this.availableTerms = termsList
					this.courseDataByTerm = {}
					
					// 获取每个学期的课程数据
					for (const term of termsList) {
						try {
							const termDetail = await fetchCourseDetailByTerm({
								userKey,
								courseId: this.courseId,
								courseTerm: term
							})
							if (termDetail) this.courseDataByTerm[term] = termDetail
						} catch (termErr) {
							console.warn(`获取学期 ${term} 的课程数据失败:`, termErr)
						}
					}
					
					// 默认选择第一个学期（最新的）
					this.selectedTermIndex = 0
					this.currentSelectedTerm = termsList[0]
					if (this.courseDataByTerm[this.currentSelectedTerm]) {
						courseDetail = this.courseDataByTerm[this.currentSelectedTerm]
					}
				} else if (termsList.length === 1) {
					// 只有一个学期，直接使用
					this.availableTerms = termsList
					this.selectedTermIndex = 0
					this.currentSelectedTerm = termsList[0]
				} else if (courseDetail && courseDetail.courseTerm) {
					// 如果获取学期列表失败，但当前课程有学期信息，使用当前学期
					this.availableTerms = [courseDetail.courseTerm]
					this.selectedTermIndex = 0
					this.currentSelectedTerm = courseDetail.courseTerm
				}
				
				// 6. 合并数据
				if (courseDetail) {
					this.courseData = buildCourseDetailViewModel(courseDetail, this.courseData, evaluatedInfo)
				} else if (evaluatedInfo) {
					// 如果数据库中没有找到，但全局变量中有基本信息，至少显示基本信息
					this.courseData = {
						courseName: evaluatedInfo.courseName || '',
						teacherName: evaluatedInfo.teacherName || '',
						hasEvaluationPermission: true,
						isEvaluated: evaluatedInfo.isEvaluated || false
					}
					this.errorMessage = '未在数据库中找到该课程的详细信息'
				} else {
					this.errorMessage = '未找到课程信息'
				}
				
				// 非「仅详情」时才在此处加载评论/评分/收藏；成绩与评论已在 onLoad 中请求，仅详情路径不再重复调用，避免二次置 loading 导致「结果→加载中→结果」闪烁
				if (!isDetailOnly && this.courseId) {
					console.log('开始加载评论和成绩统计，courseId:', this.courseId)
					if (userKey) {
						this.loadComments(userKey)
						this.checkCollectionStatus(userKey)
					}
					this.loadScoreStats(userKey || '')
					this.loadCourseRating()
				} else if (!isDetailOnly && !this.courseId) {
					console.warn('缺少 courseId，无法加载评论和成绩统计')
				}
				// 从评价引导页刚提交返回且页面被重新创建时，再刷新一次评价状态与评论列表
				try {
					const flag = uni.getStorageSync('courseDetailRefreshCourseId')
					const idLower = String(this.courseId).trim().toLowerCase()
					if (flag && idLower === String(flag).toLowerCase()) {
						uni.removeStorageSync('courseDetailRefreshCourseId')
						await this.refreshEvaluationStatus()
					}
				} catch (e) {}
				
			} catch (err) {
				// 与旧版一致：优先展示后端返回的文案（reject 可能为字符串）
				const msg = (err && err.message) != null ? err.message : (typeof err === 'string' ? err : '')
				this.errorMessage = msg || '加载课程详情失败'
				console.error('加载课程详情失败:', err, 'details:', err?.details ? JSON.stringify({status: err.details.statusCode, body: typeof err.details.data === 'string' ? err.details.data.substring(0, 300) : err.details.data}) : 'N/A')
			} finally {
				if (isDetailOnly) {
					this.detailLoading = false
				} else {
					this.loading = false
				}
			}
		},
		/**
		 * 学期标签点击处理
		 */
		onTermTabClick(index) {
			if (index < 0 || index >= this.availableTerms.length) {
				return
			}
			this.selectedTermIndex = index
			const selectedTerm = this.availableTerms[index]
			this.onTermChange({ detail: { value: index } })
		},
		showTermPicker() {
			uni.showActionSheet({
				itemList: this.availableTerms,
				success: (res) => {
					this.onTermTabClick(res.tapIndex)
				}
			})
		},
		/**
		 * 学期切换处理
		 */
		async onTermChange(e) {
			const selectedIndex = parseInt(e.detail.value) || 0
			if (selectedIndex < 0 || selectedIndex >= this.availableTerms.length) {
				return
			}
			
			this.selectedTermIndex = selectedIndex
			const selectedTerm = this.availableTerms[selectedIndex]
			this.currentSelectedTerm = selectedTerm

			// 如果该学期的数据已缓存，直接使用
			if (this.courseDataByTerm[selectedTerm]) {
				const courseDetail = this.courseDataByTerm[selectedTerm]
				this.courseData = buildCourseDetailViewModel(courseDetail, this.courseData, null)
			} else {
				// 如果数据未缓存，重新加载
				try {
					const userKey = this.getUserKeyForDetail()
					if (!userKey) {
						uni.showToast({
							title: '请先登录',
							icon: 'none'
						})
						return
					}
					
					const courseDetail = await fetchCourseDetailByTerm({
						userKey,
						courseId: this.courseId,
						courseTerm: selectedTerm
					})
					
					if (courseDetail) {
						// 缓存数据
						this.courseDataByTerm[selectedTerm] = courseDetail
						this.courseData = buildCourseDetailViewModel(courseDetail, this.courseData, null)
					}
				} catch (err) {
					console.error('加载学期课程数据失败:', err)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				}
			}
		},
		/**
		 * 加载课程评论
		 */
		async loadComments(userKey) {
			if (!userKey || !this.courseId) {
				console.warn('缺少必要参数，无法加载评论:', { userKey: !!userKey, courseId: this.courseId })
				this.commentsLoading = false
				return
			}
			
			this.commentsLoading = true
			this.commentCountFromApi = null
			this.commentPage = 1
			this.commentHasMore = false
			try {
				this.commentCountFromApi = await fetchCourseCommentCount({
					userKey,
					courseId: this.courseId
				})
				const result = await fetchCourseComments({
					userKey,
					courseId: this.courseId,
					page: 1,
					pageSize: COURSE_COMMENT_PAGE_SIZE
				})
				this.comments = result.list
				this.commentHasMore = result.hasMore
				
				// 如果commentCountFromApi为null或0，但comments有数据，更新commentCountFromApi
				if ((this.commentCountFromApi == null || this.commentCountFromApi === 0) && this.comments.length > 0) {
					this.commentCountFromApi = this.comments.length
					console.log('使用实际加载的评论数量更新commentCountFromApi:', this.commentCountFromApi)
				}
				
				// 如果commentCountFromApi为0但comments也为0，尝试使用courseRating.starCount（如果已加载）
				if (this.commentCountFromApi === 0 && this.comments.length === 0 && this.courseRating && this.courseRating.starCount != null && this.courseRating.starCount > 0) {
					this.commentCountFromApi = this.courseRating.starCount
					console.log('使用courseRating.starCount更新commentCountFromApi:', this.commentCountFromApi)
				}
				
				// 如果comments有数据但commentCountFromApi还是0，强制更新
				if (this.comments.length > 0 && (this.commentCountFromApi == null || this.commentCountFromApi === 0)) {
					this.commentCountFromApi = this.comments.length
					console.log('强制使用comments.length更新commentCountFromApi:', this.commentCountFromApi)
				}
			} catch (err) {
				console.error('加载评论失败:', err)
				console.error('错误详情:', { message: err?.message || String(err), error: err })
				this.comments = []
				// 如果错误信息包含"服务器返回了错误响应"，说明是PHP错误，不显示错误提示（避免干扰用户）
				const errorMsg = err?.message || String(err) || ''
				if (errorMsg.indexOf('服务器返回了错误响应') === -1 && errorMsg.indexOf('PHP错误日志') === -1) {
					// 其他错误可以显示，但PHP错误已经在api.js中处理了
					console.warn('评论加载失败，但不影响页面显示')
				}
			} finally {
				this.commentsLoading = false
			}
		},
		/**
		 * 加载更多评论（分页追加）
		 */
		async loadMoreComments() {
			if (this.commentLoadingMore || !this.commentHasMore) return
			const userKey = this.getUserKeyForDetail()
			if (!userKey) return
			this.commentLoadingMore = true
			try {
				const nextPage = this.commentPage + 1
				const result = await fetchCourseComments({
					userKey,
					courseId: this.courseId,
					page: nextPage,
					pageSize: COURSE_COMMENT_PAGE_SIZE
				})
				// 按 commentId 去重（防止分页边界重叠）
				const existIds = new Set(this.comments.map(c => c.commentId))
				const deduped = result.list.filter(c => !existIds.has(c.commentId))
				this.comments = this.comments.concat(deduped)
				this.commentPage = nextPage
				this.commentHasMore = result.hasMore
			} catch (err) {
				console.error('加载更多评论失败:', err)
			} finally {
				this.commentLoadingMore = false
			}
		},
		/**
		 * 点赞/取消点赞评论（仅选课用户可用，由 hasEvaluationPermission 控制展示）
		 */
		async onLikeComment(comment) {
			const userKey = this.getUserKeyForDetail()
			if (!userKey || !comment || comment.commentId == null) return
			try {
				const res = await likeCourseComment({
					userKey,
					commentId: comment.commentId
				})
				if (res && typeof res.liked === 'boolean' && typeof res.likeCount === 'number') {
					comment.hasLiked = res.liked
					comment.likeCount = res.likeCount
				}
			} catch (e) {
				uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
			}
		},
		/**
		 * 加载成绩统计
		 */
		async loadScoreStats(userKey) {
			const DEBUG = false
			if (!this.courseId) {
				console.warn('[成绩统计] 缺少 courseId，未请求')
				this.scoreStatsLoading = false
				return
			}
			this.scoreStatsLoading = true
			try {
				const courseIdNorm = String(this.courseId || '').trim().toLowerCase()
				if (DEBUG) {
					console.log('[成绩统计] 请求参数', { hasUserKey: !!userKey, courseIdLength: courseIdNorm.length, courseIdPreview: courseIdNorm.slice(0, 8) + '...' })
				}
				const res = await fetchCourseScoreStats({ userKey, courseId: courseIdNorm })
				if (DEBUG) {
					console.log('[成绩统计] API 原始返回', {
						count: res?.count,
						avgScore: res?.avgScore,
						minScore: res?.minScore,
						maxScore: res?.maxScore,
						hasDistribution: !!res?.distribution,
						distributionKeys: res?.distribution ? Object.keys(res.distribution) : []
					})
				}

				if (res && (res.count !== undefined || res.avgScore !== undefined)) {
					this.scoreStats = res
					this.scoreStatsLoading = false
					const showChart = Number(res.count) > 0 && res.distribution
					if (DEBUG) {
						console.log('[成绩统计] 已赋值', { count: res.count, avgScore: res.avgScore, 将显示直方图: showChart })
					}
				} else {
					if (DEBUG) console.warn('[成绩统计] API 返回格式不正确，使用兜底空数据', res)
					this.scoreStats = buildEmptyScoreStats()
					this.scoreStatsLoading = false
				}
			} catch (err) {
				if (DEBUG) {
					console.error('[成绩统计] 请求失败', err?.message || String(err))
					console.error('[成绩统计] 完整错误', err)
				}
				this.scoreStats = buildEmptyScoreStats()
			} finally {
				if (this.scoreStatsLoading !== false) this.scoreStatsLoading = false
			}
		},
		/**
		 * 加载课程评分统计（从userComment表）
		 */
		async loadCourseRating() {
			if (!this.courseId) {
				console.warn('缺少courseId，无法加载课程评分')
				return
			}
			
			try {
				console.log('开始加载课程评分统计，courseId:', this.courseId)
				const res = await fetchCourseRating({
					courseId: this.courseId
				})
				console.log('课程评分统计API返回结果:', res)
				
				if (res && (res.starAvgTotal != null || res.scoreAvg != null)) {
					this.courseRating = res
					console.log('成功加载课程评分统计:', {
						starAvgTotal: res.starAvgTotal,
						scoreAvg: res.scoreAvg,
						starCount: res.starCount
					})
					
					// 如果commentCountFromApi为0或null，且courseRating有starCount，使用starCount更新
					if ((this.commentCountFromApi == null || this.commentCountFromApi === 0) && res.starCount != null && res.starCount > 0) {
						this.commentCountFromApi = res.starCount
						console.log('使用courseRating.starCount更新commentCountFromApi:', this.commentCountFromApi)
					}
				} else {
					this.courseRating = null
					console.warn('课程评分统计API返回数据为空')
				}
			} catch (err) {
				console.error('加载课程评分统计失败:', err)
				this.courseRating = null
			}
		},
		/** 从评论列表计算某项指标的平均分（1=内容价值 2=管理轻松度 3=良师指数），API 未返回时用 */
		ratingAvgFromComments(which) {
			const list = this.comments || []
			if (list.length === 0) return null
			const key = which === 1 ? 'commentStar1' : which === 2 ? 'commentStar2' : 'commentStar3'
			let sum = 0
			let count = 0
			list.forEach(c => {
				const v = c[key]
				if (v != null && v !== '' && !Number.isNaN(Number(v))) {
					sum += Number(v)
					count++
				}
			})
			return count > 0 ? sum / count : null
		},
		/**
		 * 格式化评分数据（处理数字、对象、null等情况）
		 */
		getDimBarWidth(val) {
			const n = parseFloat(val)
			if (isNaN(n) || n <= 0) return 0
			return Math.min(100, (n / 5) * 100)
		},
		formatRating(rating) {
			if (rating == null || rating === '') return '—'
			// 如果是对象，尝试获取平均值或其他属性
			if (typeof rating === 'object') {
				if (Array.isArray(rating) && rating.length > 0) {
					// 如果是数组，计算平均值
					const sum = rating.reduce((a, b) => (a || 0) + (b || 0), 0)
					return (sum / rating.length).toFixed(1)
				} else if (rating.avg || rating.average) {
					return parseFloat(rating.avg || rating.average).toFixed(1)
				} else {
					return '—'
				}
			}
			// 如果是数字，保留1位小数
			if (typeof rating === 'number') {
				return rating.toFixed(1)
			}
			// 如果是字符串，尝试转换为数字
			const num = parseFloat(rating)
			if (!isNaN(num)) {
				return num.toFixed(1)
			}
			return '—'
		},
		/**
		 * 格式化时间戳
		 */
		formatTime(timestamp) {
			if (!timestamp) return '未知时间'
			const date = new Date(parseInt(timestamp) * 1000)
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			return `${year}-${month}-${day}`
		},
		getCommentDisplayName(comment, index) {
			const candidates = [
				comment && comment.commenterName,
				comment && comment.commentUserName,
				comment && comment.userName,
				comment && comment.nickname
			]
			const hit = candidates.find(item => String(item || '').trim())
			const realName = hit ? String(hit).trim() : ''
			return '匿名同学'
		},
		getCommentAvatarText() {
			return '匿'
		},
		getCommentStarAverage(comment) {
			const values = [comment.commentStar1, comment.commentStar2, comment.commentStar3]
				.map(value => Number(value))
				.filter(value => !Number.isNaN(value))
			if (!values.length) return '—'
			const avg = values.reduce((sum, value) => sum + value, 0) / values.length
			return avg.toFixed(1)
		},
		/** 是否高分（90 分及以上） */
		isHighComment(comment) {
			if (comment.commenterScore == null || comment.commenterScore === '') return false
			const n = Number(comment.commenterScore)
			return !Number.isNaN(n) && n >= 90
		},
		/** 是否顶尖高分（97-100，用于更深黄色背景） */
		isHighScoreComment(comment) {
			if (comment.commenterScore == null || comment.commenterScore === '') return false
			const n = Number(comment.commenterScore)
			return !Number.isNaN(n) && n >= 97
		},
		/** 评论所属分数段：high(90-100)|normal(80-89)|low(79及以下)，无成绩返回 null */
		getCommentScoreRange(comment) {
			if (comment.commenterScore == null || comment.commenterScore === '') return null
			const n = Number(comment.commenterScore)
			if (Number.isNaN(n)) return null
			if (n >= 90) return 'high'
			if (n >= 80) return 'normal'
			return 'low'
		},
		/** 某分数段评论数量 */
		getRangeCount(rangeKey) {
			if (!this.comments || this.comments.length === 0) return 0
			if (rangeKey === 'all') return this.comments.length
			if (rangeKey === 'noScore') {
				return this.comments.filter(c => {
					const score = c.commenterScore
					return score == null || score === '' || String(score).trim() === ''
				}).length
			}
			return this.comments.filter(c => this.getCommentScoreRange(c) === rangeKey).length
		},
		/**
		 * 计算条形图宽度百分比
		 */
		getBarWidth(count, total) {
			if (!total || total === 0) return 0
			return (count / total) * 100
		},
		getBarHeight(count, total) {
			if (!total || total === 0) return 0
			return (count / total) * 100
		},
		/**
		 * 检查当前课程是否已收藏
		 */
		async checkCollectionStatus(userKey) {
			if (!userKey || !this.courseId) return
			try {
				this.isCollected = await fetchCollectionStatus({
					userKey,
					courseId: this.courseId
				})
			} catch (e) {
				this.isCollected = false
			}
		},
		/**
		 * 切换收藏状态（添加收藏 / 取消收藏）
		 */
		async toggleCollect() {
			if (!this.courseData || !this.courseId || this.collectionLoading) return
			const userKey = this.getUserKeyForDetail()
			if (!userKey) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			this.collectionLoading = true
			const name = this.courseData.lessonName || this.courseData.courseName || '该课程'
			try {
				if (this.isCollected) {
					await removeCourseCollection({
						userKey,
						courseId: this.courseId
					})
					this.isCollected = false
					uni.showToast({ title: '已取消收藏' })
				} else {
					await createCourseCollection({
						userKey,
						courseId: this.courseId
					})
					this.isCollected = true
					uni.showToast({ title: '已收藏' })
				}
				const app = getApp()
				if (app && app.globalData) app.globalData.ifChangeLikeState = true
			} catch (e) {
				const msg = (e && (e.message || e)) || '操作失败'
				uni.showToast({ title: msg, icon: 'none' })
			} finally {
				this.collectionLoading = false
			}
		},
		/**
		 * 选择筛选选项
		 */
		onSelectFilter(value) {
			this.commentFilter = value
			this.showFilterDropdown = false
		},
		/**
		 * 跳转到评价引导页（仅当有评价权限且未评价时可用）
		 */
		/** 返回上一页 */
		navigateBack() {
			uni.navigateBack({
				fail: () => {
					uni.switchTab({ url: '/pages/index/index' })
				}
			})
		},
		/** 计算评论的星级填充数（1-5），基于三项维度均值四舍五入 */
		getCommentStarsFilled(comment) {
			const avg = this.getCommentStarAverage(comment)
			if (avg === '—') return 0
			return Math.round(Number(avg))
		},
		goEvaluateGuide() {
			if (!this.courseData || !this.courseData.hasEvaluationPermission || this.courseData.isEvaluated) {
				uni.showToast({ title: '无评价权限或已评价', icon: 'none' })
				return
			}
			const name = (this.courseData && (this.courseData.lessonName || this.courseData.courseName)) || ''
			const teacher = (this.courseData && this.courseData.teacherName) || ''
			const url = '/pages/evaluateGuide/evaluateGuide?courseId=' + encodeURIComponent(this.courseId || '') +
				'&courseName=' + encodeURIComponent(name) +
				'&teacherName=' + encodeURIComponent(teacher)
			uni.navigateTo({ url })
		}
	}
}
</script>


<style scoped>
.page {
	min-height: 100vh;
	min-height: 100dvh;
	background: var(--color-bg-page);
	color: var(--color-text-primary);
	font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
	box-sizing: border-box;
}


/* ===== Content Area ===== */
/* ===== 页面标题区 ===== */
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
	flex: 1;
	min-width: 0;
	font-size: 44rpx;
	line-height: 1.2;
	font-weight: 800;
	color: var(--color-brand);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.header-meta-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 12rpx;
	padding-left: 64rpx;
}
.header-subtitle {
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
	font-weight: 500;
}
.header-tag {
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.4;
	background: var(--color-bg-tag);
	color: var(--color-warning);
	flex-shrink: 0;
}
.header-tag-done {
	color: var(--color-success);
}
.header-tag-view {
	color: var(--color-text-secondary);
}

/* ===== 骨架标题 ===== */
.skeleton-header-title {
	flex: 1;
	height: 44rpx;
	border-radius: 999rpx;
	max-width: 50%;
}
.skeleton-header-sub {
	height: 28rpx;
	width: 120rpx;
	border-radius: 999rpx;
}

.content {
	padding: 0 24rpx 48rpx;
}

/* ===== Skeleton Screen ===== */
@keyframes sk-shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: 0 0; }
}

.sk-shimmer {
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: sk-shimmer 1.4s ease infinite;
}

.skeleton-tag {
	width: 96rpx;
	height: 36rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
}

.skeleton-body {
	margin-top: 12rpx;
}

.skeleton-section {
	margin-top: 24rpx;
}

.skeleton-section-title {
	width: 120rpx;
	height: 26rpx;
	border-radius: 999rpx;
	margin-bottom: 16rpx;
}

.skeleton-card {
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	border-radius: 20rpx;
	padding: 24rpx 22rpx;
}

.skeleton-fact-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 14rpx 0;
}

.skeleton-fact-label {
	width: 80rpx;
	height: 22rpx;
	border-radius: 999rpx;
}

.skeleton-fact-value {
	width: 140rpx;
	height: 22rpx;
	border-radius: 999rpx;
}

.skeleton-chart-bar {
	height: 120rpx;
	border-radius: 18rpx;
	margin-bottom: 18rpx;
}

.skeleton-chip-row {
	display: flex;
	gap: 14rpx;
}

.skeleton-chip {
	flex: 1;
	height: 56rpx;
	border-radius: 14rpx;
}

.skeleton-review {
	padding: 18rpx 0;
}

.skeleton-review + .skeleton-review {
	border-top: 1rpx solid var(--color-border-light);
}

.skeleton-review-head {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.skeleton-avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	flex-shrink: 0;
}

.skeleton-review-meta {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.skeleton-review-name {
	width: 120rpx;
	height: 22rpx;
	border-radius: 999rpx;
}

.skeleton-review-stars {
	width: 160rpx;
	height: 18rpx;
	border-radius: 999rpx;
}

.skeleton-review-body {
	height: 20rpx;
	border-radius: 999rpx;
	margin-bottom: 10rpx;
	width: 92%;
}

.skeleton-review-body-short {
	width: 54%;
}

.skeleton-facts-inner {
	padding: 4rpx 0;
}

.skeleton-score-comment {
	margin-top: 12rpx;
}

/* ===== State Panels (Loading / Error) ===== */
.state-panel {
	margin-top: 24rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	border-radius: 20rpx;
	padding: 36rpx 28rpx;
	text-align: center;
}

.state-panel-compact {
	margin-top: 18rpx;
}

.state-panel-error {
	border-color: rgba(205, 73, 73, 0.24);
	background: var(--color-danger-bg);
}

.state-text {
	font-size: 24rpx;
	line-height: 1.5;
	color: var(--color-text-tertiary);
}

.error-text {
	font-size: 26rpx;
	line-height: 1.5;
	color: var(--color-danger);
}

.inline-loading {
	padding: 30rpx 36rpx;
}

.inline-loading-text {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
}

/* ===== Sections ===== */
.section {
	margin-top: 30rpx;
	padding: 22rpx;
	border-radius: 30rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	padding: 0 4rpx;
	margin-bottom: 16rpx;
}

.section-title-wrap {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.2;
	letter-spacing: 0.4rpx;
	color: var(--color-text-section);
	min-width: 0;
}

.section-meta-chip {
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	border: 1rpx solid var(--color-border);
	color: var(--color-brand);
	flex-shrink: 0;
}

.section-meta-chip-value {
	font-size: 24rpx;
	font-weight: 700;
	color: var(--color-brand);
}

.section-meta-chip-label {
	font-size: 22rpx;
	font-weight: 500;
	color: var(--color-text-tertiary);
}

/* ===== Card ===== */
.card {
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	border-radius: 26rpx;
	box-sizing: border-box;
}

/* ===== Facts Card ===== */
.facts-card {
	overflow: hidden;
	background: transparent;
	border: none;
	border-radius: 0;
}

.fact-row {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 26rpx;
	padding: 12rpx 28rpx;
	border-top: 1rpx solid var(--color-border-light);
}

.fact-row:first-child {
	border-top: none;
}

.fact-label {
	font-size: 24rpx;
	font-weight: 500;
	line-height: 1.4;
	color: var(--color-text-tertiary);
	flex-shrink: 0;
}

.fact-value {
	flex: 1;
	font-size: 27rpx;
	font-weight: 600;
	line-height: 1.4;
	text-align: right;
	color: var(--color-text-heading);
}

/* ===== Term Meta Chip ===== */
.term-meta-chip {
	gap: 8rpx;
}

.term-meta-chip-arrow {
	margin-left: -2rpx;
	font-size: 14rpx;
	line-height: 1;
	color: var(--color-text-tertiary);
}

/* ===== Rating & Review Card ===== */
.review-card {
	padding: 4rpx 2rpx 0;
	background: transparent;
	border: none;
	border-radius: 0;
}

.rating-summary {
	display: flex;
	align-items: center;
	gap: 28rpx;
	margin-bottom: 20rpx;
}

.rating-overall {
	width: 154rpx;
	text-align: center;
}

.rating-score {
	display: block;
	font-size: 78rpx;
	font-weight: 800;
	line-height: 1;
	color: var(--color-brand);
}

.rating-caption {
	display: block;
	margin-top: 10rpx;
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.2;
	letter-spacing: 0.6rpx;
	color: var(--color-text-tertiary);
}

.rating-dimensions {
	flex: 1;
}

.rating-dimension {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 18rpx;
}

.rating-dimension:last-child {
	margin-bottom: 0;
}

.rating-dimension-label {
	width: 138rpx;
	font-size: 23rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
	flex-shrink: 0;
	white-space: nowrap;
}

.rating-dimension-track {
	flex: 1;
	height: 10rpx;
	background: var(--color-bg-secondary);
	border-radius: 999rpx;
	overflow: hidden;
}

.rating-dimension-fill {
	height: 100%;
	border-radius: 999rpx;
}

.rating-dimension-fill-primary {
	background: var(--color-brand);
}

.rating-dimension-fill-warn {
	background: var(--color-warning);
}

.rating-dimension-value {
	width: 44rpx;
	text-align: right;
	font-size: 23rpx;
	font-weight: 600;
	color: var(--color-text-heading);
}

/* ===== Review Toolbar ===== */
.review-toolbar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	margin: 8rpx 0 10rpx;
	position: relative;
}

.comment-filter-left {
	flex: 1;
	min-width: 0;
	position: relative;
}

.comment-filter-main {
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	max-width: 100%;
	padding: 10rpx 16rpx 10rpx 18rpx;
	background: var(--color-bg-tag);
	border: 1rpx solid var(--color-border);
	border-radius: 999rpx;
	box-shadow: none;
}

.comment-filter-text {
	max-width: 100%;
	font-size: 22rpx;
	font-weight: 600;
	line-height: 1.2;
	color: var(--color-text-tertiary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.comment-filter-arrow {
	flex-shrink: 0;
	font-size: 14rpx;
	line-height: 1;
	color: var(--color-text-secondary);
	transition: transform 0.2s ease;
}

.comment-filter-arrow-open {
	transform: rotate(180deg);
}

.comment-filter-dropdown {
	position: absolute;
	left: 0;
	top: calc(100% + 10rpx);
	min-width: 240rpx;
	padding: 10rpx 0;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	border-radius: 20rpx;
	box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
	z-index: 120;
	overflow: hidden;
}

.comment-filter-dropdown-item {
	padding: 18rpx 22rpx;
}

.comment-filter-dropdown-item-active {
	background: var(--color-brand-bg);
}

.comment-filter-dropdown-text {
	display: block;
	font-size: 22rpx;
	line-height: 1.35;
	color: var(--color-text-tertiary);
	white-space: nowrap;
}

.comment-filter-dropdown-item-active .comment-filter-dropdown-text {
	color: var(--color-brand);
	font-weight: 700;
}

.filter-dropdown-mask {
	position: fixed;
	inset: 0;
	z-index: 110;
	background: transparent;
}

.sort-chip {
	display: inline-flex;
	align-items: center;
	padding: 6rpx 0;
	background: transparent;
	border: none;
	position: relative;
	flex-shrink: 0;
}

.sort-row {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 18rpx;
	flex-shrink: 0;
}

.sort-chip-active::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: -4rpx;
	height: 3rpx;
	border-radius: 999rpx;
	background: var(--color-brand);
}

.sort-chip-text {
	font-size: 23rpx;
	font-weight: 500;
	line-height: 1.2;
	color: var(--color-text-secondary);
}

.sort-chip-active .sort-chip-text {
	color: var(--color-brand);
	font-weight: 700;
}

/* ===== Review Empty State ===== */
.review-empty {
	padding: 36rpx 0;
	text-align: center;
}

.review-empty-title {
	display: block;
	font-size: 28rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
}

.review-empty-hint {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	line-height: 1.4;
	color: var(--color-text-secondary);
}

/* ===== Review Items ===== */
.review-list {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	margin-top: 10rpx;
}

.review-item {
	position: relative;
	padding: 26rpx 4rpx 24rpx 22rpx;
	margin-top: 0;
	background: transparent;
}

.review-item::before {
	content: '';
	position: absolute;
	left: 0;
	top: 20rpx;
	bottom: 20rpx;
	width: 4rpx;
	border-radius: 999rpx;
	background: var(--color-brand-bg);
}

.review-item:first-child {
	margin-top: 0;
}

.review-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 14rpx;
}

.review-user {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
	flex: 1;
	min-width: 0;
}

.review-avatar {
	width: 50rpx;
	height: 50rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.review-avatar-primary {
	background: var(--color-brand-bg);
}

.review-avatar-muted {
	background: var(--color-border);
}

.review-avatar-text {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--color-brand);
}

.review-avatar-muted .review-avatar-text {
	color: var(--color-text-tertiary);
}

.review-copy {
	flex: 1;
	min-width: 0;
}

.review-name {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	line-height: 1.3;
	color: var(--color-text-primary);
}

.review-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 6rpx;
}

.review-stars {
	display: flex;
	align-items: center;
	gap: 2rpx;
}

.review-star {
	font-size: 20rpx;
	line-height: 1;
	color: var(--color-warning);
}

.review-star-empty {
	color: var(--color-border);
}

.score-badge {
	padding: 2rpx 10rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.3;
}

.score-badge-success {
	background: var(--color-bg-tag);
	color: var(--color-success);
}

.score-badge-info {
	background: var(--color-bg-tag);
	color: var(--color-brand);
}

.score-badge-muted {
	background: var(--color-bg-tag);
	color: var(--color-text-secondary);
}

.review-date {
	font-size: 20rpx;
	line-height: 1.4;
	color: var(--color-text-secondary);
	white-space: nowrap;
}


.review-body {
	display: block;
	font-size: 27rpx;
	line-height: 1.68;
	color: var(--color-text-primary);
	word-break: break-all;
	white-space: pre-wrap;
}

.review-body-empty {
	color: var(--color-text-secondary);
}

/* ===== Review Like Button ===== */
.review-like {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	padding: 0;
	margin-top: 14rpx;
}

.review-like-active {
	background: transparent;
}

.review-like-icon {
	width: 26rpx;
	height: 26rpx;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	line-height: 1;
	color: var(--color-text-secondary);
}

.review-like-icon-active {
	color: var(--color-danger);
}

.review-like-count {
	font-size: 20rpx;
	line-height: 1;
	color: var(--color-text-secondary);
}

.review-like-count-active {
	color: var(--color-danger);
}

/* ===== View All Button ===== */
.view-all-button {
	margin-top: 22rpx;
	padding: 18rpx 12rpx 6rpx;
	background: transparent;
	border: none;
	border-radius: 0;
	text-align: center;
}

.view-all-text {
	font-size: 24rpx;
	font-weight: 600;
	line-height: 1.3;
	color: var(--color-text-tertiary);
}

/* ===== Bottom Action Bar ===== */
.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 40;
	display: flex;
	gap: 24rpx;
	padding: 28rpx 24rpx calc(28rpx + constant(safe-area-inset-bottom, 0px));
	padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom, 0px));
	background: var(--color-bg-card);
	border-top: 1rpx solid var(--color-border);
	box-sizing: border-box;
}

.action-button {
	height: 84rpx;
	border-radius: 20rpx;
	border: none;
	padding: 0;
	margin: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
}

.action-button::after {
	border: none;
}

.action-button-inner {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}

.action-button-icon-el {
	font-size: 28rpx;
	line-height: 1;
}

.action-button-text {
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1;
	color: #ffffff;
}

.action-button-secondary {
	flex: 1;
	border: 2rpx solid var(--color-brand);
	background: var(--color-bg-card);
}

.action-button-secondary .action-button-icon-el,
.action-button-text-secondary {
	color: var(--color-brand);
}

.action-button-secondary-active {
	background: var(--color-brand-bg);
}

.action-button-primary {
	flex: 2;
	background: var(--color-brand);
}

.action-button-primary .action-button-icon-el {
	color: #ffffff;
}

.action-button-primary-disabled {
	background: transparent !important;
	border: 1rpx solid var(--color-border) !important;
	box-shadow: none !important;
	opacity: 1 !important;
}

.action-button-primary-disabled .action-button-text,
.action-button-primary-disabled .action-button-icon-el {
	color: var(--color-text-secondary) !important;
}

.action-button-disabled {
	opacity: 0.6 !important;
}

.action-button[disabled] {
	background: transparent !important;
	border: 1rpx solid var(--color-border) !important;
	opacity: 1 !important;
}

/* ===== Responsive ===== */
@media (max-width: 360px) {
	.rating-summary {
		flex-direction: column;
		gap: 24rpx;
	}

	.rating-overall {
		width: 100%;
	}
}
</style>
