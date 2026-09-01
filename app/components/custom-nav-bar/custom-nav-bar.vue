<template>
	<view class="nav-bar" :class="{ 'nav-bar-border': border }" :style="navBarStyle">
		<view class="nav-bar-status" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar-content">
			<view class="nav-bar-left" @tap="onLeftTap">
				<slot name="left">
					<view v-if="showBack" class="nav-bar-back" hover-class="nav-bar-back-hover" hover-stay-time="80">
						<view class="nav-bar-back-arrow"></view>
					</view>
				</slot>
			</view>
			<view class="nav-bar-center">
				<slot name="center"></slot>
			</view>
			<view class="nav-bar-right">
				<slot name="right">
					<view class="nav-bar-right-placeholder"></view>
				</slot>
			</view>
		</view>
	</view>
	<view class="nav-bar-placeholder" :style="{ height: totalHeight + 'px' }"></view>
</template>

<script>
export default {
	name: 'custom-nav-bar',
	props: {
		title: {
			type: String,
			default: ''
		},
		showBack: {
			type: Boolean,
			default: true
		},
		border: {
			type: Boolean,
			default: true
		},
		background: {
			type: String,
			default: ''
		},
		fixed: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			statusBarHeight: 0,
			navContentHeight: 44
		}
	},
	computed: {
		totalHeight() {
			return this.statusBarHeight + this.navContentHeight
		},
		navBarStyle() {
			const styles = {}
			if (this.background) {
				styles.background = this.background
			}
			if (this.fixed) {
				styles.position = 'fixed'
				styles.top = '0'
				styles.left = '0'
				styles.right = '0'
			}
			return styles
		}
	},
	created() {
		const sysInfo = uni.getSystemInfoSync()
		this.statusBarHeight = sysInfo.statusBarHeight || 0
	},
	methods: {
		onLeftTap() {
			if (this.showBack) {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
				} else {
					uni.switchTab({ url: '/pages/index/index' })
				}
			}
			this.$emit('left-tap')
		}
	}
}
</script>

<style scoped>
.nav-bar {
	z-index: 100;
	background: var(--color-bg-card);
}

.nav-bar-border {
	border-bottom: 1rpx solid var(--color-border);
}

.nav-bar-status {
	width: 100%;
}

.nav-bar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	padding: 0 16rpx;
}

.nav-bar-left,
.nav-bar-right {
	width: 80rpx;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.nav-bar-left {
	justify-content: flex-start;
}

.nav-bar-right {
	justify-content: flex-end;
}

.nav-bar-right-placeholder {
	width: 80rpx;
}

.nav-bar-center {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.nav-bar-title {
	font-size: 34rpx;
	font-weight: 600;
	color: var(--color-brand);
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
	line-height: 1.3;
}

.nav-bar-back {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
}

.nav-bar-back-hover {
	background: rgba(30, 58, 138, 0.06);
}

.nav-bar-back-arrow {
	width: 16rpx;
	height: 16rpx;
	border-left: 4rpx solid var(--color-brand);
	border-bottom: 4rpx solid var(--color-brand);
	transform: rotate(45deg);
	margin-left: 4rpx;
}

.nav-bar-placeholder {
	width: 100%;
	flex-shrink: 0;
}
</style>
