<template>
	<view class="page" :class="themeClass">
		<view class="page-header">
			<view class="header-title-row">
				<view class="header-back" hover-class="header-back-hover" hover-stay-time="80" @tap="goBack">
					<view class="header-back-arrow"></view>
				</view>
				<text class="header-title">教务通知</text>
			</view>
			<text class="header-subtitle">每天自动同步教务处选课相关通知，仅显示最新 5 条。</text>
		</view>

		<view class="page-content">
			<!-- 加载中 -->
			<module-state
				v-if="loading"
				icon="·"
				title="正在同步公告"
				description="稍等片刻，最新公告会在这里显示。"
			/>

			<!-- 空状态 -->
			<module-state
				v-else-if="list.length === 0"
				icon="·"
				title="暂无通知"
				description="当前没有新的选课公告，可稍后再来查看。"
			/>

			<!-- 通知列表 -->
			<view v-else class="notice-list">
				<view
					v-for="(item, index) in list"
					:key="index"
					class="notice-card"
					hover-class="notice-card-hover"
					hover-stay-time="80"
					@tap="openNotice(item)"
				>
					<view class="notice-card-top">
						<text class="notice-date-tag">{{ formatDateTag(item.date) }}</text>
						<text class="notice-arrow">&#8250;</text>
					</view>
					<text class="notice-title">{{ item.title }}</text>
					<text class="notice-date-full">{{ item.date }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { post } from '@/utils/api.js'
import ModuleState from '@/components/course_module/module-state.vue'

export default {
	components: { ModuleState },
	data() {
		return {
			loading: true,
			list: []
		}
	},
	onLoad() {
		this.loadList()
	},
	methods: {
		formatDateTag(dateStr) {
			if (!dateStr) return ''
			const now = new Date()
			const d = new Date(dateStr.replace(/-/g, '/'))
			if (isNaN(d.getTime())) return dateStr
			const diffMs = now.getTime() - d.getTime()
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
			if (diffDays < 0) return '即将发布'
			if (diffDays === 0) return '今天'
			if (diffDays === 1) return '昨天'
			if (diffDays < 7) return diffDays + '天前'
			if (diffDays < 30) return Math.floor(diffDays / 7) + '周前'
			if (diffDays < 365) return Math.floor(diffDays / 30) + '个月前'
			return Math.floor(diffDays / 365) + '年前'
		},
		async loadList() {
			this.loading = true
			this.list = []
			try {
				const res = await post('App.JwNotice.GetLatestJwNoticeListSelectCourse', { limit: 5 })
				if (res && Array.isArray(res.list)) {
					this.list = res.list
				} else if (Array.isArray(res)) {
					this.list = res
				}
			} catch (err) {
				console.error('加载通知列表失败:', err)
				uni.showToast({ title: (err && (err.message || err)) || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		openNotice(item) {
			if (!item.url) {
				uni.showToast({ title: '链接无效', icon: 'none' })
				return
			}
			const title = item.title ? '&title=' + encodeURIComponent(item.title) : ''
			uni.navigateTo({
				url: '/pages/webview/webview?url=' + encodeURIComponent(item.url) + title
			})
		},
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.switchTab({ url: '/pages/index/index' })
			}
		}
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
.page-header {
	background: var(--color-bg-card);
	padding: 32rpx;
	padding-top: calc(24rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(24rpx + env(safe-area-inset-top, 0px));
	border-bottom: 1rpx solid var(--color-border);
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
.header-back-hover {
	background: rgba(30, 58, 138, 0.06);
}
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
.header-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rpx 16rpx;
	border-radius: 999rpx;
	background: var(--color-bg-tag);
	align-self: center;
}
.header-badge-text {
	font-size: 24rpx;
	line-height: 1.2;
	font-weight: 700;
	color: var(--color-brand);
}
.header-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}
.page-content {
	width: 100%;
	box-sizing: border-box;
	padding: 32rpx;
	padding-top: 28rpx;
	padding-bottom: calc(120rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
}
.notice-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}
.notice-card {
	background: var(--color-bg-card);
	border-radius: 20rpx;
	border: 1rpx solid var(--color-border);
	padding: 24rpx 28rpx;
}
.notice-card-hover {
	background: var(--color-bg-hover);
}
.notice-card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}
.notice-date-tag {
	font-size: 22rpx;
	font-weight: 500;
	color: var(--color-brand);
	background: var(--color-bg-tag);
	padding: 4rpx 16rpx;
	border-radius: 999rpx;
	line-height: 1.4;
}
.notice-arrow {
	font-size: 32rpx;
	color: var(--color-text-secondary);
	line-height: 1;
}
.notice-title {
	display: block;
	font-size: 28rpx;
	font-weight: 500;
	line-height: 1.5;
	color: var(--color-text-primary);
	margin-bottom: 10rpx;
}
.notice-date-full {
	display: block;
	font-size: 24rpx;
	color: var(--color-text-secondary);
	font-variant-numeric: tabular-nums;
}
</style>
