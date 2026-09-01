<template>
	<view class="page" :class="themeClass">
		<!-- #ifdef APP-PLUS -->
		<view class="native-webview-host"></view>
		<!-- #endif -->
		<!-- #ifndef APP-PLUS -->
		<view class="fallback">
			<text class="fallback-title">请在 App 运行环境打开</text>
		</view>
		<!-- #endif -->
	</view>
</template>

<script>
import { fetchCollectionList, consumeCollectionListDirtyFlag } from '@/services/course/courseCollectionService.js'
import { getStoredSession } from '@/services/auth/sessionService.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { post } from '@/utils/api.js'

const DEFAULT_JW_URL = 'http://jw.sdufe.edu.cn/jsxsd/kbcx/kbxx_kc'

function safeDecode(value) {
	try {
		return decodeURIComponent(value || '')
	} catch (error) {
		return value || ''
	}
}

function isAllowedJwUrl(value) {
	const url = String(value || '').trim()
	return /^https?:\/\/jw\.sdufe\.edu\.cn(?:[/:?#]|$)/i.test(url)
}

function getQueryParam(url, name) {
	const query = String(url || '').split('?')[1] || ''
	const target = String(name || '')
	const pairs = query.split('&')
	for (const pair of pairs) {
		const index = pair.indexOf('=')
		const key = index >= 0 ? pair.slice(0, index) : pair
		if (safeDecode(key) !== target) continue
		return safeDecode(index >= 0 ? pair.slice(index + 1) : '')
	}
	return ''
}

export default {
	data() {
		return {
			targetUrl: DEFAULT_JW_URL,
			favoritePairs: [],
			favoritePairsLoaded: false,
			favoritePairsLoading: false,
			nativeWebview: null,
			nativeWebviewId: `linke-jw-enhanced-${Date.now()}`,
			nativeWebviewCreating: false,
			injectTimers: [],
			lastSearchKeyword: '',
			lastSearchAt: 0
		}
	},
	onLoad(options = {}) {
		const url = safeDecode(options.url || options.u || DEFAULT_JW_URL)
		this.targetUrl = isAllowedJwUrl(url) ? url : DEFAULT_JW_URL
		uni.setNavigationBarTitle({ title: '教务增强试验' })
		this.loadFavoritePairs({ forceRefresh: true })
	},
	onReady() {
		this.createNativeWebview()
	},
	onShow() {
		if (consumeCollectionListDirtyFlag()) {
			this.loadFavoritePairs({ forceRefresh: true })
		}
		this.showNativeWebview()
		this.startInjectBurst()
	},
	onHide() {
		this.hideNativeWebview()
		this.clearInjectTimers()
	},
	onBackPress() {
		this.destroyNativeWebview()
		return false
	},
	onUnload() {
		this.destroyNativeWebview()
		this.clearInjectTimers()
	},
	methods: {
		runWhenPlusReady(callback) {
			// #ifdef APP-PLUS
			try {
				if (typeof plus !== 'undefined' && plus.webview) {
					callback()
					return true
				}
				if (typeof document !== 'undefined') {
					document.addEventListener('plusready', callback, false)
					return true
				}
			} catch (error) {
				console.warn('[jw-enhanced] 等待 App-Plus 环境失败:', error && (error.message || error))
			}
			// #endif
			return false
		},
		createNativeWebview() {
			// #ifdef APP-PLUS
			if (this.nativeWebview || this.nativeWebviewCreating) return
			this.nativeWebviewCreating = true
			const scheduled = this.runWhenPlusReady(() => {
					try {
						if (this.nativeWebview) return
						if (!plus || !plus.webview || typeof plus.webview.create !== 'function') {
							throw new Error('plus.webview.create 不可用')
						}
						const requestHeaders = this.getNativeRequestHeaders()
						this.seedNativeCookies()
						const current = plus.webview.currentWebview()
						const child = plus.webview.create('', this.nativeWebviewId, {
							top: this.getNativeWebviewTop(),
							left: '0px',
							width: '100%',
						bottom: '0px',
						bounce: 'vertical',
						scalable: true,
						popGesture: 'none',
						background: '#FFFFFF',
							zindex: 99,
							additionalHttpHeaders: requestHeaders,
							progress: {
								color: '#1E3A8A'
							}
					})
					this.nativeWebview = child
					this.installNativeWebviewBridge(child)
					if (current && typeof child.opener === 'function') {
						child.opener(current)
					}
						if (typeof child.show === 'function') {
							child.show('none')
						}
						if (typeof child.loadURL === 'function') {
							child.loadURL(this.targetUrl, requestHeaders)
						}
						console.log('[jw-enhanced] 受控 WebView 已创建:', this.targetUrl, 'headers:', Object.keys(requestHeaders).join(','))
						this.startInjectBurst()
					} catch (error) {
					console.warn('[jw-enhanced] 创建受控 WebView 失败:', error && (error.message || error))
					uni.showToast({ title: '教务 WebView 创建失败', icon: 'none' })
				} finally {
					this.nativeWebviewCreating = false
				}
			})
			if (!scheduled) {
				this.nativeWebviewCreating = false
				uni.showToast({ title: '当前平台不支持 App-Plus WebView', icon: 'none' })
			}
			// #endif
			// #ifndef APP-PLUS
			uni.showToast({ title: '请在 App 运行环境打开', icon: 'none' })
			// #endif
		},
		getNativeWebviewTop() {
			// #ifdef APP-PLUS
			try {
				const statusbarHeight = plus && plus.navigator && typeof plus.navigator.getStatusbarHeight === 'function'
					? Number(plus.navigator.getStatusbarHeight()) || 0
					: 0
				return `${Math.max(88, Math.round(statusbarHeight + 44))}px`
			} catch (error) {}
			// #endif
			return '88px'
		},
		installNativeWebviewBridge(child) {
			if (!child) return
				if (typeof child.overrideUrlLoading === 'function') {
					child.overrideUrlLoading({
						mode: 'allow',
						match: '^https?://jw\\.sdufe\\.edu\\.cn(?:[/:?#]|$)',
						effect: 'instant'
					}, (event) => {
						this.handleNativeBridgeUrl(event && event.url)
					})
				} else {
					console.warn('[jw-enhanced] 当前 WebView 不支持 overrideUrlLoading')
			}
				if (typeof child.addEventListener === 'function') {
					child.addEventListener('loaded', () => {
						console.log('[jw-enhanced] 受控 WebView loaded:', this.getNativeWebviewUrl(child))
						this.startInjectBurst()
					}, false)
					child.addEventListener('rendered', () => {
						console.log('[jw-enhanced] 受控 WebView rendered:', this.getNativeWebviewUrl(child))
						this.startInjectBurst()
					}, false)
					child.addEventListener('error', () => {
					uni.showToast({ title: '教务页面加载失败', icon: 'none' })
				}, false)
				}
			},
			getNativeWebviewUrl(child) {
				try {
					if (child && typeof child.getURL === 'function') return child.getURL()
				} catch (error) {}
				return ''
			},
			handleNativeBridgeUrl(url) {
				const bridgeUrl = String(url || '')
				if (/^linke:\/\/search(?:[/?#]|$)/i.test(bridgeUrl)) {
					this.handleNativeSearchUrl(bridgeUrl)
				}
			},
			showNativeWebview() {
				const child = this.getNativeWebview()
				if (!child) {
					this.createNativeWebview()
					return
				}
				try {
					if (typeof child.show === 'function') {
						child.show('none')
					}
				} catch (error) {
					console.warn('[jw-enhanced] 显示受控 WebView 失败:', error && (error.message || error))
				}
			},
			hideNativeWebview() {
				const child = this.nativeWebview
				if (!child) return
				try {
					if (typeof child.hide === 'function') {
						child.hide('none')
					}
				} catch (error) {
					console.warn('[jw-enhanced] 隐藏受控 WebView 失败:', error && (error.message || error))
				}
			},
			destroyNativeWebview() {
				const child = this.nativeWebview
				this.nativeWebview = null
			if (!child) return
			try {
				if (typeof child.close === 'function') {
					child.close('none')
				} else if (typeof plus !== 'undefined' && plus.webview && typeof plus.webview.close === 'function') {
					plus.webview.close(child, 'none')
				}
			} catch (error) {
				console.warn('[jw-enhanced] 关闭受控 WebView 失败:', error && (error.message || error))
			}
		},
		handleNativeSearchUrl(url) {
			const keyword = String(getQueryParam(url, 'keyword') || '').trim()
			if (!keyword) return
			const now = Date.now()
			if (keyword === this.lastSearchKeyword && now - this.lastSearchAt < 800) return
			this.lastSearchKeyword = keyword
			this.lastSearchAt = now
			uni.navigateTo({
				url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
			})
		},
		getNativeWebview() {
			if (this.nativeWebview && typeof this.nativeWebview.evalJS === 'function') return this.nativeWebview
			// #ifdef APP-PLUS
			try {
				if (typeof plus === 'undefined' || !plus.webview || typeof plus.webview.getWebviewById !== 'function') return null
				const found = plus.webview.getWebviewById(this.nativeWebviewId)
				if (found && typeof found.evalJS === 'function') {
					this.nativeWebview = found
					return found
				}
			} catch (error) {
				return null
			}
			// #endif
			return null
		},
		clearInjectTimers() {
			for (const timer of this.injectTimers) {
				clearTimeout(timer)
			}
			this.injectTimers = []
		},
		async loadFavoritePairs(options = {}) {
			if (this.favoritePairsLoading) return
			this.favoritePairsLoading = true
			const forceRefresh = !!options.forceRefresh
			try {
				let session = getStoredSession()
				let userKey = session && session.userKey ? session.userKey : ''
				if (!userKey) {
					await ensureUserRegistered()
					session = getStoredSession()
					userKey = session && session.userKey ? session.userKey : ''
				}
				if (!userKey) {
					this.favoritePairs = []
					this.favoritePairsLoaded = true
					return
				}
				const rows = await fetchCollectionList({ userKey, forceRefresh })
				const courseIds = rows.map(row => row && row.courseId).filter(Boolean)
				if (courseIds.length === 0) {
					this.favoritePairs = []
					this.favoritePairsLoaded = true
					return
				}
				const rowMap = {}
				rows.forEach(row => {
					if (row && row.courseId) rowMap[row.courseId] = row
				})
				const batchRes = await post('App.Course.GetCourseByIds', {
					userKey,
					courseIds: JSON.stringify(courseIds)
				})
				const batchList = Array.isArray(batchRes) ? batchRes : (batchRes ? Object.values(batchRes) : [])
				const courseMap = {}
				batchList.forEach(course => {
					if (course && course.courseId) courseMap[course.courseId] = course
				})
				this.favoritePairs = courseIds.map(courseId => {
					const row = rowMap[courseId] || {}
					const course = courseMap[courseId] || row
					return {
						courseName: String(course.lessonName || course._lessonName || course.courseName || course._courseName || row.lessonName || row.courseName || '').trim(),
						teacherName: String(course.teacherName || course._teacherName || row.teacherName || row._teacherName || '').trim()
					}
				}).filter(item => item.courseName && item.teacherName)
				this.favoritePairsLoaded = true
				console.log('[jw-enhanced] 收藏匹配记录数:', this.favoritePairs.length)
			} catch (error) {
				this.favoritePairs = []
				this.favoritePairsLoaded = true
				console.warn('[jw-enhanced] 加载收藏匹配记录失败:', error && (error.message || error))
			} finally {
				this.favoritePairsLoading = false
				this.startInjectBurst()
			}
		},
		startInjectBurst() {
			this.clearInjectTimers()
			;[300, 900, 1800, 3200, 5200, 8000].forEach((delay) => {
				this.injectTimers.push(setTimeout(() => {
					this.injectEnhancement()
				}, delay))
			})
		},
			injectEnhancement() {
				const webview = this.getNativeWebview()
				if (!webview || typeof webview.evalJS !== 'function') {
				this.createNativeWebview()
					return
				}
				try {
					const script = this.buildInjectionScript()
					webview.evalJS(script)
				} catch (error) {
					console.warn('[jw-enhanced] 注入脚本执行失败:', error && (error.message || error))
				}
			},
			getStoredCookieHeader() {
				return String(uni.getStorageSync('loginCookie') || '').trim()
			},
			getStoredCookiePairs() {
				const cookieHeader = this.getStoredCookieHeader()
				if (!cookieHeader) return []
				return cookieHeader
					.split(';')
					.map(item => item.trim())
					.filter(Boolean)
					.map(item => {
						const index = item.indexOf('=')
						if (index <= 0) return null
						return {
							name: item.slice(0, index).trim(),
							value: item.slice(index + 1).trim()
						}
					})
					.filter(item => item && item.name && item.value && !/[;\s]/.test(item.name))
			},
			getNativeRequestHeaders() {
				const cookieHeader = this.getStoredCookieHeader()
				return cookieHeader ? { Cookie: cookieHeader } : {}
			},
			seedNativeCookies() {
				// #ifdef APP-PLUS
				try {
					const pairs = this.getStoredCookiePairs()
					if (!pairs.length) {
						console.warn('[jw-enhanced] 无可写入的教务 Cookie')
						return false
					}
					if (typeof plus === 'undefined' || !plus.navigator || typeof plus.navigator.setCookie !== 'function') {
						console.warn('[jw-enhanced] plus.navigator.setCookie 不可用')
						return false
					}
					const urls = [
						'http://jw.sdufe.edu.cn',
						'http://jw.sdufe.edu.cn/',
						'http://jw.sdufe.edu.cn/jsxsd',
						'http://jw.sdufe.edu.cn/jsxsd/',
						this.targetUrl
					].filter(Boolean)
					urls.forEach(url => {
						pairs.forEach(pair => {
							plus.navigator.setCookie(url, `${pair.name}=${pair.value}; path=/`)
							plus.navigator.setCookie(url, `${pair.name}=${pair.value}; path=/jsxsd`)
						})
					})
					console.log('[jw-enhanced] native cookie seeded:', pairs.map(pair => pair.name).join(','))
					return true
				} catch (error) {
					console.warn('[jw-enhanced] native cookie 写入失败:', error && (error.message || error))
				}
				// #endif
				return false
			},
			getJsessionId() {
				const cookieHeader = this.getStoredCookieHeader()
				if (!cookieHeader) return ''
				const matched = cookieHeader.match(/JSESSIONID=([^;]+)/i)
				if (matched && matched[1]) return matched[1]
			return cookieHeader.split(';')[0].replace(/^JSESSIONID=/i, '').trim()
		},
		buildInjectionScript() {
			const sessionId = this.getJsessionId()
			const targetUrl = this.targetUrl
			const favoritePairs = Array.isArray(this.favoritePairs) ? this.favoritePairs : []
			return `
	(function () {
	  if (!/^https?:\\/\\/jw\\.sdufe\\.edu\\.cn(?:[\\/:?#]|$)/i.test(location.href)) return;
	  var TARGET_URL = ${JSON.stringify(targetUrl)};
	  var SESSION_ID = ${JSON.stringify(sessionId)};
	  var FAVORITE_PAIRS = ${JSON.stringify(favoritePairs)};
	  window.__linkeJwFavoritePairs = FAVORITE_PAIRS;
	  var COURSE_HEADER_TEXTS = {
	    '课程': true, '课程名': true, '课程名称': true, '课程全称': true, '课程简称': true,
	    '课程中文名': true, '课程中文名称': true, '中文课程名': true, '中文课程名称': true,
	    '课程英文名': true, '课程英文名称': true, '英文课程名': true, '英文课程名称': true,
	    '开课名称': true, '开课课程': true, '开课课程名': true, '开课课程名称': true,
	    '任课课程': true, '任课课程名': true, '任课课程名称': true,
	    '授课课程': true, '授课课程名': true, '授课课程名称': true,
	    '上课课程': true, '上课课程名': true, '上课课程名称': true,
	    '选课课程': true, '选课课程名': true, '选课课程名称': true,
	    '已选课程': true, '已选课程名': true, '已选课程名称': true,
	    '所选课程': true, '所选课程名': true, '所选课程名称': true,
	    '课程环节名称': true, '课程或环节名称': true, '课程环节名': true
	  };
	  var NEGATIVE_HEADER_TEXTS = {
	    '课程编号': true, '课程代码': true, '课程号': true, '课程id': true, '课程ID': true,
	    '课程性质': true, '课程属性': true, '课程类别': true, '课程类型': true, '课程分类': true,
	    '课程归属': true, '课程层次': true, '课程模块': true, '课程组': true, '课程表': true,
	    '课程列表': true, '课程管理': true, '课程查询': true, '课程评价': true, '课程安排': true,
	    '课程状态': true, '课程容量': true, '课程学分': true, '课程成绩': true, '课程绩点': true,
	    '课程时间': true, '课程地点': true, '课程周次': true, '课程节次': true,
	    '选课编码': true, '选课编号': true, '选课号': true,
	    '上课班级': true, '上课时间': true, '上课地点': true, '上课周次': true, '上课节次': true,
	    '上课校区': true, '上课院区': true, '授课教师': true, '任课教师': true,
	    '教师': true, '老师': true, '教工号': true, '教师工号': true, '授课教师工号': true,
	    '教学班': true, '教学班号': true, '教学班名称': true, '教学班编号': true,
	    '专业': true, '专业名称': true, '所属专业': true, '年级': true, '班级': true,
	    '行政班': true, '行政班级': true, '学院': true, '院系': true, '校区': true,
	    '教材': true, '教材名称': true, '教材名': true, 'ISBN': true, 'ISBN号': true,
	    'ISBN书号': true, '作者': true, '出版社': true, '版次': true, '定价': true,
	    '学分': true, '绩点': true, '成绩': true, '考试性质': true, '考试方式': true,
	    '状态': true, '操作': true, '备注': true
	  };
	  var TEACHER_HEADER_TEXTS = {
	    '教师': true, '老师': true, '教师姓名': true, '教师名称': true, '老师姓名': true,
	    '任课教师': true, '任课老师': true, '任课教师姓名': true,
	    '上课教师': true, '上课老师': true, '上课教师姓名': true,
	    '授课教师': true, '授课老师': true, '授课教师姓名': true,
	    '主讲教师': true, '主讲老师': true, '主讲教师姓名': true,
	    '开课教师': true, '开课老师': true
	  };
	  var BLOCKED_TEXTS = {
	    '课程': true, '课程名称': true, '课程名': true, '编号': true, '代码': true, '编码': true,
	    '课程编号': true, '课程代码': true, '课程性质': true, '课程属性': true,
	    '课程类别': true, '课程类型': true, '课程表': true, '我的课程': true,
	    '本学期课程': true, '课程列表': true, '成绩查询': true, '学生评价': true,
	    '选课中心': true, '退选课': true, '选课': true, '退课': true, '查询': true,
	    '搜索': true, '保存': true, '提交': true, '取消': true, '关闭': true, '详情': true,
	    '更多': true, '通知': true, '公告': true, '小计': true, '合计': true, '总计': true,
	    '必修': true, '选修': true, '通选': true, '正常考试': true, '实践必修': true,
	    '通识必修课': true, '通识选修课': true, '专业必修课': true, '否': true, '是': true
	  };
	  function normalizeText(value) {
	    return String(value || '').replace(/[\\u200B-\\u200D\\uFEFF]/g, '').replace(/[\\u00a0\\s]+/g, ' ').trim();
	  }
	  function normalizeCourseKeyword(value) {
	    return normalizeText(value)
	      .replace(/^课程(名称|名)?\\s*[:：]\\s*/, '')
	      .replace(/^(名称|课程)\\s*[:：]\\s*/, '')
	      .replace(/\\s*(查看|详情|搜索|进入林课|林课).*$/, '')
	      .replace(/[;；，,。]+$/g, '')
	      .trim();
	  }
	  function isBlockedText(value, loose) {
	    var text = normalizeCourseKeyword(value);
	    if (!text || text.length < 2 || text.length > 60) return true;
	    if (BLOCKED_TEXTS[text]) return true;
	    if (/^\\d+$/.test(text)) return true;
	    if (/^\\d{4}-\\d{4}-\\d$/.test(text)) return true;
	    if (/^\\d{4}.+(班|学院|专业)$/.test(text)) return true;
	    if (/^https?:\\/\\//i.test(text)) return true;
	    if (/^[\\dA-Za-z_-]{5,}$/.test(text) && !/[\\u4e00-\\u9fa5]/.test(text)) return true;
	    if (/^(优秀|良好|中等|及格|不及格|合格|不合格|通过|未通过)$/.test(text)) return true;
	    if (/^(星期[一二三四五六日天]|第?\\d+节|上午|下午|晚上)$/.test(text)) return true;
	    if (/^(序号|开课学期|成绩|学分|绩点|考试性质|辅修课程|状态|教师|老师|任课教师)$/.test(text)) return true;
	    if (/学分\\s*\\d|学时\\s*\\d|周\\/节次|上课地点|上课周次|课程编号|课程代码/.test(text)) return true;
	    if (loose && !/[\\u4e00-\\u9fa5]/.test(text)) return true;
	    return false;
	  }
	  function isLikelyCourseNameText(value, tableColumn) {
	    var text = normalizeCourseKeyword(value);
	    if (isBlockedText(text, !tableColumn)) return false;
	    if (tableColumn) return true;
	    return /(论|学|语|法|史|课|体育|数学|英语|技能|指导|教育|会计|微积分|代数|哲学|艺术|计算机|人工智能|心理|文化|理论|实践|概论|军事|数据|程序|设计|经济|管理)/.test(text);
	  }
	  function normalizeCompact(value) {
	    return normalizeText(value).replace(/[\\s\\u00a0]+/g, '').replace(/[，、；;]/g, ',');
  }
  function buildMatchKey(courseName, teacherName) {
    var course = normalizeCompact(courseName);
    var teacher = normalizeCompact(teacherName);
    return course && teacher ? course + '|' + teacher : '';
  }
	  function normalizeHeader(value) {
	    return normalizeText(value)
	      .replace(/[-_—–＝=·•.。…]+/g, '')
	      .replace(/[：:／\\/\\\\|（）()\\[\\]【】{}<>《》“”"'‘’\`~,，;；]/g, '')
	      .replace(/\\s+/g, '')
	      .trim();
	  }
	  function isNegativeHeader(value) {
	    var header = normalizeHeader(value);
	    if (!header) return true;
	    if (NEGATIVE_HEADER_TEXTS[header]) return true;
	    if (/课程(编号|代码|性质|属性|类别|类型|学分|成绩|绩点|容量|时间|地点|周次|教师|老师|状态|列表|表|中心|查询|管理|评价|安排|号|ID)$/i.test(header)) return true;
	    if (/(编号|代码|编码|课程号|课号|ID|id|性质|属性|类别|类型|分类|归属|层次|模块|学分|学时|成绩|绩点|容量|人数|状态|操作|备注)$/.test(header)) return true;
	    if (/(教师|老师|教工|教材|ISBN|书号|作者|出版社|版次|定价|班级|专业|学院|院系|年级|校区)$/.test(header)) return true;
	    if (/^(上课|授课|任课).*(时间|地点|周次|节次|班级|教师|老师|教工)$/.test(header)) return true;
	    return false;
	  }
	  function isCourseHeader(value) {
	    var header = normalizeHeader(value);
	    if (!header || isNegativeHeader(header)) return false;
	    if (COURSE_HEADER_TEXTS[header]) return true;
	    if (/^课程(中文|英文)?(名称|名|全称|简称)$/.test(header)) return true;
	    if (/^(中文|英文)课程(名称|名|全称|简称)$/.test(header)) return true;
	    if (/^(开课|任课|授课|上课|选课|已选|所选)课程(名称|名|全称|简称)?$/.test(header)) return true;
	    if (/^课程.*(名称|名)$/.test(header) && !isNegativeHeader(header)) return true;
	    return false;
	  }
	  function isTeacherHeader(value) {
	    var header = normalizeHeader(value);
	    if (!header || /(工号|编号|代码|职称|学院|单位|部门|时间|地点)$/.test(header)) return false;
	    if (TEACHER_HEADER_TEXTS[header]) return true;
	    return /^(任课|上课|授课|主讲|开课)?(教师|老师)(姓名|名称)?$/.test(header);
	  }
  function getCellSpan(cell, attrName, propertyName) {
    var rawValue = cell && (cell.getAttribute(attrName) || cell[propertyName]);
    var value = parseInt(rawValue, 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  function buildVisualRows(rows) {
    var rowSpanSlots = [];
    return rows.map(function (row) {
      var visualCells = [];
      var visualColumn = 0;
      var cells = Array.prototype.slice.call(row.children || []).filter(function (child) {
        return /^(TD|TH)$/i.test(child.tagName);
      });
      var occupiedColumns = rowSpanSlots.map(function (count) { return count > 0; });
      var nextRowSpanSlots = [];
      cells.forEach(function (cell) {
        while (occupiedColumns[visualColumn]) {
          visualCells[visualColumn] = null;
          visualColumn += 1;
        }
        var colSpan = getCellSpan(cell, 'colspan', 'colSpan');
        var rowSpan = getCellSpan(cell, 'rowspan', 'rowSpan');
        for (var offset = 0; offset < colSpan; offset += 1) {
          visualCells[visualColumn + offset] = cell;
          if (rowSpan > 1) {
            nextRowSpanSlots[visualColumn + offset] = Math.max(nextRowSpanSlots[visualColumn + offset] || 0, rowSpan - 1);
          }
        }
        visualColumn += colSpan;
      });
      for (var index = 0; index < rowSpanSlots.length; index += 1) {
        rowSpanSlots[index] = Math.max(0, (rowSpanSlots[index] || 0) - 1);
      }
      for (var nextIndex = 0; nextIndex < nextRowSpanSlots.length; nextIndex += 1) {
        if (nextRowSpanSlots[nextIndex] > 0) {
          rowSpanSlots[nextIndex] = Math.max(rowSpanSlots[nextIndex] || 0, nextRowSpanSlots[nextIndex]);
        }
      }
      return visualCells;
    });
  }
	  function collectAccessibleDocuments(rootWindow, documents, seen) {
	    rootWindow = rootWindow || window;
	    documents = documents || [];
	    seen = seen || [];
	    try {
	      var doc = rootWindow.document;
	      if (doc && seen.indexOf(doc) < 0) {
	        seen.push(doc);
	        documents.push(doc);
	      }
	      Array.prototype.slice.call(rootWindow.frames || []).forEach(function (frameWindow) {
	        collectAccessibleDocuments(frameWindow, documents, seen);
	      });
	    } catch (error) {}
	    return documents;
	  }
	  function installStyle(doc) {
	    doc = doc || document;
	    if (!doc.head || doc.getElementById('linke-jw-mobile-enhance-style')) return;
	    var style = doc.createElement('style');
    style.id = 'linke-jw-mobile-enhance-style';
    style.textContent = [
      '.linke-jw-search-link{display:inline;border:0;border-bottom:1px dashed #1e3a8a;background:transparent;color:#1e3a8a;font:inherit;line-height:inherit;cursor:pointer;text-decoration:none;}',
      '.linke-jw-search-link.linke-jw-teacher-link{border-bottom-color:#047857;color:#047857;}',
      'tr.linke-jw-favorite-row>td,tr.linke-jw-favorite-row>th{background:#fff7ed!important;box-shadow:inset 0 1px rgba(217,119,6,.42),inset 0 -1px rgba(217,119,6,.42);}',
      'tr.linke-jw-favorite-row>td:first-child,tr.linke-jw-favorite-row>th:first-child{position:relative;overflow:visible;box-shadow:inset 4px 0 #d97706,inset 0 1px rgba(217,119,6,.5),inset 0 -1px rgba(217,119,6,.5);}',
      '.linke-jw-favorite-tag{display:inline-flex;align-items:center;gap:4px;position:absolute;top:-13px;left:7px;z-index:30;padding:2px 8px 2px 7px;border-radius:8px 8px 8px 0;background:#d97706;color:#fff7ed;font-size:11px;font-weight:700;line-height:1.5;box-shadow:0 3px 8px rgba(146,64,14,.22);white-space:nowrap;pointer-events:none;}'
    ].join('\\n');
	    doc.head.appendChild(style);
	  }
	  function postSearch(keyword, source) {
	    var text = normalizeCourseKeyword(keyword);
	    if (isBlockedText(text, false)) return;
	    var url = 'linke://search?keyword=' + encodeURIComponent(text) + '&source=' + encodeURIComponent(source || '') + '&href=' + encodeURIComponent(location.href) + '&title=' + encodeURIComponent(document.title || '');
	    window.__linkeJwLastSearchUrl = url;
	    try {
	      if (window.top && window.top !== window) {
	        window.top.location.href = url;
	      } else {
	        location.href = url;
	      }
	    } catch (error) {
	      window.location = url;
	    }
  }
			  function createSearchLink(keyword, source, doc) {
		    doc = doc || document;
		    var link = doc.createElement('span');
	    link.className = 'linke-jw-search-link' + (source.indexOf('teacher') >= 0 ? ' linke-jw-teacher-link' : '');
	    link.setAttribute('data-linke-jw-search-link', '1');
	    link.textContent = normalizeCourseKeyword(keyword);
	    link.setAttribute('role', 'button');
	    link.setAttribute('tabindex', '0');
	    link.setAttribute('title', '在林课数据库搜索：' + normalizeCourseKeyword(keyword));
	    link.onclick = function (event) {
	      event.preventDefault();
	      event.stopPropagation();
	      postSearch(keyword, source);
	    };
	    link.onkeydown = function (event) {
	      if (event.key !== 'Enter' && event.key !== ' ') return;
	      event.preventDefault();
	      event.stopPropagation();
	      postSearch(keyword, source);
	    };
		    return link;
		  }
			  function enhanceCell(cell, keyword, source) {
		    if (!cell || cell.getAttribute('data-linke-jw-enhanced') === '1') return;
		    var text = normalizeCourseKeyword(keyword);
		    if (source.indexOf('teacher') >= 0) {
		      if (isBlockedText(text, false)) return;
			    } else if (!isLikelyCourseNameText(text, source.indexOf('table') >= 0)) {
			      return;
			    }
			    var doc = cell.ownerDocument || document;
			    installStyle(doc);
			    cell.setAttribute('data-linke-jw-enhanced', '1');
			    cell.textContent = '';
			    cell.appendChild(createSearchLink(text, source, doc));
		  }
		  function syncFavoriteRow(row, courseName, teacherName, favoriteSet) {
    if (!row) return;
    if (!favoriteSet[buildMatchKey(courseName, teacherName)]) {
      row.classList.remove('linke-jw-favorite-row');
      Array.prototype.slice.call(row.querySelectorAll('.linke-jw-favorite-tag')).forEach(function (tag) {
        tag.parentNode && tag.parentNode.removeChild(tag);
      });
      return;
    }
    row.classList.add('linke-jw-favorite-row');
    row.setAttribute('title', '已收藏：' + normalizeText(courseName) + ' ' + normalizeText(teacherName));
    if (row.querySelector('.linke-jw-favorite-tag')) return;
    var firstCell = Array.prototype.slice.call(row.children || []).find(function (child) {
      return /^(TD|TH)$/i.test(child.tagName);
    });
    if (!firstCell) return;
	    var doc = row.ownerDocument || document;
	    installStyle(doc);
	    var tag = doc.createElement('span');
    tag.className = 'linke-jw-favorite-tag';
    tag.textContent = '已收藏记录';
    firstCell.appendChild(tag);
  }
	  function scanTables(doc) {
	    doc = doc || document;
	    installStyle(doc);
    var favoriteSet = {};
    var favoritePairs = Array.isArray(window.__linkeJwFavoritePairs) ? window.__linkeJwFavoritePairs : FAVORITE_PAIRS;
    favoritePairs.forEach(function (item) {
      var key = buildMatchKey(item.courseName, item.teacherName);
      if (key) favoriteSet[key] = true;
    });
		    Array.prototype.slice.call(doc.querySelectorAll('table')).forEach(function (table) {
	      var rows = Array.prototype.slice.call(table.querySelectorAll('tr'));
	      var visualRows = buildVisualRows(rows);
	      var courseIndexes = [];
	      var teacherIndexes = [];
	      var headerRowIndex = -1;
	      visualRows.some(function (cells, rowIndex) {
	        var nextCourseIndexes = [];
	        cells.forEach(function (cell, index) {
	          if (!cell) return;
	          if (isCourseHeader(cell.textContent)) {
	            nextCourseIndexes.push(index);
	          }
	        });
	        if (nextCourseIndexes.length > 0) {
	          courseIndexes = nextCourseIndexes;
	          teacherIndexes = [];
	          cells.forEach(function (cell, index) {
	            if (cell && isTeacherHeader(cell.textContent)) teacherIndexes.push(index);
	          });
	          headerRowIndex = rowIndex;
	          return true;
	        }
	        return false;
	      });
	      if (courseIndexes.length === 0) {
	        visualRows.some(function (cells, rowIndex) {
	          cells.forEach(function (cell, index) {
	            if (cell && isTeacherHeader(cell.textContent) && teacherIndexes.indexOf(index) < 0) {
	              teacherIndexes.push(index);
	            }
	          });
	          if (teacherIndexes.length > 0) {
	            headerRowIndex = rowIndex;
	            return true;
	          }
	          return false;
	        });
	      }
	      if (headerRowIndex < 0 || (courseIndexes.length === 0 && teacherIndexes.length === 0)) return;
	      visualRows.forEach(function (cells, rowIndex) {
	        if (rowIndex <= headerRowIndex) return;
	        var row = rows[rowIndex];
        var teacherName = teacherIndexes.map(function (index) {
          return normalizeText(cells[index] && cells[index].textContent);
        }).find(Boolean) || '';
        teacherIndexes.forEach(function (index) {
          enhanceCell(cells[index], cells[index] && cells[index].textContent, 'table-teacher-column');
	        });
	        courseIndexes.forEach(function (index) {
	          var courseName = normalizeCourseKeyword(cells[index] && cells[index].textContent);
	          syncFavoriteRow(row, courseName, teacherName, favoriteSet);
	          enhanceCell(cells[index], courseName, 'table-course-column');
	        });
      });
    });
		  }
		  function countEnhancedLinks() {
		    var docs = collectAccessibleDocuments();
		    var count = 0;
		    docs.forEach(function (doc) {
		      try {
		        count += doc.querySelectorAll('.linke-jw-search-link').length;
		      } catch (error) {}
		    });
		    return count;
		  }
		  function scanAllDocuments() {
		    collectAccessibleDocuments().forEach(function (doc) {
	      try {
		        scanTables(doc);
		      } catch (error) {}
		    });
		    window.__linkeJwEnhancedStats = {
		      links: countEnhancedLinks(),
		      href: location.href,
		      title: document.title || ''
		    };
		  }
  function seedCookieAndMaybeRedirect() {
    if (!SESSION_ID) return false;
    try {
      document.cookie = 'JSESSIONID=' + SESSION_ID + '; path=/';
      document.cookie = 'JSESSIONID=' + SESSION_ID + '; path=/jsxsd';
      if (!sessionStorage.getItem('__linke_jw_cookie_seeded') && location.href.indexOf('/jsxsd/kbcx/kbxx_kc') < 0) {
        sessionStorage.setItem('__linke_jw_cookie_seeded', '1');
        location.replace(TARGET_URL);
        return true;
      }
    } catch (error) {}
    return false;
  }
  if (seedCookieAndMaybeRedirect()) return;
		  function scheduleScan(delay) {
		    clearTimeout(window.__linkeJwEnhancedTimer);
		    window.__linkeJwEnhancedTimer = setTimeout(scanAllDocuments, delay || 300);
		  }
		  window.__linkeJwEnhancedRun = scanAllDocuments;
		  scanAllDocuments();
	  if (!window.__linkeJwEnhancedObserver) {
	    window.__linkeJwEnhancedObserver = new MutationObserver(function () {
	      scheduleScan(300);
	    });
	    window.__linkeJwEnhancedObserver.observe(document.documentElement, { childList: true, subtree: true });
	    document.addEventListener('click', function () { scheduleScan(900); }, true);
	    document.addEventListener('change', function () { scheduleScan(700); }, true);
	    document.addEventListener('submit', function () { scheduleScan(1200); }, true);
		    var bootAttempts = 0;
		    window.__linkeJwEnhancedBootTimer = setInterval(function () {
		      bootAttempts += 1;
		      scanAllDocuments();
			      if (bootAttempts >= 45 || countEnhancedLinks() > 0) {
		        clearInterval(window.__linkeJwEnhancedBootTimer);
		      }
		    }, 1000);
	  }
})();
`
		}
	}
}
</script>

<style scoped>
.page {
	width: 100%;
	height: 100vh;
	background: #f8fafc;
}

.native-webview-host {
	width: 100%;
	height: 100%;
}

.fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding: 32rpx;
	box-sizing: border-box;
}

.fallback-title {
	color: #334155;
	font-size: 30rpx;
}
</style>
