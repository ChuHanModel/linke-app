<template>
	<view class="score-boxplot">
		<text v-if="label" class="score-boxplot__label">{{ label }}</text>
		<view v-if="hasValidData" class="score-boxplot__track" :class="{ 'score-boxplot__track--detail': showStatsLabels || showScaleTicks, 'score-boxplot__track--data-values': showDataValues || showFixedScale }">
			<!-- 0–100 轴背景 -->
			<view class="score-boxplot__axis" :style="axisStyle"></view>
			<!-- 左须：min → Q1 -->
			<view
				class="score-boxplot__whisker score-boxplot__whisker--left"
				:style="leftWhiskerStyle"
			></view>
			<!-- 箱体：Q1 → Q3 -->
			<view
				class="score-boxplot__box"
				:style="boxStyle"
			></view>
			<!-- 中位数线 -->
			<view
				class="score-boxplot__median"
				:style="medianStyle"
			></view>
			<!-- 中位数值标注（showStatsLabels 时改为下方统一「中位 xx」，showDataValues 时由数据值代替） -->
			<text v-if="!showStatsLabels && !showDataValues" class="score-boxplot__median-label" :style="medianLabelStyle">{{ medianDisplayText }}</text>
			<!-- Q1/Q3 标注：showFixedScale 模式下在箱体上方显示 -->
			<template v-if="showFixedScale && !showStatsLabels && !showDataValues">
				<text v-if="hasQ1" class="score-boxplot__quartile-label" :style="quartileLabelStyle(toNum(q1))">{{ formatScore(toNum(q1)) }}</text>
				<text v-if="hasQ3" class="score-boxplot__quartile-label" :style="quartileLabelStyle(toNum(q3))">{{ formatScore(toNum(q3)) }}</text>
			</template>
			<!-- 刻度 0、75、100：直接标在数轴上，极小标签 -->
			<template v-if="showScaleTicks">
				<text class="score-boxplot__scale-tick score-boxplot__scale-tick--on-axis" :style="scaleTickStyle(0)">0</text>
				<text class="score-boxplot__scale-tick score-boxplot__scale-tick--on-axis" :style="scaleTickStyle(75)">75</text>
				<text class="score-boxplot__scale-tick score-boxplot__scale-tick--on-axis" :style="scaleTickStyle(100)">100</text>
			</template>
			<!-- 平均分竖线（与中位数区分颜色） -->
			<view v-if="showStatsLabels && hasAvg" class="score-boxplot__avg-line" :style="avgLineStyle"></view>
			<!-- 平均分标注：数轴上方 -->
			<text v-if="showStatsLabels && hasAvg" class="score-boxplot__avg-label" :style="avgLabelStyle">平均 {{ formatScore(toNum(avg)) }}</text>
			<!-- 四统计量：最低/最高靠近数轴，中位在下方 -->
			<template v-if="showStatsLabels">
				<text v-if="hasMin" class="score-boxplot__stat-label score-boxplot__stat-label--minmax" :style="statLabelStyle(toNum(min))">最低 {{ formatScore(toNum(min)) }}</text>
				<text v-if="hasMax" class="score-boxplot__stat-label score-boxplot__stat-label--minmax" :style="statLabelStyle(toNum(max))">最高 {{ formatScore(toNum(max)) }}</text>
				<text v-if="hasMedian" class="score-boxplot__stat-label" :style="statLabelStyle(toNum(median))">中位 {{ formatScore(toNum(median)) }}</text>
			</template>
			<!-- 右须：Q3 → max -->
			<view
				class="score-boxplot__whisker score-boxplot__whisker--right"
				:style="rightWhiskerStyle"
			></view>
			<!-- 端点圆点（showDataValues 或 showFixedScale 模式，hideEndpoints 时隐藏） -->
			<template v-if="(showDataValues || showFixedScale) && !hideEndpoints">
				<view v-if="hasMin" class="score-boxplot__endpoint" :style="endpointStyle(toNum(min))"></view>
				<view v-if="hasMax" class="score-boxplot__endpoint" :style="endpointStyle(toNum(max))"></view>
			</template>
			<!-- 数据值标注（showDataValues 模式）：轴下方显示去重后的关键数值 -->
			<template v-if="showDataValues && !showFixedScale">
				<text
					v-for="dv in dedupedDataValues"
					:key="'dv-' + dv.score"
					class="score-boxplot__data-value"
					:style="dataValueStyle(dv.score)"
				>{{ dv.label }}</text>
			</template>
			<!-- 固定刻度轴（showFixedScale 模式） -->
			<template v-if="showFixedScale">
				<text
					v-for="tick in fixedScaleValues"
					:key="'fs-' + tick"
					class="score-boxplot__data-value"
					:style="dataValueStyle(tick)"
				>{{ tick }}</text>
			</template>
			<!-- 评分数字（0–5）：列表模式显示在轨道上方，详情模式显示在轨道下方 -->
			<text v-if="hasRating" class="score-boxplot__rating-label" :class="{ 'score-boxplot__rating-label--above': !showStatsLabels }" :style="ratingLabelStyle">{{ ratingDisplayText }}</text>
		</view>
		<text v-else class="score-boxplot__empty">暂无</text>
	</view>
</template>

<script>
import { THEME_GRADE_COLOR, THEME_RATING_COLOR } from '@/utils/themeScoreRating.js'

export default {
	name: 'ScoreBoxplot',
	props: {
		/** 最低分（0–100） */
		min: { type: Number, default: null },
		/** 最高分（0–100） */
		max: { type: Number, default: null },
		/** 第一四分位数（0–100） */
		q1: { type: Number, default: null },
		/** 中位数（0–100） */
		median: { type: Number, default: null },
		/** 第三四分位数（0–100） */
		q3: { type: Number, default: null },
		/** 课程评分（0–5），换算为百分制后显示在轨道上 */
		rating: { type: Number, default: null },
		/** 左侧文案，与 segment-progress 对齐 */
		label: { type: String, default: '' },
		/** 是否在轨道上显示 0、75、100 刻度 */
		showScaleTicks: { type: Boolean, default: false },
		/** 是否显示最低/最高/平均/中位数标注 */
		showStatsLabels: { type: Boolean, default: false },
		/** 平均分（0–100），showStatsLabels 时用于「平均分」标注 */
		avg: { type: Number, default: null },
		/** 是否在轴下方显示五个关键数值（min/Q1/median/Q3/max），不带文字前缀 */
		showDataValues: { type: Boolean, default: false },
		/** 颜色覆盖：须线（whisker）颜色，不传则用 THEME_GRADE_COLOR */
		whiskerColor: { type: String, default: '' },
		/** 颜色覆盖：箱体（IQR box）颜色，不传则用 THEME_GRADE_COLOR */
		boxColor: { type: String, default: '' },
		/** 颜色覆盖：中位数线颜色，不传则用 THEME_GRADE_COLOR */
		medianColor: { type: String, default: '' },
		/** 颜色覆盖：端点圆点颜色，不传则用 #94A3B8 */
		endpointColor: { type: String, default: '' },
		/** 颜色覆盖：轴线颜色 */
		axisColor: { type: String, default: '' },
		/** 颜色覆盖：箱体边框颜色 */
		boxBorderColor: { type: String, default: '' },
		/** 是否在轴下方显示固定刻度（0/60/75/85/100） */
		showFixedScale: { type: Boolean, default: false },
		/** 是否隐藏最高分/最低分端点圆点及对应数据值标注 */
		hideEndpoints: { type: Boolean, default: false }
	},
	computed: {
		hasValidData() {
			const m = this.toNum(this.min)
			const x = this.toNum(this.max)
			const q1 = this.toNum(this.q1)
			const med = this.toNum(this.median)
			const q3 = this.toNum(this.q3)
			if (m == null || x == null || q1 == null || med == null || q3 == null) return false
			if (m > x) return false
			return true
		},
		resolvedWhiskerColor() { return this.whiskerColor || THEME_GRADE_COLOR },
		resolvedBoxColor() { return this.boxColor || THEME_GRADE_COLOR },
		resolvedMedianColor() { return this.medianColor || THEME_GRADE_COLOR },
		resolvedEndpointColor() { return this.endpointColor || '#94A3B8' },
		resolvedAxisColor() { return this.axisColor || '' },
		resolvedBoxBorderColor() { return this.boxBorderColor || '' },
		axisStyle() {
			if (!this.resolvedAxisColor) return {}
			return { backgroundColor: this.resolvedAxisColor }
		},
		leftWhiskerStyle() {
			const min = Math.max(0, this.toNum(this.min) ?? 0)
			const q1 = Math.max(0, this.toNum(this.q1) ?? 0)
			const pMin = this.scoreToPosition(min)
			const pQ1 = this.scoreToPosition(q1)
			const w = Math.max(0, pQ1 - pMin)
			return {
				left: pMin + '%',
				width: w + '%',
				backgroundColor: this.resolvedWhiskerColor
			}
		},
		boxStyle() {
			const q1 = Math.max(0, Math.min(100, this.toNum(this.q1) ?? 0))
			const q3 = Math.max(0, Math.min(100, this.toNum(this.q3) ?? 0))
			const pQ1 = this.scoreToPosition(q1)
			const pQ3 = this.scoreToPosition(q3)
			const left = Math.min(pQ1, pQ3)
			const w = Math.max(0, Math.abs(pQ3 - pQ1))
			const style = {
				left: left + '%',
				width: w + '%',
				backgroundColor: this.resolvedBoxColor
			}
			if (this.resolvedBoxBorderColor) {
				style.borderLeft = '1px solid ' + this.resolvedBoxBorderColor
				style.borderRight = '1px solid ' + this.resolvedBoxBorderColor
			}
			return style
		},
		medianStyle() {
			const median = Math.max(0, Math.min(100, this.toNum(this.median) ?? 0))
			return {
				left: this.scoreToPosition(median) + '%',
				backgroundColor: this.resolvedMedianColor
			}
		},
		/** 中位数展示文案（保留一位小数） */
		medianDisplayText() {
			const m = this.toNum(this.median)
			if (m == null || Number.isNaN(m)) return ''
			const n = Math.max(0, Math.min(100, m))
			return Number(n) === Math.floor(n) ? String(Math.round(n)) : n.toFixed(1)
		},
		/** 中位数标注定位（与中位数线对齐，居中） */
		medianLabelStyle() {
			const median = Math.max(0, Math.min(100, this.toNum(this.median) ?? 0))
			return {
				left: this.scoreToPosition(median) + '%',
				transform: 'translateX(-50%)',
				color: this.resolvedMedianColor
			}
		},
		rightWhiskerStyle() {
			const q3 = Math.max(0, this.toNum(this.q3) ?? 0)
			const max = Math.min(100, this.toNum(this.max) ?? 100)
			const pQ3 = this.scoreToPosition(q3)
			const pMax = this.scoreToPosition(max)
			const w = Math.max(0, pMax - pQ3)
			return {
				left: pQ3 + '%',
				width: w + '%',
				backgroundColor: this.resolvedWhiskerColor
			}
		},
		/** 是否有有效评分（0–5）用于在轨道上显示 */
		hasRating() {
			const r = this.normalizedRating
			return r != null && !Number.isNaN(r)
		},
		/** 评分 0–5 规整 */
		normalizedRating() {
			const v = this.rating
			if (v == null || v === '') return null
			const n = Number(v)
			if (Number.isNaN(n)) return null
			return Math.max(0, Math.min(5, n))
		},
		/** 评分换算为百分制（用于在 0–100 轴上定位） */
		rating100() {
			const r = this.normalizedRating
			return r == null ? null : r * 20
		},
		/** 评分文案样式（居中于评分位置） */
		ratingLabelStyle() {
			const r100 = this.rating100
			if (r100 == null) return {}
			const left = this.scoreToPosition(r100)
			return {
				left: left + '%',
				transform: 'translateX(-50%)',
				color: THEME_RATING_COLOR
			}
		},
		/** 评分展示文案（保留一位小数） */
		ratingDisplayText() {
			const r = this.normalizedRating
			if (r == null || Number.isNaN(r)) return ''
			return Number(r) === Math.floor(r) ? String(Math.round(r)) : r.toFixed(1)
		},
		hasMin() {
			return this.toNum(this.min) != null && !Number.isNaN(this.toNum(this.min))
		},
		hasMax() {
			return this.toNum(this.max) != null && !Number.isNaN(this.toNum(this.max))
		},
		hasAvg() {
			return this.toNum(this.avg) != null && !Number.isNaN(this.toNum(this.avg))
		},
		hasMedian() {
			return this.toNum(this.median) != null && !Number.isNaN(this.toNum(this.median))
		},
		hasQ1() {
			return this.toNum(this.q1) != null && !Number.isNaN(this.toNum(this.q1))
		},
		hasQ3() {
			return this.toNum(this.q3) != null && !Number.isNaN(this.toNum(this.q3))
		},
		/** 固定刻度值：只显示成绩的最小值和最大值 */
		fixedScaleValues() {
			const min = this.toNum(this.min)
			const max = this.toNum(this.max)
			const values = []
			if (min != null && !Number.isNaN(min)) values.push(Math.round(min))
			if (max != null && !Number.isNaN(max) && Math.round(max) !== Math.round(min)) values.push(Math.round(max))
			return values
		},
		/** 去重后的数据值列表（showDataValues 模式用），避免重叠 */
		dedupedDataValues() {
			const vals = this.hideEndpoints
				? [this.toNum(this.q1), this.toNum(this.median), this.toNum(this.q3)]
				: [this.toNum(this.min), this.toNum(this.q1), this.toNum(this.median), this.toNum(this.q3), this.toNum(this.max)]
			const valid = vals.filter(v => v != null && !Number.isNaN(v))
			if (valid.length === 0) return []
			// 去重：相同分数只保留一个
			const seen = new Set()
			const unique = []
			for (const v of valid) {
				const label = this.formatScore(v)
				if (!seen.has(label)) {
					seen.add(label)
					unique.push({ score: v, label, pos: this.scoreToPosition(v) })
				}
			}
			// 按位置排序后，移除位置过近的值（< 8% 间距时跳过中间值，保留首尾）
			unique.sort((a, b) => a.pos - b.pos)
			if (unique.length <= 2) return unique
			const result = [unique[0]]
			for (let i = 1; i < unique.length; i++) {
				const prev = result[result.length - 1]
				if (unique[i].pos - prev.pos < 8) {
					// 太近了：如果是最后一个则替换，否则跳过
					if (i === unique.length - 1) result.push(unique[i])
				} else {
					result.push(unique[i])
				}
			}
			return result
		},
		/** 平均分竖线样式（与中位数不同颜色） */
		avgLineStyle() {
			const a = Math.max(0, Math.min(100, this.toNum(this.avg) ?? 0))
			return {
				left: this.scoreToPosition(a) + '%',
				backgroundColor: THEME_RATING_COLOR
			}
		},
		/** 平均分标注：数轴上方 */
		avgLabelStyle() {
			const a = Math.max(0, Math.min(100, this.toNum(this.avg) ?? 0))
			return {
				left: this.scoreToPosition(a) + '%',
				transform: 'translateX(-50%)',
				color: THEME_RATING_COLOR
			}
		}
	},
	methods: {
		/**
		 * 分数 → 视觉位置（%）
		 * V2 规格：0-60 占 15%，60-100 占 85%
		 * 默认（非 showFixedScale）：0-75 占 25%，75-100 占 75%
		 */
		scoreToPosition(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return 0
			if (this.showFixedScale) {
				// V2 设计：0-60 压缩至 15%，60-100 拉伸至 85%
				if (s <= 60) return (s / 60) * 15
				return 15 + ((s - 60) / 40) * 85
			}
			// 默认模式（详情页等）：0-75 占 25%，75-100 占 75%
			if (s <= 75) return (s / 75) * 25
			return 25 + ((s - 75) / 25) * 75
		},
		toNum(v) {
			if (v == null || v === '') return null
			const n = Number(v)
			return Number.isNaN(n) ? null : n
		},
		/** 刻度 0/75/100 的定位样式（垂直由 CSS --on-axis 控制） */
		scaleTickStyle(score) {
			const p = this.scoreToPosition(score)
			return { left: p + '%' }
		},
		/** 四统计量标注的定位样式（轨道下方） */
		statLabelStyle(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return {}
			const p = this.scoreToPosition(s)
			return {
				left: p + '%',
				transform: 'translateX(-50%)',
				color: THEME_GRADE_COLOR
			}
		},
		/** 端点圆点定位（showDataValues 模式） */
		endpointStyle(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return {}
			return { left: this.scoreToPosition(s) + '%', backgroundColor: this.resolvedEndpointColor }
		},
		/** 数据值标注定位（showDataValues 模式，轴下方） */
		dataValueStyle(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return {}
			return {
				left: this.scoreToPosition(s) + '%',
				transform: 'translateX(-50%)'
			}
		},
		/** Q1/Q3 标注定位（箱体上方） */
		quartileLabelStyle(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return {}
			return {
				left: this.scoreToPosition(s) + '%',
				transform: 'translateX(-50%)'
			}
		},
		/** 分数展示文案（与中位数一致：整数不小数，否则一位小数） */
		formatScore(v) {
			if (v == null || Number.isNaN(v)) return ''
			const n = Math.max(0, Math.min(100, v))
			return Number(n) === Math.floor(n) ? String(Math.round(n)) : n.toFixed(1)
		}
	}
}
</script>

<style scoped>
.score-boxplot {
	display: flex;
	align-items: center;
	gap: 10rpx;
}
.score-boxplot__label {
	font-size: 24rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	flex-shrink: 0;
	width: 120rpx;
}
.score-boxplot__track {
	flex: 1;
	position: relative;
	height: 36rpx;
	min-width: 0;
	overflow: visible;
	padding-top: 20rpx;
	padding-bottom: 2rpx;
}
.score-boxplot__track--detail {
	padding-bottom: 36rpx;
}
.score-boxplot__median-label {
	position: absolute;
	top: 0rpx;
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
/* Q1/Q3 四分位标注：箱体上方，浅灰色 */
.score-boxplot__quartile-label {
	position: absolute;
	top: -20rpx;
	font-size: 18rpx;
	line-height: 1;
	color: var(--color-text-secondary);
	white-space: nowrap;
	z-index: 2;
}
.score-boxplot__axis {
	position: absolute;
	left: 0;
	right: 0;
	top: 50%;
	height: 2rpx;
	margin-top: -1rpx;
	background: var(--color-border);
	border-radius: 1rpx;
}
.score-boxplot__whisker {
	position: absolute;
	top: 50%;
	height: 2rpx;
	margin-top: -1rpx;
	border-radius: 1rpx;
}
.score-boxplot__box {
	position: absolute;
	top: 50%;
	height: 28rpx;
	margin-top: -14rpx;
	border-radius: 4rpx;
}
/* 中位数竖线：仅比箱体略高，居中于轨道 */
.score-boxplot__median {
	position: absolute;
	top: 50%;
	height: 40rpx;
	margin-top: -20rpx;
	width: 4rpx;
	margin-left: -2rpx;
	border-radius: 2rpx;
	z-index: 1;
}
/* 评分数字标注：详情模式在轨道下方，列表模式在轨道上方 */
.score-boxplot__rating-label {
	position: absolute;
	bottom: -10rpx;
	font-size: 18rpx;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
.score-boxplot__rating-label--above {
	bottom: auto;
	top: -8rpx;
	font-size: 20rpx;
}
.score-boxplot__scale-tick {
	position: absolute;
	top: -24rpx;
	font-size: 20rpx;
	line-height: 1;
	color: var(--app-color-text-tertiary, #8794A8);
	white-space: nowrap;
	z-index: 2;
}
/* 刻度标在数轴上，极小标签 */
.score-boxplot__scale-tick--on-axis {
	top: 50%;
	margin-top: -2rpx;
	transform: translate(-50%, -50%);
	font-size: 14rpx;
	color: var(--app-color-text-tertiary, #8794A8);
}
/* 平均分竖线（与中位数线同结构，颜色由内联样式区分） */
.score-boxplot__avg-line {
	position: absolute;
	top: 20%;
	bottom: 20%;
	width: 4rpx;
	margin-left: -2rpx;
	border-radius: 2rpx;
	z-index: 1;
}
/* 平均分标注：数轴上方 */
.score-boxplot__avg-label {
	position: absolute;
	top: -8rpx;
	font-size: 20rpx;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
.score-boxplot__stat-label {
	position: absolute;
	bottom: -28rpx;
	font-size: 18rpx;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
/* 最高/最低靠近数轴 */
.score-boxplot__stat-label--minmax {
	bottom: -12rpx;
}
/* showDataValues 模式：轨道下方留空间 */
.score-boxplot__track--data-values {
	padding-bottom: 44rpx;
}
/* 端点圆点 */
.score-boxplot__endpoint {
	position: absolute;
	top: 50%;
	width: 8rpx;
	height: 8rpx;
	margin-left: -4rpx;
	margin-top: -4rpx;
	border-radius: 50%;
	z-index: 2;
}
/* 数据值标注 */
.score-boxplot__data-value {
	position: absolute;
	bottom: 0;
	font-size: 18rpx;
	line-height: 1;
	color: var(--color-text-secondary);
	white-space: nowrap;
	z-index: 2;
}
.score-boxplot__empty {
	font-size: 24rpx;
	color: var(--app-color-text-tertiary, #8794A8);
	flex: 1;
}
</style>
