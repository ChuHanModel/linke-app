import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { getAppGlobal } from '@/utils/appGlobalStorage.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { refreshEvaluatedStatus } from '@/utils/evaluationLoader.js'
import { fetchCollectionList } from '@/services/course/courseCollectionService.js'
import { getPostLoginSyncState, waitForPostLoginSync } from '@/services/sync/postLoginSyncService.js'

const HOME_DASHBOARD_CACHE_TTL = 5 * 60 * 1000
const HOME_ABOUT_ME_REFRESH_TTL = 30 * 1000

function padNumber(value) {
	return value < 10 ? `0${value}` : `${value}`
}

function shuffle(list) {
	const result = Array.isArray(list) ? list.slice() : []
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const temp = result[i]
		result[i] = result[j]
		result[j] = temp
	}
	return result
}

function uniqueStrings(list) {
	return Array.from(new Set((Array.isArray(list) ? list : [])
		.map(item => String(item || '').trim())
		.filter(Boolean)))
}

function normalizeList(result) {
	if (Array.isArray(result)) return result
	if (result && Array.isArray(result.list)) return result.list
	if (result && typeof result === 'object') return Object.values(result)
	return []
}

function parseNumber(value) {
	const text = String(value == null ? '' : value).trim()
	if (!text) return null
	const parsed = Number(text)
	return Number.isNaN(parsed) ? null : parsed
}

function formatCreditNumber(value) {
	if (value == null || Number.isNaN(value)) return null
	if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value))
	return value.toFixed(1)
}

function formatDateTag(dateStr) {
	if (!dateStr) return ''
	const now = new Date()
	const d = new Date(dateStr.replace(/-/g, '/'))
	if (isNaN(d.getTime())) return dateStr
	const diffMs = now.getTime() - d.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
	if (diffDays < 0) return '即将发布'
	if (diffDays === 0) return '今天'
	if (diffDays === 1) return '昨天'
	if (diffDays < 7) return diffDays + '天前'
	if (diffDays < 30) return Math.floor(diffDays / 7) + '周前'
	if (diffDays < 365) return Math.floor(diffDays / 30) + '个月前'
	return Math.floor(diffDays / 365) + '年前'
}

function formatTermText(term) {
	if (!term || term === '当前学期') return ''
	const match = String(term).match(/^(\d{4})-(\d{4})-(\d)$/)
	if (!match) return String(term)
	const semesterText = match[3] === '1'
		? '第一学期'
		: (match[3] === '2' ? '第二学期' : `第${match[3]}学期`)
	return `${match[1]}-${match[2]}学年${semesterText}`
}

function resolveStoredUserInfo() {
	const fromStorage = uni.getStorageSync('userInfo')
	if (fromStorage && fromStorage.user) return fromStorage
	try {
		const app = getApp()
		const globalInfo = app && app.globalData && app.globalData.userData && app.globalData.userData.userInfo
		if (globalInfo && globalInfo.user) return globalInfo
	} catch (e) {}
	return null
}

function resolveUserName() {
	const userInfo = resolveStoredUserInfo()
	if (userInfo && userInfo.user && userInfo.user.name) {
		const name = String(userInfo.user.name).trim()
		if (name) return name
	}
	const userId = uni.getStorageSync('userId')
	return userId ? String(userId).trim() : '同学'
}

function resolveUserKey() {
	try {
		const app = getApp()
		const key = app && app.globalData && app.globalData.userData && app.globalData.userData.userKey
		if (key) return key
	} catch (e) {}
	const storageKey = uni.getStorageSync('userKey')
	if (storageKey) return storageKey
	const userId = uni.getStorageSync('userId')
	const userPassword = uni.getStorageSync('userPassword')
	if (userId && userPassword) return md5.hexMD5(userId + userPassword)
	return ''
}

function getErrorMessage(error, fallback = '请求失败') {
	return error && (error.message || error.errMsg || error) ? String(error.message || error.errMsg || error) : fallback
}

function isInterruptedRequestError(error) {
	const message = getErrorMessage(error, '')
	return /request:fail abort|abort statusCode:-1|网络连接已中断|\(-1005\)|network connection was lost/i.test(message)
}

function isHomeAboutMeDirty() {
	try {
		const app = getApp()
		return !!(app && app.globalData && app.globalData.homeAboutMeDirty)
	} catch (e) {
		return false
	}
}

function clearHomeAboutMeDirty() {
	try {
		const app = getApp()
		if (app && app.globalData) app.globalData.homeAboutMeDirty = false
	} catch (e) {}
}

function computeElectiveCreditTotal(creditParsed) {
	if (!creditParsed || typeof creditParsed !== 'object') return null
	let total = 0
	let hasAnyValue = false
	for (const key of Object.keys(creditParsed)) {
		const item = creditParsed[key]
		if (!item || typeof item !== 'object') continue
		const finished = parseNumber(item.count)
		const studying = parseNumber(item.studying)
		if (finished != null) {
			total += finished
			hasAnyValue = true
		}
		if (studying != null) {
			total += studying
			hasAnyValue = true
		}
	}
	return hasAnyValue ? formatCreditNumber(total) : null
}

function pickRandomTagsFromCourses(courseList) {
	const rows = Array.isArray(courseList) ? courseList : []
	const courseNames = uniqueStrings(rows.map(item => item.lessonName || item.courseName))
	const teacherNames = uniqueStrings(rows.map(item => item.teacherName))
	const courseTags = shuffle(courseNames).slice(0, 6).map(keyword => ({ keyword, type: 'course' }))
	const teacherTags = shuffle(teacherNames).slice(0, 3).map(keyword => ({ keyword, type: 'teacher' }))
	return shuffle(courseTags.concat(teacherTags)).slice(0, 9)
}

async function fetchLatestTermCode() {
	const result = await post('App.Course.getLatestTerm', {}, {
		cacheKey: 'home:latest-term',
		cacheTTL: HOME_DASHBOARD_CACHE_TTL,
		staleCacheOnError: true,
		retryCount: 1,
		retryDelay: 300
	})
	return result && result.term ? result.term : ''
}

async function fetchLatestCourseList(term) {
	if (!term) return []
	const result = await post('App.Course.getCourseList', {
		courseTerm: term,
		limitIndex: 1,
		limitCount: 1000
	}, {
		cacheKey: `home:course-list:${term}`,
		cacheTTL: HOME_DASHBOARD_CACHE_TTL,
		staleCacheOnError: true,
		retryCount: 1,
		retryDelay: 300
	})
	return normalizeList(result)
}

async function fetchTotalCourseCount() {
	const result = await post('App.Course.getCourseCount', {}, {
		cacheKey: 'home:total-course-count',
		cacheTTL: HOME_DASHBOARD_CACHE_TTL,
		staleCacheOnError: true,
		retryCount: 1,
		retryDelay: 300
	})
	const count = result && result.courseCount != null ? Number(result.courseCount) : null
	return count != null && !Number.isNaN(count) ? count : null
}

async function fetchCollectionCount(userKey) {
	if (!userKey) return null
	const list = await fetchCollectionList({ userKey })
	return normalizeList(list).length
}

async function fetchLatestNotices() {
	const result = await post('App.JwNotice.GetLatestJwNoticeListSelectCourse', { limit: 2 }, {
		cacheKey: 'home:latest-notices',
		cacheTTL: HOME_DASHBOARD_CACHE_TTL
	})
	const list = normalizeList(result)
	return list.slice(0, 2).map(item => ({
		title: item.title || '',
		date: item.date || '',
		url: item.url || ''
	}))
}

async function resolveEvaluatedCourses(userKey) {
	let courses = getAppGlobal('evaluatedCourses')
	if (Array.isArray(courses) && courses.length > 0) {
		return { list: courses, known: true }
	}

	try {
		if (userKey && Array.isArray(getAppGlobal('allCourses')) && getAppGlobal('allCourses').length > 0) {
			courses = await refreshEvaluatedStatus()
			return { list: Array.isArray(courses) ? courses : [], known: true }
		}
		const syncState = getPostLoginSyncState()
		if (syncState.status === 'running') {
			await waitForPostLoginSync()
			// 同步完成后重新读取
			courses = getAppGlobal('evaluatedCourses')
			if (Array.isArray(courses) && courses.length > 0) {
				return { list: courses, known: true }
			}
			// 同步完成但仍无数据，尝试用 allCourses 刷新
			if (userKey && Array.isArray(getAppGlobal('allCourses')) && getAppGlobal('allCourses').length > 0) {
				courses = await refreshEvaluatedStatus()
				return { list: Array.isArray(courses) ? courses : [], known: true }
			}
		}
	} catch (error) {
		console.warn('[home] 获取评价课程失败:', error && (error.message || error))
	}

	const fallback = Array.isArray(courses) ? courses : []
	return { list: fallback, known: fallback.length > 0 }
}

export function createHomePageState() {
	return {
		userName: '同学',
		now: Date.now(),
		termStatusText: '学期信息同步中',
		latestTerm: '',
		totalCourseCount: null,
		jwNotices: [],
		noticesLoading: true,
		randomTags: [],
		visibleTagCount: 3,
		tagsAdjusting: false,
		latestCourseList: [],
		courseListLoading: true,
		courseListError: '',
		collectionCount: null,
		collectionLoading: true,
		evaluatePendingCount: null,
		evaluatePendingLoading: true,
		electiveCreditTotal: null,
		userKey: '',
		skipNextOnShowRefresh: false,
		lastDashboardRefreshAt: 0,
		lastAboutMeRefreshAt: 0,
		postLoginSyncSnapshot: { status: 'idle', taskResults: [], taskProgress: {} },
		firstSyncOverlayDismissed: false,
		_postLoginSyncTimer: null,
		_overlayShownAt: 0,
		_overlayHideTimer: null
	}
}

export const homePageComputed = {
	greetingText() {
		const hour = new Date(this.now).getHours()
		if (hour < 6) return '夜深了'
		if (hour < 11) return '早上好'
		if (hour < 14) return '中午好'
		if (hour < 18) return '下午好'
		return '晚上好'
	},
	currentDateText() {
		const date = new Date(this.now)
		const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
		return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${weekMap[date.getDay()]}`
	},
	formattedLatestTerm() {
		return formatTermText(this.latestTerm)
	},
	userInitials() {
		const name = String(this.userName || '').trim()
		if (!name) return 'LK'
		const parts = name.split(/\s+/).filter(Boolean)
		if (parts.length >= 2) {
			return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
		}
		return name.slice(0, 2).toUpperCase()
	},
	formattedTotalCourseCount() {
		if (this.totalCourseCount == null) return '—'
		return this.totalCourseCount.toLocaleString()
	},
	pageLoading() {
		return this.noticesLoading || this.courseListLoading || this.evaluatePendingLoading || this.collectionLoading
	},
	homeLoadingItems() {
		const frontItems = [
			{ key: 'notices', label: '教务通知', status: this.noticesLoading ? 'running' : 'done', detail: this.noticesLoading ? '正在拉取通知...' : '', done: !this.noticesLoading },
			{ key: 'courseList', label: '通选课列表', status: this.courseListLoading ? 'running' : 'done', detail: this.courseListLoading ? '正在拉取通选课列表...' : '', done: !this.courseListLoading },
			{ key: 'evaluate', label: '待评价课程', status: this.evaluatePendingLoading ? 'running' : 'done', detail: this.evaluatePendingLoading ? '正在统计待评价课程...' : '', done: !this.evaluatePendingLoading },
			{ key: 'collection', label: '我的收藏', status: this.collectionLoading ? 'running' : 'done', detail: this.collectionLoading ? '正在拉取收藏列表...' : '', done: !this.collectionLoading }
		]
		const state = this.postLoginSyncSnapshot || { status: 'idle', taskResults: [], taskProgress: {} }
		// 只有登录后正在跑（running）或刚跑完（success/partial/error）时才把同步任务算进进度
		// idle 状态（比如冷启动/已登录复开）下，postLoginSync 根本不会跑，不能把它们纳入统计
		const everRan = state.status === 'running' || state.status === 'success' || state.status === 'partial' || state.status === 'error'
		if (!everRan) return frontItems
		const isFinalState = state.status === 'success' || state.status === 'partial' || state.status === 'error'
		const taskResults = Array.isArray(state.taskResults) ? state.taskResults : []
		const resultMap = {}
		for (const item of taskResults) {
			if (item && item.key) resultMap[item.key] = item
		}
		const taskProgress = (state && typeof state.taskProgress === 'object' && state.taskProgress) || {}
		const buildSyncItem = (key, label) => {
			const tp = taskProgress[key] || null
			const result = resultMap[key] || null
			let status = 'pending'
			let detail = ''
			if (tp) {
				if (tp.status === 'fulfilled') {
					status = 'done'
					detail = tp.message || '已完成'
				} else if (tp.status === 'rejected') {
					status = 'error'
					detail = tp.message || '加载失败'
				} else if (tp.status === 'running') {
					status = 'running'
					detail = tp.message || '加载中...'
				} else {
					status = 'pending'
					detail = '等待中'
				}
			} else if (result) {
				status = result.status === 'fulfilled' ? 'done' : 'error'
				detail = result.status === 'fulfilled' ? '已完成' : (result.message || '加载失败')
			} else if (isFinalState) {
				status = 'done'
				detail = '已完成'
			}
			return { key, label, status, detail, done: status === 'done' || status === 'error' }
		}
		const syncItems = [
			buildSyncItem('schedule', '课表同步'),
			buildSyncItem('evaluation', '评价同步'),
			buildSyncItem('credit', '学分同步')
		]
		return [...frontItems, ...syncItems]
	},
	homeLoadingDoneCount() {
		return this.homeLoadingItems.filter(item => item.done).length
	},
	homeLoadingTotalCount() {
		return this.homeLoadingItems.length
	},
	homeLoadingPercent() {
		const total = this.homeLoadingTotalCount
		if (total === 0) return 100
		return Math.round((this.homeLoadingDoneCount / total) * 100)
	},
	homeLoadingActiveItem() {
		// 优先返回正在 running 的项，其次返回第一个 pending 项
		const items = this.homeLoadingItems
		const running = items.find(item => item.status === 'running')
		if (running) return running
		const pending = items.find(item => item.status === 'pending')
		if (pending) return pending
		return null
	},
	homeLoadingCurrentLabel() {
		const active = this.homeLoadingActiveItem
		if (!active) return '即将完成'
		if (active.detail) return `${active.label} · ${active.detail}`
		return `正在加载 ${active.label}…`
	},
	homeLoadingAllDone() {
		return this.homeLoadingDoneCount >= this.homeLoadingTotalCount
	},
	loadingOverlayVisible() {
		if (this.firstSyncOverlayDismissed) return false
		return !this.homeLoadingAllDone
	},
	homeSearchTags() {
		return Array.isArray(this.randomTags) ? this.randomTags.slice(0, this.visibleTagCount) : []
	},
	homeNoticeItems() {
		const notices = Array.isArray(this.jwNotices) ? this.jwNotices : []
		if (notices.length === 0) {
			if (this.noticesLoading) return []
			return [
				{ title: '暂无教务选课通知', date: '', tag: '通知' }
			]
		}
		return notices.map(item => ({
			title: item.title || '暂无标题',
			date: item.date || '',
			tag: formatDateTag(item.date)
		}))
	},
	courseCount() {
		if (!this.latestTerm && (!Array.isArray(this.latestCourseList) || this.latestCourseList.length === 0)) return '—'
		return Array.isArray(this.latestCourseList) ? this.latestCourseList.length : '—'
	}
}

export const homePageMethods = {
	async setupHomePageInitialState() {
		this.syncHomeBaseState()
		this.skipNextOnShowRefresh = true
		this._overlayShownAt = Date.now()
		this.startPostLoginSyncPolling()
		await this.refreshHomePageData({
			refreshDashboard: true,
			refreshAboutMe: true,
			ensureRegistration: true
		})
	},
	startPostLoginSyncPolling() {
		const cloneSnapshot = (raw) => {
			const safe = raw && typeof raw === 'object' ? raw : { status: 'idle', taskResults: [], taskProgress: {} }
			const taskResults = Array.isArray(safe.taskResults) ? safe.taskResults.map(item => ({ ...item })) : []
			const taskProgressRaw = (safe.taskProgress && typeof safe.taskProgress === 'object') ? safe.taskProgress : {}
			const taskProgress = {}
			for (const k of Object.keys(taskProgressRaw)) {
				taskProgress[k] = { ...taskProgressRaw[k] }
			}
			return { ...safe, taskResults, taskProgress }
		}
		// 立即读一次快照
		try {
			this.postLoginSyncSnapshot = cloneSnapshot(getPostLoginSyncState())
		} catch (e) {}
		if (this._postLoginSyncTimer) return
		this._postLoginSyncTimer = setInterval(() => {
			try {
				this.postLoginSyncSnapshot = cloneSnapshot(getPostLoginSyncState())
			} catch (e) {}
			this.maybeDismissLoadingOverlay()
		}, 150)
	},
	stopPostLoginSyncPolling() {
		if (this._postLoginSyncTimer) {
			clearInterval(this._postLoginSyncTimer)
			this._postLoginSyncTimer = null
		}
		if (this._overlayHideTimer) {
			clearTimeout(this._overlayHideTimer)
			this._overlayHideTimer = null
		}
	},
	maybeDismissLoadingOverlay() {
		if (this.firstSyncOverlayDismissed) {
			this.stopPostLoginSyncPolling()
			return
		}
		const elapsed = Date.now() - (this._overlayShownAt || 0)
		// 安全网：硬超时 30 秒后强制隐藏 overlay，防止任何 future bug 把用户锁死在加载界面
		const HARD_TIMEOUT_MS = 30000
		if (elapsed >= HARD_TIMEOUT_MS) {
			console.warn('[home] 加载已超过 30 秒，强制隐藏 loading overlay 以避免锁死用户')
			this.firstSyncOverlayDismissed = true
			if (this._overlayHideTimer) {
				clearTimeout(this._overlayHideTimer)
				this._overlayHideTimer = null
			}
			this.stopPostLoginSyncPolling()
			return
		}
		if (!this.homeLoadingAllDone) return
		// 所有任务都完成了，延迟一小段时间再隐藏，避免闪烁
		if (this._overlayHideTimer) return
		const minDuration = 500
		const wait = Math.max(0, minDuration - elapsed)
		this._overlayHideTimer = setTimeout(() => {
			this.firstSyncOverlayDismissed = true
			this._overlayHideTimer = null
			this.stopPostLoginSyncPolling()
		}, wait)
	},
	async refreshHomePageOnShow() {
		this.syncHomeBaseState()
		if (this.skipNextOnShowRefresh) {
			this.skipNextOnShowRefresh = false
			return
		}
		const now = Date.now()
		const refreshDashboard = !this.lastDashboardRefreshAt || (now - this.lastDashboardRefreshAt >= HOME_DASHBOARD_CACHE_TTL)
		const refreshAboutMe = isHomeAboutMeDirty() || !this.lastAboutMeRefreshAt || (now - this.lastAboutMeRefreshAt >= HOME_ABOUT_ME_REFRESH_TTL)
		if (!refreshDashboard && !refreshAboutMe) return
		await this.refreshHomePageData({
			refreshDashboard,
			refreshAboutMe,
			ensureRegistration: false
		})
	},
	syncHomeBaseState() {
		this.now = Date.now()
		this.userName = resolveUserName()
		this.userKey = resolveUserKey()
		this.electiveCreditTotal = this.resolveElectiveCreditTotal()
	},
	resolveElectiveCreditTotal() {
		const parsed = getAppGlobal('globalCreditParsed')
		const computed = computeElectiveCreditTotal(parsed)
		if (computed != null) return computed
		const legacy = parseNumber(uni.getStorageSync('userCreditTotal'))
		return legacy == null ? null : formatCreditNumber(legacy)
	},
	async refreshHomePageData(options = {}) {
		const {
			refreshDashboard = true,
			refreshAboutMe = true,
			ensureRegistration = false
		} = options
		if (ensureRegistration) {
			try {
				await ensureUserRegistered()
			} catch (error) {
				console.warn('[home] ensureUserRegistered 失败:', error && (error.message || error))
			}
		}
		this.userKey = resolveUserKey()
		this.electiveCreditTotal = this.resolveElectiveCreditTotal()
		const tasks = []
		if (refreshDashboard) {
			tasks.push(Promise.all([
				this.loadLatestNoticeCard().catch(() => {}),
				this.loadCourseOverview().catch(() => {}),
				this.loadTotalCourseCount().catch(() => {})
			]).finally(() => {
				this.lastDashboardRefreshAt = Date.now()
			}))
		}
		if (refreshAboutMe) {
			tasks.push(this.loadAboutMeCard().catch(() => {}).finally(() => {
				this.lastAboutMeRefreshAt = Date.now()
				clearHomeAboutMeDirty()
			}))
		}
		if (tasks.length > 0) {
			await Promise.all(tasks)
		}
		// 数据加载结束时立刻尝试触发 overlay 隐藏判断，避免等定时器
		if (typeof this.maybeDismissLoadingOverlay === 'function') {
			this.maybeDismissLoadingOverlay()
		}
	},
	async loadTotalCourseCount() {
		try {
			this.totalCourseCount = await fetchTotalCourseCount()
		} catch (error) {
			if (isInterruptedRequestError(error)) {
				console.info('[home] 加载课程总数请求被中断:', getErrorMessage(error))
				return
			}
			console.warn('[home] 加载课程总数失败:', error && (error.message || error))
		}
	},
	async loadLatestNoticeCard() {
		this.noticesLoading = true
		try {
			this.jwNotices = await fetchLatestNotices()
		} catch (error) {
			console.warn('[home] 加载公告失败:', error && (error.message || error))
			this.jwNotices = []
		} finally {
			this.noticesLoading = false
		}
	},
	async loadCourseOverview() {
		this.courseListLoading = true
		this.courseListError = ''
		try {
			const latestTerm = await fetchLatestTermCode()
			if (!latestTerm) {
				this.latestTerm = ''
				this.latestCourseList = []
				this.randomTags = []
				this.termStatusText = '暂无学期数据'
				this.courseListError = '暂无课程数据'
				return
			}
			const list = await fetchLatestCourseList(latestTerm)
			this.latestTerm = latestTerm
			this.latestCourseList = list
			this.randomTags = pickRandomTagsFromCourses(list)
			this.visibleTagCount = Math.min(this.randomTags.length, 5)
			this.$nextTick(() => { this.fitTagsToOneLine() })
			this.termStatusText = list.length > 0 ? '当前学期' : '当前学期暂无课程'
		} catch (error) {
			if (isInterruptedRequestError(error)) {
				console.info('[home] 加载课程概览请求被中断:', getErrorMessage(error))
				if (!this.latestTerm && (!Array.isArray(this.latestCourseList) || this.latestCourseList.length === 0)) {
					this.termStatusText = '课程信息稍后更新'
					this.courseListError = ''
				}
				return
			}
			console.error('[home] 加载课程概览失败:', error, 'code:', error?.code, 'details:', JSON.stringify(error?.details?.statusCode ?? error?.details ?? null))
			this.latestTerm = ''
			this.latestCourseList = []
			this.randomTags = []
			this.termStatusText = '学期信息获取失败'
			this.courseListError = error && error.message ? error.message : '加载失败'
		} finally {
			this.courseListLoading = false
		}
	},
	async loadAboutMeCard() {
		const userKey = this.userKey || resolveUserKey()
		const tasks = [
			(async () => {
				this.collectionLoading = true
				try {
					if (!userKey) {
						// 没拿到 userKey（新用户注册流程未完成 / 异常），不卡住 UI，按"未知"处理
						this.collectionCount = null
						return
					}
					this.collectionCount = await fetchCollectionCount(userKey)
				} catch (error) {
					console.warn('[home] 加载收藏数失败:', error && (error.message || error))
					// 失败时保留 null（UI 显示 "—"），但务必在 finally 解除 loading 状态，避免锁死首页
					this.collectionCount = null
				} finally {
					this.collectionLoading = false
				}
			})(),
			(async () => {
				this.evaluatePendingLoading = true
				try {
					const result = await resolveEvaluatedCourses(userKey)
					if (!result.known) {
						this.evaluatePendingCount = null
						return
					}
					const list = Array.isArray(result.list) ? result.list : []
					this.evaluatePendingCount = list.filter(item => !item.isEvaluated).length
				} finally {
					this.evaluatePendingLoading = false
				}
			})()
		]
		await Promise.all(tasks.map(task => task.catch(() => {})))
		this.electiveCreditTotal = this.resolveElectiveCreditTotal()
	},
	async loadRandomTags() {
		this.tagsAdjusting = true
		if (Array.isArray(this.latestCourseList) && this.latestCourseList.length > 0) {
			this.randomTags = pickRandomTagsFromCourses(this.latestCourseList)
		} else {
			await this.loadCourseOverview()
		}
		this.visibleTagCount = Math.min(this.randomTags.length, 5)
		this.$nextTick(() => { this.fitTagsToOneLine() })
	},
	fitTagsToOneLine() {
		const query = uni.createSelectorQuery().in(this)
		query.select('.tag-row').boundingClientRect()
		query.select('.tag-refresh').boundingClientRect()
		query.exec(res => {
			if (!res || !res[0] || !res[1]) { this.tagsAdjusting = false; return }
			const rowRight = res[0].right
			const refreshRight = res[1].right
			if (refreshRight > rowRight + 1 && this.visibleTagCount > 1) {
				this.visibleTagCount--
				this.$nextTick(() => { this.fitTagsToOneLine() })
			} else {
				this.tagsAdjusting = false
			}
		})
	},
	goSearch() {
		uni.navigateTo({ url: '/pages/search/search' })
	},
	goSearchWithKeyword(keyword) {
		if (!keyword) return
		uni.navigateTo({
			url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
		})
	},
	goJwNoticeList() {
		uni.navigateTo({ url: '/pages/jwNoticeList/jwNoticeList' })
	},
	goCourseList() {
		uni.navigateTo({ url: '/pages/courseList/courseList' })
	},
	goCourseDetail(course) {
		const courseId = course && course.courseId
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
	goCollection() {
		uni.navigateTo({ url: '/pages/collection/collection' })
	},
	goEvaluate() {
		uni.navigateTo({ url: '/pages/evaluateManage/evaluateManage' })
	},
	goCourseCredit() {
		uni.navigateTo({ url: '/pages/courseCredit/courseCredit' })
	},
	goForm() {
		uni.switchTab({ url: '/pages/form/form' })
	},
	goMe() {
		uni.switchTab({ url: '/pages/me/me' })
	}
}
