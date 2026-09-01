<template>
	<view class="score-violin">
		<text v-if="label" class="score-violin__label">{{ label }}</text>
		<view v-if="hasValidData" class="score-violin__track">
			<view class="score-violin__canvas-wrap" :id="canvasWrapId" @tap="onWrapTap">
				<canvas
					:canvas-id="canvasId"
					:id="canvasId"
					class="score-violin__canvas"
					:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
					:width="canvasWidth"
					:height="canvasHeight"
				/>
			</view>
			<!-- 平均分标注：数轴上方 -->
			<text v-if="hasAvg" class="score-violin__avg-label" :style="avgLabelStyle">平均 {{ formatScore(toNum(avg)) }}</text>
			<!-- 最低/最高靠近数轴，中位在下方 -->
			<text v-if="hasMin" class="score-violin__stat-label score-violin__stat-label--minmax" :style="statLabelStyle(toNum(min))">最低 {{ formatScore(toNum(min)) }}</text>
			<text v-if="hasMax" class="score-violin__stat-label score-violin__stat-label--minmax" :style="statLabelStyle(toNum(max))">最高 {{ formatScore(toNum(max)) }}</text>
			<text v-if="hasMedian" class="score-violin__stat-label" :style="statLabelStyle(toNum(median))">中位 {{ formatScore(toNum(median)) }}</text>
		</view>
		<text v-else class="score-violin__empty">暂无</text>
	</view>
</template>

<script>
import { THEME_GRADE_COLOR, THEME_RATING_COLOR } from '@/utils/themeScoreRating.js'

const ORDERED_RANGES = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
const MIDPOINTS = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]

export default {
	name: 'ScoreViolin',
	props: {
		/** 成绩分布（与详情页 API 一致：{ '0-59': n, '60-69': n, ... }） */
		distribution: { type: Object, default: () => null },
		/** 最低分（0–100） */
		min: { type: Number, default: null },
		/** 最高分（0–100） */
		max: { type: Number, default: null },
		/** 平均分（0–100） */
		avg: { type: Number, default: null },
		/** 中位数（0–100） */
		median: { type: Number, default: null },
		/** 左侧文案 */
		label: { type: String, default: '' }
	},
	data() {
		return {
			canvasId: 'scoreViolinCanvas_' + Math.random().toString(36).slice(2, 9),
			canvasWrapId: 'scoreViolinWrap_' + Math.random().toString(36).slice(2, 9),
			canvasWidth: 300,
			canvasHeight: 60,
			drawDone: false
		}
	},
	computed: {
		/** 是否有有效分布数据 */
		hasValidData() {
			const dist = this.distribution
			if (!dist || typeof dist !== 'object') return false
			const counts = ORDERED_RANGES.map(r => Number(dist[r]) || 0)
			const total = counts.reduce((a, b) => a + b, 0)
			return total > 0
		},
		/** 各桶 (midpoint, count)，用于绘图 */
		violinPoints() {
			const dist = this.distribution
			if (!dist || typeof dist !== 'object') return []
			const counts = ORDERED_RANGES.map(r => Number(dist[r]) || 0)
			const maxCount = Math.max(...counts, 1)
			return MIDPOINTS.map((mid, i) => ({
				score: mid,
				count: counts[i],
				normalized: counts[i] / maxCount
			}))
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
		avgLabelStyle() {
			const a = Math.max(0, Math.min(100, this.toNum(this.avg) ?? 0))
			return {
				left: this.scoreToPosition(a) + '%',
				transform: 'translateX(-50%)',
				color: THEME_RATING_COLOR
			}
		}
	},
	watch: {
		distribution: { handler: 'scheduleDraw', deep: true },
		min: 'scheduleDraw',
		max: 'scheduleDraw',
		avg: 'scheduleDraw',
		median: 'scheduleDraw'
	},
	mounted() {
		this.scheduleDraw()
	},
	methods: {
		scoreToPosition(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			if (Number.isNaN(s)) return 0
			if (s <= 75) return (s / 75) * 25
			return 25 + ((s - 75) / 25) * 75
		},
		toNum(v) {
			if (v == null || v === '') return null
			const n = Number(v)
			return Number.isNaN(n) ? null : n
		},
		formatScore(v) {
			if (v == null || Number.isNaN(v)) return ''
			const n = Math.max(0, Math.min(100, v))
			return Number(n) === Math.floor(n) ? String(Math.round(n)) : n.toFixed(1)
		},
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
		scheduleDraw() {
			if (!this.hasValidData) return
			this.$nextTick(() => this.measureAndDraw())
		},
		onWrapTap() {
			// 点击容器时重新测量并绘制（解决部分机型 canvas 未就绪）
			if (this.hasValidData && !this.drawDone) this.measureAndDraw()
		},
		measureAndDraw() {
			const query = uni.createSelectorQuery().in(this)
			query.select('#' + this.canvasWrapId)
				.boundingClientRect(rect => {
					if (!rect || rect.width <= 0) return
					const w = Math.floor(rect.width)
					const h = Math.min(80, Math.max(48, Math.floor(rect.height || 60)))
					this.canvasWidth = w
					this.canvasHeight = h
					this.$nextTick(() => this.draw())
				})
				.exec()
		},
		draw() {
			const points = this.violinPoints
			if (!points.length) return
			const w = this.canvasWidth
			const h = this.canvasHeight
			const centerY = h / 2
			const maxHalfWidth = (h / 2) * 0.85

			const ctx = uni.createCanvasContext(this.canvasId, this)
			if (!ctx) return

			// 1) 小提琴填充：左半 → 上缘 → 右半 → 下缘 → 闭合
			const topPoints = []
			const bottomPoints = []
			for (let i = 0; i < points.length; i++) {
				const x = (this.scoreToPosition(points[i].score) / 100) * w
				const halfW = points[i].normalized * maxHalfWidth
				topPoints.push({ x, y: centerY - halfW })
				bottomPoints.push({ x, y: centerY + halfW })
			}
			const x0 = topPoints[0].x
			const x1 = topPoints[topPoints.length - 1].x
			ctx.beginPath()
			ctx.moveTo(x0, centerY)
			topPoints.forEach(p => ctx.lineTo(p.x, p.y))
			ctx.lineTo(x1, centerY)
			bottomPoints.slice().reverse().forEach(p => ctx.lineTo(p.x, p.y))
			ctx.closePath()
			ctx.setFillStyle(THEME_GRADE_COLOR)
			ctx.setGlobalAlpha(0.85)
			ctx.fill()
			ctx.setGlobalAlpha(1)

			// 2) 中央横线（数轴）
			ctx.beginPath()
			ctx.moveTo(0, centerY)
			ctx.lineTo(w, centerY)
			ctx.setStrokeStyle('#e8e8e8')
			ctx.setLineWidth(1)
			ctx.stroke()

			// 3) 中位数竖线
			const med = this.toNum(this.median)
			if (med != null && !Number.isNaN(med)) {
				const px = (this.scoreToPosition(med) / 100) * w
				ctx.beginPath()
				ctx.moveTo(px, centerY - maxHalfWidth)
				ctx.lineTo(px, centerY + maxHalfWidth)
				ctx.setStrokeStyle(THEME_GRADE_COLOR)
				ctx.setLineWidth(2)
				ctx.stroke()
			}

			// 4) 平均分竖线（不同颜色）
			const avgVal = this.toNum(this.avg)
			if (avgVal != null && !Number.isNaN(avgVal)) {
				const px = (this.scoreToPosition(avgVal) / 100) * w
				ctx.beginPath()
				ctx.moveTo(px, centerY - maxHalfWidth)
				ctx.lineTo(px, centerY + maxHalfWidth)
				ctx.setStrokeStyle(THEME_RATING_COLOR)
				ctx.setLineWidth(2)
				ctx.stroke()
			}

			ctx.draw(true, () => {
				this.drawDone = true
			})
		}
	}
}
</script>

<style scoped>
.score-violin {
	display: flex;
	align-items: center;
	gap: 10rpx;
}
.score-violin__label {
	font-size: 24rpx;
	color: #666;
	flex-shrink: 0;
	width: 120rpx;
}
.score-violin__track {
	flex: 1;
	position: relative;
	min-height: 80rpx;
	min-width: 0;
	overflow: visible;
	padding-top: 28rpx;
	padding-bottom: 36rpx;
}
.score-violin__canvas-wrap {
	width: 100%;
	height: 80rpx;
	position: relative;
}
.score-violin__canvas {
	display: block;
	width: 100%;
	height: 80rpx;
}
.score-violin__avg-label {
	position: absolute;
	top: -8rpx;
	font-size: 20rpx;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
.score-violin__stat-label {
	position: absolute;
	bottom: -28rpx;
	font-size: 18rpx;
	line-height: 1;
	white-space: nowrap;
	z-index: 2;
}
.score-violin__stat-label--minmax {
	bottom: -12rpx;
}
.score-violin__empty {
	font-size: 24rpx;
	color: #999;
	flex: 1;
}
</style>
