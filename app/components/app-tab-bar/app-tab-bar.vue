<template>
	<view class="tab-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
		<view class="tab-bar-inner">
			<view
				v-for="tab in visibleTabs"
				:key="tab.path"
				class="tab-item"
				:class="{ 'tab-item--active': currentTab === tab.path }"
				@click="switchTo(tab.path)"
			>
				<image
					class="tab-icon"
					:src="currentTab === tab.path ? tab._selectedIcon : tab._icon"
					mode="aspectFit"
				/>
				<text class="tab-text" :class="{ 'tab-text--active': currentTab === tab.path }">{{ tab.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { isDark } from '@/utils/darkMode.js'

const TABS = [
	{
		path: '/pages/index/index', text: '通选课',
		icon: '/static/images/tab/index.png', selectedIcon: '/static/images/tab/index1.png',
		iconDark: '/static/images/tab/index_dark.png', selectedIconDark: '/static/images/tab/index1_dark.png'
	},
	{
		path: '/pages/form/form', text: '课程表',
		icon: '/static/images/tab/form.png', selectedIcon: '/static/images/tab/form1.png',
		iconDark: '/static/images/tab/form_dark.png', selectedIconDark: '/static/images/tab/form1_dark.png'
	},
	{
		path: '/pages/me/me', text: '个人中心',
		icon: '/static/images/tab/me.png', selectedIcon: '/static/images/tab/me1.png',
		iconDark: '/static/images/tab/me_dark.png', selectedIconDark: '/static/images/tab/me1_dark.png'
	}
]

export default {
	props: {
		currentTab: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			safeAreaBottom: 0
		}
	},
	computed: {
		visibleTabs() {
			const dark = isDark()
			return TABS.map(tab => ({
				...tab,
				_icon: dark ? tab.iconDark : tab.icon,
				_selectedIcon: dark ? tab.selectedIconDark : tab.selectedIcon
			}))
		}
	},
	created() {
		try {
			const sys = uni.getSystemInfoSync()
			this.safeAreaBottom = sys.safeAreaInsets ? sys.safeAreaInsets.bottom : 0
		} catch (e) {}
	},
	methods: {
		switchTo(path) {
			if (path === this.currentTab) return
			uni.switchTab({ url: path })
		}
	}
}
</script>

<style scoped>
.tab-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background: var(--color-nav-bg);
	border-top: 1rpx solid var(--color-border-light);
	box-shadow: 0 -2rpx 12rpx var(--color-tab-shadow);
}

.tab-bar-inner {
	display: flex;
	align-items: center;
	justify-content: space-around;
	height: 100rpx;
}

.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	height: 100%;
}

.tab-icon {
	width: 44rpx;
	height: 44rpx;
}

.tab-text {
	font-size: 20rpx;
	color: var(--color-text-secondary);
	font-weight: 500;
}

.tab-text--active {
	color: var(--color-brand);
	font-weight: 600;
}
</style>
