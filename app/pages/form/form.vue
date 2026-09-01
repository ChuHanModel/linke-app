<template>
	<view class="page" :class="themeClass" :style="pageStyle">
		<page-meta :page-style="'overflow: hidden'" />

		<!-- 更多菜单遮罩 -->
		<view v-if="showMoreMenu" class="menu-mask" @click="showMoreMenu = false">
			<view class="menu-panel" @click.stop>
				<picker v-if="pyfaTermList.length > 0" mode="selector" :range="pyfaTermList" :value="pyfaTermIndex" @change="onTermChange" :disabled="scheduleLoadingWeek !== null">
					<view class="menu-item">
						<text class="menu-item-label">切换学期</text>
						<text class="menu-item-value">{{ pyfaTermList[pyfaTermIndex] || '' }}</text>
					</view>
				</picker>
				<view class="menu-item" :class="{ 'menu-item--disabled': isRefreshing }" @click="onMenuRefresh">
					<text class="menu-item-label">刷新课表</text>
				</view>
			</view>
		</view>

		<!-- 已登录但课表尚未加载 -->
		<view v-if="!term && isLoggedIn" class="empty-state">
			<template v-if="!syncFailedHint">
				<view class="loading-spinner"></view>
				<text class="empty-title">{{ syncProgressTitle }}</text>
				<text class="empty-desc">{{ syncProgressDetail }}</text>
			</template>
			<template v-else>
				<text class="empty-title">{{ syncFailedHint }}</text>
				<text class="empty-desc">课表数据没拉到。可能是教务系统暂时异常或者本学期暂无课表。</text>
				<button class="btn-primary" @tap="retryScheduleLoad">重新加载课表</button>
			</template>
		</view>

		<!-- 未登录状态 -->
		<view v-else-if="!term && !scheduleLoadStatus" class="empty-state">
			<text class="empty-title">课程表</text>
			<text class="empty-desc">登录教务系统后，课表将自动同步。</text>
			<button class="btn-primary" @tap="goJwLogin">去登录</button>
		</view>

		<!-- 主内容区 -->
		<view v-if="term" class="main">
			<!-- 头部：学期标题 + 状态 + 更多按钮 -->
			<view class="header">
				<view class="header-title-row">
					<text class="header-term">{{ term }}</text>
					<view class="header-status-wrap">
						<view v-if="scheduleLoadingWeek !== null || isRefreshing" class="status-dot status-dot--loading"></view>
						<view v-else class="status-dot" :class="statusDotClass"></view>
						<text v-if="scheduleLoadingWeek !== null || isRefreshing" class="header-status">加载中<text v-if="scheduleLoadingWeek !== null" class="header-progress"> {{ scheduleLoadingWeek }}/{{ refreshTotalWeeks }}</text></text>
						<text class="header-status" v-else-if="scheduleLoadStatus" :class="scheduleStatusClass">{{ scheduleLoadStatus }}</text>
						<text class="header-status" v-else>已同步</text>
					</view>
					<view class="header-actions">
						<text v-if="needReLoginHint" class="header-login-link" @click="goJwLogin">去登录</text>
						<view class="header-more-btn" @click="showMoreMenu = !showMoreMenu">
							<view class="more-dot"></view>
							<view class="more-dot"></view>
							<view class="more-dot"></view>
						</view>
					</view>
				</view>
			</view>

			<!-- 周次导航 -->
			<view class="week-nav">
				<view class="week-nav-row">
					<view class="week-arrow" :class="{ 'week-arrow--disabled': scheduleStartWeek === null || currentWeek <= scheduleStartWeek }" @click="prevWeek">
						<text class="week-arrow-text">‹</text>
					</view>
					<picker mode="selector" :range="weekOptions" :value="currentWeekIndex" @change="onWeekChange" :disabled="scheduleLoadingWeek !== null">
						<view class="week-center">
							<text class="week-label" :class="{ 'week-label--holiday': isHoliday }">第 {{ currentWeek }} 周</text>
							<text v-if="isHoliday" class="week-holiday-tag">假期</text>
							<text v-else class="week-expand-icon">▾</text>
						</view>
					</picker>
					<view class="week-arrow" :class="{ 'week-arrow--disabled': scheduleEndWeek === null || currentWeek >= scheduleEndWeek }" @click="nextWeek">
						<text class="week-arrow-text">›</text>
					</view>
				</view>
			</view>

			<!-- 课程网格 -->
			<view class="grid-wrap">
				<view v-if="scheduleGrid.length === 0 && scheduleLoadingWeek === null" class="grid-empty">
					<text class="grid-empty-text">本学期暂无课表数据</text>
				</view>
				<view v-else class="grid-container">
					<!-- 表头行 -->
					<view class="day-header-row">
						<view class="day-header-cell day-header-cell--time">
							<text class="day-header-time-text">节</text>
						</view>
						<view v-for="(day, di) in ['一','二','三','四','五','六','日']" :key="di" class="day-header-cell" :class="{ 'day-header-cell--today': !isHoliday && todayDayIndex === di, 'day-header-cell--weekend': di >= 5 }">
							<text class="day-header-text" :class="{ 'day-header-text--today': !isHoliday && todayDayIndex === di, 'day-header-text--weekend': di >= 5 }">{{ day }}</text>
							<view v-if="!isHoliday && todayDayIndex === di" class="day-header-indicator"></view>
						</view>
					</view>
					<!-- 数据行 -->
					<view class="grid-body">
						<template v-if="scheduleGrid.length > 0">
							<view v-for="(row, ri) in scheduleGrid" :key="ri" class="grid-row">
								<view class="grid-cell grid-cell--period">
									<text class="period-label">{{ String(ri + 1).padStart(2, '0') }}</text>
								</view>
								<view v-for="(cell, ci) in row" :key="ci" class="grid-cell grid-cell--course" :class="{ 'grid-cell--today-col': !isHoliday && todayDayIndex === ci }">
									<view v-if="cell && cell.course" class="course-card" :class="{ 'course-card--today': !isHoliday && todayDayIndex === ci }" @click="onCourseClick(cell, ri, ci)">
										<text class="course-name" :class="{ 'course-name--today': !isHoliday && todayDayIndex === ci }">{{ cell.course }}</text>
										<view class="course-meta">
											<text v-if="cell.teacher" class="course-teacher">{{ cell.teacher }}</text>
											<text v-if="cell.location" class="course-location">{{ cell.location }}</text>
										</view>
									</view>
								</view>
							</view>
						</template>
						<!-- 加载中骨架 -->
						<template v-else-if="scheduleLoadingWeek !== null || isRefreshing">
							<view v-for="ri in 11" :key="'sk-' + ri" class="grid-row">
								<view class="grid-cell grid-cell--period">
									<text class="period-label">{{ String(ri).padStart(2, '0') }}</text>
								</view>
								<view v-for="ci in 7" :key="ci" class="grid-cell grid-cell--course">
									<view v-if="(ri === 1 && ci === 2) || (ri === 1 && ci === 4) || (ri === 3 && ci === 1) || (ri === 3 && ci === 5) || (ri === 5 && ci === 3) || (ri === 7 && ci === 2) || (ri === 9 && ci === 4)" class="sk-course-card sk-shimmer"></view>
								</view>
							</view>
						</template>
						<!-- 空行骨架 -->
						<template v-else>
							<view v-for="(label, ri) in sectionLabels" :key="'e-' + ri" class="grid-row">
								<view class="grid-cell grid-cell--period">
									<text class="period-label">{{ String(ri + 1).padStart(2, '0') }}</text>
								</view>
								<view v-for="day in 7" :key="day" class="grid-cell grid-cell--course" :class="{ 'grid-cell--today-col': !isHoliday && todayDayIndex === (day - 1) }"></view>
							</view>
						</template>
					</view>
				</view>
			</view>
		</view>

		<!-- 课程详情底部抽屉 -->
		<view v-if="courseDetailVisible" class="sheet-mask" @click="closeCourseDetail">
			<view class="sheet" @click="closeCourseDetail">
				<view class="sheet-handle-wrap"><view class="sheet-handle"></view></view>
				<view class="sheet-body" v-if="courseDetail">
					<view class="sheet-head">
						<text class="sheet-title">{{ courseDetail.course }}</text>
					</view>
					<view v-if="courseDetail.courseType || courseDetail.courseCode" class="sheet-tags">
						<text v-if="courseDetail.courseType" class="sheet-tag sheet-tag--primary">{{ courseDetail.courseType }}</text>
						<text v-if="courseDetail.courseCode" class="sheet-tag-code">课程代码: {{ courseDetail.courseCode }}</text>
					</view>
					<view class="sheet-info-list">
						<view v-if="courseDetail.teacher" class="sheet-info-row">
							<view class="sheet-icon-badge">
								<view class="ico-person">
									<view class="ico-person-head"></view>
									<view class="ico-person-body"></view>
								</view>
							</view>
							<view class="sheet-info-copy">
								<text class="sheet-info-label">教师</text>
								<text class="sheet-info-value">{{ courseDetail.teacher }}</text>
							</view>
						</view>
						<view v-if="courseDetailScheduleText" class="sheet-info-row">
							<view class="sheet-icon-badge">
								<view class="ico-clock">
									<view class="ico-clock-hand-h"></view>
									<view class="ico-clock-hand-m"></view>
								</view>
							</view>
							<view class="sheet-info-copy">
								<text class="sheet-info-label">时间</text>
								<view class="sheet-info-value-line">
									<text class="sheet-info-value">{{ courseDetailScheduleText || '待确认' }}</text>
								</view>
							</view>
						</view>
						<view v-if="courseDetail.time" class="sheet-info-row">
							<view class="sheet-icon-badge">
								<view class="ico-cal">
									<view class="ico-cal-ring ico-cal-ring--l"></view>
									<view class="ico-cal-ring ico-cal-ring--r"></view>
									<view class="ico-cal-body">
										<view class="ico-cal-dot"></view>
										<view class="ico-cal-dot"></view>
										<view class="ico-cal-dot"></view>
										<view class="ico-cal-dot"></view>
									</view>
								</view>
							</view>
							<view class="sheet-info-copy">
								<text class="sheet-info-label">周次</text>
								<text class="sheet-info-value">{{ courseDetail.time }}</text>
							</view>
						</view>
						<view class="sheet-info-row">
							<view class="sheet-icon-badge sheet-icon-badge--location">
								<view class="ico-pin">
									<view class="ico-pin-head"></view>
									<view class="ico-pin-tail"></view>
								</view>
							</view>
							<view class="sheet-info-copy">
								<text class="sheet-info-label">地点</text>
								<text class="sheet-info-value sheet-info-value--location">{{ courseDetailLocationText }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
		<app-tab-bar currentTab="/pages/form/form" />
	</view>
</template>

<script>
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { ensureAuthenticatedPage } from '@/utils/authGuard.js'
import { waitForPostLoginSync, getPostLoginSyncState, startPostLoginSync } from '@/services/sync/postLoginSyncService.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'
import { clearJwSession } from '@/utils/jwRequest.js'
import {
	SECTION_LABELS,
	calculateCurrentWeek as calculateScheduleCurrentWeek,
	checkAutoSwitchWeek as syncScheduleAutoSwitchWeek,
	checkTermDateAndCalculateWeek as syncScheduleTermDateCheck,
	defaultTerm,
	getTodayDayIndex,
	getSectionEnd as getScheduleSectionEnd,
	getSectionStart as getScheduleSectionStart,
	updateGlobalScheduleState,
	updateGlobalScheduleWithDates as persistScheduleDates
} from '@/services/schedule/scheduleService.js'
import {
	changeScheduleTerm,
	doRefreshSchedule,
	loadScheduleBatch as loadScheduleBatchFlow,
	refreshSchedule as refreshScheduleFlow
} from '@/services/schedule/scheduleFlowService.js'
import {
	applyCurrentWeekGrid,
	applyScheduleHtmlResult,
	changeScheduleWeekByPicker,
	getScheduleCookie,
	getScheduleMaxWeek,
	getScheduleMinWeek,
	goNextWeek,
	goPrevWeek,
	loadScheduleForWeek as loadScheduleForWeekState,
	syncScheduleFromGlobal
} from '@/services/schedule/schedulePageService.js'

export default {
	data() {
		return {
			term: defaultTerm(),
			scheduleGrid: [],
			currentWeek: 1,
			totalWeeks: 25,
			sectionLabels: SECTION_LABELS,
			scheduleLoadStatus: '',
			scheduleStartWeek: null,
			scheduleEndWeek: null,
			scheduleLoadingWeek: null,
			scheduleCache: {},
			pyfaTermList: [],
			windowWidth: 375,
			windowHeight: 667,
			safeAreaBottom: 0,
			courseDetailVisible: false,
			courseDetail: null,
			courseDetailSection: 0,
			courseDetailDay: 0,
			todayDayIndex: 0,
			dateCheckTimer: null,
			isHoliday: false,
			termStartDate: null,
			termEndDate: null,
			isRefreshing: false,
			refreshTotalWeeks: 30,
			loadScheduleBatchController: null,
			lastDateCheckTime: 0,
			dateCheckDebounceTime: 30000,
			showMoreMenu: false,
			// 课表同步实时进度（用于"已登录但课表未加载"空状态展示）
			postLoginSyncSnapshot: { status: 'idle', taskProgress: {} },
			postLoginSyncTimer: null,
			syncFailedHint: ''
		}
	},
		computed: {
			courseDetailSectionLabel() {
				if (this.courseDetailSection < 0 || this.courseDetailSection >= this.sectionLabels.length) return ''
				return this.sectionLabels[this.courseDetailSection]
			},
			courseDetailDayLabel() {
				const days = ['一', '二', '三', '四', '五', '六', '日']
				if (this.courseDetailDay < 0 || this.courseDetailDay >= days.length) return ''
				return days[this.courseDetailDay]
			},
			courseDetailScheduleText() {
				const parts = []
				if (this.courseDetailDayLabel) parts.push(`周${this.courseDetailDayLabel}`)
				if (this.courseDetailSectionLabel) parts.push(this.courseDetailSectionLabel)
				return parts.join(' ')
			},
			courseDetailLocationText() {
				if (this.courseDetail && this.courseDetail.location) return this.courseDetail.location
				return '待安排教室'
			},
			pyfaTermIndex() {
				if (!this.term || this.pyfaTermList.length === 0) return 0
				const index = this.pyfaTermList.indexOf(this.term)
				return index >= 0 ? index : 0
			},
			pageStyle() {
				const tabBarHeight = Math.round(this.windowWidth / 750 * 100) + this.safeAreaBottom
				return {
					height: `${this.windowHeight - tabBarHeight}px`,
					overflow: 'hidden'
				}
			},
		scheduleStatusClass() {
			const s = this.scheduleLoadStatus
			if (s == null || typeof s !== 'string') return {}
			return {
				'status-success': s.indexOf('成功') !== -1,
				'status-error': s.indexOf('失败') !== -1
			}
		},
		statusDotClass() {
			const s = this.scheduleLoadStatus
			if (this.isRefreshing) return 'status-dot--syncing'
			if (typeof s === 'string' && s.indexOf('失败') !== -1) return 'status-dot--error'
			return 'status-dot--ok'
		},
		needReLoginHint() {
			const s = this.scheduleLoadStatus
			return typeof s === 'string' && (s.indexOf('登录已过期') !== -1 || s.indexOf('请先完成教务登录') !== -1)
		},
		weekOptions() {
			const maxWeek = this.scheduleEndWeek !== null ? this.scheduleEndWeek : this.totalWeeks
			const minWeek = this.scheduleStartWeek !== null ? this.scheduleStartWeek : 1
			const real = this.realCurrentWeek
			const options = []
			for (let i = minWeek; i <= maxWeek; i++) {
				options.push(i === real ? `第 ${i} 周（本周）` : `第 ${i} 周`)
			}
			return options
		},
		currentWeekIndex() {
			const minWeek = this.scheduleStartWeek !== null ? this.scheduleStartWeek : 1
			return this.currentWeek - minWeek
		},
		weekList() {
			const min = this.scheduleStartWeek !== null ? this.scheduleStartWeek : 1
			const max = this.scheduleEndWeek !== null ? this.scheduleEndWeek : this.totalWeeks
			const list = []
			for (let i = min; i <= max; i++) list.push(i)
			return list
		},
		realCurrentWeek() {
			return calculateScheduleCurrentWeek(this.termStartDate)
		},
		isLoggedIn() {
			try {
				return !!(uni.getStorageSync('loginCookie') || uni.getStorageSync('userKey'))
			} catch (e) {
				return false
			}
		},
		// 从 postLoginSyncSnapshot 提取课表同步任务的实时进度信息，给空状态显示
		scheduleSyncProgress() {
			const tp = this.postLoginSyncSnapshot && this.postLoginSyncSnapshot.taskProgress
			if (!tp || !tp.schedule) return null
			return tp.schedule
		},
		syncProgressTitle() {
			const p = this.scheduleSyncProgress
			if (!p) return '正在加载课表'
			if (p.status === 'running') return '正在加载课表'
			if (p.status === 'fulfilled') return '课表已就绪'
			if (p.status === 'rejected') return '课表加载失败'
			return '正在加载课表'
		},
		syncProgressDetail() {
			const p = this.scheduleSyncProgress
			if (p && p.message) return p.message
			// 如果还没拿到 sync 状态，说明 postLoginSync 还没启动，给个温和的等待文案
			const status = this.postLoginSyncSnapshot && this.postLoginSyncSnapshot.status
			if (status === 'idle') return '等待登录后台同步开始...'
			return '课表数据同步中，请稍候...'
		}
	},
	onLoad() {
		if (!ensureAuthenticatedPage('form')) return
		uni.hideTabBar({ animation: false })
		try {
			const sys = uni.getSystemInfoSync()
			if (sys && sys.windowWidth) this.windowWidth = sys.windowWidth
			if (sys && sys.windowHeight) this.windowHeight = sys.windowHeight
			if (sys && sys.safeAreaInsets) this.safeAreaBottom = sys.safeAreaInsets.bottom || 0
		} catch (e) {}
		this.syncFromGlobal()
		this.updateTodayDayIndex()
		this.startDateCheckTimer()
	},
	async onShow() {
		if (!ensureAuthenticatedPage('form')) return
		uni.hideTabBar({ animation: false })
		ensureUserRegistered()
		this.syncFromGlobal()
		try {
			const sys = uni.getSystemInfoSync()
			if (sys && sys.windowHeight) this.windowHeight = sys.windowHeight
			if (sys && sys.windowWidth) this.windowWidth = sys.windowWidth
			if (sys && sys.safeAreaInsets) this.safeAreaBottom = sys.safeAreaInsets.bottom || 0
		} catch (e) {}
		this.updateTodayDayIndex()
		// 如果课表还没加载出来（登录后同步尚未完成），开始轮询同步进度并等待
		if (!this.term && this.isLoggedIn) {
			this.startPostLoginSyncPolling()
			await waitForPostLoginSync(30000)
			this.syncFromGlobal()
			// 同步完成（或超时）后还是没有 term，给出明确的错误提示让用户能重试
			if (!this.term) {
				const tp = (this.postLoginSyncSnapshot && this.postLoginSyncSnapshot.taskProgress) || {}
				const scheduleStatus = tp.schedule && tp.schedule.status
				if (scheduleStatus === 'rejected') {
					this.syncFailedHint = '课表加载失败'
				} else {
					this.syncFailedHint = '课表暂时未拿到'
				}
			}
			this.stopPostLoginSyncPolling()
		}
		await this.checkTermDateAndCalculateWeek()
		this.checkAutoSwitchWeek()
		if (!this.dateCheckTimer) {
			this.startDateCheckTimer()
		}
	},
	onHide() {
		this.stopDateCheckTimer()
		this.stopPostLoginSyncPolling()
	},
	onUnload() {
		this.stopDateCheckTimer()
		this.stopPostLoginSyncPolling()
		if (this.loadScheduleBatchController) {
			this.loadScheduleBatchController.cancelled = true
			this.loadScheduleBatchController = null
		}
	},
	methods: {
		startPostLoginSyncPolling() {
			if (this.postLoginSyncTimer) return
			const cloneSnapshot = (raw) => {
				const safe = raw && typeof raw === 'object' ? raw : { status: 'idle', taskProgress: {} }
				const tpRaw = (safe.taskProgress && typeof safe.taskProgress === 'object') ? safe.taskProgress : {}
				const taskProgress = {}
				for (const k of Object.keys(tpRaw)) taskProgress[k] = { ...tpRaw[k] }
				return { ...safe, taskProgress }
			}
			try { this.postLoginSyncSnapshot = cloneSnapshot(getPostLoginSyncState()) } catch (e) {}
			this.postLoginSyncTimer = setInterval(() => {
				try { this.postLoginSyncSnapshot = cloneSnapshot(getPostLoginSyncState()) } catch (e) {}
				// 一旦发现 term 已经就位，立刻 syncFromGlobal 让页面 unstuck
				if (!this.term) {
					this.syncFromGlobal()
					if (this.term) this.stopPostLoginSyncPolling()
				}
			}, 200)
		},
		stopPostLoginSyncPolling() {
			if (this.postLoginSyncTimer) {
				clearInterval(this.postLoginSyncTimer)
				this.postLoginSyncTimer = null
			}
		},
		async retryScheduleLoad() {
			this.syncFailedHint = ''
			this.startPostLoginSyncPolling()
			try {
				const cookie = uni.getStorageSync('loginCookie')
				if (!cookie) {
					this.syncFailedHint = '当前未登录'
					this.stopPostLoginSyncPolling()
					return
				}
				// 用 startPostLoginSync 重新触发一次完整后台同步（含课表）；它内部有 dedupe，已在跑就直接复用
				startPostLoginSync({ cookieHeader: cookie }).catch(err => console.warn('[form] retryScheduleLoad startPostLoginSync 失败:', err))
				await waitForPostLoginSync(30000)
				this.syncFromGlobal()
				if (!this.term) {
					this.syncFailedHint = '课表仍未拿到'
				}
			} finally {
				this.stopPostLoginSyncPolling()
			}
		},
		getSectionStart(ri) {
			return getScheduleSectionStart(this.sectionLabels, ri)
		},
		getSectionEnd(ri) {
			return getScheduleSectionEnd(this.sectionLabels, ri)
		},
		calculateCurrentWeek(startDate) {
			return calculateScheduleCurrentWeek(startDate)
		},
		async checkTermDateAndCalculateWeek() {
			await syncScheduleTermDateCheck(this)
		},
		handlePasswordError() {
			clearJwSession()
			uni.showModal({
				title: '密码已更改',
				content: '检测到您的教务系统密码已更改，请使用新密码重新登录',
				showCancel: false,
				confirmText: '去登录',
				confirmColor: '#179ecf',
				success: () => {
					uni.navigateTo({ url: `${JW_LOGIN_PAGE}?from=form` })
				}
			})
		},
		updateTodayDayIndex() {
			this.todayDayIndex = getTodayDayIndex()
		},
		startDateCheckTimer() {
			this.stopDateCheckTimer()
			this.dateCheckTimer = setInterval(() => {
				const oldIndex = this.todayDayIndex
				this.updateTodayDayIndex()
				if (oldIndex !== this.todayDayIndex) {
					console.log('[form] 日期已更新，今天高亮从', oldIndex, '变为', this.todayDayIndex)
				}
			}, 60000)
		},
		stopDateCheckTimer() {
			if (this.dateCheckTimer) {
				clearInterval(this.dateCheckTimer)
				this.dateCheckTimer = null
			}
		},
		async checkAutoSwitchWeek() {
			await syncScheduleAutoSwitchWeek(this)
		},
		onCourseClick(cell, sectionIndex, dayIndex) {
			if (!cell || !cell.course) return
			this.courseDetail = cell
			this.courseDetailSection = sectionIndex
			this.courseDetailDay = dayIndex
			this.courseDetailVisible = true
		},
		closeCourseDetail() {
			this.courseDetailVisible = false
			this.courseDetail = null
		},
		goJwLogin() {
			uni.navigateTo({ url: `${JW_LOGIN_PAGE}?from=form` })
		},
		syncFromGlobal() {
			syncScheduleFromGlobal(this)
		},
		loadScheduleCacheFromStorage() {
			syncScheduleFromGlobal(this)
		},
		getCookieHeader() {
			return getScheduleCookie()
		},
		parseScheduleStartWeek(schedule) {
			return getScheduleMinWeek(schedule)
		},
		parseScheduleEndWeek(schedule) {
			return getScheduleMaxWeek(schedule)
		},
		prevWeek() {
			return goPrevWeek(this)
		},
		nextWeek() {
			return goNextWeek(this)
		},
		onWeekChange(e) {
			return changeScheduleWeekByPicker(this, e)
		},
		onWeekSwiperChange(e) {
			const index = e.detail.current
			const minWeek = this.scheduleStartWeek !== null ? this.scheduleStartWeek : 1
			const newWeek = minWeek + index
			if (newWeek === this.currentWeek || this.scheduleLoadingWeek !== null) return
			this.currentWeek = newWeek
			return applyCurrentWeekGrid(this)
		},
		async applyWeekGrid() {
			await applyCurrentWeekGrid(this)
		},
		async loadScheduleForWeek(week) {
			await loadScheduleForWeekState(this, week)
		},
		parseScheduleHtml(parsed, week) {
			applyScheduleHtmlResult(this, parsed, week)
		},
		onTermChange(e) {
			if (!e || !e.detail) return
			const raw = e.detail.value
			const index = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
			if (isNaN(index) || index < 0 || index >= this.pyfaTermList.length) return
			const newTerm = this.pyfaTermList[index]
			if (!newTerm || newTerm === this.term) return
			this.showMoreMenu = false
			this.doTermChange(newTerm)
		},
		async doTermChange(newTerm) {
			await changeScheduleTerm(this, newTerm)
		},
		updateGlobalSchedule() {
			updateGlobalScheduleState(this)
		},
		updateGlobalScheduleWithDates(currentWeek, isHoliday, startDate = null, endDate = null, term = null) {
			persistScheduleDates(this, currentWeek, isHoliday, startDate, endDate, term)
		},
		onMenuRefresh() {
			if (this.isRefreshing) return
			this.showMoreMenu = false
			this.refreshSchedule()
		},
		async refreshSchedule() {
			await refreshScheduleFlow(this)
		},
		async doRefresh(cookie) {
			await doRefreshSchedule(this, cookie)
		},
		async loadScheduleBatch(targetTerm, providedCookie = null) {
			await loadScheduleBatchFlow(this, targetTerm, providedCookie)
		}
	}
}
</script>

<style scoped>
/* ══ Stitch Design: Academic Efficiency Workspace ══ */

/* ── 页面容器 ── */
.page {
	background: var(--color-bg-page-white);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	height: 100vh;
	box-sizing: border-box;
	padding-top: constant(safe-area-inset-top, 0px);
	padding-top: env(safe-area-inset-top, 0px);
}

/* ── 未登录空状态 ── */
.empty-state {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 60rpx;
}
.empty-icon-wrap {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background: rgba(23, 158, 207, 0.08);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 32rpx;
}
.empty-icon {
	font-size: 48rpx;
	color: #179ecf;
}
.empty-title {
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text-primary);
	margin-bottom: 12rpx;
	letter-spacing: -0.5rpx;
}
.empty-desc {
	font-size: 26rpx;
	color: var(--color-text-secondary);
	margin-bottom: 48rpx;
	text-align: center;
	line-height: 1.5;
}
.btn-primary {
	width: 360rpx;
	background: #179ecf;
	color: #fff;
	font-size: 28rpx;
	font-weight: 600;
	border-radius: 16rpx;
	padding: 24rpx 0;
	border: none;
	text-align: center;
}
.btn-primary::after { border: none; }
.loading-spinner {
	width: 56rpx;
	height: 56rpx;
	border: 4rpx solid var(--color-border);
	border-top-color: var(--color-brand);
	border-radius: 50%;
	margin-bottom: 32rpx;
	animation: spin 0.8s linear infinite;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

/* ── 主内容区 ── */
.main {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

/* ── 头部 ── */
.header {
	padding: 28rpx 40rpx 20rpx;
	flex-shrink: 0;
}
.header-title-row {
	display: flex;
	align-items: flex-end;
	gap: 16rpx;
}
.header-term {
	font-size: 44rpx;
	font-weight: 800;
	color: var(--color-brand);
	letter-spacing: -1rpx;
	line-height: 1.2;
	flex-shrink: 0;
}
.header-status-wrap {
	display: flex;
	align-items: center;
	gap: 8rpx;
	flex-shrink: 0;
	padding-bottom: 6rpx;
}
.status-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	flex-shrink: 0;
}
.status-dot--ok {
	background: #10b981;
}
.status-dot--syncing {
	background: #f59e0b;
}
.status-dot--loading {
	background: #179ecf;
	animation: dot-pulse 1s ease-in-out infinite;
}
@keyframes dot-pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.4; transform: scale(0.7); }
}
.status-dot--error {
	background: #ef4444;
}
.header-status {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--color-text-secondary);
}
.header-progress {
	font-variant-numeric: tabular-nums;
}
.header-status.status-success { color: #10b981; }
.header-status.status-error { color: #ef4444; }
.header-actions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-left: auto;
}
.header-login-link {
	font-size: 24rpx;
	color: #179ecf;
	font-weight: 600;
}
.header-more-btn {
	padding: 12rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
}
.header-more-btn:active { opacity: 0.5; }
.more-dot {
	width: 7rpx;
	height: 7rpx;
	border-radius: 50%;
	background: var(--color-text-secondary);
}

/* ── 周次导航 ── */
.week-nav {
	padding: 0 40rpx 16rpx;
	flex-shrink: 0;
}
.week-nav-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}
.week-arrow {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.week-arrow:active {
	opacity: 0.5;
}
.week-arrow--disabled {
	opacity: 0.2;
}
.week-arrow-text {
	font-size: 40rpx;
	font-weight: 300;
	color: var(--color-brand);
	line-height: 1;
}
.week-center {
	display: flex;
	align-items: center;
	gap: 10rpx;
}
.week-label {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-brand);
}
.week-label--holiday { color: #f59e0b; }
.week-holiday-tag {
	font-size: 22rpx;
	font-weight: 600;
	color: #f59e0b;
	background: rgba(245, 158, 11, 0.1);
	padding: 4rpx 14rpx;
	border-radius: 8rpx;
}
.week-expand-icon {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
}

/* ── 课程网格 ── */
.grid-wrap {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}
.grid-empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 300rpx;
}
.grid-empty-text {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}
.grid-container {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ── 表头行 ── */
.day-header-row {
	display: flex;
	flex-shrink: 0;
	border-bottom: 1rpx solid var(--color-border-light);
}
.day-header-cell {
	flex: 1;
	min-width: 0;
	height: 80rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	position: relative;
}
.day-header-cell--time {
	flex: 0 0 80rpx;
	max-width: 80rpx;
}
.day-header-time-text {
	font-size: 20rpx;
	font-weight: 700;
	color: var(--color-text-secondary);
	text-transform: uppercase;
	letter-spacing: 1rpx;
}
.day-header-text {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--color-text-tertiary);
}
.day-header-text--today {
	font-weight: 700;
	color: #179ecf;
}
.day-header-text--weekend {
	font-weight: 500;
	color: var(--color-text-secondary);
}
.day-header-cell--today {
	background: rgba(23, 158, 207, 0.05);
}
.day-header-indicator {
	position: absolute;
	bottom: 0;
	left: 25%;
	right: 25%;
	height: 4rpx;
	background: #179ecf;
	border-radius: 2rpx;
}

/* ── 网格主体 ── */
.grid-body {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}
.grid-row {
	display: flex;
	flex: 1;
	min-height: 0;
	border-bottom: 1rpx solid var(--color-border-light);
}
.grid-row:last-child { border-bottom: none; }

.grid-cell {
	min-width: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-sizing: border-box;
}

/* 节次列 */
.grid-cell--period {
	flex: 0 0 80rpx;
	max-width: 80rpx;
	align-items: center;
	justify-content: center;
	border-right: 1rpx solid var(--color-border-light);
}
.period-label {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--color-text-secondary);
}

/* 课程列 */
.grid-cell--course {
	flex: 1;
	padding: 4rpx;
	border-right: 1rpx solid var(--color-border-light);
}
.grid-cell--course:last-child { border-right: none; }

/* 今日列背景 */
.grid-cell--today-col {
	background: rgba(23, 158, 207, 0.05);
}

/* ── 骨架加载 ── */
@keyframes sk-shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: 0 0; }
}
.sk-shimmer {
	background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 37%, var(--color-skeleton-from) 63%);
	background-size: 400% 100%;
	animation: sk-shimmer 1.4s ease infinite;
}
.sk-course-card {
	height: 100%;
	border-radius: 12rpx;
	min-height: 60rpx;
}

/* ── 课程卡片 ── */
.course-card {
	height: 100%;
	border-radius: 16rpx;
	box-sizing: border-box;
	background: rgba(23, 158, 207, 0.05);
	border: 1rpx solid rgba(23, 158, 207, 0.1);
	padding: 12rpx 8rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow: hidden;
}
.course-card:active {
	opacity: 0.8;
}

/* 今日列课程卡 - 白色 + 阴影 */
.course-card--today {
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border-light);
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.course-name {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--color-brand);
	line-height: 1.3;
	word-break: break-all;
}
.course-name--today {
	color: #334155;
}
.course-meta {
	display: flex;
	flex-direction: column;
	gap: 2rpx;
}
.course-teacher {
	font-size: 18rpx;
	color: var(--color-text-tertiary);
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.course-location {
	font-size: 18rpx;
	font-weight: 500;
	color: var(--color-text-secondary);
	line-height: 1.3;
}

/* ── 更多菜单 ── */
.menu-mask {
	position: fixed;
	left: 0; right: 0; top: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	z-index: 101;
	display: flex;
	justify-content: flex-end;
	align-items: flex-start;
	padding-top: calc(120rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(120rpx + env(safe-area-inset-top, 0px));
	padding-right: 40rpx;
}
.menu-panel {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	min-width: 300rpx;
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.12);
	overflow: hidden;
}
.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 28rpx;
	border-bottom: 1rpx solid var(--color-border-light);
}
.menu-item:last-child { border-bottom: none; }
.menu-item-label {
	font-size: 28rpx;
	color: var(--color-text-primary);
}
.menu-item-value {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	margin-left: 16rpx;
}
.menu-item--disabled {
	opacity: 0.5;
}

/* ══ 底部抽屉 ══ */
.sheet-mask {
	position: fixed;
	left: 0; right: 0; top: 0; bottom: 0;
	background: rgba(15, 23, 42, 0.18);
	z-index: 1000;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}
.sheet {
	width: 100%;
	background: var(--color-bg-card);
	border-radius: 28rpx 28rpx 0 0;
	box-shadow: 0 -8rpx 32rpx rgba(15, 23, 42, 0.10);
	padding-bottom: constant(safe-area-inset-bottom, 0px);
	padding-bottom: env(safe-area-inset-bottom, 0px);
	max-height: 66vh;
	overflow: hidden;
}
.sheet-handle-wrap {
	display: flex;
	justify-content: center;
	padding: 14rpx 0 8rpx;
}
.sheet-handle {
	width: 52rpx;
	height: 6rpx;
	border-radius: 3rpx;
	background: var(--color-border);
}
.sheet-body {
	max-height: 58vh;
	overflow-y: auto;
	padding: 8rpx 24rpx 32rpx;
	box-sizing: border-box;
}

.sheet-head {
	display: block;
	margin-bottom: 18rpx;
}
.sheet-title {
	font-size: 38rpx;
	font-weight: 800;
	color: var(--color-text-primary);
	line-height: 1.3;
	word-break: break-all;
}

.sheet-tags {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 14rpx;
	margin-bottom: 18rpx;
}
.sheet-tag {
	font-size: 20rpx;
	font-weight: 600;
	color: var(--color-text-tertiary);
	background: var(--color-bg-input);
	border: 1rpx solid var(--color-border);
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	line-height: 1;
}
.sheet-tag--primary {
	color: var(--color-brand);
	background: var(--color-bg-tag);
	border-color: var(--color-border);
}
.sheet-tag-code {
	font-size: 22rpx;
	color: var(--color-text-secondary);
	line-height: 1.4;
}

.sheet-info-list {
	display: flex;
	flex-direction: column;
}
.sheet-info-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 12rpx 2rpx;
}
.sheet-icon-badge {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: var(--color-bg-tag);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.sheet-icon-badge--location {
	background: #E8F0FF;
}
.sheet-info-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 4rpx;
}
.sheet-info-label {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--color-text-secondary);
	line-height: 1.4;
}
.sheet-info-value {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--color-text-primary);
	line-height: 1.4;
	word-break: break-all;
}
.sheet-info-value-line {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 12rpx;
}
.sheet-info-value--location {
	color: var(--color-brand);
}

.ico-person {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.ico-person-head {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: var(--color-text-secondary);
	margin-bottom: 4rpx;
}
.ico-person-body {
	width: 24rpx;
	height: 12rpx;
	border-radius: 12rpx 12rpx 0 0;
	background: var(--color-text-secondary);
}

.ico-clock {
	width: 24rpx;
	height: 24rpx;
	border-radius: 50%;
	border: 3rpx solid var(--color-text-secondary);
	position: relative;
	box-sizing: border-box;
}
.ico-clock-hand-h {
	position: absolute;
	width: 3rpx;
	height: 8rpx;
	background: var(--color-text-secondary);
	top: 50%;
	left: 50%;
	transform: translate(-50%, -100%);
	border-radius: 2rpx;
}
.ico-clock-hand-m {
	position: absolute;
	width: 3rpx;
	height: 7rpx;
	background: var(--color-text-secondary);
	top: 50%;
	left: 50%;
	transform-origin: bottom center;
	transform: translate(-50%, -100%) rotate(90deg);
	border-radius: 2rpx;
}

.ico-cal {
	width: 24rpx;
	height: 24rpx;
	position: relative;
}
.ico-cal-ring {
	position: absolute;
	top: 0;
	width: 4rpx;
	height: 7rpx;
	background: var(--color-text-secondary);
	border-radius: 2rpx;
}
.ico-cal-ring--l { left: 6rpx; }
.ico-cal-ring--r { right: 6rpx; }
.ico-cal-body {
	position: absolute;
	top: 5rpx;
	left: 0;
	right: 0;
	bottom: 0;
	border: 3rpx solid var(--color-text-secondary);
	border-radius: 4rpx;
	box-sizing: border-box;
	display: flex;
	flex-wrap: wrap;
	align-content: flex-end;
	justify-content: center;
	gap: 2rpx;
	padding: 7rpx 3rpx 3rpx;
}
.ico-cal-dot {
	width: 4rpx;
	height: 4rpx;
	border-radius: 1rpx;
	background: var(--color-text-secondary);
}

.ico-pin {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.ico-pin-head {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	border: 4rpx solid #2563EB;
	box-sizing: border-box;
	position: relative;
}
.ico-pin-head::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 6rpx;
	height: 6rpx;
	border-radius: 50%;
	background: #2563EB;
}
.ico-pin-tail {
	width: 0;
	height: 0;
	border-left: 5rpx solid transparent;
	border-right: 5rpx solid transparent;
	border-top: 8rpx solid #2563EB;
	margin-top: -1rpx;
}
</style>
