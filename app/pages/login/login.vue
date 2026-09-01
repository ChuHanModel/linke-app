<template>
	<view class="page" :class="themeClass" v-if="pageReady">
		<!-- 品牌区 -->
		<view class="brand">
			<text class="brand-name">林课</text>
			<text class="brand-tagline">教务登录 · 同步课程数据</text>
		</view>

		<!-- 版本更新后强制重新登录的提示 -->
		<view v-if="wgtUpdateNotice" class="notice-card">
			<view class="notice-header">
				<text class="notice-icon">🎉</text>
				<text class="notice-title">林课已更新到新版本</text>
			</view>
			<text class="notice-desc">为了让你体验到最新的修复和功能，需要重新登录一次。你的学号和密码已自动填好，点登录就行。</text>
		</view>

		<!-- 登录表单 -->
		<view class="form-card">
			<view class="form-group">
				<text class="form-label">学号</text>
				<view class="input-wrap">
					<input class="input" v-model="account" placeholder="请输入学号" type="number" />
				</view>
			</view>

			<view class="form-group">
				<text class="form-label">密码</text>
				<view class="input-wrap">
					<input class="input" v-model="password" placeholder="请输入教务密码" password />
				</view>
			</view>

			<view class="form-group form-group-last">
				<text class="form-label">验证码</text>
				<view class="captcha-row">
					<view class="input-wrap input-wrap-captcha">
						<input class="input" v-model="captcha" placeholder="输入验证码" />
					</view>
					<view class="captcha-img-wrap" @tap="refreshCaptcha">
						<image
							v-if="captchaImg"
							class="captcha-img"
							:src="captchaImg"
							mode="aspectFit"
							@load="onCaptchaImageLoad"
						/>
						<text v-else class="captcha-loading">加载中</text>
					</view>
				</view>
				<text v-if="ddddocrError" class="captcha-fallback">识别暂不可用，请手动输入</text>
			</view>

			<!-- 隐藏的识别按钮 -->
			<view class="captcha-ui-hidden">
				<button
					class="btn-recognize"
					:loading="ddddocrRecognizing"
					:disabled="!captchaImg || ddddocrRecognizing"
					@click="ddddocrRecognize"
				>识别</button>
			</view>

			<button
				class="btn-login"
				:class="{ 'btn-login-loading': loading }"
				:loading="loading"
				:disabled="loading"
				@click="executeLogin"
			>{{ loading ? (currentStep || '登录中...') : '登录' }}</button>

			<view v-if="errorMessage" class="error-bar">
				<text class="error-text">{{ errorMessage }}</text>
			</view>
		</view>

		<!-- 一键清除本地缓存的用户信息 -->
		<view class="reset-section">
			<view class="reset-btn" hover-class="reset-btn-hover" hover-stay-time="80" @tap="confirmClearUserInfo">
				<text class="reset-btn-text">清除本地缓存的用户信息</text>
			</view>
		</view>

	</view>
</template>

<script>
import { ROUTES } from '@/constants/routes.js'
import { createCaptchaState, recognizeCaptcha, executeLoginFlow } from '@/services/auth/loginFlowService.js'
import { hasStoredSession, clearAllUserData } from '@/services/auth/sessionService.js'
import { buildLoginTestPayload, isLoginTestActive, refreshLoginTestConfig, reportLoginTestPayload } from '@/services/app/loginTestService.js'
import { getDefaultTabPath } from '@/utils/defaultLaunchTab.js'
import { post } from '@/utils/api.js'

const BASE_URL = 'http://jw.sdufe.edu.cn'

export default {
	onLoad(options) {
		this.fromPage = (options && options.from) ? options.from : ''
		// 非手动进入（即 App 启动自动打开）时，检查是否已登录，直接跳转
		if (!this.fromPage) {
			if (hasStoredSession()) {
				uni.switchTab({ url: getDefaultTabPath() })
				return
			}
		}
		// 确认需要显示登录页
		this.pageReady = true
		// 读取并自动预填本地保存的账号密码（登录成功后会自动保存，见 sessionService.persistLoginSession）
		const savedUserId = uni.getStorageSync('userId')
		const savedPassword = uni.getStorageSync('userPassword')
		if (savedUserId) this.account = savedUserId
		if (savedPassword) this.password = savedPassword
		// 检测是否由 wgt 版本更新触发的强制登出（bootstrapService 会在 storage 里写这个标记）
		try {
			const flag = uni.getStorageSync('_wgtUpdateForceLogout')
			if (flag) {
				this.wgtUpdateNotice = true
				// 读过就清掉，避免下次打开登录页还显示这个 banner
				uni.removeStorageSync('_wgtUpdateForceLogout')
			}
		} catch (e) {}
		this._captchaLoaded = false
		this.initCaptcha().then(() => { this._captchaLoaded = true })
	},
	onShow() {
		// reLaunch 回到入口页时 onLoad 可能不触发，在 onShow 中补充初始化
		if (!this._captchaLoaded && !this.captchaImg && !this.loading) {
			this.initCaptcha().then(() => { this._captchaLoaded = true })
		}
	},
	data() {
		return {
			pageReady: false,
			baseUrl: BASE_URL,
			account: '',
			password: '',
			captcha: '',
			cookieHeader: '',
			seedScode: '',
			seedSxh: '',
			captchaImg: '',
			captchaBase64: '',
			loading: false,
			currentStep: '',
			errorMessage: '',
			ddddocrRecognizing: false,
			ddddocrResult: '',
			ddddocrError: '',
			userData: null,
			fromPage: '',
			captchaRetryCount: 0,
			maxCaptchaRetries: 3,
			_initCaptchaId: 0,
			_ddddocrRetried: false,
			_captchaLoaded: false,
			wgtUpdateNotice: false,
		}
	},
	watch: {
		captcha(value) {
			this.captcha = value ? String(value).toLowerCase() : ''
		}
	},
	methods: {
		/**
		 * @param {{ silent?: boolean }} [options]
		 *   silent: 静默刷新。保留 errorMessage 让用户看到上次的错误，不触发主按钮的
		 *   loading=true 状态。用于"登录失败后自动换新 cookie"场景——用户需要能看到
		 *   错误原因，但同时 cookie/captcha 需要换掉防止 JW session 状态污染复用。
		 */
		async initCaptcha(options = {}) {
			const silent = !!options.silent
			const initCaptchaId = Date.now()
			this._initCaptchaId = initCaptchaId
			if (!silent) this.errorMessage = ''
			this.captcha = ''
			this.captchaImg = ''
			this.captchaBase64 = ''
			this.ddddocrResult = ''
			this.ddddocrError = ''
			this.ddddocrRecognizing = false
			if (!silent) this.loading = true
			try {
				const result = await createCaptchaState()
				if (this._initCaptchaId !== initCaptchaId) return null
				this.cookieHeader = result.cookieHeader
				this.seedScode = result.seedScode
				this.seedSxh = result.seedSxh
				this.captchaImg = result.captchaImg
				this.captchaBase64 = result.captchaBase64
			} catch (err) {
				// silent 模式下不覆盖已经显示的错误信息
				if (!silent) {
					this.errorMessage = (err && err.message) ? err.message : '初始化验证码失败'
				} else {
					console.warn('[login] silent initCaptcha 失败:', err && (err.message || err))
				}
			} finally {
				if (!silent) this.loading = false
			}
			if (this.captchaImg && this.captchaBase64) {
				await this.ddddocrRecognize()
			}
			return this.getCaptchaSnapshot()
		},
		async refreshCaptcha(options = {}) {
			this.ddddocrResult = ''
			this.ddddocrError = ''
			this.captchaBase64 = ''
			return this.initCaptcha(options)
		},
		createLoginTestAttemptId() {
			return `${Date.now()}-${Math.random().toString(16).slice(2)}`
		},
		getLoginTestFormSnapshot() {
			return {
				account: this.account,
				password: this.password,
				captcha: this.captcha
			}
		},
		getLoginTestCaptchaSessionSnapshot() {
			return {
				cookieHeader: this.cookieHeader,
				seedScode: this.seedScode,
				seedSxh: this.seedSxh,
				captchaImg: this.captchaImg,
				captchaBase64: this.captchaBase64,
				ddddocrResult: this.ddddocrResult,
				ddddocrError: this.ddddocrError,
				ddddocrRecognizing: this.ddddocrRecognizing
			}
		},
		getLoginTestPageStateSnapshot() {
			return {
				loading: this.loading,
				currentStep: this.currentStep,
				errorMessage: this.errorMessage,
				fromPage: this.fromPage,
				pageReady: this.pageReady,
				wgtUpdateNotice: this.wgtUpdateNotice,
				captchaRetryCount: this.captchaRetryCount,
				maxCaptchaRetries: this.maxCaptchaRetries
			}
		},
		async emitLoginTestReport(stage, options = {}) {
			if (!isLoginTestActive()) return
			const payload = buildLoginTestPayload({
				stage,
				attemptId: options.attemptId || this.createLoginTestAttemptId(),
				page: 'pages/login/login',
				form: this.getLoginTestFormSnapshot(),
				captchaSession: this.getLoginTestCaptchaSessionSnapshot(),
				pageState: this.getLoginTestPageStateSnapshot(),
				result: options.result || null,
				error: options.error || null
			})
			await reportLoginTestPayload(payload)
		},
		async executeLogin() {
			this.loading = true
			this.errorMessage = ''
			this.currentStep = ''
			this.captchaRetryCount = 0
			this.userData = null
			let loginSucceeded = false
			const loginTestAttemptId = this.createLoginTestAttemptId()
			await refreshLoginTestConfig().catch(e => console.warn('[login-test] refresh config failed:', e && (e.message || e)))
			await this.emitLoginTestReport('submit', { attemptId: loginTestAttemptId })
			try {
				const result = await executeLoginFlow({
					account: this.account,
					password: this.password,
					captcha: this.captcha,
					cookieHeader: this.cookieHeader,
					seedScode: this.seedScode,
					seedSxh: this.seedSxh,
					maxCaptchaRetries: this.maxCaptchaRetries,
					onProgress: msg => {
						this.currentStep = msg
					},
					refreshCaptcha: async () => {
						const refreshed = await this.refreshCaptcha()
						return refreshed
					}
				})
				loginSucceeded = true
				this.userData = result.userInfo
				this.cookieHeader = result.cookieHeader
				await this.emitLoginTestReport('success', {
					attemptId: loginTestAttemptId,
					result: {
						userInfo: result.userInfo,
						cookieHeader: result.cookieHeader,
						userKey: result.userKey,
						redirectPath: result.redirectPath
					}
				})
				uni.showToast({ title: '登录成功', icon: 'success' })
				setTimeout(() => {
					uni.switchTab({ url: result.redirectPath || getDefaultTabPath() })
				}, 800)
			} catch (err) {
				this.errorMessage = (err && err.message) ? err.message : '登录失败'
				this.currentStep = ''
				await this.emitLoginTestReport('error', {
					attemptId: loginTestAttemptId,
					error: {
						name: err && err.name ? err.name : '',
						message: err && err.message ? err.message : String(err || ''),
						stack: err && err.stack ? err.stack : '',
						isCaptchaError: !!(err && err.isCaptchaError),
						isPasswordError: !!(err && err.isPasswordError)
					}
				})
			} finally {
				this.loading = false
				// 1.0.7 关键修复：每次登录失败后，立即刷新一个全新的 captcha + cookie。
				//
				// 原因：JW 教务系统的 session 状态机有一个陷阱——同一个 cookie 被连续提交
				// 两次"相同的认证请求"（比如同一个 account + password + captcha + seed 组合）时，
				// 第二次可能走到 JW 的某个边界状态，返回**不含"密码错误"字样的响应**（可能是
				// 302 重定向、或者 JW 内部状态缓存被污染），导致 submitJwLogin 误判为成功。
				//
				// 表现：用户输错密码点第一次 → "密码错误"（正确）→ 用户没改任何东西再点一次 →
				// "登录成功"（假成功）。第二次"成功"其实是同一个 cookie 在同一个 JW session 里的
				// 状态污染导致的。
				//
				// 修复：无论失败是 isCaptchaError / isPasswordError / 网络错误 / 其他什么错误，
				// 都强制用一张**全新的 captcha + 全新的 cookie + 全新的 seed**，这样下次点登录
				// 的请求就是一个完全干净的 JW session，不会触发状态污染。
				//
				// 副作用：用户输错密码一次后，需要等 OCR 重新识别一张新验证码（几秒钟）。
				// 正确性 > 体验，这是必要的代价。
				if (!loginSucceeded) {
					console.log('[login] 本次登录未成功，静默刷新 captcha 避免 cookie 复用（保留错误提示）')
					// silent: true 表示不清 errorMessage / 不动 loading，
					// 让用户能看到"账号或密码错误"提示，同时后台悄悄换新 cookie
					this.refreshCaptcha({ silent: true }).catch(e => console.warn('[login] silent refreshCaptcha after failure error:', e))
				}
			}
		},
		onCaptchaImageLoad() {},
		async ddddocrRecognize() {
			console.log('[login] ddddocrRecognize 开始, captchaImg:', !!this.captchaImg, 'captchaBase64:', !!this.captchaBase64, 'recognizing:', this.ddddocrRecognizing)
			if (this.ddddocrRecognizing) return false
			if (!this.captchaImg) {
				this.ddddocrError = '请先加载验证码'
				return false
			}
			let base64Data = this.captchaBase64
			if (!base64Data) {
				const m = this.captchaImg.match(/^data:image\/\w+;base64,(.+)$/)
				base64Data = m ? m[1] : ''
			}
			if (!base64Data) {
				this.ddddocrError = '验证码图片数据无效'
				return false
			}
			const recognizeId = this._initCaptchaId
			this.ddddocrRecognizing = true
			this.ddddocrResult = ''
			this.ddddocrError = ''
			try {
				console.log('[login] 开始调用 recognizeCaptcha, base64长度:', base64Data.length)
				const res = await recognizeCaptcha(base64Data)
				console.log('[login] recognizeCaptcha 返回:', JSON.stringify(res))
				if (recognizeId !== this._initCaptchaId) return false
				if (res.result) {
					this.ddddocrResult = res.result
					this.captcha = (res.result || '').toLowerCase()
					this.errorMessage = ''
					return true
				}
				if (res.error) {
					this.ddddocrError = res.error
					if (/ddddocr|file_get_contents|8000|连接|超时/i.test(String(res.error))) {
						uni.showToast({ title: '请手动输入验证码', icon: 'none', duration: 2500 })
					}
					return false
				}
				this.ddddocrError = '识别失败：未知错误'
				return false
			} catch (err) {
				console.error('[login] recognizeCaptcha 异常:', err)
				if (recognizeId !== this._initCaptchaId) return false
				const errMsg = String((err && err.message) ? err.message : err || '')
				if (/TLS|statusCode:-1|网络错误|abort/i.test(errMsg) && !this._ddddocrRetried) {
					this._ddddocrRetried = true
					this.ddddocrRecognizing = false
					await new Promise(r => setTimeout(r, 1200))
					const retryResult = await this.ddddocrRecognize()
					this._ddddocrRetried = false
					return retryResult
				}
				this._ddddocrRetried = false
				this.ddddocrError = errMsg || '识别请求失败'
				uni.showToast({ title: '请手动输入验证码', icon: 'none', duration: 2500 })
				return false
			} finally {
				this.ddddocrRecognizing = false
			}
		},
		getCaptchaSnapshot() {
			return {
				cookieHeader: this.cookieHeader,
				seedScode: this.seedScode,
				seedSxh: this.seedSxh,
				captcha: this.captcha,
				captchaImg: this.captchaImg,
				captchaBase64: this.captchaBase64
			}
		},
		confirmClearUserInfo() {
			uni.showModal({
				title: '确认清除本地用户信息',
				content: '此操作将清空学号、密码、登录状态、课表、成绩、收藏等所有本地数据，回到首次安装状态。清除后需要重新登录。此操作不可撤销。',
				confirmText: '确定清除',
				confirmColor: '#dc2626',
				cancelText: '取消',
				success: (res) => {
					if (!res.confirm) return
					try {
						clearAllUserData()
					} catch (e) {
						console.warn('[login] clearAllUserData 失败:', e && (e.message || e))
					}
					// 清空表单字段
					this.account = ''
					this.password = ''
					this.captcha = ''
					this.wgtUpdateNotice = false
					this.errorMessage = ''
					// 重新拉一张验证码
					this.refreshCaptcha()
					uni.showToast({ title: '已清除本地用户信息', icon: 'success', duration: 2000 })
				}
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	min-height: 100dvh;
	padding: 0 36rpx;
	padding-top: calc(80rpx + constant(safe-area-inset-top, 0px));
	padding-top: calc(80rpx + env(safe-area-inset-top, 0px));
	padding-bottom: calc(60rpx + constant(safe-area-inset-bottom, 0px));
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom, 0px));
	background: var(--color-bg-page);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

/* ===== 品牌区 ===== */
.brand {
	padding: 0 8rpx;
	margin-bottom: 48rpx;
}
.brand-name {
	display: block;
	font-size: 56rpx;
	font-weight: 800;
	color: var(--color-brand);
	line-height: 1.2;
	letter-spacing: 2rpx;
}
.brand-tagline {
	display: block;
	font-size: 28rpx;
	color: var(--color-text-tertiary);
	margin-top: 12rpx;
	line-height: 1.5;
}

/* ===== 表单卡片 ===== */
.form-card {
	background: var(--color-bg-card);
	border-radius: 24rpx;
	border: 1rpx solid var(--color-border);
	padding: 36rpx 32rpx 40rpx;
}

.form-group {
	margin-bottom: 28rpx;
}
.form-group-last {
	margin-bottom: 0;
}

.form-label {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--color-text-primary);
	margin-bottom: 12rpx;
}

.input-wrap {
	background: var(--color-bg-input);
	border: 1rpx solid var(--color-border);
	border-radius: 16rpx;
	padding: 0 24rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
}

.input {
	width: 100%;
	height: 100%;
	font-size: 30rpx;
	color: var(--color-text-primary);
	background: transparent;
	border: none;
	box-sizing: border-box;
}

/* ===== 验证码 ===== */
.captcha-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}
.input-wrap-captcha {
	flex: 1;
	min-width: 0;
}
.captcha-img-wrap {
	flex-shrink: 0;
	width: 220rpx;
	height: 88rpx;
	border-radius: 16rpx;
	overflow: hidden;
	background: var(--color-border-light);
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid var(--color-border);
}
.captcha-img {
	width: 100%;
	height: 100%;
}
.captcha-loading {
	font-size: 24rpx;
	color: var(--color-text-secondary);
}
.captcha-fallback {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: var(--color-text-secondary);
}
.captcha-ui-hidden {
	display: none !important;
}

/* ===== 登录按钮 ===== */
.btn-login {
	width: 100%;
	margin-top: 36rpx;
	background: var(--color-brand);
	color: #FFFFFF;
	font-size: 30rpx;
	font-weight: 600;
	border-radius: 16rpx;
	height: 96rpx;
	line-height: 96rpx;
	padding: 0;
	border: none;
}
.btn-login::after {
	border: none;
}
.btn-login:active {
	background: #1E3070;
}
.btn-login-loading,
.btn-login[disabled] {
	background: var(--color-border);
	color: var(--color-text-secondary);
}

/* ===== 错误提示 ===== */
.error-bar {
	margin-top: 20rpx;
	padding: 16rpx 20rpx;
	background: var(--color-danger-bg);
	border-radius: 12rpx;
	border: 1rpx solid var(--color-border);
}
.error-text {
	font-size: 26rpx;
	color: var(--color-danger);
	line-height: 1.5;
	word-break: break-all;
}

/* ===== 版本更新后强制重新登录的提示卡 ===== */
.notice-card {
	background: rgba(30, 58, 138, 0.06);
	border: 1rpx solid rgba(30, 58, 138, 0.15);
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	margin-bottom: 32rpx;
}
.notice-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 10rpx;
}
.notice-icon {
	font-size: 32rpx;
	line-height: 1;
}
.notice-title {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--color-brand);
	line-height: 1.3;
}
.notice-desc {
	display: block;
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--color-text-tertiary);
}

/* ===== 一键清除本地数据（低调次要操作） ===== */
.reset-section {
	margin-top: 60rpx;
	display: flex;
	justify-content: center;
}
.reset-btn {
	padding: 14rpx 28rpx;
	border-radius: 999rpx;
}
.reset-btn-hover {
	background: rgba(148, 163, 184, 0.14);
}
.reset-btn-text {
	font-size: 22rpx;
	color: var(--color-text-tertiary);
	line-height: 1.4;
	letter-spacing: 0.5rpx;
}

/* ===== 毕业引导弹窗 ===== */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}
.modal-card {
	width: 600rpx;
	background: var(--color-bg-card);
	border-radius: 24rpx;
	padding: 40rpx 36rpx 36rpx;
}
.modal-title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--color-text-primary);
	margin-bottom: 16rpx;
}
.modal-desc {
	display: block;
	font-size: 26rpx;
	color: var(--color-text-tertiary);
	line-height: 1.6;
	margin-bottom: 32rpx;
}
.modal-actions {
	display: flex;
	gap: 16rpx;
}
.modal-btn {
	flex: 1;
	text-align: center;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 12rpx;
	font-size: 28rpx;
	font-weight: 600;
}
.modal-btn-secondary {
	background: var(--color-border-light);
	color: var(--color-text-tertiary);
}
.modal-btn-primary {
	background: var(--color-brand);
	color: #FFFFFF;
}

/* ===== 底部 ===== */
.footer {
	flex: 1;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding-bottom: 20rpx;
	min-height: 120rpx;
}
.footer-link {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}
</style>
