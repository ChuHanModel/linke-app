<template>
	<view v-if="hasData" class="score-summary-card">
		<view class="score-summary-card__left">
			<text class="score-summary-card__avg-value">{{ formatMean }}</text>
			<text class="score-summary-card__avg-unit">分</text>
		</view>
		<view class="score-summary-card__right">
			<view class="score-summary-card__bar-wrap">
				<view class="score-summary-card__track">
					<!-- 进度条色块：表示 [μ-σ, μ+σ] 区间 -->
					<view
						class="score-summary-card__segment"
						:style="segmentStyle"
					></view>
					<!-- 重心点：平均分位置 -->
					<view
						class="score-summary-card__center-dot"
						:style="centerDotStyle"
					></view>
				</view>
			</view>
			<text class="score-summary-card__eval">{{ evaluationPhrase }}</text>
		</view>
	</view>
</template>

<script>
import { THEME_GRADE_COLOR } from '@/utils/themeScoreRating.js'

const ORDERED_RANGES = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
const MIDPOINTS = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]

/** 根据 distribution 与 avgScore 计算标准差 σ */
function calcStdDev(dist, n, mu) {
	if (!dist || typeof dist !== 'object' || n <= 0 || mu == null || Number.isNaN(mu)) return null
	let sumSq = 0
	for (let i = 0; i < ORDERED_RANGES.length; i++) {
		const count = Number(dist[ORDERED_RANGES[i]]) || 0
		sumSq += count * Math.pow(MIDPOINTS[i] - mu, 2)
	}
	const variance = sumSq / n
	const sigma = Math.sqrt(variance)
	return Number.isNaN(sigma) ? null : sigma
}

export default {
	name: 'ScoreSummaryCard',
	props: {
		/** 成绩分布，与 scoreStats.distribution 同结构 */
		distribution: { type: Object, default: () => null },
		/** 平均分（0–100） */
		mean: { type: [Number, String], default: null }
	},
	computed: {
		meanNum() {
			if (this.mean == null || this.mean === '') return null
			const n = Number(this.mean)
			return Number.isNaN(n) ? null : n
		},
		n() {
			if (!this.distribution || typeof this.distribution !== 'object') return 0
			return ORDERED_RANGES.reduce((sum, r) => sum + (Number(this.distribution[r]) || 0), 0)
		},
		stdDev() {
			const dist = this.distribution
			const n = this.n
			const mu = this.meanNum
			return calcStdDev(dist, n, mu)
		},
		hasData() {
			const total = this.n
			const m = this.meanNum
			const sd = this.stdDev
			return total > 0 && m != null && !Number.isNaN(m) && sd != null && !Number.isNaN(sd)
		},
		formatMean() {
			const m = this.meanNum
			if (m == null) return '—'
			const n = Number(m)
			return Number.isInteger(n) ? String(n) : n.toFixed(1)
		},
		/** 进度条色块：left% 与 width%，对应 [μ-σ, μ+σ] 在 0–100 中的占比 */
		segmentStyle() {
			const mean = this.meanNum
			const sd = this.stdDev
			if (mean == null || sd == null) return {}
			const low = Math.max(0, mean - sd) / 100
			const high = Math.min(100, mean + sd) / 100
			const left = low * 100
			const width = (high - low) * 100
			return {
				left: left + '%',
				width: width + '%',
				backgroundColor: THEME_GRADE_COLOR
			}
		},
		/** 重心点：平均分在 0–100 上的位置 */
		centerDotStyle() {
			const mean = this.meanNum
			if (mean == null) return {}
			const pct = Math.max(0, Math.min(100, Number(mean))) / 100 * 100
			return {
				left: pct + '%',
				backgroundColor: THEME_GRADE_COLOR
			}
		},
		/** 根据标准差大小匹配教学评价语 */
		evaluationPhrase() {
			const sd = this.stdDev
			if (sd == null || Number.isNaN(sd)) return ''
			if (sd <= 6) return '分布均匀'
			if (sd >= 14) return '两极分化'
			return '存在断层'
		}
	}
}
</script>

<style scoped>
.score-summary-card {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-top: 20rpx;
	padding: 24rpx 24rpx 28rpx;
	background: var(--app-color-card, #fff);
	border-radius: 20rpx;
	border: 1rpx solid var(--app-color-border, #E0E7F0);
}
.score-summary-card__left {
	display: flex;
	align-items: baseline;
	flex-shrink: 0;
	margin-right: 24rpx;
}
.score-summary-card__avg-value {
	font-size: 56rpx;
	font-weight: 700;
	color: var(--app-color-text, #162033);
	line-height: 1.2;
}
.score-summary-card__avg-unit {
	font-size: 28rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	margin-left: 4rpx;
}
.score-summary-card__right {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 12rpx;
}
.score-summary-card__bar-wrap {
	width: 100%;
}
.score-summary-card__track {
	position: relative;
	width: 100%;
	height: 24rpx;
	background: var(--app-color-surface-muted, #FAFBFE);
	border: 1rpx solid var(--app-color-border, #E0E7F0);
	border-radius: 12rpx;
	overflow: visible;
}
.score-summary-card__segment {
	position: absolute;
	top: 0;
	height: 100%;
	border-radius: 12rpx;
	transition: left 0.2s ease, width 0.2s ease;
}
.score-summary-card__center-dot {
	position: absolute;
	top: 50%;
	width: 8rpx;
	height: 8rpx;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	box-shadow: 0 0 0 2rpx #fff;
	transition: left 0.2s ease;
}
.score-summary-card__eval {
	font-size: 24rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	text-align: right;
}
</style>
