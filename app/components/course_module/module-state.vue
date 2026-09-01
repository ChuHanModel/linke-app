<template>
	<view class="state-card">
		<text class="state-icon">{{ icon }}</text>
		<text class="state-title">{{ title }}</text>
		<text v-if="description" class="state-description">{{ description }}</text>
		<button
			v-if="actionText"
			class="state-button"
			:loading="loading"
			:disabled="disabled || loading"
			@tap="$emit('action')"
		>
			{{ actionText }}
		</button>
		<text v-if="secondaryText" class="state-secondary">{{ secondaryText }}</text>
	</view>
</template>

<script>
export default {
	props: {
		icon: {
			type: String,
			default: '·'
		},
		title: {
			type: String,
			default: ''
		},
		description: {
			type: String,
			default: ''
		},
		actionText: {
			type: String,
			default: ''
		},
		secondaryText: {
			type: String,
			default: ''
		},
		loading: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	}
}
</script>

<style scoped>
.state-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 44rpx 36rpx;
	background: var(--app-color-card, #FFFFFF);
	border-radius: 24rpx;
	border: 1rpx solid var(--app-color-border, #E0E7F0);
}
.state-icon {
	font-size: 48rpx;
	line-height: 1;
	color: var(--app-color-primary, #0056D2);
}
.state-title {
	margin-top: 18rpx;
	font-size: 32rpx;
	font-weight: 700;
	line-height: 1.3;
	color: var(--app-color-text, #1C2337);
}
.state-description {
	margin-top: 12rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--app-color-text-secondary, #6F7C91);
}
.state-button {
	width: 100%;
	margin-top: 28rpx;
	height: 84rpx;
	line-height: 84rpx;
	border-radius: 999rpx;
	background: var(--app-color-primary, #0056D2);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
	border: none;
}
.state-button::after {
	border: none;
}
.state-secondary {
	margin-top: 18rpx;
	font-size: 22rpx;
	color: var(--app-color-text-tertiary, #8B97AA);
	line-height: 1.5;
}
</style>
