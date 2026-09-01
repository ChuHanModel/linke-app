<template>
	<view class="course-card" hover-class="course-card-hover" hover-stay-time="80" @tap="handleSelect" @longpress="handleLongpress">
		<!-- Row 1：课名 + 教师（同行 baseline 对齐）+ 右侧元素 -->
		<view class="card-row1">
			<view class="card-row1-text">
				<text class="card-name">{{ courseName }}</text>
				<text class="card-teacher">{{ teacherName }}</text>
			</view>
			<view v-if="showBookmark" class="card-bookmark">
				<view class="card-bookmark-shape"></view>
			</view>
		</view>

		<!-- Row 2：类别标签 + 评分 -->
		<view class="card-row2">
			<view v-if="courseType" class="card-rating-tag">
				<text class="card-rating-tag-text">{{ courseType }}</text>
			</view>
			<view v-if="ratingValue != null" class="card-rating">
				<text class="card-rating-star">★</text>
				<text class="card-rating-value">{{ ratingValue.toFixed(1) }}</text>
				<text class="card-rating-count">({{ commentCount }} 评价)</text>
			</view>
			<text v-else class="card-no-rating">暂无评分</text>
		</view>

		<!-- Row 3：箱线图 -->
		<view v-if="hasScoreBoxplot" class="card-boxplot-wrap">
			<score-boxplot
				:min="course.scoreStats.minScore"
				:max="course.scoreStats.maxScore"
				:q1="course.scoreStats.q1Score"
				:median="course.scoreStats.medianScore"
				:q3="course.scoreStats.q3Score"
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
		<text v-else class="card-no-score">暂无成绩分布数据</text>
	</view>
</template>

<script>
import ScoreBoxplot from '@/components/score_boxplot/score-boxplot.vue'
import { isDark } from '@/utils/darkMode.js'

export default {
	components: { ScoreBoxplot },
	emits: ['select', 'longpress'],
	props: {
		course: {
			type: Object,
			default() {
				return {}
			}
		},
		showBookmark: {
			type: Boolean,
			default: false
		},
	},
	computed: {
		courseName() {
			return this.course.lessonName || this.course.courseName || '未命名课程'
		},
		teacherName() {
			return this.course.teacherName || '教师信息暂缺'
		},
		courseType() {
			return this.course.courseType || ''
		},
		ratingValue() {
			const n = Number(this.course.starAvgTotal)
			if (Number.isNaN(n) || n <= 0) return null
			return Math.min(5, Math.max(0, n))
		},
		commentCount() {
			const n = Number(this.course.courseComment)
			if (Number.isNaN(n) || n <= 0) return 0
			return n
		},
		// 箱线图颜色适配深色模式
		whiskerColor() { return isDark() ? '#4B5563' : '#CBD5E1' },
		boxColor() { return isDark() ? 'rgba(91, 141, 239, 0.15)' : 'rgba(30, 58, 138, 0.08)' },
		boxBorderColor() { return isDark() ? 'rgba(91, 141, 239, 0.35)' : 'rgba(30, 58, 138, 0.20)' },
		medianColor() { return isDark() ? '#5B8DEF' : '#1E3A8A' },
		axisColor() { return isDark() ? '#2A2D3A' : '#E2E8F0' },
		endpointColor() { return isDark() ? '#6B7280' : '#94A3B8' },
		hasScoreBoxplot() {
			const s = this.course.scoreStats
			if (!s || s.count == null || s.count <= 0) return false
			const min = Number(s.minScore)
			const max = Number(s.maxScore)
			const q1 = Number(s.q1Score)
			const med = Number(s.medianScore)
			const q3 = Number(s.q3Score)
			return ![min, max, q1, med, q3].some(Number.isNaN)
		}
	},
	methods: {
		handleSelect() {
			this.$emit('select', this.course)
		},
		handleLongpress() {
			this.$emit('longpress', this.course)
		}
	}
}
</script>

<style scoped>
.course-card {
	padding: 32rpx;
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border-light);
	box-shadow: 0 2rpx 8rpx var(--color-card-shadow, rgba(0, 0, 0, 0.02));
	transform: scale(1);
	transition: transform 120ms ease;
}
.course-card-hover {
	transform: scale(0.985);
}

/* Row 1：课名 + 教师（同行）+ 右侧元素 */
.card-row1 {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}
.card-row1-text {
	flex: 1;
	display: flex;
	align-items: baseline;
	gap: 16rpx;
	flex-wrap: wrap;
}
.card-name {
	font-size: 32rpx;
	line-height: 1.35;
	font-weight: 600;
	color: var(--color-text-primary);
}
.card-teacher {
	font-size: 26rpx;
	line-height: 1.4;
	color: var(--color-text-tertiary);
	flex-shrink: 0;
}

/* 书签 */
.card-bookmark {
	flex-shrink: 0;
	width: 36rpx;
	height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.card-bookmark-shape {
	width: 24rpx;
	height: 32rpx;
	background: var(--color-brand);
	clip-path: polygon(
		4% 0%, 96% 0%,
		100% 4%, 100% 100%,
		50% 78%,
		0% 100%, 0% 4%
	);
}

/* Row 2：类别标签 + 评分 */
.card-row2 {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-top: 16rpx;
}
.card-rating-tag {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 6rpx 14rpx;
	border-radius: 8rpx;
	background: var(--color-bg-tag);
}
.card-rating-tag-text {
	font-size: 22rpx;
	line-height: 1.3;
	font-weight: 600;
	color: var(--color-brand);
}
.card-rating {
	display: flex;
	align-items: center;
	gap: 6rpx;
}
.card-rating-star {
	font-size: 22rpx;
	color: var(--color-brand);
}
.card-rating-value {
	font-size: 26rpx;
	line-height: 1.2;
	font-weight: 600;
	color: var(--color-brand);
}
.card-rating-count {
	font-size: 24rpx;
	line-height: 1.2;
	color: var(--color-text-secondary);
	margin-left: 2rpx;
}
.card-no-rating {
	font-size: 22rpx;
	line-height: 1.4;
	color: var(--color-text-secondary);
	font-style: italic;
}

/* 箱线图 */
.card-boxplot-wrap {
	margin-top: 24rpx;
	padding: 8rpx 24rpx 2rpx 12rpx;
}
.card-no-score {
	display: block;
	margin-top: 24rpx;
	font-size: 22rpx;
	line-height: 1.4;
	color: rgba(100, 116, 139, 0.6);
	text-align: center;
	font-style: italic;
}
</style>
