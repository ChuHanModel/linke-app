<template>
	<view class="mean-std-chart">
		<view v-if="!hasData" class="mean-std-chart__empty">暂无数据</view>
		<view v-else class="mean-std-chart__wrap">
			<view class="mean-std-chart__canvas-wrap" :id="canvasWrapId" @tap="onWrapTap">
				<canvas
					:canvas-id="canvasId"
					:id="canvasId"
					class="mean-std-chart__canvas"
					:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
					:width="canvasWidth"
					:height="canvasHeight"
				/>
			</view>
			<!-- 平均分、68% 集中区 文案用 view 叠在图上，避免 canvas 字体兼容问题 -->
			<text v-if="meanNum != null" class="mean-std-chart__mean-label" :style="meanLabelStyle">平均分</text>
			<text class="mean-std-chart__zone-label" :style="zoneLabelStyle">68% 集中区</text>
		</view>
	</view>
</template>

<script>
import { THEME_GRADE_COLOR } from '@/utils/themeScoreRating.js'

const ORDERED_RANGES = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
const MIDPOINTS = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]

const PAD_LEFT = 12
const PAD_RIGHT = 12
const PAD_TOP = 20
const PAD_BOTTOM = 28
const ZONE_COLOR = 'rgba(65, 151, 254, 0.2)'

export default {
	name: 'MeanStdChart',
	props: {
		distribution: { type: Object, default: () => null },
		mean: { type: [Number, String], default: null },
		stdDev: { type: Number, default: null }
	},
	data() {
		return {
			canvasId: 'meanStdCanvas_' + Math.random().toString(36).slice(2, 9),
			canvasWrapId: 'meanStdWrap_' + Math.random().toString(36).slice(2, 9),
			canvasWidth: 320,
			canvasHeight: 200,
			drawDone: false
		}
	},
	computed: {
		hasData() {
			const dist = this.distribution
			if (!dist || typeof dist !== 'object') return false
			const total = ORDERED_RANGES.reduce((sum, r) => sum + (Number(dist[r]) || 0), 0)
			const m = this.meanNum
			const sd = this.stdDev
			return total > 0 && m != null && !Number.isNaN(m) && sd != null && !Number.isNaN(sd)
		},
		meanNum() {
			if (this.mean == null || this.mean === '') return null
			const n = Number(this.mean)
			return Number.isNaN(n) ? null : n
		},
		chartData() {
			const dist = this.distribution
			if (!dist || typeof dist !== 'object') return []
			return ORDERED_RANGES.map((range, i) => ({
				mid: MIDPOINTS[i],
				count: Number(dist[range]) || 0
			}))
		},
		meanLabelStyle() {
			const m = this.meanNum
			if (m == null) return {}
			const pct = Math.max(0, Math.min(100, m)) / 100
			return {
				left: (PAD_LEFT + pct * (this.canvasWidth - PAD_LEFT - PAD_RIGHT)) + 'px',
				transform: 'translateX(-50%)',
				top: (PAD_TOP - 4) + 'px'
			}
		},
		zoneLabelStyle() {
			const m = this.meanNum
			const sd = this.stdDev
			if (m == null || sd == null) return {}
			const low = Math.max(0, m - sd)
			const high = Math.min(100, m + sd)
			const leftPct = low / 100
			const widthPct = (high - low) / 100
			const chartW = this.canvasWidth - PAD_LEFT - PAD_RIGHT
			return {
				left: (PAD_LEFT + leftPct * chartW) + 'px',
				width: (widthPct * chartW) + 'px',
				top: (this.canvasHeight - PAD_BOTTOM + 4) + 'px'
			}
		}
	},
	watch: {
		distribution: { handler: 'scheduleDraw', deep: true },
		mean: 'scheduleDraw',
		stdDev: 'scheduleDraw'
	},
	mounted() {
		this.scheduleDraw()
	},
	methods: {
		scoreToX(score) {
			const s = Math.max(0, Math.min(100, Number(score)))
			const w = this.canvasWidth
			return PAD_LEFT + (s / 100) * (w - PAD_LEFT - PAD_RIGHT)
		},
		scheduleDraw() {
			if (!this.hasData) return
			this.$nextTick(() => this.measureAndDraw())
		},
		onWrapTap() {
			if (this.hasData && !this.drawDone) this.measureAndDraw()
		},
		measureAndDraw() {
			const query = uni.createSelectorQuery().in(this)
			query.select('#' + this.canvasWrapId)
				.boundingClientRect(rect => {
					if (!rect || rect.width <= 0) {
						// App 端首帧可能拿不到节点，延迟重试一次
						if (!this._measureRetried) {
							this._measureRetried = true
							setTimeout(() => this.measureAndDraw(), 150)
						}
						return
					}
					this._measureRetried = false
					const w = Math.floor(rect.width)
					const h = Math.min(220, Math.max(160, Math.floor(rect.height || 200)))
					this.canvasWidth = w
					this.canvasHeight = h
					this.$nextTick(() => this.draw())
				})
				.exec()
		},
		draw() {
			if (!this.hasData) return
			const ctx = uni.createCanvasContext(this.canvasId, this)
			if (!ctx) return

			const w = this.canvasWidth
			const h = this.canvasHeight
			const chartLeft = PAD_LEFT
			const chartRight = w - PAD_RIGHT
			const chartTop = PAD_TOP
			const chartBottom = h - PAD_BOTTOM
			const chartW = chartRight - chartLeft
			const chartH = chartBottom - chartTop

			const data = this.chartData
			const maxCount = Math.max(1, ...data.map(d => d.count))
			const mean = Number(this.meanNum)
			const stdDev = Number(this.stdDev)
			const low = Math.max(0, mean - stdDev)
			const high = Math.min(100, mean + stdDev)

			// 1) 68% 集中区阴影
			const xLow = this.scoreToX(low)
			const xHigh = this.scoreToX(high)
			ctx.setFillStyle(ZONE_COLOR)
			ctx.fillRect(xLow, chartTop, xHigh - xLow, chartH)

			// 2) 柱状图：每段用区间中点占宽，柱宽为区间占满的 70%
			const barGap = chartW / 10 * 0.3
			const barWidth = chartW / 10 * 0.7
			for (let i = 0; i < data.length; i++) {
				const mid = data[i].mid
				const count = data[i].count
				const xCenter = this.scoreToX(mid)
				const barHeight = (count / maxCount) * chartH
				const left = xCenter - barWidth / 2
				const top = chartBottom - barHeight
				ctx.setFillStyle(THEME_GRADE_COLOR)
				ctx.fillRect(left, top, barWidth, barHeight)
			}

			// 3) 平均分竖线
			const xMean = this.scoreToX(mean)
			ctx.beginPath()
			ctx.moveTo(xMean, chartTop)
			ctx.lineTo(xMean, chartBottom)
			ctx.setStrokeStyle('#333')
			ctx.setLineWidth(2)
			ctx.stroke()

			// 4) 横轴
			ctx.beginPath()
			ctx.moveTo(chartLeft, chartBottom)
			ctx.lineTo(chartRight, chartBottom)
			ctx.setStrokeStyle('#e0e0e0')
			ctx.setLineWidth(1)
			ctx.stroke()

			ctx.draw(true, () => {
				this.drawDone = true
			})
		}
	}
}
</script>

<style scoped>
.mean-std-chart {
	width: 100%;
	min-height: 200px;
	position: relative;
}
.mean-std-chart__empty {
	padding: 24rpx 0;
	text-align: center;
	font-size: 26rpx;
	color: #999;
}
.mean-std-chart__wrap {
	position: relative;
	width: 100%;
	min-height: 200px;
}
.mean-std-chart__canvas-wrap {
	width: 100%;
	height: 200px;
}
.mean-std-chart__canvas {
	display: block;
	width: 100%;
	height: 200px;
}
.mean-std-chart__mean-label {
	position: absolute;
	font-size: 20rpx;
	line-height: 1;
	color: #333;
	white-space: nowrap;
	z-index: 2;
	pointer-events: none;
}
.mean-std-chart__zone-label {
	position: absolute;
	left: 0;
	text-align: center;
	font-size: 18rpx;
	line-height: 1;
	color: #666;
	z-index: 2;
	pointer-events: none;
}
</style>
