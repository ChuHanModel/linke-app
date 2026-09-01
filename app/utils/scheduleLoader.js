/**
 * 登录成功后拉取课表并写入 app.globalData，供 form 页使用；同时通过 setAppGlobal 同步到本地存储。
 */
import { setAppGlobal } from '@/utils/appGlobalStorage.js'
import { post } from '@/utils/api.js'
import { requestJw, getCookieHeader } from '@/utils/jwRequest.js'
import { isJwLoginExpired } from '@/utils/jwLoginExpired.js'

const BASE_URL = 'http://jw.sdufe.edu.cn'

function parseScheduleStartWeek(schedule) {
	let minWeek = null
	schedule.forEach(item => {
		if (!item || !item.time || item.time === '') return
		const numbers = []
		const numberMatches = item.time.matchAll(/(\d+)(?:-(\d+))?/g)
		for (const match of numberMatches) {
			const start = parseInt(match[1], 10)
			const end = match[2] ? parseInt(match[2], 10) : start
			for (let i = start; i <= end; i++) {
				if (!numbers.includes(i)) numbers.push(i)
			}
		}
		if (numbers.length > 0) {
			const weekMin = Math.min(...numbers)
			if (minWeek === null || weekMin < minWeek) minWeek = weekMin
		}
	})
	return minWeek
}

function parseScheduleEndWeek(schedule) {
	let maxWeek = null
	schedule.forEach(item => {
		if (!item || !item.time || item.time === '') return
		const numbers = []
		const numberMatches = item.time.matchAll(/(\d+)(?:-(\d+))?/g)
		for (const match of numberMatches) {
			const start = parseInt(match[1], 10)
			const end = match[2] ? parseInt(match[2], 10) : start
			for (let i = start; i <= end; i++) {
				if (!numbers.includes(i)) numbers.push(i)
			}
		}
		if (numbers.length > 0) {
			const weekMax = Math.max(...numbers)
			if (maxWeek === null || weekMax > maxWeek) maxWeek = weekMax
		}
	})
	return maxWeek
}

async function fetchScheduleTerm(cookieHeader) {
	const cookie = getCookieHeader(cookieHeader)
	if (!cookie) throw new Error('请先完成教务登录')
	const res = await requestJw(cookieHeader, BASE_URL + '/jsxsd/xskb/xskb_list.do', 'GET', null, {})
	let html = typeof res.data === 'string' ? res.data : ''
	if (!html) throw new Error('获取课表页面失败')
	const optionRegex = /<option\s+value="(\d{4}-\d{4}-\d)"(?:\s+selected="selected")?>(.*?)<\/option>/g
	const matches = Array.from(html.matchAll(optionRegex))
	if (matches.length === 0) return null
	for (const match of matches) {
		if (match[0].includes('selected="selected"')) return match[1]
	}
	return matches[0][1]
}

async function fetchPyfaTerms(cookieHeader) {
	const cookie = getCookieHeader(cookieHeader)
	if (!cookie) throw new Error('请先完成教务登录')
	const res = await requestJw(cookieHeader, BASE_URL + '/jsxsd/pyfa/pyfa_query', 'GET', null, {})
	let html = typeof res.data === 'string' ? res.data : ''
	if (!html) throw new Error('获取培养方案执行计划页面失败')
	const htmlForParse = html.replace(/[\s　\t\n\r]/g, '')
	const termRegex = /<tr><td>.*?<\/td><td>(.*?)<\/td>/g
	const matches = Array.from(htmlForParse.matchAll(termRegex))
	const termSet = new Set()
	matches.forEach(match => {
		const term = (match[1] || '').trim()
		if (term && /^\d{4}-\d{4}-\d$/.test(term)) termSet.add(term)
	})
	return Array.from(termSet).sort()
}

/**
 * @param {string} cookieHeader
 * @param {string} term
 * @param {(week: number, total: number) => void} [onWeekProgress] 每开始获取一周时回调 (当前周, 总周数)
 */
async function loadScheduleBatch(cookieHeader, term, onWeekProgress) {
	const cookie = getCookieHeader(cookieHeader)
	if (!cookie) throw new Error('请先完成教务登录')
	const scheduleCache = { [term]: {} }
	const allSchedules = []
	const maxWeeks = 30
	for (let week = 1; week <= maxWeeks; week++) {
		if (onWeekProgress) onWeekProgress(week, maxWeeks)
		try {
			const zc = String(week)
			const res = await requestJw(
				cookieHeader,
				BASE_URL + '/jsxsd/xskb/xskb_list.do',
				'POST',
				`xnxq01id=${encodeURIComponent(term)}&zc=${encodeURIComponent(zc)}`,
				{ 'Content-Type': 'application/x-www-form-urlencoded' }
			)
			const html = typeof res.data === 'string' ? res.data : ''
			if (isJwLoginExpired(html)) continue
			const courseMatches = html.matchAll(/kbcontent"\s?>(.*?)<\/div>/g)
			const courses = Array.from(courseMatches).map(m => m[1])
			if (courses.length < 35) continue
			const schedule = courses.map(courseHtml => {
				if (courseHtml === '&nbsp;') return { course: '', teacher: '', time: '', location: '' }
				const courseMatch = courseHtml.match(/(.*?)<font title='老师'>/)
				const course = courseMatch ? courseMatch[1] : ''
				const teacherMatch = courseHtml.match(/<font title='老师'>(.*?)<\/font>/)
				const teacher = teacherMatch ? teacherMatch[1] : ''
				const timeMatch = courseHtml.match(/<font title='周次.*?'>(.*?)<\/font>/)
				const time = timeMatch ? timeMatch[1] : ''
				const locationMatch = courseHtml.match(/<font title='教室'>(.*?)<\/font>/)
				const location = locationMatch ? locationMatch[1] : ''
				return { course, teacher, time, location }
			})
			const remarkMatches = html.matchAll(/<\/th>.?<td.?colspan="7".?align="left">(.*?)<\/td>/g)
			const remarks = Array.from(remarkMatches).map(m => m[1])
			if (remarks.length > 0) schedule.push({ remark: remarks })
			const result = []
			for (let i = 0; i < schedule.length; i += 7) {
				const row = schedule.slice(i, i + 7)
				if (row.length === 7 && !row.some(c => c && c.remark)) result.push(row)
			}
			scheduleCache[term][String(week)] = result
			allSchedules.push(...schedule)
			if (week < maxWeeks) await new Promise(r => setTimeout(r, 100))
		} catch (e) {
			// skip
		}
	}
	const startWeek = parseScheduleStartWeek(allSchedules)
	const endWeek = parseScheduleEndWeek(allSchedules)
	let currentWeek = startWeek !== null ? startWeek : 1
	let grid = []
	if (scheduleCache[term] && scheduleCache[term][String(currentWeek)]) {
		grid = scheduleCache[term][String(currentWeek)]
	}
	return { scheduleCache, startWeek, endWeek, currentWeek, grid }
}

/**
 * 登录成功后调用：拉取课表并写入 app.globalData
 * @param {string} cookieHeader - 教务 Cookie（如 JSESSIONID=xxx 或 仅 xxx）
 * @param {(message: string) => void} [onProgress] - 进度文案回调，如「正在获取课表学期...」「正在获取第 3 周的课表（3/30）...」
 */
export async function loadScheduleAfterLogin(cookieHeader, onProgress) {
	const app = getApp()
	if (!app || !app.globalData) return
	try {
		if (onProgress) onProgress('正在获取课表学期...')
		let term = await fetchScheduleTerm(cookieHeader)
		if (!term) {
			app.globalData.globalScheduleTerm = ''
			app.globalData.globalSchedulePyfaTermList = []
			app.globalData.globalScheduleCache = {}
			app.globalData.globalScheduleGrid = []
			app.globalData.globalScheduleIsHoliday = false
			setAppGlobal('globalScheduleTerm', '')
			setAppGlobal('globalSchedulePyfaTermList', [])
			setAppGlobal('globalScheduleCache', {})
			setAppGlobal('globalScheduleGrid', [])
			setAppGlobal('globalScheduleIsHoliday', false)
			return
		}
		
		// 判断当前日期是否在学期内
		let isHoliday = false
		let targetTerm = term
		let termStartDate = null
		let termEndDate = null
		try {
			if (onProgress) onProgress('正在查询学期日期...')
			// 获取当前日期（格式：YYYY-MM-DD）
			const today = new Date().toISOString().split('T')[0]
			
			// 调用API获取所有学期的开学日期和结束日期
			const termDates = await post('App.TermStartDate.QueryTermStartDate', { cookie: cookieHeader })
			
			if (termDates && termDates.list && Array.isArray(termDates.list) && termDates.list.length > 0) {
				// 判断当前日期是否在某个学期内
				let foundTermInRange = false
				for (const termInfo of termDates.list) {
					const startDate = termInfo.startDate
					const endDate = termInfo.endDate
					
					// 如果有结束日期，判断是否在范围内
					if (startDate && endDate && today >= startDate && today <= endDate) {
						targetTerm = termInfo.term
						termStartDate = startDate
						termEndDate = endDate
						foundTermInRange = true
						break
					}
					// 如果没有结束日期，只比较开始日期（当前日期 >= 开始日期）
					else if (startDate && !endDate && today >= startDate) {
						targetTerm = termInfo.term
						termStartDate = startDate
						termEndDate = endDate
						foundTermInRange = true
						break
					}
				}
				
				// 如果不在任何学期内，获取最新学期
				if (!foundTermInRange) {
					isHoliday = true
					if (termDates.termSelectList && Array.isArray(termDates.termSelectList) && termDates.termSelectList.length > 0) {
						// 按学期代码排序，取最新的（学期代码格式：YYYY-YYYY-N）
						const sortedTerms = [...termDates.termSelectList].sort((a, b) => {
							// 比较学期代码，如 "2024-2025-1" vs "2023-2024-2"
							return b.value.localeCompare(a.value)
						})
						targetTerm = sortedTerms[0]?.value || term
					}
					// 找到最新学期对应的日期信息
					if (targetTerm) {
						const latestTermInfo = termDates.list.find(t => t.term === targetTerm)
						if (latestTermInfo) {
							termStartDate = latestTermInfo.startDate
							termEndDate = latestTermInfo.endDate
						}
					}
				} else {
					// 如果找到了学期，但还没有设置日期，从列表中查找
					if (!termStartDate && targetTerm) {
						const foundTermInfo = termDates.list.find(t => t.term === targetTerm)
						if (foundTermInfo) {
							termStartDate = foundTermInfo.startDate
							termEndDate = foundTermInfo.endDate
						}
					}
				}
			}
		} catch (e) {
			// API调用失败，回退到原有逻辑（使用默认学期）
			console.warn('查询学期日期失败，使用默认学期:', e)
			targetTerm = term
			isHoliday = false
		}
		
		let pyfaTermList = []
		try {
			pyfaTermList = await fetchPyfaTerms(cookieHeader)
		} catch (e) {
			// 忽略
		}
		const { scheduleCache, startWeek, endWeek, currentWeek, grid } = await loadScheduleBatch(
			cookieHeader,
			targetTerm,
			onProgress ? (week, total) => onProgress(`正在获取第 ${week} 周的课表（${week}/${total}）...`) : undefined
		)
		app.globalData.globalScheduleCache = scheduleCache
		app.globalData.globalScheduleTerm = targetTerm
		app.globalData.globalSchedulePyfaTermList = pyfaTermList
		app.globalData.globalScheduleStartWeek = startWeek
		app.globalData.globalScheduleEndWeek = endWeek
		app.globalData.globalScheduleCurrentWeek = currentWeek
		app.globalData.globalScheduleGrid = grid || []
		app.globalData.globalScheduleIsHoliday = isHoliday
		app.globalData.globalTermStartDate = termStartDate
		app.globalData.globalTermEndDate = termEndDate
		setAppGlobal('globalScheduleCache', scheduleCache)
		setAppGlobal('globalScheduleTerm', targetTerm)
		setAppGlobal('globalSchedulePyfaTermList', pyfaTermList)
		setAppGlobal('globalScheduleStartWeek', startWeek)
		setAppGlobal('globalScheduleEndWeek', endWeek)
		setAppGlobal('globalScheduleCurrentWeek', currentWeek)
		setAppGlobal('globalScheduleGrid', grid || [])
		setAppGlobal('globalScheduleIsHoliday', isHoliday)
		setAppGlobal('globalTermStartDate', termStartDate)
		setAppGlobal('globalTermEndDate', termEndDate)
		// 持久化当前学期课表到本地，form 页可恢复
		try {
			uni.setStorage({ key: `schedule_${targetTerm}`, data: scheduleCache[targetTerm] })
		} catch (e) {}
	} catch (err) {
		console.warn('登录后拉取课表失败:', err)
		app.globalData.globalScheduleCache = {}
		app.globalData.globalScheduleGrid = []
		app.globalData.globalScheduleIsHoliday = false
		setAppGlobal('globalScheduleCache', {})
		setAppGlobal('globalScheduleGrid', [])
		setAppGlobal('globalScheduleIsHoliday', false)
	}
}

export default { loadScheduleAfterLogin }
