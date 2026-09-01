/**
 * 匿名昵称生成器
 * 将真实姓名确定性地映射为「形容词 + 动物」的匿名昵称
 * 同一姓名始终生成同一昵称，无法反推
 */

const ADJECTIVES = [
	'勤奋的', '认真的', '安静的', '活泼的', '温柔的',
	'勇敢的', '聪明的', '快乐的', '阳光的', '淡定的',
	'从容的', '优雅的', '机智的', '率真的', '沉稳的',
	'热情的', '谦逊的', '坚定的', '灵巧的', '随和的',
	'悠闲的', '专注的', '开朗的', '沉默的', '自在的',
	'敏捷的', '潇洒的', '踏实的', '善良的', '爽朗的',
	'清醒的', '坦然的', '低调的', '朴素的', '洒脱的',
	'稳重的', '真诚的', '理性的', '乐观的', '淳朴的'
]

const ANIMALS = [
	'白鸽', '松鼠', '海豚', '白鹭', '梅花鹿',
	'云雀', '企鹅', '树袋熊', '小熊猫', '银狐',
	'蝴蝶', '喜鹊', '柴犬', '锦鲤', '萤火虫',
	'水獭', '猫头鹰', '鹦鹉', '刺猬', '兔子',
	'长颈鹿', '浣熊', '海马', '白鲸', '黄鹂',
	'麋鹿', '翠鸟', '仓鼠', '斑马', '蜻蜓',
	'青鸟', '天鹅', '海獭', '狸猫', '飞鱼',
	'知更鸟', '河狸', '小鹿', '丹顶鹤', '啄木鸟'
]

/**
 * 简易字符串哈希（djb2 变体）
 */
function hashStr(str) {
	let hash = 5381
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0
	}
	return hash
}

/**
 * 生成匿名昵称
 * @param {string} name - 真实姓名或用户标识
 * @returns {string} 如 "勤奋的白鸽"
 */
export function generateAnonymousName(name) {
	if (!name || !String(name).trim()) return '匿名同学'
	const s = String(name).trim()
	const h = hashStr(s)
	const adj = ADJECTIVES[h % ADJECTIVES.length]
	// 用不同的偏移选动物，避免和形容词耦合
	const animal = ANIMALS[(h >>> 8) % ANIMALS.length]
	return adj + animal
}
