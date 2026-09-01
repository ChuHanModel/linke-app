import * as api from '@/repositories/appApi.js'
import { APP_SERVICES } from '@/constants/services.js'
import { saveLoginTestConfig } from '@/services/app/loginTestService.js'
import { sha256 } from '@/utils/sha256.js'

const SKIP_STORAGE_KEY = 'update_skip_until'
const SKIP_DURATION = 24 * 60 * 60 * 1000 // 24 小时
let wgtInstalledThisSession = false // 本次会话是否已安装 wgt（等待重启）

// T2-d：WGT 下载地址白名单，只允许官方下载目录的 HTTPS 地址
const WGT_URL_ALLOWLIST = ['https://api.linketeam.com/download/']

/** 校验 WGT 下载地址是否命中白名单（导出以便测试） */
export function isAllowedWgtUrl(url) {
  if (typeof url !== 'string' || url === '') return false
  return WGT_URL_ALLOWLIST.some(prefix => url.startsWith(prefix))
}

/** 期望 hash 归一化（去空白、转小写；导出以便测试） */
export function normalizeExpectedSha256(expected) {
  return typeof expected === 'string' ? expected.trim().toLowerCase() : ''
}

/**
 * 获取本地版本信息
 * 优先从 manifest.json 读取，确保调试和正式包版本号一致
 */
export function getLocalVersion() {
  const manifest = __MANIFEST_VERSION__ || {}
  return {
    version: manifest.version || '1.0.0',
    versionCode: parseInt(manifest.versionCode) || 100
  }
}

/**
 * 检查版本更新
 * @param {Object} options
 * @param {boolean} options.silent - true: 启动时静默检查（无更新不提示，跳过期内不弹窗）
 */
export async function checkUpdate({ silent = true } = {}) {
  try {
    const local = getLocalVersion()
    const platform = uni.getSystemInfoSync().platform === 'ios' ? 'ios' : 'android'

    const result = await api.post(APP_SERVICES.updateCheck, {
      platform,
      currentVersionCode: local.versionCode
    })
    if (result && result.loginTest) {
      saveLoginTestConfig(result.loginTest)
    }

    if (!result || !result.needUpdate) {
      if (!silent) {
        uni.showToast({ title: '已是最新版本', icon: 'none' })
      }
      return
    }

    // 静默模式下，检查是否在跳过期内（强制更新不受此限制）
    if (silent && !result.mustUpdate && isSkipped()) {
      return
    }

    // wgt 热更新
    if (result.updateType === 'wgt') {
      // 本次会话已安装过，直接提示重启，不重复下载安装
      if (wgtInstalledThisSession) {
        // #ifdef APP-PLUS
        uni.showModal({
          title: '更新已就绪',
          content: '新版本已安装，重启后生效',
          confirmText: '立即重启',
          cancelText: '稍后',
          success(res) { if (res.confirm) plus.runtime.restart() }
        })
        // #endif
        return
      }
      // 后端 silentUpdate 控制是否无感更新；手动检查更新时始终弹窗
      var isSilent = silent && result.silentUpdate
      handleWgtUpdate(result, { silent: isSilent })
      return
    }

    // 整包更新：弹窗提示
    showUpdateModal(result)
  } catch (e) {
    console.warn('[update] 检查更新失败:', e)
    if (!silent) {
      uni.showToast({ title: '检查更新失败，请稍后再试', icon: 'none' })
    }
  }
}

/**
 * 是否在跳过期内
 */
function isSkipped() {
  try {
    const skipUntil = uni.getStorageSync(SKIP_STORAGE_KEY)
    return skipUntil && Date.now() < Number(skipUntil)
  } catch (e) {
    return false
  }
}

/**
 * 记录跳过时间
 */
function setSkipped() {
  try {
    uni.setStorageSync(SKIP_STORAGE_KEY, String(Date.now() + SKIP_DURATION))
  } catch (e) {}
}

/**
 * 读取本地文件为 ArrayBuffer（APP-PLUS 专用）
 */
function readFileArrayBuffer(path) {
  return new Promise((resolve, reject) => {
    // tempFilePath 可能带 file:// 前缀，resolveLocalFileSystemURL 两种都接受
    plus.io.resolveLocalFileSystemURL(path, (entry) => {
      entry.file((file) => {
        const reader = new plus.io.FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (err) => reject(err)
        reader.readAsArrayBuffer(file)
      }, (err) => reject(err))
    }, (err) => reject(err))
  })
}

/**
 * wgt 热更新
 * 下载 wgt 包 → SHA-256 校验 → 静默安装 → 提示重启
 *
 * T2-d 安装前置条件（任一不满足直接拒绝安装）：
 * 1. updateUrl 命中 HTTPS 白名单（防配置被篡改指向任意地址）
 * 2. 后端下发 sha256（缺失视为不可信，禁止静默安装）
 * 3. 下载内容 sha256 与期望一致（防下载链路被替换）
 */
async function handleWgtUpdate(result, { silent }) {
  // #ifdef APP-PLUS
  const url = result.updateUrl
  if (!url) {
    if (!silent) {
      uni.showToast({ title: '热更新地址未配置', icon: 'none' })
    }
    return
  }

  const expectedSha256 = normalizeExpectedSha256(result.sha256)

  // 前置 1：下载地址白名单
  if (!isAllowedWgtUrl(url)) {
    console.warn('[update] WGT 地址不在白名单，拒绝下载:', url)
    if (!silent) {
      uni.showToast({ title: '更新地址异常，已取消下载', icon: 'none' })
    }
    return
  }

  // 前置 2：必须携带 sha256
  if (!expectedSha256) {
    console.warn('[update] 后端未下发 sha256，拒绝安装（updateUrl:', url + '）')
    if (!silent) {
      uni.showToast({ title: '更新包缺少校验信息，已取消安装', icon: 'none' })
    }
    return
  }

  console.log('[update] 开始下载 wgt:', url)

  const downloadTask = uni.downloadFile({
    url,
    async success(downloadRes) {
      if (downloadRes.statusCode !== 200) {
        console.warn('[update] wgt 下载失败, statusCode:', downloadRes.statusCode)
        if (!silent) {
          uni.showToast({ title: '下载更新包失败', icon: 'none' })
        }
        return
      }

      // 前置 3：下载内容 SHA-256 校验
      let actualSha256 = ''
      try {
        const buffer = await readFileArrayBuffer(downloadRes.tempFilePath)
        actualSha256 = sha256(buffer)
      } catch (e) {
        console.error('[update] 读取下载包失败，拒绝安装:', e)
        if (!silent) {
          uni.showToast({ title: '校验更新包失败，已取消安装', icon: 'none' })
        }
        return
      }
      if (actualSha256 !== expectedSha256) {
        console.error('[update] wgt sha256 不一致，拒绝安装。expected:', expectedSha256, 'actual:', actualSha256)
        if (!silent) {
          uni.showToast({ title: '更新包校验失败，已取消安装', icon: 'none' })
        }
        return
      }

      console.log('[update] wgt 下载完成且校验通过，开始安装')

      plus.runtime.install(
        downloadRes.tempFilePath,
        { force: true },
        () => {
          console.log('[update] wgt 安装成功')
          wgtInstalledThisSession = true

          // 后端指定 forceRelogin 时，写标记让下次启动强制退出登录
          if (result.forceRelogin) {
            try {
              uni.setStorageSync('_wgtUpdateForceLogout', {
                from: String(getLocalVersion().versionCode),
                to: String(result.latestVersionCode),
                at: Date.now()
              })
              console.log('[update] forceRelogin 标记已写入')
            } catch (e) {}
          }

          if (silent) {
            // 无感更新：静默安装完成，下次冷启动自动生效
            console.log('[update] 静默模式，跳过弹窗，下次启动生效')
            return
          }
          uni.showModal({
            title: '更新完成',
            content: result.updateDesc || '新版本已准备就绪，重启后生效',
            showCancel: !result.mustUpdate,
            confirmText: '立即重启',
            cancelText: '稍后',
            success(res) {
              if (res.confirm) {
                plus.runtime.restart()
              }
            }
          })
        },
        (e) => {
          console.error('[update] wgt 安装失败:', e)
          if (!silent) {
            uni.showToast({ title: '安装更新包失败', icon: 'none' })
          }
        }
      )
    },
    fail(e) {
      console.warn('[update] wgt 下载请求失败:', e)
      if (!silent) {
        uni.showToast({ title: '下载更新包失败', icon: 'none' })
      }
    }
  })
  // #endif
  // #ifndef APP-PLUS
  if (!silent) {
    uni.showToast({ title: '当前环境不支持热更新', icon: 'none' })
  }
  // #endif
}

/**
 * 弹出整包更新提示
 */
function showUpdateModal(result) {
  const content = result.updateDesc || `发现新版本 ${result.latestVersion}`

  uni.showModal({
    title: '发现新版本',
    content,
    showCancel: !result.mustUpdate,
    confirmText: '立即更新',
    cancelText: '稍后提醒',
    success(res) {
      if (res.confirm) {
        openStoreUrl(result.updateUrl)
      } else if (res.cancel) {
        setSkipped()
      }
    }
  })
}

/**
 * 打开应用商店链接
 */
function openStoreUrl(url) {
  if (!url) {
    uni.showToast({ title: '更新地址未配置', icon: 'none' })
    return
  }
  // #ifdef APP-PLUS
  plus.runtime.openURL(url)
  // #endif
  // #ifndef APP-PLUS
  window.open(url)
  // #endif
}
