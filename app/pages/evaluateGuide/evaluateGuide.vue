<template>
	<view class="page" :class="themeClass">
		<!-- 页面标题区：保持不动 -->
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">{{ isEditMode ? '修改评价' : '课程评价' }}</text>
				<view class="header-badge">
					<text class="header-badge-text">{{ isEditMode ? '编辑模式' : '匿名提交' }}</text>
				</view>
			</view>
			<text class="header-subtitle">{{ isEditMode ? '你可以随时修正已提交的评分与文字评价。' : '匿名提交，仅作选课参考。' }}</text>
		</view>

		<view class="page-content">
			<!-- 课程确认 -->
			<view v-if="courseIdFromUrl" class="course-confirm">
				<view class="course-confirm-left">
					<text class="course-confirm-name">{{ courseNameFromUrl || '未知课程' }}</text>
					<text class="course-confirm-teacher">{{ teacherNameFromUrl || '教师信息暂无' }}</text>
				</view>
				<text class="course-confirm-tag">当前课程</text>
			</view>
			<view v-else class="course-confirm">
				<picker class="course-confirm-picker" :range="unevaluatedCourses" range-key="label" @change="onCoursePick">
					<view class="picker-value">
						<text v-if="selectedCourseId" class="picker-selected">{{ selectedCourseLabel }}</text>
						<text v-else class="picker-placeholder">选择待评价课程</text>
						<text class="picker-arrow">&#8250;</text>
					</view>
				</picker>
			</view>

			<!-- 三维评分 -->
			<view class="section-title-row">
				<text class="section-title">从三个维度评价</text>
			</view>

			<view class="dimension-card">
				<view class="dimension-header">
					<view class="dimension-indicator"></view>
					<text class="dimension-name">内容价值</text>
				</view>
				<text class="dimension-hint">是否讲清核心知识，学完后有没有"确实学到东西"的感觉</text>
				<view class="star-row">
					<text
						v-for="n in 5" :key="'s1-' + n"
						class="star" :class="{ active: form.commentStar1 >= n }"
						@tap="form.commentStar1 = n"
					>&#9733;</text>
					<text v-if="form.commentStar1 > 0" class="star-label">{{ starLabels[form.commentStar1 - 1] }}</text>
				</view>
			</view>

			<view class="dimension-card">
				<view class="dimension-header">
					<view class="dimension-indicator"></view>
					<text class="dimension-name">管理轻松度</text>
				</view>
				<text class="dimension-hint">签到、作业、点名等要求是否合理，课堂管理是否清晰</text>
				<view class="star-row">
					<text
						v-for="n in 5" :key="'s2-' + n"
						class="star" :class="{ active: form.commentStar2 >= n }"
						@tap="form.commentStar2 = n"
					>&#9733;</text>
					<text v-if="form.commentStar2 > 0" class="star-label">{{ starLabels[form.commentStar2 - 1] }}</text>
				</view>
			</view>

			<view class="dimension-card">
				<view class="dimension-header">
					<view class="dimension-indicator"></view>
					<text class="dimension-name">良师指数</text>
				</view>
				<text class="dimension-hint">老师是否耐心负责、愿意沟通，评分和要求是否相对公平</text>
				<view class="star-row">
					<text
						v-for="n in 5" :key="'s3-' + n"
						class="star" :class="{ active: form.commentStar3 >= n }"
						@tap="form.commentStar3 = n"
					>&#9733;</text>
					<text v-if="form.commentStar3 > 0" class="star-label">{{ starLabels[form.commentStar3 - 1] }}</text>
				</view>
			</view>

			<!-- 文字评价 -->
			<view class="section-title-row section-title-row-comment">
				<text class="section-title">文字评价</text>
			</view>

			<view class="comment-card">
				<textarea
					v-model="form.commentMessage"
					class="comment-textarea"
					placeholder="说说你的真实感受，帮后来人做选课参考"
					maxlength="255"
					:show-confirm-bar="false"
					:auto-height="true"
				/>
				<view class="comment-footer">
					<text class="comment-count" :class="{ 'comment-count-warn': form.commentMessage.length > 230 }">{{ form.commentMessage.length }}/255</text>
				</view>
			</view>

			<!-- 底部留白给固定按钮 -->
			<view class="bottom-spacer"></view>
		</view>

		<!-- 底部固定提交 -->
		<view class="submit-bar">
			<view class="submit-bar-inner">
				<view v-if="!formReady" class="submit-hint">
					<text class="submit-hint-text">{{ submitHintText }}</text>
				</view>
				<button
					class="btn-submit"
					:class="{ 'btn-submit-disabled': !formReady || submitting }"
					:loading="submitting"
					:disabled="!formReady || submitting"
					@tap="submitComment"
				>{{ isEditMode ? '保存修改' : '提交评价' }}</button>
			</view>
		</view>
	</view>
</template>

<script>
import { post } from '@/utils/api.js'
import { getAppGlobal } from '@/utils/appGlobalStorage.js'
import { syncUserCourseToBackend } from '@/utils/evaluationLoader.js'
import md5 from '@/utils/md5.js'
export default {
	data() {
		return {
			courseIdFromUrl: '',
			courseNameFromUrl: '',
			teacherNameFromUrl: '',
			isEditMode: false,
			selectedCourseId: '',
			selectedCourseLabel: '',
			form: {
				commentStar1: 0,
				commentStar2: 0,
				commentStar3: 0,
				commentMessage: ''
			},
			submitting: false,
			starLabels: ['很差', '较差', '一般', '较好', '很好']
		}
	},
	computed: {
		unevaluatedCourses() {
			const courses = getApp().globalData?.evaluatedCourses || getAppGlobal('evaluatedCourses') || []
			const list = Array.isArray(courses) ? courses : []
			return list
				.filter(c => !c.isEvaluated)
				.map(c => ({
					md5Hash: c.md5Hash,
					courseName: c.courseName || '',
					teacherName: c.teacherName || '',
					label: (c.courseName || '未知课程') + (c.teacherName ? ' - ' + c.teacherName : '')
				}))
		},
		formReady() {
			return this.getCurrentCourseId()
				&& this.form.commentStar1 >= 1
				&& this.form.commentStar2 >= 1
				&& this.form.commentStar3 >= 1
				&& (this.form.commentMessage || '').trim().length > 0
		},
		submitHintText() {
			if (!this.getCurrentCourseId()) return '请先选择课程'
			if (this.form.commentStar1 < 1 || this.form.commentStar2 < 1 || this.form.commentStar3 < 1) return '请完成三个维度的评分'
			if (!(this.form.commentMessage || '').trim()) return '请填写文字评价'
			return ''
		}
	},
	onLoad(options) {
		if (options.courseId) {
			this.courseIdFromUrl = options.courseId
			this.courseNameFromUrl = options.courseName ? decodeURIComponent(options.courseName) : ''
			this.teacherNameFromUrl = options.teacherName ? decodeURIComponent(options.teacherName) : ''
			this.isEditMode = options.edit === '1'
		}
	},
	onShow() {
		if (this.isEditMode && this.courseIdFromUrl && this.getUserKey()) {
			this.loadMyComment()
		}
	},
	methods: {
		onCoursePick(e) {
			const idx = e.detail.value
			const list = this.unevaluatedCourses
			if (list[idx]) {
				this.selectedCourseId = list[idx].md5Hash
				this.selectedCourseLabel = list[idx].label
			}
		},
		getUserKey() {
			const app = getApp()
			let userKey = uni.getStorageSync('userKey')
			if (!userKey && app?.globalData?.userData?.userKey) {
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
		getCurrentCourseId() {
			if (this.courseIdFromUrl) return this.courseIdFromUrl
			return this.selectedCourseId || null
		},
		async loadMyComment() {
			const userKey = this.getUserKey()
			const courseId = this.getCurrentCourseId()
			if (!userKey || !courseId) return
			try {
				const res = await post('App.CourseComment.GetMyComment', {
					userKey,
					courseId: String(courseId).trim().toLowerCase()
				})
				if (res && (res.commentStar1 !== undefined || res.commentMessage !== undefined)) {
					this.form.commentStar1 = res.commentStar1 || 0
					this.form.commentStar2 = res.commentStar2 || 0
					this.form.commentStar3 = res.commentStar3 || 0
					this.form.commentMessage = res.commentMessage || ''
				}
			} catch (e) {
				console.warn('加载我的评价失败:', e)
			}
		},
		formatCommentError(err) {
			const raw = (typeof err === 'string' ? err : (err && err.message)) || ''
			const map = {
				'UserKey Error': '登录已失效，请重新登录',
				'UserState Error': '账号状态异常，无法提交评价',
				'CourseComment Error': '您已评价过该课程，不能重复评价',
				'CourseComment Not Found': '未找到该课程评价',
				'Course Error': '该课程在系统中不存在，无法评价',
				'UserCourse Error': '该课程不在您的选课列表中，请先点击同步选择后再提交'
			}
			if (map[raw]) return map[raw]
			if (/用户课表错误|用户课程错误/.test(raw)) {
				return '该课程不在您的选课列表中，请先点击同步选择后再提交'
			}
			return raw || '提交失败'
		},
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.switchTab({ url: '/pages/index/index' })
			}
		},
		async submitComment() {
			const courseId = this.getCurrentCourseId()
			const userKey = this.getUserKey()

			if (!userKey) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				setTimeout(() => {
					uni.navigateTo({ url: '/pages/login/login?from=evaluateGuide' })
				}, 1500)
				return
			}
			if (!courseId) {
				uni.showToast({ title: '请选择要评价的课程', icon: 'none' })
				return
			}
			if (this.form.commentStar1 < 1 || this.form.commentStar2 < 1 || this.form.commentStar3 < 1) {
				uni.showToast({ title: '请为三个维度各选 1～5 星', icon: 'none' })
				return
			}
			const msg = (this.form.commentMessage || '').trim()
			if (!msg) {
				uni.showToast({ title: '请填写文字评价', icon: 'none' })
				return
			}

			this.submitting = true
			try {
				const courseIdLower = String(courseId).trim().toLowerCase()
				if (this.isEditMode) {
					await post('App.CourseComment.UpdateComment', {
						userKey,
						courseId: courseIdLower,
						commentStar1: this.form.commentStar1,
						commentStar2: this.form.commentStar2,
						commentStar3: this.form.commentStar3,
						commentMessage: msg
					})
					uni.showToast({ title: '评价修改成功' })
				} else {
					await syncUserCourseToBackend()
					await post('App.CourseComment.PostComment', {
						userKey,
						courseId: courseIdLower,
						commentStar1: this.form.commentStar1,
						commentStar2: this.form.commentStar2,
						commentStar3: this.form.commentStar3,
						commentMessage: msg
					})
					uni.showToast({ title: '评价提交成功' })
				}
				try {
					uni.setStorageSync('courseDetailRefreshCourseId', courseIdLower)
				} catch (e) {}
				try {
					const app = getApp()
					if (app && app.globalData) app.globalData.homeAboutMeDirty = true
				} catch (e) {}
				const pages = getCurrentPages()
				const prev = pages[pages.length - 2]
				if (prev && prev.$vm && typeof prev.$vm.refreshEvaluationStatus === 'function') {
					try {
						await prev.$vm.refreshEvaluationStatus()
					} catch (e) {}
				}
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
			} catch (e) {
				const tip = this.formatCommentError(e)
				console.error('提交评价失败:', e, '-> 提示:', tip)
				uni.showToast({ title: tip, icon: 'none', duration: tip.length > 20 ? 3500 : 2000 })
			} finally {
				this.submitting = false
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

/* ===== 页面标题区（保持不动） ===== */
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
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
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}

/* ===== 内容区 ===== */
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 24rpx 32rpx;
	padding-bottom: calc(160rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(160rpx + env(safe-area-inset-bottom, 0px));
}

/* ===== 课程确认条 ===== */
.course-confirm {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--color-bg-card);
	border-radius: 20rpx;
	padding: 28rpx 28rpx;
	border: 1rpx solid var(--color-border);
}
.course-confirm-left {
	flex: 1;
	min-width: 0;
}
.course-confirm-name {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	line-height: 1.35;
	word-break: break-all;
}
.course-confirm-teacher {
	display: block;
	font-size: 26rpx;
	color: var(--color-text-tertiary);
	margin-top: 6rpx;
	line-height: 1.4;
}
.course-confirm-tag {
	flex-shrink: 0;
	margin-left: 16rpx;
	padding: 6rpx 18rpx;
	font-size: 22rpx;
	font-weight: 500;
	color: var(--color-brand);
	background: var(--color-bg-tag);
	border-radius: 999rpx;
}
.course-confirm-picker {
	flex: 1;
}
.picker-value {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}
.picker-selected {
	font-size: 28rpx;
	color: var(--color-text-primary);
	font-weight: 500;
}
.picker-placeholder {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}
.picker-arrow {
	font-size: 36rpx;
	color: var(--color-text-secondary);
	margin-left: 12rpx;
	line-height: 1;
}

/* ===== 区块标题 ===== */
.section-title-row {
	margin-top: 36rpx;
	margin-bottom: 20rpx;
	padding-left: 4rpx;
}
.section-title-row-comment {
	margin-top: 32rpx;
}
.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	line-height: 1.3;
}

/* ===== 维度评分卡 ===== */
.dimension-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	border: 1rpx solid var(--color-border);
	margin-bottom: 16rpx;
}
.dimension-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 8rpx;
}
.dimension-indicator {
	width: 6rpx;
	height: 28rpx;
	border-radius: 3rpx;
	background: var(--color-brand);
	flex-shrink: 0;
}
.dimension-name {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	line-height: 1.3;
}
.dimension-hint {
	display: block;
	font-size: 24rpx;
	color: var(--color-text-tertiary);
	line-height: 1.55;
	margin-bottom: 16rpx;
	padding-left: 18rpx;
}

/* ===== 星级选择 ===== */
.star-row {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding-left: 14rpx;
}
.star {
	font-size: 52rpx;
	color: var(--color-border);
	line-height: 1;
	padding: 4rpx 6rpx;
}
.star.active {
	color: var(--color-brand);
}
.star-label {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
	margin-left: 12rpx;
	font-weight: 500;
}

/* ===== 文字评价 ===== */
.comment-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	border: 1rpx solid var(--color-border);
}
.comment-textarea {
	width: 100%;
	min-height: 180rpx;
	font-size: 28rpx;
	color: var(--color-text-primary);
	line-height: 1.6;
	box-sizing: border-box;
}
.comment-footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 12rpx;
}
.comment-count {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	font-variant-numeric: tabular-nums;
}
.comment-count-warn {
	color: var(--color-danger);
}

/* ===== 底部固定提交栏 ===== */
.bottom-spacer {
	height: 20rpx;
}
.submit-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 100;
	background: var(--color-bg-card);
	border-top: 1rpx solid var(--color-border);
	padding: 20rpx 32rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
}
.submit-bar-inner {
	display: flex;
	align-items: center;
	gap: 20rpx;
}
.submit-hint {
	flex: 1;
	min-width: 0;
}
.submit-hint-text {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	line-height: 1.4;
}
.btn-submit {
	flex-shrink: 0;
	min-width: 240rpx;
	background: var(--color-brand) !important;
	color: #FFFFFF !important;
	font-size: 28rpx;
	font-weight: 600;
	border-radius: 16rpx;
	padding: 22rpx 40rpx;
	border: none;
	line-height: 1;
}
.btn-submit::after {
	border: none;
}
.btn-submit-disabled {
	background: var(--color-border) !important;
	color: var(--color-text-tertiary) !important;
	opacity: 1 !important;
}
</style>
