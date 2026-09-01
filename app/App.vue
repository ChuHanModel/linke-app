<script>
import { initApp } from '@/services/app/bootstrapService.js';
import { legacyAppMethods } from '@/services/app/legacyAppService.js';

export default {
	globalData: {
		// 保留原有的globalCookie
		globalCookie: '',
		
		// ——————————本地数据（仅做备忘用，不被实际调用）
		localData: {
			// 用户登出，用以控制form到login的跳转
			userOut: '',
			// 强制登出版本
			forceOut: '',
			// 用户信息
			userId: '',
			userPassword: '',
			userKey: '',
			userInfo: '',
			// 本地课程
			userSchedule: '',
			// 学分
			userCredit: '',
			userCreditTotal: '',
			// 搜索历史记录
			searchRecord: '',
			// 课程分类
			courseType: [],
			// 无网
			app_tem_func_EN_state: {
				waitNet: true,
				notNet: false,
			},
			// 维护
			maintenanceInfo: {
				state: false,
				time: '',
				title: '',
				info: '',
			},
			// 开学第一天
			schoolFirstDay: {},
			// 选课时间
			courseSelectionTime: {},
			// 是否设置过form页背景图来源
			formBackground_state: '',
			// 背景图默认的图片
			formBackground_default: '',
			// 背景图默认的图片，手机中的
			formBackground_phone: '',
			// 当前学期值，用以控制总表
			thisSelectionTerm: '',
		},

		// ——————————仅供本地赋值用，除了本地赋值，其他函数一概不得操作如下变量

		// 无网
		app_tem_func_EN_state: {
			waitNet: true,
			notNet: false,
		},
		// 维护
		maintenanceInfo: {
			state: false,
			time: '',
			title: '',
			info: '',
		},

		// ——————————全局数据

		// 用户信息
		userData: {
			'userId': '',
			'userPassword': '',
			'userKey': '',
			'userInfo': '',
			'userSchedule': '',
		},
		// 是否改变了收藏状态
		ifChangeLikeState: null,
		// 收藏页是否需要在返回时静默刷新
		collectionListDirty: false
	},

	onLaunch() {
		initApp(this)
		console.log('App Launch')
	},

	onShow() {
		console.log('App Show')
	},
	
	onHide() {
		console.log('App Hide')
	},
	methods: legacyAppMethods
}
</script>

<style>
	/* ===== 全局主题变量 ===== */
	page {
		/* 页面背景 */
		--color-bg-page: #F8FAFC;
		--color-bg-page-alt: #f3f5f9;
		--color-bg-page-white: #ffffff;
		/* 卡片/容器 */
		--color-bg-card: #FFFFFF;
		--color-bg-input: #F8FAFC;
		--color-bg-hover: #F8FAFC;
		--color-bg-tag: #eef2f7;
		--color-bg-secondary: #edf1f8;
		/* 边框 */
		--color-border: #E2E8F0;
		--color-border-light: #F1F5F9;
		/* 文本 */
		--color-text-primary: #0F172A;
		--color-text-heading: #1b2b56;
		--color-text-section: #203054;
		--color-text-secondary: #94A3B8;
		--color-text-tertiary: #76839c;
		/* 品牌色 */
		--color-brand: #1E3A8A;
		--color-brand-light: #5B8DEF;
		--color-brand-bg: rgba(30, 58, 138, 0.06);
		/* 功能色 */
		--color-danger: #B91C1C;
		--color-danger-bg: #FEF2F2;
		--color-success: #28a35c;
		--color-warning: #d0841f;
		/* 导航/Tab */
		--color-nav-bg: #FFFFFF;
		--color-tab-shadow: rgba(0, 0, 0, 0.04);
		/* 骨架屏 */
		--color-skeleton-from: #E8ECF1;
		--color-skeleton-to: #F1F4F8;

		min-height: 100%;
		font-family: "DIN Alternate", "Avenir Next", "Avenir", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif;
	}

	/* ===== 深色主题覆盖 ===== */
	.theme-dark {
		--color-bg-page: #0F1117;
		--color-bg-page-alt: #0F1117;
		--color-bg-page-white: #151823;
		--color-bg-card: #1A1D27;
		--color-bg-input: #1A1D27;
		--color-bg-hover: #252836;
		--color-bg-tag: #252836;
		--color-bg-secondary: #252836;
		--color-border: #2A2D3A;
		--color-border-light: #1F222D;
		--color-text-primary: #E2E4EA;
		--color-text-heading: #F0F2F7;
		--color-text-section: #D0D4DE;
		--color-text-secondary: #6B7280;
		--color-text-tertiary: #8892A4;
		--color-brand: #5B8DEF;
		--color-brand-light: #7BA4F7;
		--color-brand-bg: rgba(91, 141, 239, 0.10);
		--color-danger: #EF4444;
		--color-danger-bg: #2D1B1B;
		--color-success: #34D399;
		--color-warning: #FBBF24;
		--color-nav-bg: #151823;
		--color-tab-shadow: rgba(0, 0, 0, 0.3);
		--color-skeleton-from: #252836;
		--color-skeleton-to: #1F222D;
		--color-card-shadow: rgba(0, 0, 0, 0.3);

		background-color: var(--color-bg-page) !important;
		color: var(--color-text-primary);
	}

	page, view, text, input, textarea, button {
		font-family: "DIN Alternate", "Avenir Next", "Avenir", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif;
	}
</style>
