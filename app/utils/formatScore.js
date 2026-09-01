/**
 * 将百分制成绩（80–100）换算为 0–5 绩点，供 10 格进度条使用。
 * @param {number|null|undefined} scoreAvg 成绩平均分（百分制）
 * @returns {number|null} 0–5 的绩点，无效时返回 null
 */
export function toGpa(scoreAvg) {
	if (scoreAvg == null || Number.isNaN(Number(scoreAvg))) return null
	const n = Number(scoreAvg)
	if (n < 80) return 0
	if (n > 100) return 5
	return Math.round(((n - 80) / 20) * 5 * 10) / 10
}
