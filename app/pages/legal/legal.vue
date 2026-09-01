<template>
	<view class="page" :class="themeClass">
		<custom-nav-bar :title="content.title" />

		<view class="page-content">
			<view class="hero-card">
				<text class="hero-title">{{ content.title }}</text>
				<text class="hero-date">生效日期：{{ content.effectiveDate }}</text>
				<text class="hero-intro">{{ content.intro }}</text>
			</view>

			<view class="content-card">
				<view
					v-for="section in content.sections"
					:key="section.title"
					class="section-block"
				>
					<text class="section-title">{{ section.title }}</text>
					<text
						v-for="paragraph in section.paragraphs"
						:key="paragraph"
						class="section-text"
					>
						{{ paragraph }}
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavBar from '@/components/custom-nav-bar/custom-nav-bar.vue'
import { getLegalContent } from '@/utils/legalContent.js'

export default {
	components: { CustomNavBar },
	data() {
		return {
			content: getLegalContent('user')
		}
	},
	onLoad(options) {
		this.content = getLegalContent(options?.type)
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	min-height: 100dvh;
	background: var(--color-bg-page);
	box-sizing: border-box;
}

.page-content {
	padding: 24rpx 32rpx 40rpx;
}

.hero-card,
.content-card {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid rgba(28, 35, 55, 0.08);
	box-shadow: 0 16rpx 48rpx rgba(28, 35, 55, 0.05);
}

.hero-card {
	padding: 32rpx 28rpx;
}

.hero-title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text-primary);
}

.hero-date {
	display: block;
	margin-top: 12rpx;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}

.hero-intro {
	display: block;
	margin-top: 20rpx;
	font-size: 28rpx;
	line-height: 1.7;
	color: #334155;
}

.content-card {
	margin-top: 24rpx;
	padding: 8rpx 28rpx;
}

.section-block {
	padding: 28rpx 0;
	border-bottom: 1rpx solid var(--color-border);
}

.section-block:last-child {
	border-bottom: none;
}

.section-title {
	display: block;
	margin-bottom: 16rpx;
	font-size: 30rpx;
	font-weight: 600;
	color: #1E293B;
}

.section-text {
	display: block;
	font-size: 27rpx;
	line-height: 1.8;
	color: #475569;
}

.section-text + .section-text {
	margin-top: 12rpx;
}
</style>
