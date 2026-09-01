<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">使用说明</text>
			</view>
		</view>

		<view class="page-content">
			<!-- 箱线图 -->
			<view class="section-card">
				<text class="section-title">成绩分布的箱线图</text>
				<text class="section-desc">展示一门课的成绩分布。</text>

				<view class="demo-boxplot-wrap">
					<score-boxplot
						:min="72"
						:max="98"
						:q1="82"
						:median="88"
						:q3="93"
						:show-fixed-scale="true"
						:hide-endpoints="false"
						:whisker-color="whiskerColor"
						:box-color="boxColor"
						:box-border-color="boxBorderColor"
						:median-color="medianColor"
						:axis-color="axisColor"
						:endpoint-color="endpointColor"
					/>
				</view>

				<view class="explain-list">
					<view class="explain-item">
						<view class="legend-whisker">
							<view class="legend-whisker-dot" :style="{ background: endpointColor }"></view>
							<view class="legend-whisker-line" :style="{ background: whiskerColor }"></view>
							<view class="legend-whisker-dot" :style="{ background: endpointColor }"></view>
						</view>
						<view class="explain-text-wrap">
							<text class="explain-label">两端数字</text>
							<text class="explain-value">最低分和最高分</text>
						</view>
					</view>
					<view class="explain-item">
						<view class="legend-box" :style="{ background: boxColor, borderColor: boxBorderColor }"></view>
						<view class="explain-text-wrap">
							<text class="explain-label">色块区间</text>
							<text class="explain-value">中间 50% 学生的成绩范围</text>
						</view>
					</view>
					<view class="explain-item">
						<view class="legend-median-wrap">
							<view class="legend-median-line" :style="{ background: medianColor }"></view>
						</view>
						<view class="explain-text-wrap">
							<text class="explain-label">竖线标记</text>
							<text class="explain-value">中位数，一半高于、一半低于</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 评价与点赞 -->
			<view class="section-card">
				<text class="section-title">评价与点赞</text>
				<text class="section-desc">上过该课的同学，可评价和点赞。</text>

				<!-- 复刻实际评论样式 -->
				<view class="demo-review-item">
					<view class="demo-review-bar"></view>
					<view class="demo-review-body">
						<view class="demo-review-head">
							<view class="demo-review-user">
								<view class="demo-review-avatar">
									<text class="demo-review-avatar-text">匿</text>
								</view>
								<view class="demo-review-copy">
									<text class="demo-review-name">匿名同学</text>
									<view class="demo-review-meta">
										<view class="demo-review-stars">
											<text class="demo-review-star">★</text>
											<text class="demo-review-star">★</text>
											<text class="demo-review-star">★</text>
											<text class="demo-review-star">★</text>
											<text class="demo-review-star demo-review-star-empty">☆</text>
										</view>
										<text class="demo-score-badge">88分</text>
									</view>
								</view>
							</view>
							<text class="demo-review-date">3月前</text>
						</view>
						<text class="demo-review-content">老师讲课很有条理，课件内容丰富，考核方式合理，整体体验不错。</text>
						<view class="demo-review-like demo-review-like-active">
							<text class="demo-review-like-icon demo-review-like-icon-active">♥</text>
							<text class="demo-review-like-count demo-review-like-count-active">3</text>
						</view>
					</view>
				</view>

			</view>
		</view>
	</view>
</template>

<script>
import ScoreBoxplot from '@/components/score_boxplot/score-boxplot.vue'
import { isDark } from '@/utils/darkMode.js'

export default {
	components: { ScoreBoxplot },
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) uni.navigateBack()
			else uni.switchTab({ url: '/pages/me/me' })
		}
	},
	computed: {
		whiskerColor() { return isDark() ? '#4B5563' : '#CBD5E1' },
		boxColor() { return isDark() ? 'rgba(91, 141, 239, 0.15)' : 'rgba(30, 58, 138, 0.08)' },
		boxBorderColor() { return isDark() ? 'rgba(91, 141, 239, 0.35)' : 'rgba(30, 58, 138, 0.20)' },
		medianColor() { return isDark() ? '#5B8DEF' : '#1E3A8A' },
		axisColor() { return isDark() ? '#2A2D3A' : '#E2E8F0' },
		endpointColor() { return isDark() ? '#6B7280' : '#94A3B8' }
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: var(--color-bg-page);
	box-sizing: border-box;
}

/* ===== 标题区 ===== */
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
}
.header-title-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}
.header-back {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
	flex-shrink: 0;
}
.header-back-hover { background: rgba(30, 58, 138, 0.06); }
.header-back-arrow {
	width: 16rpx;
	height: 16rpx;
	border-left: 4rpx solid var(--color-brand);
	border-bottom: 4rpx solid var(--color-brand);
	transform: rotate(45deg);
	margin-left: 4rpx;
}
.header-title {
	font-size: 48rpx;
	line-height: 1.2;
	font-weight: 800;
	color: var(--color-brand);
}


.page-content {
	padding: 24rpx 32rpx 80rpx;
}

/* ===== 独立卡片板块 ===== */
.section-card {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border);
	padding: 32rpx 28rpx;
	margin-bottom: 24rpx;
}

.section-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: var(--color-text-heading);
	margin-bottom: 12rpx;
}

.section-desc {
	display: block;
	font-size: 26rpx;
	line-height: 1.7;
	color: var(--color-text-tertiary);
	margin-bottom: 24rpx;
}

/* ===== 示例箱线图 ===== */
.demo-boxplot-wrap {
	padding: 8rpx 12rpx 24rpx;
}

/* ===== 图解列表 ===== */
.explain-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.explain-item {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

/* 图例：须线 + 端点 */
.legend-whisker {
	flex-shrink: 0;
	width: 48rpx;
	height: 24rpx;
	display: flex;
	align-items: center;
}
.legend-whisker-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	flex-shrink: 0;
}
.legend-whisker-line {
	flex: 1;
	height: 3rpx;
}

/* 图例：色块区间 */
.legend-box {
	flex-shrink: 0;
	width: 48rpx;
	height: 24rpx;
	border-radius: 6rpx;
	border: 2rpx solid transparent;
}

/* 图例：中位数竖线 */
.legend-median-wrap {
	flex-shrink: 0;
	width: 48rpx;
	height: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.legend-median-line {
	width: 4rpx;
	height: 100%;
	border-radius: 999rpx;
}

/* 图例：星级 */
.legend-stars {
	flex-shrink: 0;
	width: 48rpx;
	display: flex;
	align-items: center;
	gap: 1rpx;
}
.legend-stars .demo-review-star {
	font-size: 16rpx;
}
.legend-stars .demo-review-star-empty {
	font-size: 16rpx;
}

/* 图例：成绩标签 */
.legend-badge-wrap {
	flex-shrink: 0;
	width: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.legend-badge-wrap .demo-score-badge {
	font-size: 16rpx;
	padding: 2rpx 8rpx;
}

/* 图例：点赞 */
.legend-like-wrap {
	flex-shrink: 0;
	width: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.legend-like-wrap .demo-review-like-icon {
	font-size: 24rpx;
}

.explain-text-wrap {
	flex: 1;
}

.explain-label {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	margin-right: 12rpx;
}

.explain-value {
	font-size: 24rpx;
	color: var(--color-text-tertiary);
}

/* ===== 复刻实际评论样式 ===== */
.demo-review-item {
	position: relative;
	padding-left: 22rpx;
}

.demo-review-bar {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 4rpx;
	border-radius: 999rpx;
	background: var(--color-brand-bg);
}

.demo-review-body {
	display: flex;
	flex-direction: column;
}

.demo-review-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 14rpx;
}

.demo-review-user {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
	flex: 1;
	min-width: 0;
}

.demo-review-avatar {
	width: 50rpx;
	height: 50rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: var(--color-brand-bg);
}

.demo-review-avatar-text {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--color-brand);
}

.demo-review-copy {
	flex: 1;
	min-width: 0;
}

.demo-review-name {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	line-height: 1.3;
	color: var(--color-text-primary);
}

.demo-review-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 6rpx;
}

.demo-review-stars {
	display: flex;
	align-items: center;
	gap: 2rpx;
}

.demo-review-star {
	font-size: 20rpx;
	line-height: 1;
	color: var(--color-warning);
}

.demo-review-star-empty {
	color: var(--color-border);
}

.demo-score-badge {
	padding: 2rpx 10rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.3;
	background: var(--color-bg-tag);
	color: var(--color-brand);
}

.demo-review-date {
	font-size: 20rpx;
	line-height: 1.4;
	color: var(--color-text-secondary);
	white-space: nowrap;
}

.demo-review-content {
	display: block;
	font-size: 27rpx;
	line-height: 1.68;
	color: var(--color-text-primary);
}

.demo-review-like {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	margin-top: 14rpx;
}

.demo-review-like-icon {
	font-size: 22rpx;
	line-height: 1;
	color: var(--color-text-secondary);
}

.demo-review-like-icon-active {
	color: var(--color-danger);
}

.demo-review-like-count {
	font-size: 20rpx;
	line-height: 1;
	color: var(--color-text-secondary);
}

.demo-review-like-count-active {
	color: var(--color-danger);
	font-weight: 600;
}


</style>
