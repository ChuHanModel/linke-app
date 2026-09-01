import logger from '@/utils/logger.js'
import { getLastScoreImportDebug } from '@/utils/evaluationLoader.js'
import { restoreToGlobalData } from '@/utils/appGlobalStorage.js'
import { checkUpdate, getLocalVersion } from '@/services/app/updateService.js'
import {
  hasStoredSession,
  clearSessionKeepCredentials
} from '@/services/auth/sessionService.js'
import {
  refreshLoginTestConfig,
  isLoginTestForceReloginActive,
  hasHandledLoginTestForceRelogin,
  markLoginTestForceReloginHandled
} from '@/services/app/loginTestService.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'

/**
 * 检测本次启动与上次相比 versionCode 是否发生了变化（即经历了一次 wgt 热更新或整包升级）。
 * 只有更新下载阶段写入了 _wgtUpdateForceLogout 标记时，才强制登出（保留账号密码）。
 *
 * 原因：wgt 更新后前端代码变了但 loginCookie 可能跟新版本的前端逻辑不兼容（比如新版本改了
 * 初始化顺序、globalData 结构、service 缓存等），强制重新走一遍登录流程能规避这类迁移坑。
 * 同时强制用户重新跟教务系统建立新 cookie，也能顺带清理过期 session。
 *
 * 2026-05-15 调整：
 * 生产登录测试需要支持"只采集全新设备登录"或"用户手动退出后再登录"等场景，
 * 不能再把所有 versionCode 跳变都硬编码为强制登出。是否强制重登由后端
 * update.{platform}.forceRelogin 或 login.test.forceRelogin 决定。
 *
 * 1.0.15 调整：
 * login.test.forceRelogin 不再必须依赖一次新的 WGT 安装。客户端启动时会主动读取
 * App.LoginTest.GetConfig；若测试开关开启、平台匹配、当前时间命中测试窗口，且
 * forceRelogin=true，就清登录态并跳转登录页。同一个 platform + startAt + endAt
 * 测试窗口只处理一次，避免用户在同一轮测试里被重复踢出。
 *
 * 1.0.5 关键修复：
 * 之前用 `if (lastCode && currentCode && lastCode !== currentCode)` 来防"全新安装"误触发，
 * 但这同时也防住了"老版本第一次升上来"的常见路径（因为老版本根本没写过 lastSeenVersionCode，
 * lastCode 自然为空）。结果就是 1.0.4 推给所有 1.0.3 用户时，强制登出全部静默失效。
 * 修正：改成检测 loginCookie 是否存在来区分"全新安装/已登出"和"老版本升级"。
 */
function checkVersionChangeAndLogout() {
  try {
    const local = getLocalVersion()
    const currentCode = String(local && local.versionCode ? local.versionCode : '')
    const lastCode = String(uni.getStorageSync('lastSeenVersionCode') || '')
    if (currentCode) {
      uni.setStorageSync('lastSeenVersionCode', currentCode)
    }
    if (!currentCode || lastCode === currentCode) return
    const reloginFlag = uni.getStorageSync('_wgtUpdateForceLogout')
    if (!reloginFlag) {
      console.log('[bootstrap] versionCode 跳变 ' + (lastCode || '<空>') + ' -> ' + currentCode + '，但后端未要求强制重登，跳过')
      return
    }
    // 没 loginCookie 说明本来就是登出状态（fresh install / 已手动登出）→ 不需要再"强制登出"
    const hadSession = !!uni.getStorageSync('loginCookie')
    if (!hadSession) {
      console.log('[bootstrap] versionCode 跳变 ' + (lastCode || '<空>') + ' -> ' + currentCode + '，但当前无 session，跳过强制登出')
      return
    }
    console.log('[bootstrap] 检测到 versionCode 跳变 ' + (lastCode || '<空>') + ' -> ' + currentCode + '，且有有效 session，强制登出保留账号密码')
    clearSessionKeepCredentials()
    uni.setStorageSync('_wgtUpdateForceLogout', { from: lastCode || '', to: currentCode, at: Date.now() })
  } catch (e) {
    console.warn('[bootstrap] checkVersionChangeAndLogout 失败:', e && (e.message || e))
  }
}

function routeToLoginForLoginTestForceRelogin() {
  try {
    const pages = getCurrentPages()
    const currentRoute = pages && pages.length ? pages[pages.length - 1].route : ''
    const loginRoute = JW_LOGIN_PAGE.replace(/^\//, '')
    if (currentRoute === loginRoute) return
    uni.reLaunch({ url: JW_LOGIN_PAGE + '?from=loginTestForceRelogin' })
  } catch (e) {
    try {
      uni.reLaunch({ url: JW_LOGIN_PAGE })
    } catch (err) {}
  }
}

async function checkLoginTestForceRelogin() {
  try {
    const config = await refreshLoginTestConfig()
    if (!isLoginTestForceReloginActive(config)) return
    if (hasHandledLoginTestForceRelogin(config)) {
      console.log('[bootstrap] 登录测试强制重登已在当前窗口处理过，跳过')
      return
    }
    if (!hasStoredSession()) {
      console.log('[bootstrap] 登录测试强制重登命中，但当前无有效 session，跳过')
      markLoginTestForceReloginHandled(config, {
        reason: 'login-test-force-relogin-no-session',
        versionCode: String((getLocalVersion() || {}).versionCode || '')
      })
      return
    }
    console.log('[bootstrap] 登录测试强制重登命中，清理登录态并跳转登录页')
    clearSessionKeepCredentials()
    markLoginTestForceReloginHandled(config, {
      reason: 'login-test-force-relogin',
      versionCode: String((getLocalVersion() || {}).versionCode || '')
    })
    setTimeout(routeToLoginForLoginTestForceRelogin, 0)
  } catch (e) {
    console.warn('[bootstrap] checkLoginTestForceRelogin 失败:', e && (e.message || e))
  }
}

export function initApp(app) {
  logger.init()
  // 必须在 restoreToGlobalData 之前跑，这样强制登出清理的 globalData 不会被老 storage 覆盖
  checkVersionChangeAndLogout()
  restoreToGlobalData()
  // 独立于 WGT 安装的生产登录测试强制重登检查，不阻塞启动。
  checkLoginTestForceRelogin()
  if (app) app.getLastScoreImportDebug = getLastScoreImportDebug
  try {
    const last = getLastScoreImportDebug()
    if (last) console.log('[成绩导入调试] 上次导入结果', last)
  } catch (e) {}
  // 异步检查版本更新，不阻塞启动
  checkUpdate({ silent: true })
}
