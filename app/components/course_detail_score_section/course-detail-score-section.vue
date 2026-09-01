<template>
	<view class="stitch-score-section">
		<view v-if="loading" class="stitch-score-loading">加载成绩分布中...</view>
		<view v-else-if="scoreStats && scoreStats.count !== undefined" class="stitch-score-card">
			<view v-if="scoreStats.count > 0 && scoreStats.distribution" class="stitch-score-chart">
				<view class="stitch-score-chart-shell">
					<view class="stitch-score-grid">
						<view
							v-for="(val, idx) in ordinate"
							:key="idx"
							class="stitch-score-grid-line"
							:class="{ 'stitch-score-grid-line--zero': val === 0 }"
							:style="{ top: (1 - val / ordinateMaxTick) * chartContentHeightRpx + 'rpx' }"
						>
							<text class="stitch-score-grid-label">{{ val }}人</text>
							<view class="stitch-score-grid-stroke"></view>
						</view>
					</view>
					<view class="stitch-score-columns" :style="{ height: chartContentHeightRpx + 'rpx' }">
						<template v-for="(item, idx) in distributionList" :key="'stitch-col-' + item.range">
							<text
								v-if="item.count > 0"
								class="stitch-score-column-ratio"
								:style="{ left: ((idx + 0.5) / distributionList.length * 100) + '%', bottom: ((item.barHeightRpx || 0) + 8) + 'rpx' }"
							>{{ item.ratio }}</text>
							<view
								v-if="item.count > 0"
								class="stitch-score-column-bar"
								:style="{ left: ((idx + 0.5) / distributionList.length * 100) + '%', height: (item.barHeightRpx || 0) + 'rpx' }"
							></view>
							<text
								class="stitch-score-column-label"
								:style="{ left: ((idx + 0.5) / distributionList.length * 100) + '%' }"
							>{{ item.label }}</text>
						</template>
					</view>
				</view>
			</view>
			<view v-else class="stitch-score-empty">暂无成绩分布数据</view>

			<view v-if="scoreStats.count > 0" class="stitch-score-summary">
				<view class="stitch-score-summary-item">
					<text class="stitch-score-summary-label">分数范围</text>
					<text class="stitch-score-summary-value">{{ displayRangeScore }}</text>
				</view>
				<view class="stitch-score-summary-item">
					<text class="stitch-score-summary-label">平均分</text>
					<text class="stitch-score-summary-value">{{ compactAvgScore }}</text>
				</view>
				<view class="stitch-score-summary-item">
					<text class="stitch-score-summary-label">中位数</text>
					<text class="stitch-score-summary-value">{{ compactMedianScore }}</text>
				</view>
			</view>
		</view>
		<view v-else class="stitch-score-empty">暂无主要分数</view>
	</view>
</template>

<script>

export default {
	name: 'CourseDetailScoreSection',
	props: {
		scoreStats: { type: Object, default: null },
		loading: { type: Boolean, default: true }
	},
	computed: {
		scoreCountText() {
			if (this.loading) return '·'
			if (this.scoreStats && this.scoreStats.count !== undefined && this.scoreStats.count !== null) return this.scoreStats.count + '人'
			return '0人'
		},
		/** 有多个分数段有数据时为真（非「合成分布」单一段） */
		hasMultiSegmentDistribution() {
			const list = this.distributionList
			if (!list || list.length === 0) return false
			const segmentsWithCount = list.filter((i) => Number(i.count) > 0).length
			return segmentsWithCount > 1
		},
		/** 最高分展示：优先用 API；仅当有多段真实分布时才从 distribution 推算，否则不冒充整课最高分 */
		displayMaxScore() {
			const s = this.scoreStats
			if (s && (s.maxScore != null && s.maxScore !== '')) return Number(s.maxScore) + '分'
			if (!this.hasMultiSegmentDistribution) return '—'
			const list = this.distributionList
			const upperBounds = [59, 69, 79, 82, 85, 88, 91, 94, 97, 100]
			for (let i = list.length - 1; i >= 0; i--) {
				if (list[i].count > 0) return upperBounds[i] + '分'
			}
			return '—'
		},
		/** 最低分展示：优先用 API；仅当有多段真实分布时才从 distribution 推算 */
		displayMinScore() {
			const s = this.scoreStats
			if (s && (s.minScore != null && s.minScore !== '')) return Number(s.minScore) + '分'
			if (!this.hasMultiSegmentDistribution) return '—'
			const list = this.distributionList
			const lowerBounds = [0, 60, 70, 80, 83, 86, 89, 92, 95, 98]
			for (let i = 0; i < list.length; i++) {
				if (list[i].count > 0) return lowerBounds[i] + '分'
			}
			return '—'
		},
		/** 平均分展示：优先用 API */
		displayAvgScore() {
			const s = this.scoreStats
			if (s && (s.avgScore != null && s.avgScore !== '')) return Number(s.avgScore) + '分'
			return '—'
		},
		/** 中位数展示：优先用 API；仅当有多段真实分布时才从 distribution 近似，否则不显示单一段中点 */
		displayMedianScore() {
			const s = this.scoreStats
			if (s && (s.medianScore != null && s.medianScore !== '')) return Number(s.medianScore) + '分'
			if (!this.hasMultiSegmentDistribution) return '—'
			const list = this.distributionList
			const total = (this.scoreStats && this.scoreStats.count) ? Number(this.scoreStats.count) : 0
			if (total <= 0) return '—'
			const midpoints = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]
			let cum = 0
			const half = total / 2
			for (let i = 0; i < list.length; i++) {
				cum += list[i].count
				if (cum >= half) return midpoints[i] + '分'
			}
			return midpoints[midpoints.length - 1] + '分'
		},
		displayRangeScore() {
			if (this.displayMinScore === '—' || this.displayMaxScore === '—') return '—'
			return `${this.displayMinScore.replace('分', '')}-${this.displayMaxScore.replace('分', '')}`
		},
		compactAvgScore() {
			return this.displayAvgScore === '—' ? '—' : this.displayAvgScore.replace('分', '')
		},
		compactMedianScore() {
			return this.displayMedianScore === '—' ? '—' : this.displayMedianScore.replace('分', '')
		},
		distributionList() {
			const dist = this.scoreStats && this.scoreStats.distribution
			if (!dist || typeof dist !== 'object') return []
			const orderedRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
			const total = this.scoreStats.count || 0
			// 兼容 key 为 0-59 或 0_59 等格式，避免只读到部分分段
			const getCount = (range) => Number(dist[range]) || Number(dist[range.replace(/-/g, '_')]) || 0
			const counts = orderedRanges.map(getCount)
			const maxCount = Math.max(...counts, 1)
			let step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 5)
			if (step < 1) step = 1
			const maxTick = Math.max(1, Math.ceil(maxCount / step) * step)
			const barMaxRpx = this.chartContentHeightRpx
			return orderedRanges.map((range, i) => {
				const count = counts[i]
				const ratio = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
				const barHeightRpx = maxTick > 0 ? (count / maxTick) * barMaxRpx : 0
				const label = range === '0-59' ? '不及格' : range
				return { range, count, ratio: ratio + '%', ratioRaw: ratio, barHeightRpx, label }
			})
		},
		ordinate() {
			const list = this.distributionList
			if (!list.length) return []
			const maxCount = Math.max(...list.map(i => i.count), 1)
			let step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 5)
			if (step < 1) step = 1
			const arr = []
			for (let v = Math.ceil(maxCount / step) * step; v >= step; v -= step) arr.push(v)
			arr.push(0)
			return arr
		},
		chartContentHeightRpx() {
			return 360
		},
		ordinateMaxTick() {
			const arr = this.ordinate
			return arr && arr.length > 0 ? arr[0] : 1
		},
		diagnosisStdDev() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return null
			if (typeof s.stdDev === 'number' && !Number.isNaN(s.stdDev)) return s.stdDev
			const dist = s.distribution
			const total = Number(s.count) || 0
			const mean = Number(s.avgScore)
			if (!dist || typeof dist !== 'object' || total <= 0 || (mean !== mean)) return null
			const orderedRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']
			const midpoints = [29.5, 64.5, 74.5, 81, 84, 87, 90, 93, 96, 99]
			let sumSq = 0
			for (let i = 0; i < orderedRanges.length; i++) {
				const c = Number(dist[orderedRanges[i]]) || 0
				sumSq += c * (midpoints[i] - mean) ** 2
			}
			return Math.sqrt(sumSq / total)
		},
		diagnostics() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return []
			if (Array.isArray(s.diagnostics) && s.diagnostics.length > 0) return s.diagnostics
			return this.diagnosticsFallback
		},
		diagnosticsVisual() {
			const s = this.scoreStats || {}
			const avg = Number(s.avgScore) || 0
			const median = Number(s.medianScore) || 0
			const sd = this.diagnosisStdDev
			const failRate = s.failRate != null ? Number(s.failRate) : null
			const iconMap = { water: 'lucide:gauge', shape: 'lucide:bar-chart-3', risk: 'lucide:alert-triangle', anomaly: 'lucide:activity' }
			const labelMap = { water: '水位', shape: '分布', risk: '风险', anomaly: '异常' }
			return this.diagnostics.map(item => {
				const out = {
					...item,
					iconName: iconMap[item.category] || 'lucide:info',
					categoryLabel: labelMap[item.category] || ''
				}
				switch (item.category) {
					case 'water':
						out.meterPos = Math.min(100, Math.max(0, avg))
						out.meterLabel = avg ? avg.toFixed(1) : ''
						break
					case 'shape':
						out.spreadPct = sd != null ? Math.min(95, Math.max(15, (sd / 30) * 100)) : 50
						break
					case 'risk':
						if (failRate != null) {
							const pct = failRate * 100
							out.riskBarW = Math.min(100, pct * 2)
							out.riskLabel = pct.toFixed(1) + '%'
						} else {
							out.riskBarW = 0
							out.riskLabel = '—'
						}
						break
					case 'anomaly':
						out.meanBarW = Math.min(100, Math.max(0, avg))
						out.medianBarW = Math.min(100, Math.max(0, median))
						out.meanLabel = avg ? avg.toFixed(1) : '—'
						out.medianLabel = median ? median.toFixed(1) : '—'
						out.gapLabel = (avg && median) ? Math.abs(avg - median).toFixed(1) : '—'
						break
				}
				return out
			})
		},
		diagnosticsFallback() {
			const s = this.scoreStats
			if (!s || (s.count != null && s.count === 0)) return []
			const mean = Number(s.avgScore)
			const median = Number(s.medianScore)
			const stdDev = this.diagnosisStdDev
			if (mean !== mean || median !== median || stdDev == null) return []
			const list = []
			if (mean >= 90) list.push({ conclusion: '普遍高分', description: '平均分在 90 分以上，整体属于好拿分的课。', category: 'water' })
			if (mean < 80) list.push({ conclusion: '普遍分偏低', description: '平均分低于 80 分，拿高分有一定挑战。', category: 'water' })
			if (stdDev < 12 && Math.abs(mean - median) <= 3) list.push({ conclusion: '分数比较整齐', description: '大多数同学的分数都在均值附近，表现相当。', category: 'shape' })
			if (stdDev > 20) list.push({ conclusion: '分数分散', description: '高分低分都有，差距比较大，没有明显的集中区间。', category: 'shape' })
			if (stdDev >= 12 && stdDev <= 18) list.push({ conclusion: '正常分布', description: '成绩有高有低，分布均匀，符合一般规律。', category: 'shape' })
			if (median > mean + 5) list.push({ conclusion: '少数低分拉低均值', description: '多数同学分数较高，平均分被少数极低分带下来了。', category: 'anomaly' })
			return list
		}
	},
}
</script>

<style scoped>
/* 成绩区块：独立合成层 + 布局包含，减少下方评价区加载时触发本区块重绘导致闪烁 */
.score-section {
	min-height: 340rpx;
	box-sizing: border-box;
	transform: translateZ(0);
	contain: layout;
}
.content-section {
	margin-top: 24rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid var(--app-color-border, #E0E7F0);
}
.content-section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--app-color-text, #162033);
	margin-bottom: 16rpx;
}
.score-overview-loading {
	font-size: 26rpx;
	color: var(--app-color-text-tertiary, #8794A8);
	padding: 40rpx 0;
	text-align: center;
}
.score-tab-inner {
	display: flex;
	flex-direction: column;
	gap: 0;
	padding: 0;
}
.score-tab-inner > .score-block-card:first-child {
	margin-top: 0;
}
.score-section-title {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--app-color-text, #162033);
	margin-bottom: 16rpx;
	display: block;
}
.score-block-card {
	background: var(--app-color-card, #fff);
	border-radius: 20rpx;
	border: 1rpx solid var(--app-color-border, #E0E7F0);
	overflow: hidden;
	margin-top: 32rpx;
}
/* ====== 课程诊断 ====== */
.score-diagnosis-card {
	padding: 24rpx;
}
.score-diagnosis-card .score-section-title {
	margin-bottom: 20rpx;
}
.diag-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}
.diag-item {
	border-radius: 16rpx;
	overflow: hidden;
	background: var(--app-color-surface-muted, #FAFBFE);
	border: 1rpx solid var(--app-color-border, #E0E7F0);
}
.diag-item-accent {
	height: 3rpx;
}
.diag-item-accent--water { background: var(--app-color-primary, #0056D2); }
.diag-item-accent--shape { background: #5B7CFA; }
.diag-item-accent--risk { background: var(--app-color-danger, #C93C3C); }
.diag-item-accent--anomaly { background: var(--app-color-warning, #C98A00); }
.diag-item-body {
	padding: 20rpx 24rpx 24rpx;
}
.diag-item-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10rpx;
}
.diag-item-title-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	flex: 1;
	min-width: 0;
}
.diag-item-icon {
	font-size: 30rpx;
	flex-shrink: 0;
}
.diag-item-icon--water { color: var(--app-color-primary, #0056D2); }
.diag-item-icon--shape { color: #5B7CFA; }
.diag-item-icon--risk { color: var(--app-color-danger, #C93C3C); }
.diag-item-icon--anomaly { color: var(--app-color-warning, #C98A00); }
.diag-item-conclusion {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--app-color-text, #162033);
}
.diag-item-tag {
	font-size: 20rpx;
	padding: 2rpx 14rpx;
	border-radius: 999rpx;
	font-weight: 500;
	flex-shrink: 0;
}
.diag-item-tag--water { background: var(--color-bg-tag); color: var(--app-color-primary, #0056D2); }
.diag-item-tag--shape { background: var(--color-bg-tag); color: #5B7CFA; }
.diag-item-tag--risk { background: var(--color-danger-bg); color: var(--app-color-danger, #C93C3C); }
.diag-item-tag--anomaly { background: var(--color-bg-tag); color: var(--app-color-warning, #C98A00); }
.diag-item-desc {
	font-size: 24rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	line-height: 1.5;
}
/* 可视化通用 */
.diag-vis {
	margin-top: 16rpx;
}
/* 水位 */
.vis-water-track {
	position: relative;
	height: 12rpx;
	border-radius: 999rpx;
	overflow: hidden;
	display: flex;
}
.vis-water-bar { flex: 1; }
.vis-water-bar--low { background: #e5eefc; }
.vis-water-bar--mid { background: #c9dcfb; }
.vis-water-bar--high { background: #9dc1fb; }
.vis-water-pin {
	position: absolute;
	top: 50%;
	transform: translate(-50%, -50%);
}
.vis-water-pin-dot {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: var(--app-color-text, #162033);
	border: 3rpx solid var(--color-bg-card);
}
.vis-water-labels {
	display: flex;
	justify-content: space-between;
	margin-top: 8rpx;
}
.vis-water-label {
	font-size: 20rpx;
	color: var(--app-color-text-tertiary, #8794A8);
}
.vis-water-value {
	display: block;
	font-size: 22rpx;
	color: var(--app-color-primary, #0056D2);
	font-weight: 500;
	margin-top: 8rpx;
	text-align: right;
}
/* 分布形态 */
.vis-shape-track {
	position: relative;
	height: 14rpx;
	border-radius: 7rpx;
	background: var(--app-color-surface-muted, #FAFBFE);
	border: 1rpx solid var(--app-color-border, #E0E7F0);
	overflow: visible;
}
.vis-shape-fill {
	position: absolute;
	height: 14rpx;
	border-radius: 7rpx;
	background: linear-gradient(90deg, #dfe6ff, #5B7CFA, #dfe6ff);
}
.vis-shape-center-line {
	position: absolute;
	left: 50%;
	top: -3rpx;
	width: 3rpx;
	height: 20rpx;
	background: #4c66d6;
	transform: translateX(-50%);
	border-radius: 2rpx;
}
.vis-shape-labels {
	display: flex;
	justify-content: space-between;
	margin-top: 8rpx;
}
.vis-shape-label {
	font-size: 20rpx;
	color: var(--app-color-text-tertiary, #8794A8);
}
/* 挂科风险 */
.vis-risk-track {
	height: 12rpx;
	border-radius: 6rpx;
	background: var(--app-color-surface-muted, #FAFBFE);
	border: 1rpx solid var(--app-color-border, #E0E7F0);
	overflow: hidden;
}
.vis-risk-fill {
	height: 12rpx;
	border-radius: 6rpx;
	background: linear-gradient(90deg, #f4d994, var(--app-color-danger, #C93C3C));
}
.vis-risk-info {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 10rpx;
}
.vis-risk-label {
	font-size: 22rpx;
	color: var(--app-color-text-tertiary, #8794A8);
}
.vis-risk-value {
	font-size: 22rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	font-weight: 500;
}
.vis-risk-value--warn {
	color: var(--app-color-danger, #C93C3C);
}
/* 均分 vs 中位数对比 */
.vis-cmp-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}
.vis-cmp-row + .vis-cmp-row {
	margin-top: 10rpx;
}
.vis-cmp-label {
	width: 56rpx;
	font-size: 22rpx;
	color: var(--app-color-text-tertiary, #8794A8);
	flex-shrink: 0;
}
.vis-cmp-bar-track {
	flex: 1;
	height: 12rpx;
	border-radius: 6rpx;
	background: var(--app-color-surface-muted, #FAFBFE);
	border: 1rpx solid var(--app-color-border, #E0E7F0);
	overflow: hidden;
}
.vis-cmp-bar {
	height: 12rpx;
	border-radius: 6rpx;
}
.vis-cmp-bar--mean { background: var(--app-color-warning, #C98A00); }
.vis-cmp-bar--median { background: var(--app-color-success, #11845B); }
.vis-cmp-val {
	width: 68rpx;
	font-size: 22rpx;
	color: var(--app-color-text, #162033);
	font-weight: 500;
	text-align: right;
	flex-shrink: 0;
}
.vis-cmp-gap {
	display: block;
	text-align: right;
	font-size: 20rpx;
	color: var(--app-color-warning, #C98A00);
	font-weight: 500;
	margin-top: 2rpx;
}
/* 正常空态 */
.diag-normal {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx 24rpx;
	background: var(--color-bg-tag);
	border-radius: 16rpx;
	border: 1rpx solid rgba(17, 132, 91, 0.12);
}
.diag-normal-icon {
	font-size: 40rpx;
	color: var(--app-color-success, #11845B);
	flex-shrink: 0;
}
.diag-normal-text {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.diag-normal-title {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--color-success);
}
.diag-normal-hint {
	font-size: 22rpx;
	color: var(--app-color-text-secondary, #5F6F86);
}
.score-chart-card {
	padding: 24rpx 24rpx 0;
}
.score-chart-wrap {
	overflow: visible;
}
.score-empty-msg {
	text-align: center;
	padding: 32rpx 24rpx;
	color: var(--app-color-text-secondary, #5F6F86);
	font-size: 28rpx;
}
.score-stats-list-card {
	padding: 24rpx 24rpx 0;
}
.score-stats-list-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	min-height: 48rpx;
	padding: 8rpx 0;
	border-bottom: 1rpx solid var(--app-color-border, #E0E7F0);
}
.score-stats-list-row-last {
	border-bottom: none;
}
.score-stats-list-label {
	font-size: 22rpx;
	color: var(--app-color-text-tertiary, #8794A8);
	font-weight: 500;
}
.score-stats-list-value {
	font-size: 22rpx;
	color: var(--app-color-text, #162033);
	font-weight: 700;
	text-align: right;
}
/* 直方图：纵轴 + 横轴 + 柱体 */
.chart-face {
	position: relative;
	width: 100%;
	min-height: 0;
	margin-top: 12rpx;
	margin-bottom: 0;
	padding-top: 28rpx;
	padding-bottom: 0;
	overflow: visible;
}
.chart-box {
	position: relative;
	width: 100%;
	min-height: 460rpx;
	padding-bottom: 5rpx;
}
.dotted-line-box {
	width: 100%;
	height: 360rpx;
	display: flex;
	flex-direction: column;
	position: relative;
}
.dotted-line-ordinate-wrap {
	position: relative;
	width: 100%;
	height: 360rpx;
}
.dotted-line-item-zero {
	/* 0 人刻度用实线，样式见 dotted-line-line-special */
}
.dotted-line-item {
	position: absolute;
	left: 0;
	right: 0;
	height: 0;
}
.dotted-line-text {
	min-width: 65rpx;
	width: auto;
	height: 40rpx;
	position: absolute;
	top: -22rpx;
	left: 0;
	color: var(--app-color-text-tertiary, #8794A8);
	font-size: 22rpx;
	text-align: right;
	white-space: nowrap;
}
.dotted-line-line {
	position: absolute;
	left: 90rpx;
	top: 0;
	right: 24rpx;
	height: 0;
	border-top: 2rpx dashed var(--app-color-border, #E0E7F0);
}
.dotted-line-line-special {
	position: absolute;
	left: 90rpx;
	top: 0;
	right: 24rpx;
	height: 0;
	border-top: 1rpx solid var(--app-color-border, #E0E7F0);
	z-index: 2;
}
.abscissa-box {
	position: absolute;
	left: 90rpx;
	width: calc(100% - 90rpx - 24rpx);
	height: 72rpx;
}
.abscissa-text {
	position: absolute;
	width: 80rpx;
	height: 30rpx;
	font-size: 20rpx;
	text-align: center;
	line-height: 30rpx;
	color: var(--app-color-text-tertiary, #8794A8);
	transform-origin: center bottom;
	transform: translate(-50%, 0) rotate(-45deg);
}
.column-face {
	position: absolute;
	top: 0;
	left: 90rpx;
	width: calc(100% - 90rpx - 24rpx);
	overflow: visible;
}
.column-box {
	position: relative;
	width: 100%;
}
.column-box-row {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	justify-content: space-between;
}
.column-slot {
	position: relative;
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	min-width: 0;
	height: 100%;
}
.column-item {
	width: 30rpx;
	flex: 0 0 auto;
	min-height: 0;
	box-sizing: border-box;
	background: linear-gradient(var(--color-brand-light), var(--color-bg-secondary));
	border-top: 2rpx solid;
}
.column-item-text {
	height: 26rpx;
	line-height: 26rpx;
	font-size: 18rpx;
	margin-bottom: 2rpx;
	flex: 0 0 auto;
}

.score-chart-card {
	padding: 26rpx 24rpx 24rpx;
	border-radius: 24rpx;
	background: var(--color-bg-card);
	border: 1rpx solid var(--color-border);
	box-shadow: 0 12rpx 28rpx rgba(31, 44, 78, 0.05);
}

.score-summary-strip {
	margin-top: 24rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid var(--color-border-light);
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12rpx;
}

.score-summary-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 8rpx 0;
}

.score-summary-label {
	font-size: 20rpx;
	color: var(--color-text-secondary);
	line-height: 1.2;
}

.score-summary-value {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-brand);
	line-height: 1;
}

.score-overview-loading,
.score-empty-msg {
	padding: 40rpx 0;
	text-align: center;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}

.content-section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	margin-bottom: 18rpx;
}

.chart-face {
	margin-top: 2rpx;
}

.chart-box {
	min-height: 430rpx;
}

.dotted-line-text,
.abscissa-text,
.column-item-text {
	color: var(--color-text-secondary);
}

.column-item {
	background: linear-gradient(180deg, rgba(44, 71, 167, 0.28) 0%, rgba(44, 71, 167, 0.08) 100%);
}
</style>

<style scoped>
.stitch-score-section {
	margin-top: 0;
}

.stitch-score-loading,
.stitch-score-empty {
	background: transparent;
	border: none;
	border-radius: 0;
	padding: 24rpx 4rpx 8rpx;
	text-align: center;
	font-size: 24rpx;
	line-height: 1.5;
	color: var(--color-text-secondary);
}

.stitch-score-card {
	background: transparent;
	border: none;
	border-radius: 0;
	padding: 4rpx 2rpx 0;
}

.stitch-score-chart-shell {
	position: relative;
	padding-left: 78rpx;
	padding-right: 14rpx;
	padding-top: 14rpx;
	padding-bottom: 68rpx;
	min-height: 394rpx;
	box-sizing: border-box;
}

.stitch-score-grid {
	position: absolute;
	left: 0;
	right: 14rpx;
	top: 14rpx;
	height: 360rpx;
}

.stitch-score-grid-line {
	position: absolute;
	left: 0;
	right: 0;
	height: 0;
}

.stitch-score-grid-label {
	position: absolute;
	left: 0;
	top: -18rpx;
	width: 58rpx;
	font-size: 18rpx;
	line-height: 1;
	text-align: left;
	color: var(--color-text-secondary);
}

.stitch-score-grid-stroke {
	position: absolute;
	left: 78rpx;
	right: 0;
	top: 0;
	border-top: 2rpx dashed var(--color-border);
}

.stitch-score-grid-line--zero .stitch-score-grid-stroke {
	border-top-style: solid;
	border-top-width: 1rpx;
}

.stitch-score-columns {
	position: relative;
	height: 100%;
}

.stitch-score-column-ratio {
	position: absolute;
	width: 60rpx;
	transform: translateX(-50%);
	font-size: 18rpx;
	line-height: 1;
	font-weight: 600;
	text-align: center;
	color: var(--color-brand);
	white-space: nowrap;
}

.stitch-score-column-bar {
	position: absolute;
	bottom: 0;
	width: 22rpx;
	margin-left: -11rpx;
	border-radius: 0;
	background: rgba(53, 90, 168, 0.22);
	border-top: 4rpx solid rgba(53, 90, 168, 0.9);
	box-sizing: border-box;
}

.stitch-score-column-label {
	position: absolute;
	bottom: -54rpx;
	width: 64rpx;
	font-size: 18rpx;
	line-height: 1.2;
	text-align: center;
	color: var(--color-text-secondary);
	transform: translateX(-56%) rotate(-45deg);
	transform-origin: center top;
}

.stitch-score-summary {
	display: flex;
	margin-top: 18rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid var(--color-border-light);
}

.stitch-score-summary-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.stitch-score-summary-item + .stitch-score-summary-item {
	border-left: 1rpx solid var(--color-border-light);
}

.stitch-score-summary-label {
	font-size: 19rpx;
	line-height: 1.4;
	color: var(--color-text-secondary);
}

.stitch-score-summary-value {
	font-size: 25rpx;
	line-height: 1.2;
	font-weight: 600;
	color: var(--color-text-heading);
}
</style>
