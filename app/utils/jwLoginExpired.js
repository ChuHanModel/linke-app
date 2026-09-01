/**
 * 教务系统「登录过期」统一判定
 * 所有请求教务接口的地方共用，保证行为一致
 */

/**
 * 根据教务返回的 HTML 判断是否为登录页（即 Cookie 已失效）
 * @param {string} html - 响应内容
 * @returns {boolean}
 */
export function isJwLoginExpired(html) {
	if (!html || typeof html !== 'string') return false
	const trimmed = html.trim()
	// 登录页通常很短且包含 </html>；正常业务页（如课表、成绩）内容较长
	if (trimmed.includes('</html>') && trimmed.length < 5000) return true
	// 部分教务系统会直接返回“请先登录”等文案
	if (trimmed.includes('用户登录') || trimmed.includes('请先登录')) return true
	return false
}
