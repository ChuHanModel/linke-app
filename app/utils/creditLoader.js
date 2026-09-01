/**
 * 登录成功后拉取学分类别成绩并写入 app.globalData.globalCreditParsed，供课程学分页读取；同时通过 setAppGlobal 同步到本地存储。
 */
import { setAppGlobal } from '@/utils/appGlobalStorage.js'
import { postJson } from '@/utils/api.js'
import { requestJw, getCookieHeader } from '@/utils/jwRequest.js'

const BASE_URL = 'http://jw.sdufe.edu.cn'

/**
 * 解析学分类别成绩 HTML，与教务集合页 fetchCredit 逻辑一致
 * @param {string} html
 * @returns {Object} { [typeName]: { required, count, studying, courses: [...] } }
 */
function parseCreditHtml(html) {
	let htmlForParse = (html || '').replace(/[\s　\t\n\r]/g, '')
	const typeMatches = htmlForParse.matchAll(/<tdalign="center">(.*?)<\/td>/g)
	const typeData = Array.from(typeMatches).map(m => m[1])
	const typeChunks = []
	for (let i = 0; i < typeData.length; i += 4) {
		typeChunks.push(typeData.slice(i, i + 4))
	}
	const result = {}
	typeChunks.forEach(chunk => {
		if (!chunk || chunk.length < 4) return
		const typeName = chunk[0]
		if (!typeName || typeof typeName !== 'string') return
		const required = chunk[1] || ''
		const count = chunk[2] || '0'
		const studying = chunk[3] || '0'
		result[typeName] = {
			required: required,
			count: count,
			studying: studying,
			courses: []
		}
	})
	const courseDetailMatch = htmlForParse.match(/已修课程明细.*?<table.*?>(.*?)<\/table>/)
	if (courseDetailMatch && courseDetailMatch[1]) {
		const courseTableHtml = courseDetailMatch[1]
		const detailMatches = courseTableHtml.matchAll(/<td>(.*?)<\/td>/g)
		const detailData = Array.from(detailMatches).map(m => m[1])
		const detailChunks = []
		for (let i = 0; i < detailData.length; i += 5) {
			if (i + 5 <= detailData.length) {
				detailChunks.push(detailData.slice(i, i + 5))
			}
		}
		detailChunks.forEach(chunk => {
			if (!chunk || chunk.length < 5) return
			const courseId = chunk[0] || ''
			const courseName = chunk[1] || ''
			const credit = chunk[2] || ''
			const score = chunk[3] || ''
			const category = chunk[4] || ''
			if (courseId === '课程编号' || courseName === '课程名称' || courseId === '' || courseName === '') {
				return
			}
			if (category && result[category] && Array.isArray(result[category].courses)) {
				result[category].courses.push({
					courseId: courseId,
					courseName: courseName,
					credit: credit,
					score: score,
					category: category
				})
			}
		})
	}
	const cleanedResult = {}
	Object.keys(result).forEach(key => {
		const value = result[key]
		if (value && typeof value === 'object') {
			cleanedResult[key] = {
				required: value.required || '',
				count: value.count || '0',
				studying: value.studying || '0',
				courses: Array.isArray(value.courses) ? value.courses : []
			}
		}
	})
	return cleanedResult
}

/**
 * 登录成功后调用：拉取学分类别成绩并写入 app.globalData.globalCreditParsed
 * @param {string} cookieHeader - 教务 Cookie（如 JSESSIONID=xxx 或 仅 xxx）
 * @param {(message: string) => void} [onProgress] - 进度文案回调
 */
export async function loadCreditAfterLogin(cookieHeader, onProgress) {
	const report = typeof onProgress === 'function' ? onProgress : () => {}
	const app = getApp()
	if (!app || !app.globalData) return
	const cookie = getCookieHeader(cookieHeader)
	if (!cookie) return
	try {
		report('正在拉取学分类别成绩页...')
		const res = await requestJw(
			cookieHeader,
			BASE_URL + '/jsxsd/xxwcqk/xstxkxdqk.do',
			'GET',
			null,
			{}
		)
		const html = typeof res.data === 'string' ? res.data : ''
		report('正在解析课程类型...')
		const parsed = parseCreditHtml(html)
		app.globalData.globalCreditParsed = parsed
		setAppGlobal('globalCreditParsed', parsed)

		// 导入课程类型到后端数据库
		try {
			const typeCount = Object.keys(parsed).length
			report(`正在导入 ${typeCount} 个课程类型...`)
			// 使用 postJson 发送 JSON 数据，确保对象结构不被转换
			await postJson('App.CourseType.ImportCourseTypes', { creditData: parsed })
			console.log('课程类型导入成功', typeCount, '个课程类型')
			report('课程类型导入完成')
		} catch (importErr) {
			console.warn('导入课程类型失败:', importErr)
			// 导入失败不影响主流程
		}
	} catch (err) {
		console.warn('登录后拉取学分类别成绩失败:', err)
		// 失败时保留已有数据，不清空
	}
}

export default { loadCreditAfterLogin }
