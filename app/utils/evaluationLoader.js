/**
 * 登录成功后加载「评价课程」数据到 app.globalData，供课程评价页读取；同时通过 setAppGlobal 同步到本地存储。
 * 流程：获取成绩解析学期 → 按学期请求退选课 → 请求已评价 courseId 列表 → 合并为 evaluatedCourses 写入全局。
 */
import { post } from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { setAppGlobal, getAppGlobal } from '@/utils/appGlobalStorage.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { requestJw } from '@/utils/jwRequest.js'

const JW_BASE = 'http://jw.sdufe.edu.cn'

function normalizeScoreText(value) {
	return String(value || '')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;|&#160;/gi, '')
		.trim()
}

function isValidScoreText(value) {
	const text = normalizeScoreText(value)
	if (!text) return false
	const numericScore = Number(text)
	if (!Number.isNaN(numericScore)) {
		return numericScore >= 0 && numericScore <= 100
	}
	return !['-', '--', '---', '—', '暂无', '暂未录入', '未录入', '未公布', '无'].includes(text)
}

function getNumericScore(value) {
	const text = normalizeScoreText(value)
	const numericScore = Number(text)
	if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) return null
	return Math.round(numericScore)
}

/**
 * 获取成绩页，解析学期列表与所有有效成绩（学期+课程号→成绩文本）。
 * 成绩页没有教师名，只负责确认课程已经出成绩；教师名仍由退选课日志补齐。
 * @param {string} cookie - 教务 Cookie 头
 * @returns {Promise<{ termList: string[], scoreByCourseCode: Map<string, string>, scoreByTermCourseCode: Map<string, string>, numericScoreByTermCourseCode: Map<string, number>, _rawRows: Array<{term,courseCode,scoreText,nature}> }>}
 */
async function fetchScores(cookie) {
	const empty = { termList: [], scoreByCourseCode: new Map(), scoreByTermCourseCode: new Map(), numericScoreByTermCourseCode: new Map(), _rawRows: [] }
	if (!cookie) return empty
	const res = await requestJw(
		cookie,
		JW_BASE + '/jsxsd/kscj/cjcx_list',
		'POST',
		'xsfs=all',
		{ 'Content-Type': 'application/x-www-form-urlencoded' }
	)
	let html = typeof res.data === 'string' ? res.data : ''
	html = html.replace(/[\s　\t\n\r]/g, '')
	const termLike = /^\d{4}-\d{4}-\d$/
	const termSet = new Set()
	const rawRows = []
	const scoreByCourseCode = new Map()
	const scoreByTermCourseCode = new Map()
	const numericScoreByTermCourseCode = new Map()

	const addScoreRow = ({ term, courseCode, scoreText, nature }) => {
		const normalizedTerm = String(term || '').trim()
		const normalizedCourseCode = String(courseCode || '').trim()
		const normalizedScoreText = normalizeScoreText(scoreText)
		if (!termLike.test(normalizedTerm) || !normalizedCourseCode || !isValidScoreText(normalizedScoreText)) return
		termSet.add(normalizedTerm)
		rawRows.push({ term: normalizedTerm, courseCode: normalizedCourseCode, scoreText: normalizedScoreText, nature: String(nature || '').trim() })
		scoreByCourseCode.set(normalizedCourseCode, normalizedScoreText)
		scoreByTermCourseCode.set(`${normalizedTerm}\u0000${normalizedCourseCode}`, normalizedScoreText)
		const numericScore = getNumericScore(normalizedScoreText)
		if (numericScore !== null) {
			numericScoreByTermCourseCode.set(`${normalizedTerm}\u0000${normalizedCourseCode}`, numericScore)
		}
	}

	// 方式1：带首列跳过（与历史前端一致）
	const scoreRegex1 = /<tr><td>.*?<\/td><td>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><!--控制成绩显示--><tdstyle=.*?><ahref=.*?>(.*?)<\/a><\/td><\/td><td>.*?<\/td><!--控制绩点显示--><td>.*?<\/td><td>.*?<\/td><td>(.*?)<\/td><td>.*?<\/td><td>.*?<\/td><\/tr>/g
	let matches = Array.from(html.matchAll(scoreRegex1))
	matches.forEach(match => {
		const col1 = (match[1] || '').trim()
		const col2 = (match[2] || '').trim()
		const scoreText = (match[4] || '').trim()
		const nature = (match[5] || '').trim()
		if (termLike.test(col1)) addScoreRow({ term: col1, courseCode: col2, scoreText, nature })
		else if (termLike.test(col2)) addScoreRow({ term: col2, courseCode: col1, scoreText, nature })
	})

	// 方式2：与后端 PHP 完全一致，无首列跳过，(1)=课程号 (2)=学期 (3)=成绩 (4)=课程性质
	if (rawRows.length === 0) {
		const scoreRegex2 = /<tdalign=.*?>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><!--控制成绩显示--><tdstyle=.*?><ahref=.*?>(.*?)<\/a><\/td><\/td><td>.*?<\/td><!--控制绩点显示--><td>.*?<\/td><td>.*?<\/td><td>(.*?)<\/td><td>.*?<\/td><td>.*?<\/td>/g
		const m2 = Array.from(html.matchAll(scoreRegex2))
		m2.forEach(match => {
			const courseCode = (match[1] || '').trim()
			const term = (match[2] || '').trim()
			const scoreText = (match[3] || '').trim()
			const nature = (match[4] || '').trim()
			addScoreRow({ term, courseCode, scoreText, nature })
		})
	}

	const termList = termSet.size > 0
		? Array.from(termSet).sort()
		: (rawRows.length ? [''] : [])
	return {
		termList,
		scoreByCourseCode,
		scoreByTermCourseCode,
		numericScoreByTermCourseCode,
		_rawRows: rawRows
	}
}

/**
 * 请求某一学期的退选课列表（所有课程类型，只要求状态为选课）
 * @param {string} cookie
 * @param {string} term
 * @returns {Promise<Array<{term,courseId,courseName,teacherName,...}>>}
 */
async function fetchTxListForTerm(cookie, term) {
	if (!cookie) return []
	const res = await requestJw(
		cookie,
		JW_BASE + '/jsxsd/xsxk/xs_txlist',
		'POST',
		`xnxqh=${encodeURIComponent(term)}`,
		{ 'Content-Type': 'application/x-www-form-urlencoded' }
	)
	let html = typeof res.data === 'string' ? res.data : ''
	html = html.replace(/[\s　\t\n\r]/g, '')
	const courseRegex = /<tr><!--<td><\/td>--><td>(.*?)<\/td><td>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td(?:align="center")?>(?:&nbsp;|.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(?:&nbsp;|.*?)<\/td><td(?:align="center")?>(?:.*?)<\/td><\/tr>/g
	const matches = Array.from(html.matchAll(courseRegex))
	const list = []
	matches.forEach(match => {
		const courseId = (match[1] || '').trim()
		const courseName = (match[2] || '').trim()
		const credit = (match[3] || '').trim()
		const courseType = (match[4] || '').trim()
		const teacherName = (match[5] || '').trim()
		const courseCategory = (match[6] || '').replace(/&nbsp;/g, '').trim()
		const status = (match[7] || '').trim()
		const txTime = (match[8] || '').trim()
		const txOperator = (match[9] || '').trim()
		if (status === '选课' && courseName && teacherName) {
			list.push({
				term,
				courseId,
				courseName,
				teacherName: teacherName || '',
				courseType,
				credit,
				courseCategory: courseCategory || '',
				status,
				txTime: txTime || '',
				txOperator: txOperator || ''
			})
		}
	})
	return list
}

/**
 * 查询已评价的 courseId 列表（MD5）
 * @returns {Promise<string[]>}
 */
async function fetchEvaluatedCourseIds() {
	const app = getApp()
	let userKey = (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) || ''
	if (!userKey) {
		try {
			userKey = uni.getStorageSync('userKey')
		} catch (e) {}
	}
	if (!userKey) return []
	try {
		const result = await post('App.UserCourse.GetCourseByUserId', { userKey })
		if (result && result.evaluated && Array.isArray(result.evaluated)) {
			return result.evaluated
		}
		return []
	} catch (err) {
		// 如果失败，可能是 userKey 无效，先确保用户已注册再重试一次
		const msg = (err && (err.message || err)) ? String(err.message || err) : ''
		if (msg.includes('用户密钥') || msg.includes('UserKey') || msg.includes('请求失败')) {
			console.log('fetchEvaluatedCourseIds: 接口失败，尝试先确保用户已注册:', msg)
			const registered = await ensureUserRegistered()
			if (registered) {
				// 重新获取 userKey（可能已更新）
				const newUserKey = (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) || uni.getStorageSync('userKey') || userKey
				try {
					const retryResult = await post('App.UserCourse.GetCourseByUserId', { userKey: newUserKey })
					if (retryResult && retryResult.evaluated && Array.isArray(retryResult.evaluated)) {
						return retryResult.evaluated
					}
				} catch (retryErr) {
					console.warn('fetchEvaluatedCourseIds: 重试仍失败', retryErr)
				}
			}
		}
		throw err // 重新抛出原错误
	}
}

/**
 * 根据 allCourses 与 evaluatedCourseIds 生成 evaluatedCourses 并写入 globalData。
 * 不用后端「我的选课」过滤：仅用教务多学期退选课 + 后端已评价打勾。
 */
function syncEvaluatedToGlobal(allCourses, evaluatedCourseIds) {
	const app = getApp()
	if (!app || !app.globalData) return
	const evaluatedSet = new Set((evaluatedCourseIds || []).map(id => String(id).toLowerCase()))
	const courses = (allCourses || []).map(c => {
		const courseName = c.courseName || ''
		const teacherName = c.teacherName || ''
		const combinedString = courseName + teacherName
		const md5Hash = md5.hexMD5(combinedString)
		const hashLower = md5Hash.toLowerCase()
		return {
			courseName,
			teacherName,
			md5Hash,
			isEvaluated: evaluatedSet.has(hashLower)
		}
	})
	app.globalData.evaluatedCourses = courses
	app.globalData.evaluatedCourseMap = {}
	courses.forEach(c => {
		if (c.md5Hash) {
			app.globalData.evaluatedCourseMap[c.md5Hash] = {
				courseId: c.md5Hash,
				isEvaluated: c.isEvaluated || false,
				courseName: c.courseName || '',
				teacherName: c.teacherName || ''
			}
		}
	})
	app.globalData.allCourses = allCourses || []
	app.globalData.evaluatedCourseIds = evaluatedCourseIds || []
	if (app.globalData.globalJwTermList === undefined) {
		app.globalData.globalJwTermList = []
	}
	setAppGlobal('evaluatedCourses', courses)
	setAppGlobal('evaluatedCourseMap', app.globalData.evaluatedCourseMap)
	setAppGlobal('allCourses', allCourses || [])
	setAppGlobal('evaluatedCourseIds', Array.from(evaluatedSet))
	if (app.globalData.globalJwTermList !== undefined) {
		setAppGlobal('globalJwTermList', app.globalData.globalJwTermList)
	}
}

/**
 * 从 allCourses 提取去重后的 courseId 列表（小写 md5(课程名+教师名)），与 syncEvaluatedToGlobal 计算方式一致
 */
function getAllCourseIds(allCourses) {
	const set = new Set()
	;(allCourses || []).forEach(c => {
		const courseName = c.courseName || ''
		const teacherName = c.teacherName || ''
		const hash = md5.hexMD5(courseName + teacherName).toLowerCase()
		if (hash) set.add(hash)
	})
	return Array.from(set)
}

/**
 * 将多学期退选课拉取到的 courseId 列表写入后端 userEvaluateCourse 表（合并去重）
 * @param {string} userKey
 * @param {Array<{courseName,teacherName}>} allCourses
 */
async function writeUserCourseToBackend(userKey, allCourses) {
	if (!userKey || !allCourses || allCourses.length === 0) return
	const courseIds = getAllCourseIds(allCourses)
	if (courseIds.length === 0) return
	const courses = (allCourses || []).map(c => {
		const courseName = c.courseName || ''
		const teacherName = c.teacherName || ''
		const courseId = md5.hexMD5(courseName + teacherName).toLowerCase()
		return {
			courseId,
			md5Hash: courseId,
			courseTerm: c.term || c.courseTerm || '',
			term: c.term || c.courseTerm || '',
			courseCode: c.courseId || c.courseCode || '',
			lessonId: c.courseId || c.courseCode || '',
			lessonName: courseName,
			courseName,
			teacherName,
			lessonCredit: c.credit || c.lessonCredit || '',
			credit: c.credit || c.lessonCredit || '',
			courseType: c.courseType || ''
		}
	}).filter(c => c.courseId && c.courseTerm && c.lessonName && c.teacherName)
	try {
		await post('App.UserCourse.SetUserCourseFromClient', {
			userKey,
			courseIds: courseIds.join(';'),
			courses: JSON.stringify(courses)
		})
	} catch (err) {
		console.warn('evaluationLoader: 写入后端 userEvaluateCourse 失败', err)
	}
}

/**
 * 用当前全局/本地的 allCourses + userKey 同步到后端 userEvaluateCourse 表（供刷新或提交前调用，避免「不在选课列表」）
 */
export async function syncUserCourseToBackend() {
	const app = getApp()
	const allCourses = (app && app.globalData && app.globalData.allCourses) || getAppGlobal('allCourses') || []
	if (!Array.isArray(allCourses) || allCourses.length === 0) return
	let userKey = (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) || ''
	if (!userKey) {
		try {
			userKey = uni.getStorageSync('userKey')
		} catch (e) {}
	}
	if (userKey) await writeUserCourseToBackend(userKey, allCourses)
}

/**
 * 登录成功后调用：拉取成绩学期 → 逐学期拉退选课 → 写入后端 userEvaluateCourse → 拉已评价列表 → 写入 app.globalData
 * @param {string} cookie - 教务 Cookie（如 login 页的 this.cookieHeader）
 * @returns {Promise<{ termList: string[], allCourses: Array, evaluatedCourses: Array }>}
 */
function buildScoresToImport(allCourses, numericScoreByTermCourseCode) {
	const scoresToImport = []
	;(allCourses || []).forEach(c => {
		const courseCode = (c.courseId || '').trim()
		if (!courseCode) return
		const term = (c.term || '').trim()
		const score = numericScoreByTermCourseCode.get(`${term}\u0000${courseCode}`)
		if (score == null || score < 0 || score > 100) return
		const courseName = (c.courseName || '').trim()
		const teacherName = (c.teacherName || '').trim()
		if (!courseName || !teacherName) return
		const courseId = md5.hexMD5(courseName + teacherName).toLowerCase()
		if (courseId) scoresToImport.push({ courseId, term, courseTerm: term, score })
	})
	return scoresToImport
}

export async function loadEvaluationData(cookie, onProgress) {
	const report = typeof onProgress === 'function' ? onProgress : () => {}
	const debugKey = 'debugScoreImport'
	const writeDebug = (obj) => {
		const payload = { ...obj, time: new Date().toISOString() }
		try {
			uni.setStorageSync(debugKey, JSON.stringify(payload))
		} catch (e) {}
		console.log('[成绩导入调试]', payload)
	}
	if (!cookie || typeof cookie !== 'string') {
		console.warn('evaluationLoader: 无 Cookie，跳过加载评价数据')
		return { termList: [], allCourses: [], evaluatedCourses: [] }
	}
	report('正在拉取历史成绩...')
	const scoreResult = await fetchScores(cookie)
	let { termList, scoreByCourseCode, scoreByTermCourseCode, numericScoreByTermCourseCode } = scoreResult
	const app = getApp()
	if (app && app.globalData) {
		app.globalData.globalJwTermList = termList
		setAppGlobal('globalJwTermList', termList)
	}
	const totalTerms = Array.isArray(termList) ? termList.length : 0
	if (totalTerms > 0) {
		report(`已识别 ${totalTerms} 个学期，正在抓取退选课...`)
	} else {
		report('未识别到历史学期，跳过退选课抓取')
	}
	let finishedTerms = 0
	const termResults = await Promise.all(termList.map(async (term) => {
		const list = await fetchTxListForTerm(cookie, term)
		finishedTerms += 1
		report(`正在抓取退选课（${finishedTerms}/${totalTerms || 1}）...`)
		return list
	}))
	const txCourses = termResults.flat()
	const allCourses = txCourses.filter(c => scoreByTermCourseCode.has(`${(c.term || '').trim()}\u0000${(c.courseId || '').trim()}`))
	report(`已抓取 ${txCourses.length} 门历史课程，其中 ${allCourses.length} 门已出成绩`)
	let userKey = (app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) || ''
	if (!userKey) {
		try { userKey = uni.getStorageSync('userKey') } catch (e) {}
	}
	if (userKey) {
		report('正在同步课程到后端...')
		await writeUserCourseToBackend(userKey, allCourses)
		const scoresToImport = buildScoresToImport(allCourses, numericScoreByTermCourseCode)
		if (scoresToImport.length > 0) {
			try {
				report(`正在导入 ${scoresToImport.length} 条历史成绩...`)
				// 使用 form-urlencoded 时数组会被转成无效字符串，故 scores 以 JSON 字符串传，后端再解析
				const res = await post('App.UserScore.ImportScoresFromCourseList', { userKey, scores: JSON.stringify(scoresToImport) })
				const num = (res && res.number) ? res.number : 0
				console.log('evaluationLoader: 已把课程成绩写入 userScore，条数:', num)
				writeDebug({ termListLength: termList.length, allCoursesLength: allCourses.length, scoreByCourseCodeSize: scoreByCourseCode.size, scoresToImportLength: scoresToImport.length, importNumber: num, ok: true })
			} catch (err) {
				console.warn('evaluationLoader: 写入 userScore 失败', err)
				writeDebug({ termListLength: termList.length, allCoursesLength: allCourses.length, scoresToImportLength: scoresToImport.length, error: (err && (err.message || err)) ? String(err.message || err) : String(err), ok: false })
			}
		} else {
			const sampleTx = (txCourses || []).slice(0, 5).map(c => `${c.term}:${c.courseId}`)
			const sampleScores = []
			scoreByCourseCode.forEach((v, k) => { if (sampleScores.length < 5) sampleScores.push(k) })
			console.warn('evaluationLoader: 未写入 userScore（匹配数为 0）')
			writeDebug({ termListLength: termList.length, allCoursesLength: allCourses.length, scoreByCourseCodeSize: scoreByCourseCode.size, scoresToImportLength: 0, sampleCourseCodesFromTx: sampleTx, sampleCourseCodesFromScores: sampleScores, ok: false })
		}
	} else {
		console.warn('evaluationLoader: 无 userKey，跳过写入 userScore')
		writeDebug({ error: 'no userKey', ok: false })
	}
	report('正在查询已评价课程列表...')
	let evaluatedCourseIds = []
	try {
		evaluatedCourseIds = await fetchEvaluatedCourseIds()
	} catch (err) {
		console.warn('evaluationLoader: 查询已评价列表失败', err)
	}
	syncEvaluatedToGlobal(allCourses, evaluatedCourseIds)
	const evaluatedCourses = (app && app.globalData && app.globalData.evaluatedCourses) || []
	report(`已识别 ${evaluatedCourseIds.length} 门已评价课程`)
	return { termList, allCourses, evaluatedCourses }
}

/**
 * 仅刷新「已评价」状态：用当前 globalData.allCourses + 接口返回的已评价列表，重新计算并写回 globalData（无需 Cookie）
 * 课程评价页可调用此方法做「刷新评价状态」。
 */
export async function refreshEvaluatedStatus() {
	const app = getApp()
	const allCourses = (app && app.globalData && app.globalData.allCourses) || getAppGlobal('allCourses') || []
	// 刷新时先把本地 allCourses 写入后端，避免只刷新状态但后端 userEvaluateCourse 未更新导致提交报「不在选课列表」
	await syncUserCourseToBackend()
	let evaluatedCourseIds = []
	try {
		evaluatedCourseIds = await fetchEvaluatedCourseIds()
	} catch (err) {
		console.warn('evaluationLoader: 刷新已评价列表失败', err)
	}
	syncEvaluatedToGlobal(allCourses, evaluatedCourseIds)
	return (app && app.globalData && app.globalData.evaluatedCourses) || []
}

/** 读取上次 loadEvaluationData 写入的调试信息（登录后成绩导入结果），便于排查评论旁「无」的问题。控制台可执行 getApp().getLastScoreImportDebug() 或 uni.getStorageSync('debugScoreImport') */
export function getLastScoreImportDebug() {
	try {
		const raw = uni.getStorageSync('debugScoreImport')
		return raw ? JSON.parse(raw) : null
	} catch (e) {
		return null
	}
}
