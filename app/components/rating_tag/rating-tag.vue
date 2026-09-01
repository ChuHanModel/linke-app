<template>
	<view class="rating-tag" :style="tagStyle">
		<text class="rating-tag__text">{{ displayText }}</text>
	</view>
</template>

<script>
/** 课程评分标签：用颜色表示分数高低，高分亮金色 */
const BRIGHT_GOLD = '#ffd700'   // 高分 亮金
const GOLD = '#ffc740'         // 中高
const MUTED_GOLD = '#c9a227'   // 中等
const LOW_GRAY = '#999'        // 低分 灰

export default {
	name: 'RatingTag',
	props: {
		/** 课程评分 0–5，null/undefined 显示「暂无」 */
		value: {
			type: Number,
			default: null
		}
	},
	computed: {
		displayText() {
			const v = this.normalizedValue
			if (v == null || Number.isNaN(v)) return '暂无'
			return v.toFixed(1)
		},
		normalizedValue() {
			const v = this.value
			if (v == null || Number.isNaN(Number(v))) return null
			const n = Number(v)
			if (n < 0) return 0
			if (n > 5) return 5
			return n
		},
		tagStyle() {
			const v = this.normalizedValue
			if (v == null) {
				return {}
			}
			if (v >= 4.5) {
				return { backgroundColor: BRIGHT_GOLD, color: '#333' }
			}
			if (v >= 4) {
				return { backgroundColor: GOLD, color: '#333' }
			}
			if (v >= 3) {
				return { backgroundColor: MUTED_GOLD, color: '#fff' }
			}
			return { backgroundColor: LOW_GRAY, color: '#fff' }
		}
	}
}
</script>

<style scoped>
.rating-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 56rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
	font-weight: 500;
	background-color: var(--color-bg-tag);
	color: var(--color-text-secondary);
}
.rating-tag__text {
	line-height: 1.2;
}
</style>
