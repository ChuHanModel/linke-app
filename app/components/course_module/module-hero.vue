<template>
	<view class="hero-card" :class="toneClass">
		<view class="hero-copy">
			<text class="hero-title">{{ title }}</text>
			<text v-if="subtitle" class="hero-subtitle">{{ subtitle }}</text>
		</view>
		<view v-if="badge" class="hero-badge">
			<text class="hero-badge-text">{{ badge }}</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		title: {
			type: String,
			default: ''
		},
		subtitle: {
			type: String,
			default: ''
		},
		badge: {
			type: String,
			default: ''
		},
		tone: {
			type: String,
			default: 'default'
		}
	},
	computed: {
		toneClass() {
			return `hero-tone-${this.tone || 'default'}`
		}
	}
}
</script>

<style scoped>
.hero-card {
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	padding: 30rpx;
	border-radius: 30rpx;
	overflow: hidden;
	border: 1rpx solid rgba(0, 86, 210, 0.1);
}
.hero-card::after {
	content: '';
	position: absolute;
	right: -24rpx;
	top: -44rpx;
	width: 190rpx;
	height: 190rpx;
	border-radius: 50%;
	background: rgba(0, 86, 210, 0.055);
}
.hero-copy {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}
.hero-title {
	font-size: 40rpx;
	line-height: 1.22;
	font-weight: 700;
	color: var(--color-brand);
}
.hero-subtitle {
	margin-top: 12rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}
.hero-badge {
	position: relative;
	z-index: 1;
	flex-shrink: 0;
	padding: 12rpx 18rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	border: 1rpx solid var(--color-border);
}
.hero-badge-text {
	font-size: 22rpx;
	line-height: 1.2;
	color: var(--app-color-primary, #0056D2);
	font-weight: 600;
}
.hero-tone-default {
	background: var(--color-bg-card);
}
.hero-tone-search {
	background: var(--color-bg-card);
}
.hero-tone-collection {
	background: var(--color-bg-card);
}
</style>
