<template>
	<view class="segment-progress">
		<text class="segment-progress__label">{{ label }}</text>
		<view class="segment-progress__strip">
			<view v-for="i in 10" :key="i" class="segment-progress__cell">
				<view class="segment-progress__cell-bg"></view>
				<view
					class="segment-progress__cell-fill"
					:style="[getSegmentFillStyle(i - 1), { backgroundColor: fillColor }]"
				></view>
			</view>
		</view>
		<text class="segment-progress__value" :class="valueClass" :style="valueStyle">{{ displayValue }}</text>
	</view>
</template>

<script>
import { THEME_GRADE_COLOR, THEME_RATING_COLOR } from '@/utils/themeScoreRating.js'

export default {
	name: 'SegmentProgress',
	props: {
		/** 0–5 的分数，null/undefined 显示「暂无」且 10 格全灰 */
		value: {
			type: Number,
			default: null
		},
		/** 'gpa'=成绩主题色（平均分/绩点），'rating'=评价主题色（课程评分） */
		type: {
			type: String,
			default: 'gpa',
			validator: (v) => ['gpa', 'rating'].includes(v)
		},
		/** 左侧文案 */
		label: {
			type: String,
			default: ''
		},
		/** 可选：展示用数值（如百分制平均分），不传则用 value */
		displayValueOverride: {
			type: [Number, String],
			default: null
		}
	},
	computed: {
		displayValue() {
			if (this.displayValueOverride != null && !Number.isNaN(Number(this.displayValueOverride))) {
				const n = Number(this.displayValueOverride)
				return n.toFixed(1)
			}
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
		fillColor() {
			return this.type === 'rating' ? THEME_RATING_COLOR : THEME_GRADE_COLOR
		},
		valueClass() {
			return this.normalizedValue != null ? '' : 'segment-progress__value--empty'
		},
		valueStyle() {
			if (this.normalizedValue == null) return {}
			return { color: this.type === 'rating' ? THEME_RATING_COLOR : THEME_GRADE_COLOR }
		}
	},
	methods: {
		/**
		 * 第 index 格（0–9）的填充比例 0–1
		 */
		getSegmentFill(index) {
			const v = this.normalizedValue
			if (v == null || v <= 0) return 0
			const fullSegments = Math.floor(v / 0.5)
			if (index < fullSegments) return 1
			if (index === fullSegments) return (v - fullSegments * 0.5) / 0.5
			return 0
		},
		getSegmentFillStyle(index) {
			const ratio = this.getSegmentFill(index)
			if (ratio <= 0) return { width: '0%' }
			return { width: (ratio * 100) + '%' }
		}
	}
}
</script>

<style scoped>
.segment-progress {
	display: flex;
	align-items: center;
	gap: 10rpx;
}
.segment-progress__label {
	font-size: 24rpx;
	color: #666;
	flex-shrink: 0;
	width: 120rpx;
}
.segment-progress__strip {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 4rpx;
	min-width: 0;
}
.segment-progress__cell {
	flex: 1;
	height: 10rpx;
	border-radius: 2rpx;
	background: #e8e8e8;
	position: relative;
	overflow: hidden;
}
.segment-progress__cell-bg {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: #e8e8e8;
	border-radius: 2rpx;
}
.segment-progress__cell-fill {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	border-radius: 2rpx;
	min-width: 0;
	transition: width 0.15s ease;
}
.segment-progress__value {
	font-size: 24rpx;
	font-weight: 500;
	flex-shrink: 0;
	width: 56rpx;
	text-align: right;
}
.segment-progress__value--empty {
	color: #999;
}
</style>
