const { ipcRenderer } = require('electron')

const ALLOWED_HOSTS = new Set(['jw.sdufe.edu.cn'])
const CAPTCHA_IMAGE_SELECTOR = '#SafeCodeImg, img[src*="verifycode.servlet"]'
const CAPTCHA_INPUT_SELECTOR = '#RANDOMCODE, input[name="RANDOMCODE"]'
const ACCOUNT_INPUT_SELECTOR = '#userAccount, input[name="userAccount"], input[placeholder*="账号"], input[placeholder*="学号"]'
const PASSWORD_INPUT_SELECTOR = '#userPassword, input[name="userPassword"], input[type="password"], input[placeholder*="密码"]'
const PENDING_LOGIN_CREDENTIALS_KEY = 'linke.pendingLoginCredentials.v1'
const PERSONAL_NOTICE_DIALOG_SESSION_KEY = 'linke.personalNoticeDialogMode.v1'
const PERSONAL_NOTICE_WINDOW_INTENT_MS = 4000
const PERSONAL_NOTICE_CLOSE_SUPPRESS_MS = 6500
const PERSONAL_NOTICE_DIAGNOSTIC_KEY = 'linke.personalNoticeDiagnostics'
const PERSONAL_NOTICE_LIMIT = 30
const PERSONAL_CENTER_NAVIGATION_ID = 'linke-personal-center'
const JW_HOME_TITLE = '教务主页'
const PERSONAL_CENTER_FRAME_PATH = '/jsxsd/framework/xsMain_new.jsp'
const PERSONAL_CENTER_FRAME_PATTERN = /\/jsxsd\/framework\/xsMain_new\.jsp/i
const SCHEDULE_COURSE_TONE_COUNT = 14
const NAVIGATION_MAX_ITEMS = 80
const NAVIGATION_MIN_ITEMS = 3
const NAVIGATION_PANEL_WIDTH = 260
const NAVIGATION_CATALOG_STRATEGY = 'native-left-source-v8-data-code-tree'
const NAVIGATION_CLICKABLE_SELECTOR = 'a[href], [onclick], [data-url], [data-href]'
const NATIVE_NAVIGATION_TEXT_LABELS = [
  '我的桌面',
  '公告留言',
  '个人信息',
  '教学周历',
  '在线问答',
  '学籍成绩',
  '我的成绩',
  '培养管理',
  '考试报名',
  '实践环节',
  '教学评价',
  '交流申请'
]
const NAVIGATION_STRUCTURAL_SELECTOR = [
  '.panel-header',
  '.panel-title',
  '.accordion-header',
  '.accordion-title',
  '.tree-node',
  '.tree-title',
  '.menu-item',
  '.menu-title',
  '.nav-item',
  '.nav-title',
  '[role="treeitem"]',
  'li'
].join(',')
const NAVIGATION_BLOCKED_TEXT = /^(登录|用户登录|验证码|密码找回|保存|清除|确定|取消|关闭|退出|注销|退出系统)$/
const NAVIGATION_HOST_MANAGED_STYLES = ['display', 'width', 'flex-basis', 'flex-shrink', 'min-width', 'max-width', 'box-sizing', 'right', 'margin', 'padding', 'border', 'overflow']
const NAVIGATION_FRAME_MANAGED_STYLES = ['display', 'width', 'min-width', 'max-width', 'flex-basis', 'margin', 'padding', 'border', 'overflow']
const NAVIGATION_CENTER_MANAGED_STYLES = ['left', 'margin-left', 'right', 'width']
const NAVIGATION_SPLITTER_MANAGED_STYLES = ['display', 'width', 'min-width', 'max-width', 'margin', 'padding', 'border', 'overflow']
const NATIVE_HIDDEN_MANAGED_STYLES = ['display', 'height', 'min-height', 'max-height', 'margin', 'padding', 'border', 'overflow']
const NATIVE_CHROME_PANEL_MANAGED_STYLES = ['position', 'top', 'left', 'right', 'width', 'height', 'min-height', 'max-height', 'overflow']
const NATIVE_CHROME_FRAME_MANAGED_STYLES = ['position', 'top', 'left', 'right', 'bottom', 'width', 'height']
const JW_ORIGINAL_LAYOUT_MANAGED_STYLES = ['width', 'height', 'min-width', 'max-width', 'right', 'overflow']
const CUSTOMIZED_CONTENT_OFFSET_MANAGED_STYLES = ['left', 'margin-left', 'margin-right', 'padding-left', 'right', 'width', 'box-sizing', 'transform', 'text-align']
const JW_ORIGINAL_MODE_SESSION_KEY = 'linke.jwOriginalMode'
const CUSTOMIZED_CONTENT_ALIGNMENT_STYLE_ID = 'linke-customized-content-alignment-style'
const CUSTOMIZED_LEGACY_CONTENT_STYLE_ID = 'linke-customized-legacy-content-style'
const CUSTOMIZED_NATIVE_LAYOUT_STYLE_ID = 'linke-customized-native-layout-style'
let jwOriginalMode = false
let personalNoticeOpenContext = null
let personalNoticeDialogClosedUntil = 0
let personalNoticeCleanupGeneration = 0

try {
  jwOriginalMode = window.sessionStorage?.getItem(JW_ORIGINAL_MODE_SESSION_KEY) === '1'
} catch {}

function isAllowedPage() {
  return ALLOWED_HOSTS.has(window.location.hostname)
}

function isAllowedDocument(doc) {
  try {
    return ALLOWED_HOSTS.has(doc?.location?.hostname)
  } catch {
    return false
  }
}

function isLikelyLoginEntryLocation() {
  if (!isAllowedPage()) {
    return false
  }

  try {
    const pathname = window.location.pathname.replace(/\/+$/, '')
    if (!pathname) {
      return true
    }
    return /login|slogin|cas|Logon\.do/i.test(pathname)
  } catch {
    return true
  }
}

function installEarlyNativeChromePrehideStyle() {
  if (!isAllowedPage() || !document.documentElement || jwOriginalMode || isLikelyLoginEntryLocation()) {
    return
  }

  document.documentElement.classList.add('linke-native-chrome-prehide')
  if (document.getElementById('linke-native-chrome-prehide-style')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'linke-native-chrome-prehide-style'
  style.textContent = `
    html.linke-native-chrome-prehide #mainNorthPanle,
    html.linke-native-chrome-prehide #mainTagPanle {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
    }

    html.linke-native-chrome-prehide #mainCenterPanle,
    html.linke-native-chrome-prehide #mainContentPanle {
      top: 0 !important;
      left: 0 !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
    }

    html.linke-native-chrome-prehide #mainContentPanle .tabs-panels,
    html.linke-native-chrome-prehide #mainContentPanle .tabs-panels > .panel,
    html.linke-native-chrome-prehide #mainContentPanle .panel-body,
    html.linke-native-chrome-prehide #mainContentPanle .panel-body-noheader,
    html.linke-native-chrome-prehide #mainContentPanle .layout-body {
      left: 0 !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
    }

    html.linke-native-chrome-prehide iframe#Frame0,
    html.linke-native-chrome-prehide iframe[name="Frame0"] {
      top: 0 !important;
      left: 0 !important;
      margin-left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
    }

    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .Nsb_r_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .Nsb_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .Nsb_top,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .Nsb_r_top,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .Title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > .bt,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > h1:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > h2:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > h3:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > table:first-child tr:first-child > td[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_pw > table:first-child tr:first-child > th[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > .Nsb_r_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > .Nsb_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > .title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > .Title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > .bt,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > table:first-child tr:first-child > td[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) .Nsb_r_list > table:first-child tr:first-child > th[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > .Nsb_r_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > .Nsb_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > .title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > .Title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > .bt,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > table:first-child tr:first-child > td[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) form > table:first-child tr:first-child > th[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > .Nsb_r_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > .Nsb_title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > .title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > .Title,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > .bt,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > h1:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > h2:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > h3:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > table:first-child tr:first-child > td[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > table:first-child tr:first-child > th[colspan],
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [class*="title"]:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [class*="Title"]:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [class*="TITLE"]:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [id*="title"]:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [id*="Title"]:first-child,
    html.linke-native-chrome-prehide body:not(:has(#Frame0)) > [id*="TITLE"]:first-child {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
    }
  `

  ;(document.head || document.documentElement).appendChild(style)
}

installEarlyNativeChromePrehideStyle()

function normalizeText(value) {
  return String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
}

function hashString(value) {
  let hash = 0
  const text = String(value || '')
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

function sendCaptchaStatus(status, message) {
  ipcRenderer.send('jw:captcha-status', {
    status,
    message,
    url: window.location.href,
    title: document.title,
    at: Date.now()
  })
}

function sendCredentialStatus(status, message) {
  ipcRenderer.send('jw:credential-status', {
    status,
    message,
    url: window.location.href,
    title: document.title,
    at: Date.now()
  })
}

function sendNavigationDebug(stage, details = {}) {
  try {
    ipcRenderer.send('jw:navigation-debug', {
      stage,
      url: window.location.href,
      title: document.title,
      at: Date.now(),
      ...details
    })
  } catch {}
}

function isPersonalNoticeDiagnosticEnabled(doc = document) {
  const windows = new Set([doc?.defaultView, doc?.defaultView?.top, window, window.top].filter(Boolean))
  for (const currentWindow of windows) {
    try {
      if (currentWindow.sessionStorage?.getItem(PERSONAL_NOTICE_DIAGNOSTIC_KEY) === '1' ||
        currentWindow.localStorage?.getItem(PERSONAL_NOTICE_DIAGNOSTIC_KEY) === '1' ||
        currentWindow.__linkePersonalNoticeDiagnostics === true) {
        return true
      }
    } catch {}
  }
  return false
}

function isVisibleInput(input) {
  if (!input || input.disabled || input.readOnly || input.type === 'hidden') {
    return false
  }
  const rect = input.getBoundingClientRect()
  const style = window.getComputedStyle(input)
  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
}

function findVisibleInput(selector) {
  return Array.from(document.querySelectorAll(selector)).find(isVisibleInput) || null
}

function isLoginFormPage() {
  return isAllowedPage() &&
    !!findVisibleInput(ACCOUNT_INPUT_SELECTOR) &&
    !!findVisibleInput(PASSWORD_INPUT_SELECTOR)
}

function isLoginOrEntryPage() {
  return isLoginFormPage() || isLikelyLoginEntryLocation()
}

function isLoginCaptchaPage() {
  return isLoginFormPage() &&
    !!document.querySelector(CAPTCHA_IMAGE_SELECTOR) &&
    !!document.querySelector(CAPTCHA_INPUT_SELECTOR)
}

function setNativeInputValue(input, value) {
  const prototype = Object.getPrototypeOf(input)
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  if (descriptor && descriptor.set) {
    descriptor.set.call(input, value)
  } else {
    input.value = value
  }
}

function fillInputValue(input, value, markerName, options = {}) {
  const text = String(value || '')
  if (!input || !text) {
    return false
  }

  const existing = String(input.value || '')
  const autoFilledBefore = input.dataset[markerName] === '1'
  if (existing && !autoFilledBefore && !options.force) {
    return false
  }

  setNativeInputValue(input, text)
  input.dataset[markerName] = '1'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
  return true
}

function clearAutoFilledInput(input, markerName) {
  if (input && input.dataset[markerName] === '1') {
    input.value = ''
    input.dataset[markerName] = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function clearAutoFilledCredentials() {
  clearAutoFilledInput(findVisibleInput(ACCOUNT_INPUT_SELECTOR), 'linkeAccountAutoFilled')
  clearAutoFilledInput(findVisibleInput(PASSWORD_INPUT_SELECTOR), 'linkePasswordAutoFilled')
}

function waitForImageReady(image) {
  if (!image) {
    return Promise.reject(new Error('验证码图片不存在'))
  }
  if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('验证码图片加载超时'))
    }, 8000)
    function cleanup() {
      window.clearTimeout(timer)
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
    }
    function onLoad() {
      cleanup()
      resolve()
    }
    function onError() {
      cleanup()
      reject(new Error('验证码图片加载失败'))
    }
    image.addEventListener('load', onLoad, { once: true })
    image.addEventListener('error', onError, { once: true })
  })
}

function canvasImageToBase64(image) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('验证码图片尺寸无效')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg').split(',')[1] || ''
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return window.btoa(binary)
}

async function fetchCaptchaImageBase64(image) {
  const source = image.currentSrc || image.src || '/verifycode.servlet'
  const response = await window.fetch(source, {
    credentials: 'include',
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error(`验证码图片请求失败(${response.status})`)
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = await response.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  image.src = `data:${contentType};base64,${base64}`
  return base64
}

async function getCaptchaImageBase64(image) {
  await waitForImageReady(image)
  try {
    return canvasImageToBase64(image)
  } catch (error) {
    return fetchCaptchaImageBase64(image)
  }
}

function fillCaptchaInput(input, value) {
  const text = String(value || '').trim()
  if (!input || !text) {
    return false
  }

  const existing = normalizeText(input.value)
  if (existing && input.dataset.linkeCaptchaAutoFilled !== '1') {
    sendCaptchaStatus('skipped', '验证码输入框已有手动内容，未覆盖')
    return false
  }

  return fillInputValue(input, text, 'linkeCaptchaAutoFilled')
}

function isCaptchaAlreadyAutoFilled(input) {
  return !!input &&
    input.dataset.linkeCaptchaAutoFilled === '1' &&
    !!normalizeText(input.value)
}

let credentialFilling = false
let credentialScanTimer
let credentialBootTimer
let credentialBootAttempts = 0
let pendingCredentialForce = false
let loginCredentialCaptureInstalled = false

function readLoginInputCredentials() {
  const accountInput = findVisibleInput(ACCOUNT_INPUT_SELECTOR)
  const passwordInput = findVisibleInput(PASSWORD_INPUT_SELECTOR)
  const account = normalizeText(accountInput && accountInput.value)
  const password = String((passwordInput && passwordInput.value) || '')
  return { account, password }
}

function storePendingLoginCredentials() {
  if (!isLoginFormPage()) {
    return
  }
  const credentials = readLoginInputCredentials()
  if (!credentials.account || !credentials.password) {
    return
  }
  try {
    window.sessionStorage.setItem(PENDING_LOGIN_CREDENTIALS_KEY, JSON.stringify({
      ...credentials,
      capturedAt: Date.now()
    }))
  } catch {}
}

function readPendingLoginCredentials() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_LOGIN_CREDENTIALS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const account = normalizeText(parsed && parsed.account)
    const password = String((parsed && parsed.password) || '')
    const capturedAt = Number(parsed && parsed.capturedAt) || 0
    if (!account || !password || Date.now() - capturedAt > 10 * 60 * 1000) {
      return null
    }
    return { account, password, capturedAt }
  } catch {
    return null
  }
}

function clearPendingLoginCredentials() {
  try {
    window.sessionStorage.removeItem(PENDING_LOGIN_CREDENTIALS_KEY)
  } catch {}
}

function isPostLoginJwPage() {
  return isAllowedPage() &&
    !isLoginFormPage() &&
    /\/jsxsd\//i.test(window.location.pathname)
}

async function rememberPendingCredentialsAfterLogin() {
  if (!isPostLoginJwPage()) {
    return
  }
  const credentials = readPendingLoginCredentials()
  if (!credentials) {
    return
  }
  try {
    await ipcRenderer.invoke('credentials:remember-from-jw', {
      account: credentials.account,
      password: credentials.password,
      pageUrl: window.location.href
    })
    clearPendingLoginCredentials()
    sendCredentialStatus('saved', '账号密码已在登录成功后自动保存')
  } catch (error) {
    sendCredentialStatus('failed', `账号密码自动保存失败：${error.message || '未知错误'}`)
  }
}

function installLoginCredentialCapture() {
  if (!isAllowedPage() || loginCredentialCaptureInstalled) {
    return
  }
  loginCredentialCaptureInstalled = true
  document.addEventListener('submit', storePendingLoginCredentials, true)
  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('button, input, a')) {
      storePendingLoginCredentials()
    }
  }, true)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      storePendingLoginCredentials()
    }
  }, true)
  rememberPendingCredentialsAfterLogin()
}

async function fillStoredCredentials(options = {}) {
  if (credentialFilling) {
    scheduleCredentialFill(250, options)
    return
  }

  if (!isLoginFormPage()) {
    return
  }

  const accountInput = findVisibleInput(ACCOUNT_INPUT_SELECTOR)
  const passwordInput = findVisibleInput(PASSWORD_INPUT_SELECTOR)
  if (!accountInput || !passwordInput) {
    return
  }

  credentialFilling = true
  try {
    const credentials = await ipcRenderer.invoke('credentials:get-for-jw', {
      pageUrl: window.location.href
    })
    if (!credentials || !credentials.hasCredentials) {
      clearAutoFilledCredentials()
      sendCredentialStatus('empty', '未保存账号密码，手动登录成功后会自动记忆')
      return
    }

    const fillOptions = { force: !!options.force }
    const accountFilled = fillInputValue(accountInput, credentials.account, 'linkeAccountAutoFilled', fillOptions)
    const passwordFilled = fillInputValue(passwordInput, credentials.password, 'linkePasswordAutoFilled', fillOptions)

    if (accountFilled || passwordFilled) {
      sendCredentialStatus('filled', '账号密码已自动填入')
    } else if (options.force) {
      sendCredentialStatus('failed', '账号密码自动填入失败：保存内容为空或未找到可写输入框')
    } else {
      sendCredentialStatus('skipped', '账号密码输入框已有内容，未覆盖')
    }
  } catch (error) {
    sendCredentialStatus('failed', `账号密码自动填入失败：${error.message || '未知错误'}`)
  } finally {
    credentialFilling = false
  }
}

function scheduleCredentialFill(delay = 300, options = {}) {
  pendingCredentialForce = pendingCredentialForce || !!options.force
  window.clearTimeout(credentialScanTimer)
  credentialScanTimer = window.setTimeout(() => {
    const force = pendingCredentialForce
    pendingCredentialForce = false
    fillStoredCredentials({ force })
  }, delay)
}

function scheduleCredentialFillWithOptions(delay = 300, options = {}) {
  scheduleCredentialFill(delay, options)
}

function bootCredentialAutoFill() {
  if (!isAllowedPage()) {
    return
  }

  scheduleCredentialFill()
  window.clearInterval(credentialBootTimer)
  credentialBootAttempts = 0
  credentialBootTimer = window.setInterval(() => {
    credentialBootAttempts += 1
    if (isLoginFormPage()) {
      scheduleCredentialFill(100)
    }
    if (credentialBootAttempts >= 20) {
      window.clearInterval(credentialBootTimer)
    }
  }, 500)
}

let captchaRecognizing = false
let captchaScanTimer
let captchaBootTimer
let captchaBootAttempts = 0
let captchaAutoFillInstalled = false
async function recognizeAndFillCaptcha() {
  if (!isLoginCaptchaPage() || captchaRecognizing) {
    return
  }

  const image = document.querySelector(CAPTCHA_IMAGE_SELECTOR)
  const input = document.querySelector(CAPTCHA_INPUT_SELECTOR)
  if (!image || !input) {
    return
  }

  if (isCaptchaAlreadyAutoFilled(input)) {
    return
  }

  captchaRecognizing = true
  sendCaptchaStatus('recognizing', '正在自动识别验证码')
  try {
    const imageBase64 = await getCaptchaImageBase64(image)
    const response = await ipcRenderer.invoke('captcha:recognize', {
      imageBase64,
      pageUrl: window.location.href
    })
    const result = String(response && response.result ? response.result : '').trim()
    if (!result) {
      throw new Error('验证码识别结果为空')
    }
    if (fillCaptchaInput(input, result)) {
      sendCaptchaStatus('filled', '验证码已自动填入')
    }
  } catch (error) {
    sendCaptchaStatus('failed', `验证码自动识别失败：${error.message || '未知错误'}`)
  } finally {
    captchaRecognizing = false
  }
}

function scheduleCaptchaRecognize(delay = 500) {
  window.clearTimeout(captchaScanTimer)
  captchaScanTimer = window.setTimeout(recognizeAndFillCaptcha, delay)
}

function installCaptchaAutoFill() {
  if (!isAllowedPage()) {
    return
  }

  scheduleCaptchaRecognize()
  if (captchaAutoFillInstalled) {
    return
  }
  captchaAutoFillInstalled = true
  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest(CAPTCHA_IMAGE_SELECTOR)) {
      const input = document.querySelector(CAPTCHA_INPUT_SELECTOR)
      if (input) {
        input.value = ''
        input.dataset.linkeCaptchaAutoFilled = ''
      }
      scheduleCaptchaRecognize(800)
    }
  }, true)
}

function bootCaptchaAutoFill() {
  if (!isAllowedPage()) {
    return
  }

  installCaptchaAutoFill()
  window.clearInterval(captchaBootTimer)
  captchaBootTimer = window.setInterval(() => {
    captchaBootAttempts += 1
    if (isLoginCaptchaPage()) {
      scheduleCaptchaRecognize(100)
    }
    if (captchaBootAttempts >= 20) {
      window.clearInterval(captchaBootTimer)
    }
  }, 500)
}

function isTopFrame() {
  try {
    return window.top === window
  } catch {
    return true
  }
}

function getWindowFromDocument(doc) {
  return doc && doc.defaultView
}

function collectAccessibleDocuments(rootWindow = window, documents = [], seen = new Set()) {
  try {
    const doc = rootWindow.document
    if (doc && !seen.has(doc)) {
      seen.add(doc)
      documents.push(doc)
    }

    for (const frameWindow of Array.from(rootWindow.frames || [])) {
      collectAccessibleDocuments(frameWindow, documents, seen)
    }
  } catch {}

  return documents
}

function normalizeNavigationText(value) {
  return normalizeText(value)
    .replace(/[>»›]/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim()
}

function normalizeNavigationTitleKey(value) {
  return normalizeNavigationText(value).replace(/\s+/g, '')
}

function isNavigationElementVisible(element) {
  if (!element) {
    return false
  }
  if (element.closest('[data-linke-native-nav-hidden="1"]')) {
    return true
  }

  const win = getWindowFromDocument(element.ownerDocument)
  if (!win) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const style = win.getComputedStyle(element)
  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
}

function isValidNavigationText(text) {
  if (!text || text.length < 2 || text.length > 24 || NAVIGATION_BLOCKED_TEXT.test(text)) {
    return false
  }

  if (/请输入|Copyright|版权所有|自动填|验证码|账号密码|桌面端预览/.test(text)) {
    return false
  }

  return /[\u4e00-\u9fa5A-Za-z]/.test(text)
}

function createNavigationId(text, href, onclick, duplicateCount) {
  const suffix = duplicateCount > 0 ? `-${duplicateCount}` : ''
  return `linke-nav-${hashString(`${text}|${href}|${onclick}`)}${suffix}`
}

function getNavigationOwnText(element) {
  return normalizeNavigationText(
    Array.from(element.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
  )
}

function getNavigationAttributeText(element) {
  return normalizeNavigationText(
    element.getAttribute('title') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('data-title') ||
    element.getAttribute('data-text') ||
    ''
  )
}

function getNavigationLabelChildText(element) {
  const label = element.querySelector && element.querySelector('.panel-title, .accordion-title, .tree-title, .menu-title, .nav-title, .title')
  return label ? normalizeNavigationText(label.textContent || '') : ''
}

function getStructuralNavigationText(element) {
  const attributeText = normalizeNavigationText(
    element.getAttribute('title') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('data-title') ||
    ''
  )
  if (isValidNavigationText(attributeText)) {
    return attributeText
  }

  const ownText = getNavigationOwnText(element)
  if (isValidNavigationText(ownText)) {
    return ownText
  }

  const labelText = getNavigationLabelChildText(element)
  if (isValidNavigationText(labelText)) {
    return labelText
  }

  const fullText = normalizeNavigationText(element.textContent || '')
  if (element.children.length <= 3 && isValidNavigationText(fullText)) {
    return fullText
  }

  return ''
}

function getStructuralNavigationElement(element, root) {
  const container = element.closest && element.closest('.panel-header, .accordion-header, .tree-node, .menu-item, .nav-item, [role="treeitem"], li')
  if (container && root.contains(container)) {
    return container
  }

  return element
}

function getClickableNavigationElement(element, root) {
  if (element.matches && element.matches(NAVIGATION_CLICKABLE_SELECTOR)) {
    return element
  }

  const closest = element.closest && element.closest(NAVIGATION_CLICKABLE_SELECTOR)
  if (closest && root.contains(closest)) {
    return closest
  }

  const child = element.querySelector && element.querySelector(NAVIGATION_CLICKABLE_SELECTOR)
  return child || element
}

function dedupeNavigationCandidates(candidates) {
  const seen = new Set()
  return candidates.filter((candidate) => {
    const key = `${normalizeNavigationTitleKey(candidate.text)}|${candidate.element && candidate.element.tagName}|${candidate.href}|${candidate.onclick}|${candidate.element ? Array.from(candidate.element.parentElement ? candidate.element.parentElement.children : []).indexOf(candidate.element) : -1}`
    if (!candidate.text || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function collectClickableNavigationCandidates(root, includeHidden = false) {
  return Array.from(root.querySelectorAll(NAVIGATION_CLICKABLE_SELECTOR))
    .filter((element) => !element.closest('#linke-jw-navigation-root'))
    .filter((element) => includeHidden || isNavigationElementVisible(element))
    .map((element) => ({
      element,
      text: normalizeNavigationText(element.textContent || element.getAttribute('title') || element.getAttribute('aria-label')),
      href: element.getAttribute('href') || element.dataset.url || element.dataset.href || '',
      onclick: element.getAttribute('onclick') || ''
    }))
    .filter((candidate) => isValidNavigationText(candidate.text))
}

function collectStructuralNavigationCandidates(root, includeHidden = false) {
  const elements = new Set()

  for (const element of Array.from(root.querySelectorAll(NAVIGATION_STRUCTURAL_SELECTOR))) {
    if (element.closest('#linke-jw-navigation-root')) {
      continue
    }
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'FRAME'].includes(element.tagName)) {
      continue
    }
    const structuralElement = getStructuralNavigationElement(element, root)
    if (structuralElement) {
      elements.add(structuralElement)
    }
  }

  return Array.from(elements)
    .filter((element) => !element.closest('#linke-jw-navigation-root'))
    .filter((element) => includeHidden || isNavigationElementVisible(element))
    .map((element) => {
      const text = getStructuralNavigationText(element)
      if (!text) {
        return null
      }

      const clickableElement = getClickableNavigationElement(element, root)
      return {
        element: clickableElement,
        text,
        href: clickableElement.getAttribute('href') || clickableElement.dataset.url || clickableElement.dataset.href || '',
        onclick: clickableElement.getAttribute('onclick') || ''
      }
    })
    .filter(Boolean)
    .filter((candidate) => isValidNavigationText(candidate.text))
}

function collectNavigationCandidates(root, includeHidden = false) {
  return dedupeNavigationCandidates([
    ...collectClickableNavigationCandidates(root, includeHidden),
    ...collectStructuralNavigationCandidates(root, includeHidden)
  ])
}

function collectNavigationCandidatesWithLevels(source, includeHidden = false) {
  return collectNavigationCandidates(source.host, includeHidden).map((candidate) => ({
    ...candidate,
    rawLevel: computeRawNavigationLevel(candidate.element, source.host)
  }))
}

function summarizeNavigationCandidate(candidate) {
  const element = candidate && candidate.element
  return {
    text: String(candidate?.text || '').slice(0, 48),
    level: candidate?.rawLevel ?? null,
    tag: element?.tagName || '',
    className: String(element?.className || '').slice(0, 80),
    href: String(candidate?.href || '').slice(0, 120),
    hasOnclick: !!candidate?.onclick
  }
}

function summarizeNavigationDocument(doc) {
  const frameElement = doc.defaultView && doc.defaultView !== window ? doc.defaultView.frameElement : null
  const visibleCandidates = collectNavigationCandidates(doc, false)
  const hiddenCandidates = collectNavigationCandidates(doc, true)
  return {
    url: doc.location?.href || '',
    title: doc.title || '',
    isFrame: !!frameElement,
    frameName: String(frameElement?.name || frameElement?.id || '').slice(0, 80),
    frameSrc: String(frameElement?.getAttribute?.('src') || '').slice(0, 160),
    bodyClassName: String(doc.body?.className || '').slice(0, 80),
    visibleCount: visibleCandidates.length,
    hiddenCount: hiddenCandidates.length,
    panelCount: doc.querySelectorAll?.('.panel, .accordion-panel, .accordion-item').length || 0,
    headerCount: doc.querySelectorAll?.('.panel-header, .accordion-header').length || 0,
    samples: hiddenCandidates.slice(0, 24).map((candidate) => summarizeNavigationCandidate(candidate))
  }
}

function summarizeNavigationScan() {
  return collectAccessibleDocuments()
    .slice(0, 12)
    .map((doc) => summarizeNavigationDocument(doc))
}

function summarizeNavigationSource(source) {
  if (!source) {
    return null
  }

  const candidates = collectNavigationCandidatesWithLevels(source, true)
  return {
    url: source.doc.location?.href || '',
    title: source.doc.title || '',
    isFrame: !!source.frameElement,
    frameName: String(source.frameElement?.name || source.frameElement?.id || '').slice(0, 80),
    frameSrc: String(source.frameElement?.getAttribute?.('src') || '').slice(0, 160),
    hostTag: source.host?.tagName || '',
    hostId: String(source.host?.id || '').slice(0, 80),
    hostClassName: String(source.host?.className || '').slice(0, 80),
    candidateCount: candidates.length,
    panelGroupCount: collectPanelNavigationGroups(source).length,
    headerGroupCount: collectHeaderBodyNavigationGroups(source).length,
    segmentGroupCount: collectLevelSegmentNavigationGroups(source, candidates).length,
    samples: candidates.slice(0, 36).map((candidate) => summarizeNavigationCandidate(candidate))
  }
}

function dispatchNativeNavigationClick(element) {
  if (!element) {
    return
  }
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    detail: 1,
    view: element.ownerDocument.defaultView
  }
  element.dispatchEvent(new MouseEvent('mousedown', eventOptions))
  element.dispatchEvent(new MouseEvent('mouseup', {
    ...eventOptions,
    buttons: 0
  }))
  element.click()
}

function summarizePersonalNoticeElement(element) {
  if (!element) {
    return null
  }

  const doc = element.ownerDocument || document
  const rect = element.getBoundingClientRect?.()
  return {
    tagName: String(element.tagName || ''),
    id: String(element.id || '').slice(0, 80),
    className: String(element.className || '').slice(0, 160),
    text: normalizeText(element.innerText || element.textContent || '').slice(0, 240),
    href: String(element.getAttribute?.('href') || '').slice(0, 320),
    target: String(element.getAttribute?.('target') || '').slice(0, 80),
    onclick: String(element.getAttribute?.('onclick') || '').slice(0, 500),
    docUrl: String(doc.location?.href || '').slice(0, 320),
    rect: rect
      ? {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      : null
  }
}

function waitForNavigationDom(delay = 180) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

function compareNavigationCandidateOrder(first, second) {
  if (first.element === second.element) {
    return 0
  }

  const position = first.element.compareDocumentPosition(second.element)
  if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1
  }
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1
  }
  return 0
}

function getNavigationCandidateContainer(candidate, host) {
  const element = candidate && candidate.element
  if (!element || !element.closest) {
    return element || host
  }

  return element.closest('li, [role="treeitem"], .tree-node, .tree-node-selected, .menu-item, .accordion-header, .accordion-body') ||
    element.parentElement ||
    element
}

function buildNavigationParentElements(candidate, group, candidates, host) {
  const container = getNavigationCandidateContainer(candidate, host)
  if (!container) {
    return []
  }

  return candidates
    .filter((parent) => parent !== candidate && parent !== group)
    .filter((parent) => {
      const parentContainer = getNavigationCandidateContainer(parent, host)
      return parentContainer &&
        parentContainer !== container &&
        parentContainer.contains(container)
    })
    .sort((first, second) => first.rawLevel - second.rawLevel || compareNavigationCandidateOrder(first, second))
    .map((parent) => parent.element)
}

function elementMatches(element, selector) {
  return !!(element && element.matches && element.matches(selector))
}

function findDirectChild(element, selector) {
  return Array.from(element?.children || []).find((child) => elementMatches(child, selector)) || null
}

function findPanelHeader(panel) {
  return findDirectChild(panel, '.panel-header, .accordion-header') ||
    panel.querySelector('.panel-header, .accordion-header')
}

function findPanelBody(panel) {
  return findDirectChild(panel, '.panel-body, .accordion-body') ||
    panel.querySelector('.panel-body, .accordion-body')
}

function findHeaderBody(header) {
  if (!header) {
    return null
  }

  const parent = header.parentElement
  if (parent) {
    const directBody = findDirectChild(parent, '.panel-body, .accordion-body')
    if (directBody) {
      return directBody
    }
  }

  let sibling = header.nextElementSibling
  while (sibling) {
    if (elementMatches(sibling, '.panel-body, .accordion-body, ul, ol, .tree, .menu, .submenu')) {
      return sibling
    }
    sibling = sibling.nextElementSibling
  }

  return null
}

function getNavigationElementText(element) {
  return getNavigationAttributeText(element) ||
    getNavigationOwnText(element) ||
    getNavigationLabelChildText(element) ||
    (element && element.children && element.children.length <= 3
      ? normalizeNavigationText(element.textContent || '')
      : '')
}

function getDirectMenuItemText(element) {
  if (!element) {
    return ''
  }

  const mainText = findDirectChild(element, '.maintext')
  if (mainText) {
    return normalizeNavigationText(mainText.textContent || '')
  }

  const directAnchor = findDirectChild(element, 'a')
  if (directAnchor) {
    const span = findDirectChild(directAnchor, 'span')
    if (span) {
      return normalizeNavigationText(span.textContent || '')
    }

    const anchorOwnText = getNavigationOwnText(directAnchor)
    if (anchorOwnText) {
      return anchorOwnText
    }
  }

  return getNavigationElementText(element)
}

function normalizeNavigationCandidateList(candidates) {
  const seenElements = new Set()
  const seenTitles = new Set()
  const normalized = []

  for (const candidate of candidates.sort(compareNavigationCandidateOrder)) {
    const titleKey = normalizeNavigationTitleKey(candidate.text)
    if (!titleKey || seenTitles.has(titleKey)) {
      continue
    }
    if (candidate.element && seenElements.has(candidate.element)) {
      continue
    }
    seenTitles.add(titleKey)
    if (candidate.element) {
      seenElements.add(candidate.element)
    }
    normalized.push(candidate)
  }

  return normalized
}

function collectStructuredGroupsByLevel(groupCandidates, buildItems) {
  const normalizedGroups = normalizeNavigationCandidateList(
    groupCandidates.map((group) => ({
      ...group,
      text: group.text || group.title
    }))
  )

  if (normalizedGroups.length < 2) {
    return []
  }

  const levels = [...new Set(normalizedGroups.map((group) => group.rawLevel))]
    .sort((first, second) => first - second)

  for (const level of levels) {
    const levelGroups = normalizedGroups.filter((group) => group.rawLevel === level)
    if (levelGroups.length < 2 || levelGroups.length > 12) {
      continue
    }

    const catalogGroups = levelGroups.map((group) => ({
      title: group.title || group.text,
      element: group.element,
      container: group.container,
      items: buildItems(group)
    })).filter((group) => group.items.length > 0)

    if (catalogGroups.length >= 2) {
      return catalogGroups
    }
  }

  return []
}

function collectSecondLevelNavigationCandidates(container, groupTitle) {
  if (!container) {
    return []
  }

  const candidates = collectNavigationCandidatesWithLevels({
    doc: container.ownerDocument,
    host: container
  }, true)
    .filter((candidate) => normalizeNavigationTitleKey(candidate.text) !== normalizeNavigationTitleKey(groupTitle))
    .filter((candidate) => !elementMatches(candidate.element, '.panel-header, .accordion-header') || !!findHeaderBody(candidate.element))

  if (candidates.length === 0) {
    return []
  }

  const minLevel = Math.min(...candidates.map((candidate) => candidate.rawLevel))
  return normalizeNavigationCandidateList(
    candidates.filter((candidate) => candidate.rawLevel === minLevel)
  )
}

function getDataCodeNavigationChildren(scope, parentCode) {
  const selector = `li[data-code][data-parent="${CSS.escape(parentCode)}"]`
  const items = []
  for (const element of Array.from(scope.querySelectorAll(selector))
    .filter((element) => element.dataset.parent === parentCode)
  ) {
    const title = getDirectMenuItemText(element)
    if (!isValidNavigationText(title)) {
      continue
    }

    items.push({
      title,
      text: title,
      element,
      href: element.dataset.url || element.getAttribute('data-url') || element.dataset.href || element.getAttribute('data-href') || '',
      onclick: element.getAttribute('onclick') || '',
      container: element,
      rawLevel: computeRawNavigationLevel(element, scope),
      level: 0
    })

    const leafItems = Array.from(element.querySelectorAll('li[data-url], [data-url]'))
      .filter((leaf) => leaf !== element)
      .map((leaf) => {
        const leafTitle = getDirectMenuItemText(leaf)
        return {
          title: leafTitle,
          text: leafTitle,
          element: leaf,
          href: leaf.dataset.url || leaf.getAttribute('data-url') || '',
          onclick: leaf.getAttribute('onclick') || '',
          rawLevel: computeRawNavigationLevel(leaf, scope),
          level: 1
        }
      })
      .filter((leaf) => isValidNavigationText(leaf.title))

    items.push(...normalizeNavigationCandidateList(leafItems))
  }

  return normalizeNavigationCandidateList(items)
}

function collectDataCodeNavigationGroups(source) {
  const scope = findDataCodeNavigationScope(source.doc) || source.host
  if (!scope || !scope.querySelectorAll) {
    return []
  }

  const childNodes = Array.from(scope.querySelectorAll('li[data-code][data-parent]'))
  if (childNodes.length < NAVIGATION_MIN_ITEMS) {
    return []
  }

  const rootByCode = new Map()
  for (const element of Array.from(scope.querySelectorAll('li[data-code]:not([data-parent])'))) {
    const code = String(element.dataset.code || '').trim()
    const title = getDirectMenuItemText(element)
    if (!code || !isValidNavigationText(title)) {
      continue
    }
    if (!childNodes.some((child) => child.dataset.parent === code)) {
      continue
    }

    const current = rootByCode.get(code)
    if (!current || (isNavigationElementVisible(element) && !isNavigationElementVisible(current.element))) {
      rootByCode.set(code, {
        code,
        title,
        text: title,
        element,
        container: scope,
        rawLevel: computeRawNavigationLevel(element, scope)
      })
    }
  }

  const groups = []
  for (const root of rootByCode.values()) {
    const items = normalizeNavigationCandidateList(getDataCodeNavigationChildren(scope, root.code))
    if (items.length === 0) {
      continue
    }
    groups.push({
      title: root.title,
      element: root.element,
      container: scope,
      items
    })
  }

  return groups.length >= 2 ? groups : []
}

function isActionableNavigationHref(href) {
  const value = String(href || '').trim()
  return !!value && value !== '#' && !/^javascript:\s*(void|;)?/i.test(value)
}

function hasExplicitNavigationAction(candidate) {
  return !!candidate && (isActionableNavigationHref(candidate.href) || !!candidate.onclick)
}

function getNavigationChildContainer(element) {
  return findHeaderBody(element) ||
    Array.from(element?.children || []).find((child) => elementMatches(child, 'ul, ol, .tree, .menu, .submenu, .children')) ||
    null
}

function isDirectNavigationTarget(candidate) {
  if (!candidate || !candidate.element) {
    return false
  }
  if (hasExplicitNavigationAction(candidate)) {
    return true
  }
  return false
}

function markNavigationBranchItemsDisabled(items = []) {
  return items.map((item, index) => {
    const next = items[index + 1]
    const hasChild = next && Number(next.level || 0) > Number(item.level || 0)
    return hasChild ? { ...item, disabled: true } : item
  })
}

function resolveNavigationActionCandidate(candidate) {
  if (isDirectNavigationTarget(candidate)) {
    return candidate
  }

  const childContainer = getNavigationChildContainer(candidate.element)
  if (!childContainer) {
    return null
  }

  const childCandidates = collectNavigationCandidatesWithLevels({
    doc: childContainer.ownerDocument,
    host: childContainer
  }, true)
    .filter((child) => child.element !== candidate.element)
    .filter((child) => normalizeNavigationTitleKey(child.text) !== normalizeNavigationTitleKey(candidate.text))

  const actionableChildren = childCandidates.filter(isDirectNavigationTarget)
  if (actionableChildren.length === 0) {
    return null
  }

  const minLevel = Math.min(...actionableChildren.map((child) => child.rawLevel))
  return actionableChildren
    .filter((child) => child.rawLevel === minLevel)
    .sort(compareNavigationCandidateOrder)[0] || null
}

function collectPanelNavigationGroups(source) {
  const panels = Array.from(source.host.querySelectorAll('.panel, .accordion-panel, .accordion-item'))
    .map((panel) => {
      const header = findPanelHeader(panel)
      const body = findPanelBody(panel)
      const title = normalizeNavigationText(getNavigationElementText(header || panel))
      return {
        title,
        element: header || panel,
        container: body,
        rawLevel: header ? computeRawNavigationLevel(header, source.host) : computeRawNavigationLevel(panel, source.host)
      }
    })
    .filter((group) => group.element && group.container && isValidNavigationText(group.title))

  if (panels.length < 2) {
    return []
  }

  return collectStructuredGroupsByLevel(
    panels,
    (group) => collectSecondLevelNavigationCandidates(group.container, group.title)
  )
}

function collectHeaderBodyNavigationGroups(source) {
  const headers = Array.from(source.host.querySelectorAll('.panel-header, .accordion-header'))
    .map((header) => {
      const title = normalizeNavigationText(getNavigationElementText(header))
      return {
        title,
        element: header,
        container: findHeaderBody(header),
        rawLevel: computeRawNavigationLevel(header, source.host)
      }
    })
    .filter((group) => group.container && isValidNavigationText(group.title))

  if (headers.length < 2) {
    return []
  }

  return collectStructuredGroupsByLevel(
    headers,
    (group) => collectSecondLevelNavigationCandidates(group.container, group.title)
  )
}

function isLikelyNavigationGroupCandidate(candidate) {
  const element = candidate && candidate.element
  if (!element) {
    return false
  }
  if (elementMatches(element, '.panel-header, .accordion-header, .panel-title, .accordion-title')) {
    return true
  }
  if (getNavigationChildContainer(element)) {
    return true
  }

  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('role') || ''}`
  return /accordion|panel|folder|parent|group|module|menu|nav|tree/i.test(marker)
}

function collectLevelSegmentNavigationGroups(source, candidates) {
  const structuralCandidates = normalizeNavigationCandidateList(candidates)
  if (structuralCandidates.length < NAVIGATION_MIN_ITEMS) {
    return []
  }

  const groupPools = [
    structuralCandidates.filter(isLikelyNavigationGroupCandidate),
    structuralCandidates
  ].filter((pool, index, pools) => pool.length >= 2 && pools.findIndex((candidatePool) => candidatePool === pool) === index)

  for (const groupPool of groupPools) {
    const levels = [...new Set(groupPool.map((candidate) => candidate.rawLevel))]
      .sort((first, second) => first - second)
    for (const level of levels) {
      const groups = groupPool.filter((candidate) => candidate.rawLevel === level)
      if (groups.length < 2 || groups.length > 12) {
        continue
      }

      const catalogGroups = groups.map((group, groupIndex) => {
        const nextGroup = groups[groupIndex + 1]
        const startIndex = structuralCandidates.indexOf(group) + 1
        const endIndex = nextGroup ? structuralCandidates.indexOf(nextGroup) : structuralCandidates.length
        const segment = structuralCandidates
          .slice(startIndex, endIndex)
          .filter((candidate) => candidate !== group)
          .filter((candidate) => !groups.includes(candidate))
          .filter((candidate) => candidate.rawLevel >= group.rawLevel)
          .filter((candidate) => normalizeNavigationTitleKey(candidate.text) !== normalizeNavigationTitleKey(group.text))

        if (segment.length === 0) {
          return null
        }

        const minItemLevel = Math.min(...segment.map((candidate) => candidate.rawLevel))
        const items = normalizeNavigationCandidateList(segment.filter((candidate) => candidate.rawLevel === minItemLevel))
        return {
          title: group.text,
          element: group.element,
          container: source.host,
          items
        }
      }).filter(Boolean).filter((group) => group.items.length > 0)

      if (catalogGroups.length >= 2) {
        return catalogGroups
      }
    }
  }

  return []
}

function createNavigationCatalogFromStructuredGroups(source, groups) {
  navigationRegistry.clear()
  const catalogGroups = []
  const scopedCandidates = collectNavigationCandidatesWithLevels(source, true)

  for (const group of groups.slice(0, 12)) {
    const items = []
    for (const item of group.items.slice(0, NAVIGATION_MAX_ITEMS)) {
      const actionItem = resolveNavigationActionCandidate(item)
      const actionable = hasExplicitNavigationAction(actionItem)
      const href = actionItem ? actionItem.href || '' : ''
      const onclick = actionItem ? actionItem.onclick || '' : ''
      const id = createNavigationId(`${group.title}/${item.text}`, href, onclick, 0)

      if (actionable && actionItem && actionItem.element) {
        navigationRegistry.set(id, {
          element: actionItem.element,
          groupElement: group.element,
          parentElements: buildNavigationParentElements(actionItem, {
            element: group.element,
            rawLevel: computeRawNavigationLevel(group.element, source.host)
          }, scopedCandidates, source.host),
          href,
          doc: source.doc
        })
      }

      items.push({
        id,
        title: item.text,
        level: Math.max(0, Math.min(3, Number.parseInt(item.level, 10) || 0)),
        disabled: !actionable
      })
    }

    if (items.length > 0) {
      catalogGroups.push({
        key: `native-${hashString(group.title)}`,
        title: group.title,
        items: markNavigationBranchItemsDisabled(items)
      })
    }
  }

  return catalogGroups.length >= 2
      ? {
        version: 1,
        strategy: NAVIGATION_CATALOG_STRATEGY,
        sourceMode: 'structured',
        updatedAt: new Date().toISOString(),
        sourceHost: window.location.hostname,
        groups: catalogGroups
      }
    : null
}

function collectNavigationCatalogFromStructuredTree(source, candidates) {
  const dataCodeGroups = collectDataCodeNavigationGroups(source)
  if (dataCodeGroups.length >= 2) {
    return createNavigationCatalogFromStructuredGroups(source, dataCodeGroups)
  }

  const groups = collectPanelNavigationGroups(source)
  if (groups.length >= 2) {
    return createNavigationCatalogFromStructuredGroups(source, groups)
  }

  const headerBodyGroups = collectHeaderBodyNavigationGroups(source)
  if (headerBodyGroups.length >= 2) {
    return createNavigationCatalogFromStructuredGroups(source, headerBodyGroups)
  }

  const segmentGroups = collectLevelSegmentNavigationGroups(source, candidates)
  if (segmentGroups.length >= 2) {
    return createNavigationCatalogFromStructuredGroups(source, segmentGroups)
  }

  return null
}

function collectNavigationCatalogFromHtmlTree(source) {
  revealNativeNavigationForReading(source)
  const candidates = collectNavigationCandidatesWithLevels(source, true)
    .sort(compareNavigationCandidateOrder)
  if (candidates.length < NAVIGATION_MIN_ITEMS) {
    return null
  }

  return collectNavigationCatalogFromStructuredTree(source, candidates)
}

function revealNativeNavigationForReading(source) {
  if (!source || !source.host) {
    return
  }

  const root = source.doc.getElementById('linke-jw-navigation-root')
  if (root && root.parentElement === source.host) {
    root.style.setProperty('display', 'none', 'important')
  }

  for (const child of Array.from(source.host.children)) {
    if (!child.dataset || child.dataset.linkeNativeNavHidden !== '1') {
      continue
    }
    child.removeAttribute('aria-hidden')
    child.style.removeProperty('display')
  }
}

function cleanupInvalidNavigationTakeover(doc) {
  if (!doc) {
    return
  }

  const root = doc.getElementById('linke-jw-navigation-root')
  if (root) {
    root.remove()
  }

  for (const frame of Array.from(doc.querySelectorAll('[data-linke-native-frame-collapsed="1"]'))) {
    delete frame.dataset.linkeNativeFrameCollapsed
    restoreManagedStyles(frame, NAVIGATION_FRAME_MANAGED_STYLES)
    const parent = frame.parentElement
    if (parent?.dataset?.linkeOriginalCols) {
      parent.setAttribute('cols', parent.dataset.linkeOriginalCols)
      delete parent.dataset.linkeOriginalCols
    }
    if (parent?.dataset?.linkeOriginalRows) {
      parent.setAttribute('rows', parent.dataset.linkeOriginalRows)
      delete parent.dataset.linkeOriginalRows
    }
  }

  for (const host of Array.from(doc.querySelectorAll('[data-linke-native-nav-host="1"], [data-linke-native-nav-resized="1"]'))) {
    delete host.dataset.linkeNativeNavHost
    delete host.dataset.linkeNativeNavResized
    host.style.removeProperty('display')
    host.style.removeProperty('overflow')
    restoreManagedStyles(host, NAVIGATION_HOST_MANAGED_STYLES)
  }

  for (const center of Array.from(doc.querySelectorAll('[data-linke-native-center-resized="1"]'))) {
    delete center.dataset.linkeNativeCenterResized
    restoreManagedStyles(center, NAVIGATION_CENTER_MANAGED_STYLES)
  }

  for (const splitter of Array.from(doc.querySelectorAll('[data-linke-native-splitter-collapsed="1"]'))) {
    delete splitter.dataset.linkeNativeSplitterCollapsed
    restoreManagedStyles(splitter, NAVIGATION_SPLITTER_MANAGED_STYLES)
  }

  for (const child of Array.from(doc.querySelectorAll('[data-linke-native-nav-hidden="1"]'))) {
    delete child.dataset.linkeNativeNavHidden
    child.removeAttribute('aria-hidden')
    child.style.removeProperty('display')
  }

  if (doc.documentElement) {
    delete doc.documentElement.dataset.linkeNavigationTakeover
  }
  if (doc.body) {
    doc.body.style.removeProperty('overflow')
  }
  navigationRendered = false
}

function isValidNavigationTakeoverHost(doc) {
  const root = doc && doc.getElementById('linke-jw-navigation-root')
  if (!root || !root.parentElement) {
    return true
  }

  const host = root.parentElement
  const candidates = collectNavigationCandidates(host, true)
  const candidateElements = candidates.map((candidate) => candidate.element)
  const frameElement = doc.defaultView && doc.defaultView !== window ? doc.defaultView.frameElement : null

  if (frameElement) {
    return isLikelyNavigationFrame(frameElement, candidateElements)
  }

  return scoreNativeNavigationContainer(host, candidateElements) > 0
}

function findDataCodeNavigationScope(doc) {
  if (!doc || !doc.body) {
    return null
  }

  const candidates = [
    ...Array.from(doc.querySelectorAll('.leftsidebar, #mainWestPanle, .main-sidebar, .sidebar-menu, #onesidebar, .first-sidebar')),
    doc.body
  ]

  let best = null
  let bestScore = 0
  for (const candidate of candidates) {
    if (!candidate || !candidate.querySelectorAll) {
      continue
    }

    const rootCount = candidate.querySelectorAll('li[data-code]:not([data-parent])').length
    const childCount = candidate.querySelectorAll('li[data-code][data-parent]').length
    const leafCount = candidate.querySelectorAll('li[data-url], [data-url]').length
    if (rootCount < 2 || childCount < 2) {
      continue
    }

    const rect = candidate.getBoundingClientRect()
    const isLeftNavigation = rect.left <= Math.max(96, (doc.defaultView?.innerWidth || 0) * 0.28)
    const hasUsableBox = rect.width > 40 && rect.height > 100
    const text = `${candidate.id || ''} ${candidate.className || ''}`
    const isNamedNavigation = /left|sidebar|menu|nav|west|mainWest/i.test(text)
    const score = childCount * 12 +
      leafCount * 2 +
      (hasUsableBox ? 60 : 0) +
      (isLeftNavigation ? 40 : 0) +
      (isNamedNavigation ? 30 : 0) -
      (candidate === doc.body ? 80 : 0)

    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

function findNavigationSources() {
  const documents = collectAccessibleDocuments()
  const sources = []

  for (const doc of documents) {
    if (!doc.body) {
      continue
    }

    if (!isValidNavigationTakeoverHost(doc)) {
      cleanupInvalidNavigationTakeover(doc)
    }

    const dataCodeScope = findDataCodeNavigationScope(doc)
    if (dataCodeScope) {
      const frameElement = doc.defaultView && doc.defaultView !== window ? doc.defaultView.frameElement : null
      sources.push({ doc, host: dataCodeScope, frameElement })
      continue
    }

    const visibleCandidates = collectNavigationCandidates(doc, false)
    const sourceCandidates = visibleCandidates.length >= NAVIGATION_MIN_ITEMS
      ? visibleCandidates
      : collectNavigationCandidates(doc, true)
    if (sourceCandidates.length < NAVIGATION_MIN_ITEMS) {
      continue
    }

    const candidateElements = sourceCandidates.map((candidate) => candidate.element)
    const frameElement = doc.defaultView && doc.defaultView !== window ? doc.defaultView.frameElement : null
    const cachedHost = doc.querySelector('[data-linke-native-nav-host="1"]')

    if (frameElement) {
      if (isLikelyNavigationFrame(frameElement, candidateElements)) {
        sources.push({ doc, host: doc.body, frameElement })
      } else if (cachedHost) {
        cleanupInvalidNavigationTakeover(doc)
      }
      continue
    }

    const cachedHostScore = cachedHost ? scoreNativeNavigationContainer(cachedHost, candidateElements) : 0
    const container = cachedHostScore > 0
      ? cachedHost
      : findNativeNavigationContainer(doc, candidateElements)

    if (container) {
      sources.push({ doc, host: container, frameElement: null })
    } else if (cachedHost) {
      cleanupInvalidNavigationTakeover(doc)
    }
  }

  return sources
}

function computeRawNavigationLevel(element, host) {
  let level = 0
  let current = element.parentElement

  while (current && current !== host && current !== current.ownerDocument.body) {
    const marker = `${current.tagName || ''} ${current.className || ''} ${current.id || ''}`
    if (/^(UL|OL|LI)$/i.test(current.tagName || '') || /tree|menu|submenu|children|level|node|leaf/i.test(marker)) {
      level += 1
    }
    current = current.parentElement
  }

  return level
}

function hasNavigationCatalog(catalog) {
  return !!catalog &&
    Array.isArray(catalog.groups) &&
    catalog.groups.some((group) => Array.isArray(group.items) && group.items.length > 0)
}

function isNativeNavigationCatalog(catalog) {
  return hasNavigationCatalog(catalog) &&
    catalog.strategy === NAVIGATION_CATALOG_STRATEGY &&
    catalog.sourceMode === 'structured' &&
    catalog.groups.every((group) => String(group.key || '').startsWith('native-'))
}

function scoreNativeNavigationContainer(container, navElements) {
  if (!container || container === container.ownerDocument.body || container === container.ownerDocument.documentElement) {
    return 0
  }

  const win = getWindowFromDocument(container.ownerDocument)
  if (!win) {
    return 0
  }

  const relatedCount = navElements.filter((element) => container.contains(element)).length
  if (relatedCount < NAVIGATION_MIN_ITEMS) {
    return 0
  }

  const rect = container.getBoundingClientRect()
  const text = `${container.id || ''} ${container.className || ''}`
  const isNamedNavigation = /left|menu|nav|sidebar|tree|accordion|west/i.test(text)
  const isLeftArea = rect.left <= Math.max(64, win.innerWidth * 0.18)
  const isReasonableWidth = rect.width > 48 && rect.width <= Math.min(340, win.innerWidth * 0.32)
  const isTallEnough = rect.height >= Math.min(220, win.innerHeight * 0.35)

  if (!isLeftArea || !isReasonableWidth || !isTallEnough) {
    return 0
  }

  return relatedCount * 20 +
    (isNamedNavigation ? 40 : 0) +
    (isLeftArea ? 24 : 0) +
    (isReasonableWidth ? 16 : 0) +
    (isTallEnough ? 10 : 0)
}

function findNativeNavigationContainer(doc, navElements) {
  let best = null
  let bestScore = 0
  const candidates = new Set()

  for (const element of navElements) {
    let current = element.parentElement
    while (current && current !== doc.body && current !== doc.documentElement) {
      candidates.add(current)
      current = current.parentElement
    }
  }

  for (const candidate of candidates) {
    const score = scoreNativeNavigationContainer(candidate, navElements)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

function isLikelyNavigationFrame(frameElement, navElements) {
  if (!frameElement) {
    return false
  }

  const rect = frameElement.getBoundingClientRect()
  const win = frameElement.ownerDocument.defaultView
  const text = [
    frameElement.id,
    frameElement.name,
    frameElement.className,
    frameElement.getAttribute('src')
  ].filter(Boolean).join(' ')
  const isNamedNavigation = /left|menu|nav|tree|sidebar|west/i.test(text)
  const leftish = rect.left <= Math.max(64, win.innerWidth * 0.18)
  const narrow = (rect.width > 0 && rect.width <= Math.min(340, win.innerWidth * 0.32)) ||
    (rect.width <= 0 && isNamedNavigation)
  if (!leftish || !narrow || navElements.length < NAVIGATION_MIN_ITEMS) {
    return false
  }

  if (isNamedNavigation) {
    return true
  }

  return true
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function findNavigationLayoutHost(host) {
  if (!host || !host.closest) {
    return host
  }

  return host.closest('.layout-panel-west, .panel-west, .west, [region="west"], [data-options*="west"]') || host
}

function styleBackupKey(property) {
  return `linkeOriginalStyle${property.replace(/(^|-)([a-z])/g, (_match, _prefix, letter) => letter.toUpperCase())}`
}

function setManagedStyle(element, property, value) {
  if (!element || !element.style || !element.dataset) {
    return
  }

  const backupKey = styleBackupKey(property)
  if (!(backupKey in element.dataset)) {
    element.dataset[backupKey] = element.style.getPropertyValue(property) || ''
  }
  if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') {
    return
  }
  element.style.setProperty(property, value, 'important')
}

function restoreManagedStyles(element, properties) {
  if (!element || !element.style || !element.dataset) {
    return
  }

  for (const property of properties) {
    const backupKey = styleBackupKey(property)
    if (!(backupKey in element.dataset)) {
      continue
    }

    const originalValue = element.dataset[backupKey]
    if (originalValue) {
      element.style.setProperty(property, originalValue)
    } else {
      element.style.removeProperty(property)
    }
    delete element.dataset[backupKey]
  }
}

function isJwOriginalModeEnabled(doc = document) {
  return jwOriginalMode || doc?.documentElement?.dataset?.linkeJwOriginal === '1'
}

function installJwOriginalRestoreStyle(doc) {
  if (!doc?.head || doc.getElementById('linke-jw-original-restore-style')) {
    return
  }

  const style = doc.createElement('style')
  style.id = 'linke-jw-original-restore-style'
  style.textContent = `
    #linke-jw-original-restore {
      display: none;
      position: fixed;
      left: 14px;
      bottom: 16px;
      z-index: 2147483647;
      width: ${NAVIGATION_PANEL_WIDTH - 28}px;
      min-height: 40px;
      padding: 0 12px;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #ffffff;
      color: #1e3a5f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.35;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
      cursor: pointer;
    }
    html[data-linke-jw-original="1"] #linke-jw-original-restore {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
    }
  `
  doc.head.appendChild(style)
}

function isTopDocument(doc) {
  try {
    return doc?.defaultView && doc.defaultView.top === doc.defaultView
  } catch {
    return doc === document
  }
}

function ensureJwOriginalRestoreButton(doc) {
  if (!doc?.body || !isTopDocument(doc)) {
    return
  }

  installJwOriginalRestoreStyle(doc)
  let button = doc.getElementById('linke-jw-original-restore')
  if (!button) {
    button = doc.createElement('button')
    button.id = 'linke-jw-original-restore'
    button.type = 'button'
    button.textContent = '回到定制化界面'
    doc.body.appendChild(button)
  }
  if (button.dataset.linkeRestoreBound === '1') {
    return
  }
  button.dataset.linkeRestoreBound = '1'
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (button.dataset.linkeRestoreTransitioning === '1') {
      return
    }
    button.dataset.linkeRestoreTransitioning = '1'
    button.disabled = true
    requestJwOriginalMode(false)
    window.setTimeout(() => {
      if (!button.isConnected) {
        return
      }
      delete button.dataset.linkeRestoreTransitioning
      button.disabled = false
    }, 1200)
  })
}

function removeJwOriginalRestoreButton(doc) {
  doc?.getElementById?.('linke-jw-original-restore')?.remove()
}

function removePersonalCenterRestoreButton(doc) {
  doc?.getElementById?.('linke-personal-center-restore')?.remove()
}

function restoreJwOriginalLayoutExpansion(doc) {
  if (!doc?.documentElement) {
    return
  }

  for (const element of Array.from(doc.querySelectorAll('[data-linke-jw-original-layout-expanded="1"]'))) {
    delete element.dataset.linkeJwOriginalLayoutExpanded
    restoreManagedStyles(element, JW_ORIGINAL_LAYOUT_MANAGED_STYLES)
  }
}

function restoreCustomizedContentOffsets(doc) {
  if (!doc?.documentElement) {
    return
  }

  doc.getElementById?.(CUSTOMIZED_CONTENT_ALIGNMENT_STYLE_ID)?.remove()
  doc.getElementById?.(CUSTOMIZED_LEGACY_CONTENT_STYLE_ID)?.remove()
  delete doc.documentElement.dataset.linkeCustomizedContentAligned
  delete doc.documentElement.dataset.linkeCustomizedLegacyContent
  for (const element of Array.from(doc.querySelectorAll('[data-linke-native-content-offset-reset="1"]'))) {
    delete element.dataset.linkeNativeContentOffsetReset
    delete element.dataset.linkeCustomizedOffsetForce
    restoreManagedStyles(element, CUSTOMIZED_CONTENT_OFFSET_MANAGED_STYLES)
  }
}

function removeCustomizedNativeLayoutStyle(doc) {
  if (!doc?.documentElement) {
    return
  }

  doc.getElementById?.(CUSTOMIZED_NATIVE_LAYOUT_STYLE_ID)?.remove()
  delete doc.documentElement.dataset.linkeJwCustomizedLayout
}

function installCustomizedNativeLayoutStyle(doc) {
  if (!doc?.head || !doc?.documentElement || !doc?.body || !isTopDocument(doc)) {
    return false
  }
  if (isJwOriginalModeEnabled(doc) || isLoginOrEntryPage()) {
    removeCustomizedNativeLayoutStyle(doc)
    return false
  }

  if (!doc.getElementById(CUSTOMIZED_NATIVE_LAYOUT_STYLE_ID)) {
    const style = doc.createElement('style')
    style.id = CUSTOMIZED_NATIVE_LAYOUT_STYLE_ID
    style.textContent = `
      html[data-linke-jw-customized-layout="1"] #mainWestPanle,
      html[data-linke-jw-customized-layout="1"] .layout-panel-west,
      html[data-linke-jw-customized-layout="1"] .panel-west,
      html[data-linke-jw-customized-layout="1"] .west,
      html[data-linke-jw-customized-layout="1"] [region="west"],
      html[data-linke-jw-customized-layout="1"] [data-options*="west"],
      html[data-linke-jw-customized-layout="1"] #left,
      html[data-linke-jw-customized-layout="1"] #leftPanel,
      html[data-linke-jw-customized-layout="1"] #leftMenu,
      html[data-linke-jw-customized-layout="1"] .left-panel,
      html[data-linke-jw-customized-layout="1"] .left-menu,
      html[data-linke-jw-customized-layout="1"] .leftsidebar,
      html[data-linke-jw-customized-layout="1"] .first-sidebar,
      html[data-linke-jw-customized-layout="1"] .left-nav,
      html[data-linke-jw-customized-layout="1"] .nav-left,
      html[data-linke-jw-customized-layout="1"] .menu-left,
      html[data-linke-jw-customized-layout="1"] .main-sidebar,
      html[data-linke-jw-customized-layout="1"] .sidebar-menu {
        display: none !important;
        visibility: hidden !important;
        left: 0 !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        flex-basis: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
      }

      html[data-linke-jw-customized-layout="1"] .layout-split-west,
      html[data-linke-jw-customized-layout="1"] .layout-expand-west,
      html[data-linke-jw-customized-layout="1"] .splitter-west,
      html[data-linke-jw-customized-layout="1"] [class*="split-west"],
      html[data-linke-jw-customized-layout="1"] [class*="expand-west"] {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
      }

      html[data-linke-jw-customized-layout="1"] #mainCenterPanle,
      html[data-linke-jw-customized-layout="1"] #mainContentPanle,
      html[data-linke-jw-customized-layout="1"] .layout-panel-center,
      html[data-linke-jw-customized-layout="1"] .panel-center,
      html[data-linke-jw-customized-layout="1"] [region="center"],
      html[data-linke-jw-customized-layout="1"] [data-options*="center"],
      html[data-linke-jw-customized-layout="1"] .tabs-panels,
      html[data-linke-jw-customized-layout="1"] .tabs-panels > .panel,
      html[data-linke-jw-customized-layout="1"] #mainContentPanle .panel-body,
      html[data-linke-jw-customized-layout="1"] #mainContentPanle .panel-body-noheader,
      html[data-linke-jw-customized-layout="1"] #mainContentPanle .layout-body {
        left: 0 !important;
        top: 0 !important;
        margin-left: 0 !important;
        padding-left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        min-height: 100vh !important;
        max-height: none !important;
        max-width: none !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      html[data-linke-jw-customized-layout="1"] iframe#Frame0,
      html[data-linke-jw-customized-layout="1"] iframe[name="Frame0"],
      html[data-linke-jw-customized-layout="1"] iframe[src*="xsMain_new"] {
        left: 0 !important;
        margin-left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        box-sizing: border-box !important;
      }
    `
    doc.head.appendChild(style)
  }

  doc.documentElement.dataset.linkeJwCustomizedLayout = '1'
  return true
}

function expandElementToViewportRight(element, win) {
  if (!element?.getBoundingClientRect || !win) {
    return
  }

  const rect = element.getBoundingClientRect()
  if (!Number.isFinite(rect.left) || rect.left < 0 || rect.left > win.innerWidth - 160) {
    return
  }

  const desiredWidth = Math.max(320, Math.round(win.innerWidth - rect.left - 2))
  const desiredHeight = Number.isFinite(rect.top)
    ? Math.max(260, Math.round(win.innerHeight - rect.top - 2))
    : 0
  if (rect.width >= desiredWidth - 8 && (!desiredHeight || rect.height >= desiredHeight - 8)) {
    return
  }

  element.dataset.linkeJwOriginalLayoutExpanded = '1'
  setManagedStyle(element, 'width', `${desiredWidth}px`)
  setManagedStyle(element, 'min-width', '0')
  setManagedStyle(element, 'max-width', `${desiredWidth}px`)
  setManagedStyle(element, 'right', '0px')
  if (desiredHeight) {
    setManagedStyle(element, 'height', `${desiredHeight}px`)
  }
  if (/^(iframe|frame)$/i.test(element.tagName || '')) {
    element.setAttribute('width', String(desiredWidth))
    if (desiredHeight) {
      element.setAttribute('height', String(desiredHeight))
    }
  }
}

function expandJwOriginalLayout(doc) {
  if (!doc?.body || !isTopDocument(doc)) {
    return
  }

  const win = getWindowFromDocument(doc)
  if (!win || win.innerWidth < 720) {
    return
  }

  const candidates = [
    '#mainCenterPanle',
    '#mainContentPanle',
    '.layout-panel-center',
    '.panel-center',
    '.tabs-panels',
    '.tabs-panels > .panel',
    '#mainContentPanle .panel-body',
    '#mainContentPanle .panel-body-noheader',
    '#mainContentPanle .layout-body',
    '.center',
    '[region="center"]',
    '[data-options*="center"]',
    'iframe#Frame0',
    'iframe[name="Frame0"]'
  ].join(',')

  for (const element of Array.from(doc.querySelectorAll(candidates))) {
    expandElementToViewportRight(element, win)
  }
}

function restoreNativeChromeCompaction(doc) {
  if (!doc?.documentElement) {
    return
  }

  doc.documentElement.classList.remove('linke-native-chrome-prehide')
  removeCustomizedNativeLayoutStyle(doc)
  cleanupInvalidNavigationTakeover(doc)

  for (const element of Array.from(doc.querySelectorAll('[data-linke-native-chrome-hidden="1"]'))) {
    delete element.dataset.linkeNativeChromeHidden
    restoreManagedStyles(element, NATIVE_HIDDEN_MANAGED_STYLES)
  }

  for (const element of Array.from(doc.querySelectorAll('[data-linke-native-content-title-hidden="1"]'))) {
    delete element.dataset.linkeNativeContentTitleHidden
    restoreManagedStyles(element, NATIVE_HIDDEN_MANAGED_STYLES)
  }

  for (const element of Array.from(doc.querySelectorAll('[data-linke-native-chrome-compacted="1"]'))) {
    delete element.dataset.linkeNativeChromeCompacted
    const tag = String(element.tagName || '').toLowerCase()
    restoreManagedStyles(
      element,
      tag === 'iframe' || tag === 'frame'
        ? NATIVE_CHROME_FRAME_MANAGED_STYLES
        : NATIVE_CHROME_PANEL_MANAGED_STYLES
    )
  }

  restoreJwOriginalLayoutExpansion(doc)
  restoreCustomizedContentOffsets(doc)
}

function applyJwOriginalModeToDocument(doc, enabled) {
  if (!doc?.documentElement) {
    return
  }

  if (enabled) {
    doc.documentElement.dataset.linkeJwOriginal = '1'
    removePersonalCenterRestoreButton(doc)
    restoreNativeChromeCompaction(doc)
    if (isPersonalCenterDocument(doc)) {
      installPersonalCenterOriginalLayoutStyle(doc)
      doc.documentElement.dataset.linkePersonalCenterOriginal = '1'
      delete doc.documentElement.dataset.linkePersonalCenterCustomized
    }
    expandJwOriginalLayout(doc)
    ensureJwOriginalRestoreButton(doc)
    return
  }

  delete doc.documentElement.dataset.linkeJwOriginal
  delete doc.documentElement.dataset.linkePersonalCenterOriginal
  restoreJwOriginalLayoutExpansion(doc)
  removeJwOriginalRestoreButton(doc)
  removePersonalCenterRestoreButton(doc)
  if (isPersonalCenterDocument(doc)) {
    if (doc.getElementById('linke-personal-center-dashboard')) {
      installPersonalCenterDashboardStyle(doc)
      doc.documentElement.dataset.linkePersonalCenterCustomized = '1'
    }
    ensurePersonalCenterDashboard(doc)
  }
}

function applyPersonalCenterCustomizedTakeover(doc) {
  if (!doc?.documentElement || !doc?.body || isJwOriginalModeEnabled(doc) || !isPersonalCenterDocument(doc)) {
    return false
  }

  delete doc.documentElement.dataset.linkeJwOriginal
  delete doc.documentElement.dataset.linkePersonalCenterOriginal
  removeJwOriginalRestoreButton(doc)
  removePersonalCenterRestoreButton(doc)
  return ensurePersonalCenterDashboard(doc)
}

function runPersonalCenterCustomizedTakeover(options = {}) {
  if (jwOriginalMode || isJwOriginalModeEnabled(document) || isLoginOrEntryPage()) {
    return false
  }

  if (isTopFrame() && options.forceFrame) {
    triggerNativePersonalCenterNavigation()
    forcePersonalCenterFrame({ reload: false })
  }

  let handled = false
  const docs = isTopFrame() ? collectAccessibleDocuments() : [document]
  for (const doc of Array.from(new Set(docs))) {
    try {
      handled = applyPersonalCenterCustomizedTakeover(doc) || handled
    } catch {}
  }

  if (handled) {
    scheduleNativeChromeCompaction(80)
  }
  return handled
}

let personalCenterCustomizedTakeoverTimer

function schedulePersonalCenterCustomizedTakeover(delay = 180, options = {}) {
  window.clearTimeout(personalCenterCustomizedTakeoverTimer)
  personalCenterCustomizedTakeoverTimer = window.setTimeout(() => {
    runPersonalCenterCustomizedTakeover(options)
  }, delay)
}

function schedulePersonalCenterCustomizedTakeoverBurst(options = {}) {
  for (const delay of [0, 120, 360, 800, 1400, 2400]) {
    window.setTimeout(() => {
      runPersonalCenterCustomizedTakeover(options)
    }, delay)
  }
}

function setJwOriginalMode(enabled) {
  const previousOriginalMode = jwOriginalMode
  jwOriginalMode = !!enabled
  const modeChanged = previousOriginalMode !== jwOriginalMode
  try {
    if (jwOriginalMode) {
      window.sessionStorage?.setItem(JW_ORIGINAL_MODE_SESSION_KEY, '1')
    } else {
      window.sessionStorage?.removeItem(JW_ORIGINAL_MODE_SESSION_KEY)
    }
  } catch {}

  if (modeChanged) {
    closeAllPersonalNoticeDialogs(jwOriginalMode ? 'original-mode-enabled' : 'original-mode-disabled')
  }

  for (const doc of Array.from(new Set(collectAccessibleDocuments()))) {
    applyJwOriginalModeToDocument(doc, jwOriginalMode)
  }

  if (jwOriginalMode) {
    for (const doc of Array.from(new Set(collectAccessibleDocuments()))) {
      try {
        cleanupCourseAugmentationsInDocument(doc)
      } catch {}
    }
    if (modeChanged) {
      resetModeSwitchToPersonalCenter({ customized: false })
    }
    window.clearTimeout(navigationScanTimer)
    window.clearTimeout(nativeChromeCompactionTimer)
    window.clearInterval(navigationBootTimer)
    navigationRendered = false
    return
  }

  if (isTopFrame() && isAllowedPage()) {
    if (isLoginOrEntryPage()) {
      restoreLoginPageLayout()
      return
    }
    installEarlyNativeChromePrehideStyle()
    compactNativeNavigationForCustomizedMode()
    if (modeChanged) {
      resetModeSwitchToPersonalCenter({ customized: true })
      schedulePersonalCenterCustomizedTakeoverBurst({ forceFrame: true })
    }
    scheduleCustomizedNavigationCompactionBurst()
    runNativeChromeCompaction()
    scheduleNativeChromeCompactionBurst()
    schedulePersonalCenterCustomizedTakeoverBurst()
    scheduleNavigationScan(150, { force: true })
  }
}

function requestJwOriginalMode(enabled) {
  setJwOriginalMode(enabled)
  ipcRenderer.invoke('jw:original-mode:set', { enabled: !!enabled }).catch(() => {})
}

function applyNavigationPanelWidth(element, width) {
  if (!element || !element.style) {
    return
  }

  element.dataset.linkeNativeNavResized = '1'
  setManagedStyle(element, 'width', width)
  setManagedStyle(element, 'flex-basis', width)
  setManagedStyle(element, 'flex-shrink', '0')
  setManagedStyle(element, 'min-width', '0')
  setManagedStyle(element, 'max-width', width)
  setManagedStyle(element, 'box-sizing', 'border-box')
  setManagedStyle(element, 'right', 'auto')
}

function resizeKnownCenterPanels(layoutHost, width) {
  if (!layoutHost || !layoutHost.parentElement) {
    return
  }

  const parent = layoutHost.parentElement
  const panelWidth = Number.parseInt(width, 10) || 0
  const parentRect = parent.getBoundingClientRect()
  const centerCandidates = Array.from(parent.children).filter((element) => {
    if (element === layoutHost || !element.matches) {
      return false
    }
    return element.matches('.layout-panel-center, .panel-center, .center, [region="center"], [data-options*="center"]')
  })

  for (const center of centerCandidates) {
    center.dataset.linkeNativeCenterResized = '1'
    setManagedStyle(center, 'left', width)
    setManagedStyle(center, 'margin-left', '0')
    setManagedStyle(center, 'right', '0')
    if (parentRect.width > panelWidth + 120) {
      setManagedStyle(center, 'width', `${Math.max(120, Math.round(parentRect.width - panelWidth))}px`)
    }
  }
}

function collapseSiblingSplitters(layoutHost) {
  const parent = layoutHost && layoutHost.parentElement
  if (!parent) {
    return
  }

  const splitterSelectors = [
    '.layout-split-west',
    '.layout-expand-west',
    '.panel-tool',
    '.splitter',
    '.splitter-west',
    '[class*="split-west"]',
    '[class*="expand-west"]'
  ].join(',')

  for (const sibling of Array.from(parent.children)) {
    if (sibling === layoutHost || !sibling.matches || !sibling.matches(splitterSelectors)) {
      continue
    }
    sibling.dataset.linkeNativeSplitterCollapsed = '1'
    setManagedStyle(sibling, 'display', 'none')
    setManagedStyle(sibling, 'width', '0px')
    setManagedStyle(sibling, 'min-width', '0px')
    setManagedStyle(sibling, 'max-width', '0px')
    setManagedStyle(sibling, 'margin', '0')
    setManagedStyle(sibling, 'padding', '0')
    setManagedStyle(sibling, 'border', '0')
    setManagedStyle(sibling, 'overflow', 'hidden')
  }
}

function collapseBoxElement(element, width = '0px') {
  if (!element || !element.style) {
    return
  }

  setManagedStyle(element, 'display', 'none')
  setManagedStyle(element, 'width', width)
  setManagedStyle(element, 'min-width', width)
  setManagedStyle(element, 'max-width', width)
  setManagedStyle(element, 'flex-basis', width)
  setManagedStyle(element, 'margin', '0')
  setManagedStyle(element, 'padding', '0')
  setManagedStyle(element, 'border', '0')
  setManagedStyle(element, 'overflow', 'hidden')
}

function isCollapsibleLeftArea(element) {
  if (!element || element === element.ownerDocument.body || element === element.ownerDocument.documentElement) {
    return false
  }

  const win = getWindowFromDocument(element.ownerDocument)
  if (!win) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const leftLimit = Math.max(96, win.innerWidth * 0.28)
  const widthLimit = Math.min(380, win.innerWidth * 0.38)
  return rect.left >= -4 &&
    rect.left <= leftLimit &&
    rect.width > 8 &&
    rect.width <= widthLimit &&
    rect.height >= Math.min(120, win.innerHeight * 0.22)
}

function findCollapsibleLeftAncestor(element) {
  let current = element && element.parentElement
  while (current && current !== current.ownerDocument.body && current !== current.ownerDocument.documentElement) {
    if (isCollapsibleLeftArea(current)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function findCollapsibleLayoutSlot(element) {
  if (!element || !element.closest) {
    return null
  }

  const slot = element.closest('td, th, .layout-panel-west, .panel-west, .west, [region="west"], [data-options*="west"]')
  if (!slot || slot === element || !isCollapsibleLeftArea(slot)) {
    return null
  }

  return slot
}

function collapseLeftPanelElement(element) {
  if (!element || !isCollapsibleLeftArea(element)) {
    return false
  }

  const layoutSlot = findCollapsibleLayoutSlot(element)
  element.dataset.linkeNativeNavResized = '1'
  collapseBoxElement(element, '0px')
  resizeKnownCenterPanels(element, '0px')
  collapseSiblingSplitters(element)

  if (layoutSlot) {
    layoutSlot.dataset.linkeNativeNavResized = '1'
    collapseBoxElement(layoutSlot, '0px')
    resizeKnownCenterPanels(layoutSlot, '0px')
    collapseSiblingSplitters(layoutSlot)
  }

  return true
}

function collapseFrameSetSlot(frameElement) {
  const parent = frameElement && frameElement.parentElement
  if (!parent || !/^frameset$/i.test(parent.tagName || '')) {
    return false
  }

  const frameChildren = Array.from(parent.children)
    .filter((child) => /^(frame|iframe)$/i.test(child.tagName || ''))
  const frameIndex = frameChildren.indexOf(frameElement)
  if (frameIndex < 0) {
    return false
  }

  let changed = false
  for (const attribute of ['cols', 'rows']) {
    const value = parent.getAttribute(attribute)
    if (!value) {
      continue
    }

    const backupKey = attribute === 'cols' ? 'linkeOriginalCols' : 'linkeOriginalRows'
    if (!parent.dataset[backupKey]) {
      parent.dataset[backupKey] = value
    }

    const parts = value.split(',').map((part) => part.trim())
    if (parts.length === frameChildren.length) {
      parts[frameIndex] = '0'
      parent.setAttribute(attribute, parts.join(','))
      changed = true
    }
  }

  parent.setAttribute('frameborder', '0')
  parent.setAttribute('border', '0')
  parent.setAttribute('framespacing', '0')
  return changed
}

function findCollapsibleFrameContainer(frameElement) {
  if (!frameElement || !frameElement.closest) {
    return null
  }

  return frameElement.closest('td, th, .layout-panel-west, .panel-west, .west, [region="west"], [data-options*="west"]') ||
    findCollapsibleLeftAncestor(frameElement)
}

function countNativeNavigationTextLabels(text) {
  const compact = normalizeText(text)
  return NATIVE_NAVIGATION_TEXT_LABELS.reduce((count, label) => (
    compact.includes(label) ? count + 1 : count
  ), 0)
}

function isLikelyNativeLeftNavigationElement(element) {
  if (!element || isPersonalCenterGeneratedNode(element) || !isCollapsibleLeftArea(element)) {
    return false
  }

  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('role') || ''}`
  const structuralCount = element.querySelectorAll?.('li[data-code], li[data-url], [data-code], [data-url], .tree-node, .accordion-header, .panel-header')?.length || 0
  const labelCount = countNativeNavigationTextLabels(element.innerText || element.textContent || '')
  if (labelCount >= 2 || structuralCount >= 3) {
    return true
  }

  return labelCount >= 1 && /left|sidebar|menu|nav|west|tree|accordion|panel/i.test(marker)
}

function collapseDetectedLeftNavigationPanels(doc) {
  if (!doc?.body) {
    return
  }

  const selector = [
    'aside',
    'nav',
    'section',
    'div',
    'ul',
    'ol',
    'table',
    'tbody',
    'tr',
    'td',
    'iframe',
    'frame'
  ].join(',')
  const candidates = Array.from(doc.body.querySelectorAll(selector))
    .filter(isLikelyNativeLeftNavigationElement)
    .sort((first, second) => {
      const firstRect = first.getBoundingClientRect()
      const secondRect = second.getBoundingClientRect()
      return (secondRect.width * secondRect.height) - (firstRect.width * firstRect.height)
    })
  const collapsed = []

  for (const candidate of candidates) {
    if (collapsed.some((ancestor) => ancestor.contains(candidate))) {
      continue
    }
    if (collapseLeftPanelElement(candidate)) {
      collapsed.push(candidate)
    }
  }
}

function collapseKnownLeftNavigationPanels(doc) {
  if (!doc || !doc.body) {
    return
  }

  const selectors = [
    '.layout-panel-west',
    '.panel-west',
    '.west',
    '[region="west"]',
    '[data-options*="west"]',
    '#left',
    '#leftPanel',
    '#leftMenu',
    '#mainWestPanle',
    '.left-panel',
    '.left-menu',
    '.leftsidebar',
    '.first-sidebar',
    '.left-nav',
    '.nav-left',
    '.menu-left',
    '.main-sidebar',
    '.sidebar-menu'
  ].join(',')

  for (const candidate of Array.from(doc.querySelectorAll(selectors))) {
    collapseLeftPanelElement(candidate)
  }
  collapseDetectedLeftNavigationPanels(doc)
}

function expandKnownContentFrames(doc) {
  if (!doc || !doc.body) {
    return
  }

  const win = getWindowFromDocument(doc)
  if (!win) {
    return
  }

  const contentFrames = Array.from(doc.querySelectorAll('iframe#Frame0, iframe[name="Frame0"], iframe[src*="xsMain_new"]'))
  for (const frame of contentFrames) {
    const rect = frame.getBoundingClientRect()
    if (rect.left <= 4) {
      continue
    }

    frame.dataset.linkeNativeCenterResized = '1'
    setManagedStyle(frame, 'left', '0px')
    setManagedStyle(frame, 'margin-left', '0')
    setManagedStyle(frame, 'right', '0')
    const parentRect = frame.parentElement?.getBoundingClientRect()
    const width = parentRect && parentRect.width > 120 ? parentRect.width : win.innerWidth
    setManagedStyle(frame, 'width', `${Math.max(120, Math.round(width))}px`)
  }
}

function expandKnownCenterPanels(doc) {
  if (!doc || !doc.body) {
    return
  }

  const win = getWindowFromDocument(doc)
  if (!win) {
    return
  }

  const centerCandidates = Array.from(doc.querySelectorAll('.layout-panel-center, .panel-center, .center, [region="center"], [data-options*="center"]'))
  for (const center of centerCandidates) {
    const rect = center.getBoundingClientRect()
    if (rect.left <= 4 || rect.left > Math.min(420, win.innerWidth * 0.45)) {
      continue
    }

    center.dataset.linkeNativeCenterResized = '1'
    setManagedStyle(center, 'left', '0px')
    setManagedStyle(center, 'margin-left', '0')
    setManagedStyle(center, 'right', '0')
    if (center.parentElement) {
      const parentRect = center.parentElement.getBoundingClientRect()
      if (parentRect.width > 120) {
        setManagedStyle(center, 'width', `${Math.round(parentRect.width)}px`)
      }
    }
  }
}

function shouldResetCustomizedContentOffset(element, win) {
  if (!element || !win || isPersonalCenterGeneratedNode(element) || isLikelyNativeLeftNavigationElement(element)) {
    return false
  }

  const tagName = String(element.tagName || '').toLowerCase()
  const rect = element.getBoundingClientRect()
  const style = win.getComputedStyle?.(element)
  const styledLeftOffset = Math.max(
    Number.parseFloat(style?.left || '0') || 0,
    Number.parseFloat(style?.marginLeft || '0') || 0,
    Number.parseFloat(style?.paddingLeft || '0') || 0
  )
  if (tagName === 'center' || element.dataset.linkeCustomizedOffsetForce === '1') {
    return rect.width > 120 && rect.height > 16
  }
  const leftLimit = Math.min(520, win.innerWidth * 0.52)
  return (rect.left > 8 || styledLeftOffset > 8) &&
    rect.left <= leftLimit &&
    rect.width > 120 &&
    rect.height > 32
}

function resetCustomizedContentOffsetElement(element, win) {
  if (isInsidePersonalNoticeModal(element)) {
    return false
  }
  if (!shouldResetCustomizedContentOffset(element, win)) {
    return false
  }

  const tagName = String(element.tagName || '').toLowerCase()
  const isFrame = tagName === 'iframe' || tagName === 'frame'
  const isTable = tagName === 'table' || tagName === 'tbody' || tagName === 'tr' || tagName === 'td' || tagName === 'th'
  const rect = element.getBoundingClientRect()
  const targetWidth = Math.max(320, Math.round(win.innerWidth - 4))

  element.dataset.linkeNativeContentOffsetReset = '1'
  setManagedStyle(element, 'left', '0px')
  setManagedStyle(element, 'margin-left', '0')
  setManagedStyle(element, 'margin-right', 'auto')
  setManagedStyle(element, 'padding-left', '0')
  setManagedStyle(element, 'transform', 'none')
  if (tagName === 'center') {
    setManagedStyle(element, 'text-align', 'left')
  }
  if (!isTable) {
    setManagedStyle(element, 'right', '0px')
    setManagedStyle(element, 'box-sizing', 'border-box')
    setManagedStyle(element, 'width', `${targetWidth}px`)
  } else if (rect.width < targetWidth - 16) {
    setManagedStyle(element, 'width', `${Math.max(320, Math.round(rect.width))}px`)
  }
  if (isFrame) {
    element.setAttribute('width', String(targetWidth))
  }
  return true
}

function isNestedCustomizedContentOffsetCandidate(element, win) {
  if (!element || !win || isInsidePersonalNoticeModal(element) || isPersonalCenterGeneratedNode(element) || isLikelyNativeLeftNavigationElement(element)) {
    return false
  }

  if (element.closest?.('#linke-jw-navigation-root, #linke-personal-center-dashboard, #linke-jw-original-restore, #linke-personal-center-restore, .window, .window-shadow, .window-mask, .layui-layer, .layui-layer-shade, .ui-dialog, .artDialog, .aui_outer, [role="dialog"]')) {
    return false
  }

  const tagName = String(element.tagName || '').toLowerCase()
  if (!['div', 'section', 'main', 'form', 'table', 'center'].includes(tagName)) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const leftOffset = Math.round(rect.left)
  const leftMin = Math.min(96, win.innerWidth * 0.12)
  const leftMax = Math.min(520, win.innerWidth * 0.52)
  const minWidth = Math.min(360, win.innerWidth * 0.32)
  return leftOffset > leftMin &&
    leftOffset <= leftMax &&
    rect.width >= minWidth &&
    rect.height >= 20
}

function collectNestedCustomizedContentOffsetCandidates(doc, win) {
  if (!doc?.body || !win) {
    return []
  }

  return Array.from(doc.body.querySelectorAll('div, section, main, form, table, center'))
    .filter((element) => isNestedCustomizedContentOffsetCandidate(element, win))
    .sort((first, second) => {
      const firstRect = first.getBoundingClientRect()
      const secondRect = second.getBoundingClientRect()
      return firstRect.left - secondRect.left || secondRect.width - firstRect.width
    })
    .slice(0, 24)
}

function shouldResetCustomizedTextAlignment(element, win) {
  if (!element || !win || isInsidePersonalNoticeModal(element) || isPersonalCenterGeneratedNode(element) || isLikelyNativeLeftNavigationElement(element)) {
    return false
  }

  if (element.closest?.('#linke-jw-navigation-root, #linke-personal-center-dashboard, #linke-jw-original-restore, #linke-personal-center-restore, .window, .window-shadow, .window-mask, .layui-layer, .layui-layer-shade, .ui-dialog, .artDialog, .aui_outer, [role="dialog"]')) {
    return false
  }

  const rect = element.getBoundingClientRect()
  if (rect.width < Math.min(360, win.innerWidth * 0.32) || rect.height < 20) {
    return false
  }

  const tagName = String(element.tagName || '').toLowerCase()
  const style = win.getComputedStyle?.(element)
  return tagName === 'center' || style?.textAlign === 'center'
}

function resetCustomizedTextAlignment(doc, win) {
  if (!doc?.body || !win) {
    return
  }

  const selectors = [
    'body',
    'body > center',
    'body > div',
    'body > table',
    'form',
    'form > div',
    'form > center',
    '.Nsb_pw',
    '.Nsb_r_list',
    '.Nsb_r_content',
    '.panel-body',
    '.layout-body'
  ].join(',')

  for (const element of Array.from(doc.querySelectorAll(selectors)).slice(0, 40)) {
    if (!shouldResetCustomizedTextAlignment(element, win)) {
      continue
    }

    element.dataset.linkeNativeContentOffsetReset = '1'
    setManagedStyle(element, 'text-align', 'left')
    setManagedStyle(element, 'margin-left', '0')
    setManagedStyle(element, 'padding-left', '0')
  }
}

function isVisibleInputInDocument(input, doc) {
  if (!input || input.disabled || input.readOnly || input.type === 'hidden') {
    return false
  }

  const win = getWindowFromDocument(doc)
  if (!win) {
    return false
  }

  const rect = input.getBoundingClientRect()
  const style = win.getComputedStyle(input)
  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
}

function findVisibleInputInDocument(doc, selector) {
  if (!doc?.querySelectorAll) {
    return null
  }

  return Array.from(doc.querySelectorAll(selector)).find((input) => isVisibleInputInDocument(input, doc)) || null
}

function isLikelyLoginEntryDocument(doc) {
  if (!isAllowedDocument(doc)) {
    return false
  }

  try {
    const pathname = doc.location.pathname.replace(/\/+$/, '')
    if (!pathname) {
      return true
    }
    return /login|slogin|cas|Logon\.do/i.test(pathname)
  } catch {
    return true
  }
}

function isLoginFormDocument(doc) {
  return isAllowedDocument(doc) &&
    !!findVisibleInputInDocument(doc, ACCOUNT_INPUT_SELECTOR) &&
    !!findVisibleInputInDocument(doc, PASSWORD_INPUT_SELECTOR)
}

function isCustomizedLegacyContentDocument(doc) {
  if (!doc?.head || !doc?.body || !doc?.documentElement || !isAllowedDocument(doc)) {
    return false
  }
  if (isPersonalNoticeDetailDocument(doc)) {
    return false
  }
  if (isJwOriginalModeEnabled(doc) || isLikelyLoginEntryDocument(doc) || isLoginFormDocument(doc)) {
    return false
  }
  if (doc.getElementById('Frame0') || doc.getElementById('linke-jw-navigation-root')) {
    return false
  }
  if (doc.getElementById('linke-personal-center-dashboard')) {
    return false
  }

  return true
}

function isPersonalNoticeDetailDocument(doc) {
  if (!doc?.body || !doc?.documentElement || doc.getElementById('Frame0') || doc.getElementById('linke-personal-center-dashboard')) {
    return false
  }
  try {
    const pathname = String(doc.location?.pathname || '')
    if (/\/jsxsd\/framework\/main_index_[^/?#]*\.jsp/i.test(pathname) ||
      /\/jsxsd\/framework\/.*(?:tzgg|ggxx|notice|gonggao|announce).*\.jsp/i.test(pathname)) {
      return true
    }
  } catch {}
  return doc.documentElement.dataset.linkePersonalNoticeDialog === '1' && isLikelyNoticeAnnouncementDocument(doc)
}

function restoreNativeContentTitleHidden(doc) {
  if (!doc?.querySelectorAll) {
    return
  }
  for (const element of Array.from(doc.querySelectorAll('[data-linke-native-content-title-hidden="1"]'))) {
    delete element.dataset.linkeNativeContentTitleHidden
    restoreManagedStyles(element, NATIVE_HIDDEN_MANAGED_STYLES)
  }
}

function installCustomizedLegacyContentStyle(doc) {
  if (!isCustomizedLegacyContentDocument(doc)) {
    doc?.getElementById?.(CUSTOMIZED_LEGACY_CONTENT_STYLE_ID)?.remove()
    if (doc?.documentElement) {
      delete doc.documentElement.dataset.linkeCustomizedLegacyContent
    }
    return false
  }

  doc.getElementById(CUSTOMIZED_LEGACY_CONTENT_STYLE_ID)?.remove()
  doc.documentElement.dataset.linkeCustomizedLegacyContent = '1'
  return true
}

function resetCustomizedContentOffsets(doc) {
  if (!doc?.body) {
    return
  }
  if (isPersonalNoticeDetailDocument(doc)) {
    restoreNativeContentTitleHidden(doc)
    return
  }

  const win = getWindowFromDocument(doc)
  if (!win || win.innerWidth < 640) {
    return
  }

  const isLegacyContent = installCustomizedLegacyContentStyle(doc)
  if (isLegacyContent) {
    return
  }

  resetCustomizedTextAlignment(doc, win)

  const selector = [
    '#mainCenterPanle',
    '#mainContentPanle',
    '.layout-panel-center',
    '.panel-center',
    '.center',
    '[region="center"]',
    '[data-options*="center"]',
    'iframe#Frame0',
    'iframe[name="Frame0"]',
    '.Nsb_pw',
    '.Nsb_r_list',
    '.Nsb_r_content',
    '.content',
    '.right',
    'form',
    'body > center:first-of-type',
    'body > center:first-of-type > table:first-of-type',
    'body > table:first-of-type',
    'body > center > table:first-of-type'
  ].join(',')
  const candidates = new Set(Array.from(doc.querySelectorAll(selector)))

  candidates.add(doc.body)
  for (const center of Array.from(doc.querySelectorAll('body > center, body > div > center')).slice(0, 4)) {
    center.dataset.linkeCustomizedOffsetForce = '1'
    candidates.add(center)
  }
  for (const child of Array.from(doc.body.children).slice(0, 8)) {
    if (isInsidePersonalNoticeModal(child)) {
      continue
    }
    candidates.add(child)
  }
  for (const frame of Array.from(doc.querySelectorAll('iframe#Frame0, iframe[name="Frame0"]'))) {
    let current = frame.parentElement
    for (let depth = 0; current && current !== doc.body && depth < 4; depth += 1, current = current.parentElement) {
      candidates.add(current)
    }
  }
  for (const candidate of collectNestedCustomizedContentOffsetCandidates(doc, win)) {
    candidates.add(candidate)
  }

  for (const candidate of candidates) {
    resetCustomizedContentOffsetElement(candidate, win)
  }
}

function collapseResidualNavigationSpace(source) {
  try {
    const docs = source && source.doc ? [source.doc, ...collectAccessibleDocuments()] : collectAccessibleDocuments()
    for (const doc of Array.from(new Set(docs))) {
      installContentFrameCompactionHooks(doc)
      installCustomizedNativeLayoutStyle(doc)
      compactNativeTopChrome(doc)
      compactNativeContentPageHeader(doc)
      collapseKnownLeftNavigationPanels(doc)
      expandKnownCenterPanels(doc)
      expandKnownContentFrames(doc)
      resetCustomizedContentOffsets(doc)
    }
  } catch {}
}

function compactNativeNavigationForCustomizedMode() {
  if (isJwOriginalModeEnabled(document)) {
    return
  }

  if (isLoginOrEntryPage()) {
    restoreLoginPageLayout()
    return
  }

  try {
    for (const doc of Array.from(new Set(collectAccessibleDocuments()))) {
      if (!doc?.body) {
        continue
      }
      removeJwOriginalRestoreButton(doc)
      removePersonalCenterRestoreButton(doc)
      installContentFrameCompactionHooks(doc)
      installCustomizedNativeLayoutStyle(doc)
      compactNativeTopChrome(doc)
      compactNativeContentPageHeader(doc)
      collapseKnownLeftNavigationPanels(doc)
      expandKnownCenterPanels(doc)
      expandKnownContentFrames(doc)
      resetCustomizedContentOffsets(doc)
    }

    for (const source of findNavigationSources()) {
      collapseNativeNavigationSource(source)
    }
  } catch {}
}

function scheduleCustomizedNavigationCompactionBurst() {
  for (const delay of [0, 120, 360]) {
    window.setTimeout(compactNativeNavigationForCustomizedMode, delay)
  }
}

function isNativeContentTitleCandidate(element) {
  if (!element || !element.ownerDocument || !element.textContent) {
    return false
  }
  if (isPersonalNoticeDetailDocument(element.ownerDocument)) {
    return false
  }
  if (isPersonalCenterGeneratedNode(element)) {
    return false
  }

  const target = getNativeContentTitleHideTarget(element)
  if (!target) {
    return false
  }
  if (isPersonalCenterGeneratedNode(target)) {
    return false
  }

  if (target.querySelector('button, input, select, textarea, iframe, frame, a[href], [data-url], [onclick]')) {
    return false
  }
  if (target === element && target.querySelector('table')) {
    return false
  }

  const text = normalizeText(target.textContent)
  if (!text || text.length > 64 || /^(返回|增加|删除|修改|查询|搜索|提交|保存|取消|关闭)$/.test(text)) {
    return false
  }

  const win = getWindowFromDocument(element.ownerDocument)
  const rect = target.getBoundingClientRect()
  const topLimit = Math.max(96, (win?.innerHeight || 720) * 0.18)
  if (rect.width <= 0 || rect.height <= 0 || rect.top < -2 || rect.top > topLimit) {
    return false
  }

  if (rect.height > 64) {
    return false
  }

  const style = win?.getComputedStyle(target)
  if (style && (style.display === 'none' || style.visibility === 'hidden')) {
    return false
  }

  return true
}

function getNativeContentTitleHideTarget(element) {
  if (!element || !element.ownerDocument) {
    return null
  }

  const row = element.closest && element.closest('tr')
  if (row && row.ownerDocument === element.ownerDocument) {
    const cells = Array.from(row.children).filter((child) => /^(td|th)$/i.test(child.tagName || ''))
    if (cells.length > 2) {
      return null
    }
    const rowText = normalizeText(row.textContent)
    const elementText = normalizeText(element.textContent)
    if (cells.length <= 2 && rowText && rowText === elementText && rowText.length <= 64) {
      return row
    }
  }

  return element
}

function compactNativeContentPageHeader(doc) {
  if (!doc || !doc.body || doc.getElementById('Frame0')) {
    return false
  }
  if (isPersonalNoticeDetailDocument(doc)) {
    restoreNativeContentTitleHidden(doc)
    return false
  }

  let changed = false
  const titleSelectors = [
    '.Nsb_pw .Nsb_r_title',
    '.Nsb_pw .Nsb_title',
    '.Nsb_pw .Nsb_top',
    '.Nsb_pw .Nsb_r_top',
    '.Nsb_pw .title',
    '.Nsb_pw .Title',
    '.Nsb_pw .bt',
    '.Nsb_pw > h1',
    '.Nsb_pw > h2',
    '.Nsb_pw > h3',
    '.Nsb_pw > div:first-child',
    '.Nsb_pw > p:first-child',
    '.Nsb_pw table:first-child tr:first-child > td',
    '.Nsb_pw table:first-child tr:first-child > th',
    '.Nsb_r_list > .Nsb_r_title',
    '.Nsb_r_list > .Nsb_title',
    '.Nsb_r_list > .title',
    '.Nsb_r_list > .Title',
    '.Nsb_r_list > .bt',
    '.Nsb_r_list > div:first-child',
    '.Nsb_r_list > p:first-child',
    '.Nsb_r_list table:first-child tr:first-child > td',
    '.Nsb_r_list table:first-child tr:first-child > th',
    'form > .Nsb_r_title',
    'form > .Nsb_title',
    'form > .title',
    'form > .Title',
    'form > .bt',
    'form > div:first-child',
    'form table:first-child tr:first-child > td',
    'form table:first-child tr:first-child > th',
    'body > .Nsb_r_title',
    'body > .Nsb_title',
    'body > .title',
    'body > .Title',
    'body > .bt',
    'body > div:first-child',
    'body > table:first-child tr:first-child > td',
    'body > table:first-child tr:first-child > th',
    '[class*="title"]',
    '[class*="Title"]',
    '[class*="TITLE"]',
    '[id*="title"]',
    '[id*="Title"]',
    '[id*="TITLE"]',
    '[class*="bt"]',
    '[id*="bt"]',
    '.page-title',
    '.pageTitle',
    '.content-title',
    '.contentTitle',
    '.head-title',
    '.headTitle',
    '.titleTop',
    '.title_top',
    '.table-title',
    '.tableTitle',
    '.right-title',
    '.rightTitle'
  ]

  for (const element of Array.from(doc.querySelectorAll(titleSelectors.join(',')))) {
    if (!isNativeContentTitleCandidate(element)) {
      continue
    }
    const target = getNativeContentTitleHideTarget(element)
    if (!target) {
      continue
    }
    target.dataset.linkeNativeContentTitleHidden = '1'
    setManagedStyle(target, 'display', 'none')
    setManagedStyle(target, 'height', '0px')
    setManagedStyle(target, 'min-height', '0px')
    setManagedStyle(target, 'max-height', '0px')
    setManagedStyle(target, 'margin', '0')
    setManagedStyle(target, 'padding', '0')
    setManagedStyle(target, 'border', '0')
    setManagedStyle(target, 'overflow', 'hidden')
    changed = true
  }

  return changed
}

function isPersonalCenterDocument(doc) {
  if (!doc || !doc.body) {
    return false
  }

  const href = String(doc.location?.href || '')
  if (PERSONAL_CENTER_FRAME_PATTERN.test(href)) {
    return true
  }

  const text = normalizeText(doc.body.textContent)
  return text.includes('我的课表') &&
    text.includes('我的课程') &&
    text.includes('通知') &&
    /单位[:：]/.test(text)
}

function getDocumentText(doc) {
  return String(doc?.body?.textContent || doc?.body?.innerText || '').replace(/\r/g, '')
}

function extractProfileInfo(text) {
  const source = String(text || '')
  const compact = normalizeText(source)
  const identityMatch = compact.match(/([\u4e00-\u9fa5·]{2,10})\s+(\d{8,})/)

  function readLabel(label, nextLabels = []) {
    const match = source.match(new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`))
    if (match?.[1]) {
      return normalizeText(match[1])
    }

    const stopPattern = nextLabels.length ? `(?=\\s*(?:${nextLabels.join('|')})\\s*[:：]|\\s*我的课表|\\s*我的课程|$)` : '(?=\\s*我的课表|\\s*我的课程|$)'
    const compactMatch = compact.match(new RegExp(`${label}\\s*[:：]\\s*(.+?)${stopPattern}`))
    return normalizeText(compactMatch?.[1] || '')
  }

  return {
    name: identityMatch?.[1] || '同学',
    studentId: identityMatch?.[2] || '',
    college: readLabel('单位', ['专业', '班级']),
    major: readLabel('专业', ['班级']),
    className: readLabel('班级')
  }
}

function parseScheduleCell(cell) {
  const raw = normalizeText(cell?.getAttribute?.('title') || cell?.textContent || '')
  if (!raw || /^(\s|&nbsp;)*$/.test(raw)) {
    return null
  }

  const labeledCourse = readScheduleField(raw, ['课程名称', '课程'])
  const labeledLocation = readScheduleField(raw, ['上课地点', '地点', '教室'])
  const labeledWeeks = readScheduleField(raw, ['上课周次', '周次', '上课周'])
  const labeledTeacher = readScheduleField(raw, ['任课教师', '任课老师', '上课教师', '主讲教师', '教师', '老师'])
  const unlabeled = parseUnlabeledScheduleText(raw)
  const course = normalizeScheduleCourseName(labeledCourse || unlabeled.course || raw.split(/\s+上课地点[:：]/)[0] || '')
  if (!course || course === ' ') {
    return null
  }

  return {
    course,
    teacher: normalizeScheduleTeacher(labeledTeacher || unlabeled.teacher || ''),
    location: normalizeText(labeledLocation || unlabeled.location || ''),
    weeks: normalizeText(labeledWeeks || unlabeled.weeks || '')
  }
}

function readScheduleField(raw, labels) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const stopLabels = [
    '课程名称',
    '课程',
    '任课教师',
    '任课老师',
    '上课教师',
    '主讲教师',
    '教师',
    '老师',
    '上课地点',
    '地点',
    '教室',
    '上课周次',
    '周次',
    '上课周'
  ].filter((label) => !labels.includes(label))
  const stopPattern = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const match = String(raw || '').match(new RegExp(`(?:${labelPattern})\\s*[:：]\\s*(.+?)(?=\\s+(?:${stopPattern})\\s*[:：]|$)`))
  return normalizeText(match?.[1] || '')
}

function parseUnlabeledScheduleText(raw) {
  let text = normalizeText(raw)
  const weeksMatch = text.match(/(?:第?\s*)?\d+(?:\s*[-–—~至]\s*\d+)?(?:\s*[,，、]\s*\d+(?:\s*[-–—~至]\s*\d+)?)*\s*[（(]\s*(?:周|单周|双周)\s*[）)]/)
  const weeks = normalizeText(weeksMatch?.[0] || '')
  let beforeWeeks = text
  let afterWeeks = ''
  if (weeksMatch) {
    beforeWeeks = normalizeText(text.slice(0, weeksMatch.index))
    afterWeeks = normalizeText(text.slice((weeksMatch.index || 0) + weeksMatch[0].length))
  }

  let location = ''
  if (afterWeeks) {
    const locationMatch = afterWeeks.match(/[A-Za-z0-9\u4e00-\u9fa5]+(?:[-–—][A-Za-z0-9\u4e00-\u9fa5]+)+(?:[（(][^）)]+[）)])?|[A-Za-z0-9\u4e00-\u9fa5]+(?:[（(][^）)]+[）)])?/)
    location = normalizeText(locationMatch?.[0] || afterWeeks)
  }

  const teacherMatch = beforeWeeks.match(/([\u4e00-\u9fa5·]{2,16}(?:副教授|教授|讲师|助教|老师|教师)(?:[（(][^）)]+[）)])?)$/)
  const teacher = normalizeScheduleTeacher(teacherMatch?.[1] || '')
  const course = normalizeScheduleCourseName(teacher ? beforeWeeks.slice(0, beforeWeeks.length - teacherMatch[1].length) : beforeWeeks)
  return {
    course,
    teacher,
    weeks,
    location
  }
}

function normalizeScheduleTeacher(value) {
  return normalizeText(value)
    .replace(/\s+/g, '')
    .replace(/^(任课教师|任课老师|上课教师|主讲教师|教师|老师)[:：]?/, '')
}

function normalizeScheduleCourseName(value) {
  return normalizeText(value)
    .replace(/^(课程名称|课程)[:：]?/, '')
    .replace(/\s+/g, ' ')
    .replace(/[，,;；:：\-\s]+$/, '')
}

function getScheduleCourseColorKey(value) {
  return normalizeScheduleCourseName(value)
    .replace(/\s+/g, '')
    .replace(/[()]/g, (match) => match === '(' ? '（' : '）')
}

function extractScheduleEntries(doc) {
  const table = Array.from(doc.querySelectorAll('table')).find((candidate) => {
    const text = normalizeText(candidate.textContent)
    return text.includes('周/节次') && text.includes('星期一') && text.includes('星期五')
  })
  if (!table) {
    return []
  }

  const rows = Array.from(table.rows || [])
  const headerRowIndex = rows.findIndex((row) => {
    const text = normalizeText(row.textContent)
    return text.includes('周/节次') && text.includes('星期一')
  })
  const headerCells = Array.from(rows[headerRowIndex]?.cells || [])
  const dayLabels = headerCells.map((cell) => normalizeText(cell.textContent))
  const entries = []

  for (const row of rows.slice(Math.max(0, headerRowIndex + 1))) {
    const cells = Array.from(row.cells || [])
    const period = normalizeText(cells[0]?.textContent || '')
    if (!period || period === '周/节次') {
      continue
    }

    for (let index = 1; index < cells.length; index += 1) {
      const day = dayLabels[index] || ''
      const parsed = parseScheduleCell(cells[index])
      if (!day || !parsed) {
        continue
      }
      entries.push({
        day,
        period,
        ...parsed
      })
    }
  }

  return entries
}

function parseSemesterCourseText(value) {
  const text = normalizeText(value)
  if (!text || !/学分/.test(text) || !/学时/.test(text)) {
    return null
  }

  const match = text.match(/([^()（）]{2,80}?)\s*[（(]\s*([A-Za-z0-9_-]{4,})\s*[）)]\s*学分\s*[:：]?\s*([\d.]+)\s*学时\s*[:：]?\s*([\d.]+)/)
  if (!match) {
    return null
  }

  const name = normalizeText(match[1])
    .split(/我的课程|课程列表|本学期课程/)
    .pop()
    .replace(/^我的课程\s*/, '')
    .replace(/^课程\s*/, '')
  if (!name || /周\/节次|星期一|星期二|星期三|星期四|星期五|星期六|星期日/.test(name)) {
    return null
  }

  return {
    name,
    code: normalizeText(match[2]),
    credit: normalizeText(match[3]),
    hours: normalizeText(match[4])
  }
}

function addSemesterCourse(target, seen, course) {
  if (!course?.name) {
    return
  }
  const key = `${course.name}|${course.code || ''}`
  if (seen.has(key)) {
    return
  }
  seen.add(key)
  target.push(course)
}

function deriveSemesterCoursesFromSchedule(schedule) {
  const courses = []
  const seen = new Set()
  for (const entry of schedule || []) {
    addSemesterCourse(courses, seen, {
      name: normalizeText(entry.course),
      code: '',
      credit: '',
      hours: '',
      teacher: normalizeText(entry.teacher),
      weeks: normalizeText(entry.weeks)
    })
  }
  return courses.slice(0, 18)
}

function extractSemesterCourses(doc, schedule = []) {
  const courses = []
  const seen = new Set()
  const elements = Array.from(doc.querySelectorAll('li, div, p, tr, td, a, span'))

  for (const element of elements) {
    const text = normalizeText(element.textContent)
    if (!text || !/学分/.test(text) || !/学时/.test(text) || !/[（(]\s*[A-Za-z0-9_-]{4,}\s*[）)]/.test(text)) {
      continue
    }

    const childHasSameCourse = Array.from(element.children || []).some((child) => {
      const childText = normalizeText(child.textContent)
      return /学分/.test(childText) &&
        /学时/.test(childText) &&
        /[（(]\s*[A-Za-z0-9_-]{4,}\s*[）)]/.test(childText)
    })
    if (childHasSameCourse) {
      continue
    }

    addSemesterCourse(courses, seen, parseSemesterCourseText(text))
  }

  if (!courses.length) {
    for (const match of getDocumentText(doc).matchAll(/([^()（）\n]{2,80}?)\s*[（(]\s*([A-Za-z0-9_-]{4,})\s*[）)]\s*学分\s*[:：]?\s*([\d.]+)\s*学时\s*[:：]?\s*([\d.]+)/g)) {
      addSemesterCourse(courses, seen, parseSemesterCourseText(match[0]))
    }
  }

  return courses.length ? courses.slice(0, 18) : deriveSemesterCoursesFromSchedule(schedule)
}

function readNoticeTitle(element) {
  const titleCandidates = [
    getElementVisibleText(element),
    element?.getAttribute?.('title'),
    element?.getAttribute?.('aria-label'),
    element?.getAttribute?.('data-title'),
    element?.getAttribute?.('data-text'),
    element?.getAttribute?.('data-name'),
    element?.getAttribute?.('data-content'),
    element?.querySelector?.('[title]')?.getAttribute('title')
  ].map((value) => normalizeText(value))
    .filter(Boolean)
    .map((value) => value.replace(/^[·•\-\s]+/, '').trim())
    .filter((value) => value &&
      value.length <= 120 &&
      !/^(更多|详情|查看|打开|通知|公告|教学活动安排|本学期课程|课程表)$/.test(value) &&
      !/周\/节次|星期一|星期二|星期三|星期四|星期五|星期六|星期日|课程名称|上课地点|上课周次|学分\s*\d|学时\s*\d/.test(value) &&
      !/理论课表|成绩查询|选课中心|考试安排查询|学生评价|缓考申请|考试报名|培养方案|我的桌面|学籍成绩|培养管理|实践环节|教学评价|交流申请/.test(value))

  return titleCandidates
    .sort((first, second) => second.length - first.length)[0] || ''
}

const PERSONAL_CENTER_SECTION_HEADINGS = [
  '通知',
  '教学活动安排',
  '本学期课程',
  '课程表',
  '我的课表',
  '常用操作',
  '个人信息',
  '我的课程'
]

function isPersonalCenterGeneratedNode(element) {
  return Boolean(element?.closest?.('#linke-personal-center-dashboard, #linke-personal-center-restore, #linke-jw-navigation-root'))
}

function getElementVisibleText(element) {
  return normalizeText(element?.innerText || element?.textContent || '')
}

function isExactSectionHeadingText(value, heading) {
  return normalizeText(value).replace(/\s+/g, '') === heading.replace(/\s+/g, '')
}

function isSourceSectionHeadingElement(element, heading) {
  if (!element || isPersonalCenterGeneratedNode(element)) {
    return false
  }
  const text = getElementVisibleText(element)
  return text.length <= Math.max(heading.length + 4, 8) && isExactSectionHeadingText(text, heading)
}

function isAfterHeading(element, headingElement) {
  if (!element || !headingElement || element === headingElement || element.contains?.(headingElement)) {
    return false
  }
  return Boolean(headingElement.compareDocumentPosition(element) & 4)
}

function countOtherSectionHeadings(container, heading) {
  return Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p,td,th,legend'))
    .filter((element) => !isPersonalCenterGeneratedNode(element))
    .filter((element) => {
      const text = getElementVisibleText(element)
      return PERSONAL_CENTER_SECTION_HEADINGS.some((label) => label !== heading && isExactSectionHeadingText(text, label))
    }).length
}

function findSourceSection(doc, heading, collectItems, minItems = 1) {
  const headingElements = Array.from(doc?.querySelectorAll?.('h1,h2,h3,h4,h5,h6,div,span,p,td,th,legend') || [])
    .filter((element) => isSourceSectionHeadingElement(element, heading))
  let fallback = null

  for (const headingElement of headingElements) {
    let current = headingElement.parentElement
    for (let depth = 0; current && current !== doc.body && depth < 10; depth += 1, current = current.parentElement) {
      if (isPersonalCenterGeneratedNode(current)) {
        continue
      }
      const items = collectItems(current, headingElement)
      if (items.length < minItems) {
        continue
      }
      const otherHeadings = countOtherSectionHeadings(current, heading)
      const candidate = {
        container: current,
        headingElement,
        items,
        otherHeadings,
        textLength: getElementVisibleText(current).length
      }
      if (otherHeadings === 0) {
        return candidate
      }
      if (!fallback ||
        candidate.otherHeadings < fallback.otherHeadings ||
        (candidate.otherHeadings === fallback.otherHeadings && candidate.textLength < fallback.textLength)) {
        fallback = candidate
      }
    }
  }

  return fallback
}

function getNoticeClickTarget(element) {
  return element?.closest?.('a, [onclick], [role="link"], [role="button"], [data-url], [data-href]') ||
    element?.querySelector?.('a, [onclick], [role="link"], [role="button"], [data-url], [data-href]') ||
    element
}

function resolveNoticeUrl(value, doc) {
  const raw = normalizeText(value)
  if (!raw || raw === '#' || /^javascript:\s*void/i.test(raw)) {
    return ''
  }
  if (/^javascript:/i.test(raw)) {
    return extractNoticeUrlFromScript(raw, doc)
  }
  try {
    const url = new URL(raw, doc?.location?.href || window.location.href)
    return /^https?:$/i.test(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function extractNoticeUrlFromScript(value, doc) {
  const script = String(value || '')
  const patterns = [
    /window\.open\s*\(\s*['"]([^'"]+)['"]/i,
    /location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
    /(?:open|show|view|detail|notice|gonggao|ggxx|tzgg)[A-Za-z0-9_$]*\s*\([^)]*['"]([^'"]+)['"]/i,
    /['"]((?:https?:\/\/|\/)[^'"]+)['"]/
  ]
  for (const pattern of patterns) {
    const match = script.match(pattern)
    const resolved = resolveNoticeUrl(match?.[1] || '', doc)
    if (resolved) {
      return resolved
    }
  }
  return ''
}

function getNoticeTargetUrl(element) {
  const doc = element?.ownerDocument || document
  const targets = [
    element,
    element?.closest?.('a[href], [data-url], [data-href], [url], [link], [data-link], [onclick]'),
    element?.querySelector?.('a[href], [data-url], [data-href], [url], [link], [data-link], [onclick]')
  ].filter(Boolean)
  const attrs = ['href', 'data-url', 'data-href', 'url', 'link', 'data-link']
  for (const target of targets) {
    for (const attr of attrs) {
      const resolved = resolveNoticeUrl(target.getAttribute?.(attr), doc)
      if (resolved) {
        return resolved
      }
    }
    const fromOnclick = extractNoticeUrlFromScript(target.getAttribute?.('onclick') || '', doc)
    if (fromOnclick) {
      return fromOnclick
    }
  }
  return ''
}

function isInvalidNoticeTitle(title) {
  const text = normalizeText(title)
  return !text ||
    !/[\u4e00-\u9fa5A-Za-z0-9]/.test(text) ||
    /^\d{4}-\d{2}-\d{2}(?:\s*~\s*\d{4}-\d{2}-\d{2})?$/.test(text) ||
    /密码找回|关闭|确定|取消|退出登录/.test(text) ||
    PERSONAL_CENTER_SECTION_HEADINGS.some((label) => isExactSectionHeadingText(text, label))
}

function collectNoticeItemsFromSection(container, headingElement) {
  const notices = []
  const seen = new Set()
  const selector = [
    'a',
    '[onclick]',
    '[role="link"]',
    '[role="button"]',
    '[data-url]',
    '[data-href]',
    '[title]',
    '[aria-label]',
    '[data-title]',
    '[data-text]',
    'li',
    'tr',
    'td',
    'div',
    'p',
    'span'
  ].join(',')

  for (const element of Array.from(container.querySelectorAll(selector))) {
    if (!isAfterHeading(element, headingElement) || isPersonalCenterGeneratedNode(element)) {
      continue
    }
    const title = readNoticeTitle(element)
    if (isInvalidNoticeTitle(title)) {
      continue
    }
    const clickTarget = getNoticeClickTarget(element)
    if (!clickTarget || isPersonalCenterGeneratedNode(clickTarget)) {
      continue
    }
    const key = title.replace(/\s+/g, '')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    notices.push({
      title,
      element: clickTarget,
      url: getNoticeTargetUrl(clickTarget)
    })
    if (notices.length >= PERSONAL_NOTICE_LIMIT) {
      break
    }
  }

  return notices
}

function extractNotices(doc) {
  const sourceSection = findSourceSection(doc, '通知', collectNoticeItemsFromSection, 1)
  return sourceSection?.items || []
}

function cleanActivityTitle(value) {
  return normalizeText(value)
    .replace(/教学活动安排/g, ' ')
    .replace(/\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(/^[：:，,;；\-\s]+/, '')
    .replace(/[：:，,;；\-\s]+$/, '')
}

function isActivityTitle(value) {
  const text = cleanActivityTitle(value)
  return Boolean(
    text &&
    text.length <= 80 &&
    /[\u4e00-\u9fa5A-Za-z]/.test(text) &&
    !/^(更多|详情|查看|通知|公告|教学活动安排|本学期课程|我的课表)$/.test(text) &&
    !/常用操作|理论课表|成绩查询|选课中心|考试安排查询|学生评价|缓考申请|社会考试报名|培养方案|课程表/.test(text)
  )
}

function extractActivityEntriesFromText(raw, addActivity) {
  const rangePattern = /\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/g
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineRanges = line.match(/\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/g) || []
    if (lineRanges.length !== 1) {
      continue
    }

    const inlineTitle = cleanActivityTitle(line)
    let title = isActivityTitle(inlineTitle) ? inlineTitle : ''
    if (!title) {
      for (let offset = 1; offset <= 3; offset += 1) {
        const previous = lines[index - offset]
        if (isActivityTitle(previous)) {
          title = cleanActivityTitle(previous)
          break
        }
      }
    }
    addActivity(title, lineRanges[0])
  }
}

function collectActivitiesFromSection(container, headingElement) {
  const activities = []
  const seen = new Set()
  const addActivity = (title, range) => {
    const cleanTitle = cleanActivityTitle(title)
    const cleanRange = normalizeText(range)
    if (!isActivityTitle(cleanTitle) || !cleanRange) {
      return
    }
    const key = `${cleanTitle}|${cleanRange}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    activities.push({
      title: cleanTitle,
      range: cleanRange
    })
  }

  const hasDateRange = (value) => /\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/.test(value)
  const elementText = (element) => String(element?.innerText || element?.textContent || '')
  const candidates = Array.from(container.querySelectorAll('section, article, ul, ol, li, table, tbody, tr, td, div, p, a, span'))
    .filter((element) => isAfterHeading(element, headingElement) && !isPersonalCenterGeneratedNode(element))
    .filter((element) => hasDateRange(elementText(element)))

  for (const element of candidates) {
    extractActivityEntriesFromText(elementText(element), addActivity)
    if (activities.length >= 8) {
      break
    }
  }

  return activities.slice(0, 8)
}

function extractActivities(doc, fallbackText = '') {
  const sourceSection = findSourceSection(doc, '教学活动安排', collectActivitiesFromSection, 1)
  if (sourceSection?.items?.length) {
    return sourceSection.items.slice(0, 8)
  }

  const activities = []
  const seen = new Set()
  extractActivityEntriesFromText(fallbackText, (title, range) => {
    const cleanTitle = cleanActivityTitle(title)
    const cleanRange = normalizeText(range)
    if (!isActivityTitle(cleanTitle) || !cleanRange) {
      return
    }
    const key = `${cleanTitle}|${cleanRange}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    activities.push({
      title: cleanTitle,
      range: cleanRange
    })
  })
  return activities.slice(0, 8)
}

function getTodayDayLabel() {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date().getDay()]
}

function parseWeekSet(value, maxWeek = 30) {
  const text = normalizeText(value).replace(/周/g, '')
  const weeks = new Set()
  const oddOnly = /单/.test(text)
  const evenOnly = /双/.test(text)
  for (const match of text.matchAll(/(\d+)(?:\s*[-~—至]\s*(\d+))?/g)) {
    const start = Number.parseInt(match[1], 10)
    const end = Number.parseInt(match[2] || match[1], 10)
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue
    }
    const from = Math.max(1, Math.min(start, end))
    const to = Math.min(maxWeek, Math.max(start, end))
    for (let week = from; week <= to; week += 1) {
      if (oddOnly && week % 2 !== 1) {
        continue
      }
      if (evenOnly && week % 2 !== 0) {
        continue
      }
      weeks.add(week)
    }
  }

  if (weeks.size === 0 && (oddOnly || evenOnly)) {
    for (let week = 1; week <= maxWeek; week += 1) {
      if ((oddOnly && week % 2 === 1) || (evenOnly && week % 2 === 0)) {
        weeks.add(week)
      }
    }
  }

  return weeks
}

function getMaxWeekFromSchedule(schedule) {
  let maxWeek = 0
  for (const entry of schedule) {
    for (const week of parseWeekSet(entry.weeks, 30)) {
      maxWeek = Math.max(maxWeek, week)
    }
  }
  return maxWeek
}

function clampWeek(value, totalWeeks) {
  const week = Number.parseInt(value, 10)
  if (!Number.isFinite(week)) {
    return 1
  }
  return Math.max(1, Math.min(totalWeeks, week))
}

function extractScheduleContext(text, schedule) {
  const compact = normalizeText(text)
  const weekMatch = compact.match(/第\s*(\d+)\s*周\s*\/\s*(\d+)\s*周/)
  const maxFromSchedule = getMaxWeekFromSchedule(schedule)
  const totalWeeks = Math.max(
    1,
    Number.parseInt(weekMatch?.[2] || '', 10) || maxFromSchedule || 18
  )
  const currentWeek = clampWeek(
    Number.parseInt(weekMatch?.[1] || '', 10) || Math.min(totalWeeks, Math.max(1, maxFromSchedule || 1)),
    totalWeeks
  )
  return { currentWeek, totalWeeks }
}

function isScheduleEntryInWeek(entry, week, totalWeeks) {
  const weeks = parseWeekSet(entry.weeks, totalWeeks || 30)
  return weeks.size === 0 || weeks.has(week)
}

function getSchedulePeriods(schedule) {
  const periods = []
  const seen = new Set()
  for (const entry of schedule) {
    const period = normalizeText(entry.period)
    if (!period || seen.has(period)) {
      continue
    }
    seen.add(period)
    periods.push(period)
  }
  return periods
}

function getPersonalCenterData(doc) {
  const text = getDocumentText(doc)
  const schedule = extractScheduleEntries(doc)
  const scheduleContext = extractScheduleContext(text, schedule)
  const todayLabel = getTodayDayLabel()
  return {
    profile: extractProfileInfo(text),
    schedule,
    periods: getSchedulePeriods(schedule),
    courses: extractSemesterCourses(doc, schedule),
    currentWeek: scheduleContext.currentWeek,
    totalWeeks: scheduleContext.totalWeeks,
    todayLabel,
    notices: extractNotices(doc),
    activities: extractActivities(doc, text)
  }
}

function restoreGeneratedDashboardHiddenContent(doc) {
  const root = doc?.getElementById?.('linke-personal-center-dashboard')
  if (!root) {
    return
  }

  for (const element of Array.from(root.querySelectorAll('[data-linke-native-content-title-hidden="1"]'))) {
    delete element.dataset.linkeNativeContentTitleHidden
    restoreManagedStyles(element, NATIVE_HIDDEN_MANAGED_STYLES)
  }
}

function refreshPersonalCenterCourseSearch(doc) {
  try {
    enhanceCourseSearchInDocument(doc)
  } catch {}
}

function installPersonalCenterOriginalLayoutStyle(doc) {
  if (!doc?.head || doc.getElementById('linke-personal-center-original-layout-style')) {
    return
  }

  const style = doc.createElement('style')
  style.id = 'linke-personal-center-original-layout-style'
  style.textContent = `
    html[data-linke-personal-center-original="1"],
    html[data-linke-personal-center-original="1"] body {
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      overflow: auto !important;
    }

    html[data-linke-personal-center-original="1"] body {
      padding-bottom: 48px !important;
    }

    html[data-linke-personal-center-original="1"] body > div,
    html[data-linke-personal-center-original="1"] body > table,
    html[data-linke-personal-center-original="1"] body > center,
    html[data-linke-personal-center-original="1"] .Nsb_pw,
    html[data-linke-personal-center-original="1"] .Nsb_r_list,
    html[data-linke-personal-center-original="1"] .Nsb_r_content,
    html[data-linke-personal-center-original="1"] .panel,
    html[data-linke-personal-center-original="1"] .panel-body,
    html[data-linke-personal-center-original="1"] .layout,
    html[data-linke-personal-center-original="1"] .layout-body,
    html[data-linke-personal-center-original="1"] .tabs-panels,
    html[data-linke-personal-center-original="1"] .tabs-panels > .panel,
    html[data-linke-personal-center-original="1"] [class*="card"],
    html[data-linke-personal-center-original="1"] [class*="Card"],
    html[data-linke-personal-center-original="1"] [class*="box"],
    html[data-linke-personal-center-original="1"] [class*="Box"],
    html[data-linke-personal-center-original="1"] [class*="notice"],
    html[data-linke-personal-center-original="1"] [class*="Notice"],
    html[data-linke-personal-center-original="1"] [class*="course"],
    html[data-linke-personal-center-original="1"] [class*="Course"],
    html[data-linke-personal-center-original="1"] [class*="schedule"],
    html[data-linke-personal-center-original="1"] [class*="Schedule"] {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  `
  doc.head.appendChild(style)
}

function installPersonalCenterDashboardStyle(doc) {
  if (!doc || doc.getElementById('linke-personal-center-dashboard-style')) {
    return
  }

  const style = doc.createElement('style')
  style.id = 'linke-personal-center-dashboard-style'
  style.textContent = `
    html[data-linke-personal-center-customized="1"],
    html[data-linke-personal-center-customized="1"] body {
      height: 100%;
      margin: 0 !important;
      background: #f4f6f8 !important;
      color: #172033 !important;
      overflow: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    html[data-linke-personal-center-customized="1"] body > :not(#linke-personal-center-dashboard):not(#linke-personal-center-restore):not(#linke-personal-notice-native-modal):not(#linke-personal-notice-modal):not(.lk-pc-native-notice-modal):not(.lk-pc-notice-modal):not(.window):not(.window-shadow):not(.window-mask):not(.layui-layer):not(.layui-layer-shade):not(.ui-dialog):not(.artDialog):not(.aui_outer):not([role="dialog"]) {
      display: none !important;
    }
    html[data-linke-personal-center-original="1"] #linke-personal-center-dashboard,
    html[data-linke-jw-original="1"] #linke-personal-center-dashboard {
      display: none !important;
    }
    #linke-personal-center-dashboard {
      display: block !important;
      width: 100%;
      height: 100vh;
      padding: 18px;
      box-sizing: border-box;
      overflow: hidden;
      background: #f4f6f8;
    }
    #linke-personal-center-dashboard * {
      box-sizing: border-box;
      letter-spacing: 0;
    }
    .lk-pc-board {
      display: grid;
      grid-template-columns: 278px minmax(420px, 1fr) 326px;
      gap: 14px;
      width: 100%;
      max-width: 1320px;
      height: calc(100vh - 36px);
      margin: 0 auto;
      min-width: 0;
    }
    .lk-pc-column,
    .lk-pc-stack {
      display: grid;
      gap: 14px;
      min-width: 0;
      min-height: 0;
    }
    .lk-pc-column {
      grid-template-rows: auto auto;
      align-content: start;
    }
    .lk-pc-stack {
      grid-template-rows: minmax(0, 1.2fr) minmax(0, 0.8fr);
    }
    .lk-pc-card {
      min-width: 0;
      min-height: 0;
      border: 1px solid rgba(203, 213, 225, 0.74);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }
    .lk-pc-panel {
      display: block;
      overflow: hidden;
    }
    .lk-pc-section {
      padding: 14px;
    }
    .lk-pc-panel > .lk-pc-section {
      display: block;
      min-height: 0;
    }
    .lk-pc-section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .lk-pc-section-head::before {
      content: attr(data-title);
      display: block !important;
      visibility: visible !important;
      flex: 1 1 auto;
      min-width: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.3;
    }
    .lk-pc-section-title {
      display: block !important;
      visibility: visible !important;
      flex: 1 1 auto;
      min-width: 0;
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.3;
    }
    .lk-pc-section-head .lk-pc-section-title {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      white-space: nowrap !important;
    }
    .lk-pc-section-meta {
      flex: 0 0 auto;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .lk-pc-profile-grid {
      display: grid;
      gap: 8px;
    }
    .lk-pc-profile-item {
      min-width: 0;
      padding: 9px 10px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .lk-pc-label {
      display: block;
      margin-bottom: 4px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }
    .lk-pc-value {
      display: block;
      overflow: hidden;
      color: #1e293b;
      font-size: 14px;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lk-pc-notice-list,
    .lk-pc-activity-list,
    .lk-pc-course-list {
      display: grid;
      gap: 9px;
      min-width: 0;
      align-content: start;
      overflow: auto;
      padding-right: 2px;
    }
    .lk-pc-notice,
    .lk-pc-activity,
    .lk-pc-course-item {
      min-width: 0;
      padding: 11px 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .lk-pc-notice-title,
    .lk-pc-activity-title,
    .lk-pc-course-name {
      display: block !important;
      visibility: visible !important;
      overflow: hidden;
      color: #172033 !important;
      font-size: 14px !important;
      font-weight: 750 !important;
      line-height: 1.45 !important;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lk-pc-activity-range,
    .lk-pc-course-meta {
      margin-top: 4px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.45;
    }
    .lk-pc-empty {
      padding: 18px;
      border-radius: 8px;
      color: #64748b;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      font-size: 13px;
      text-align: center;
    }
    .lk-pc-notice {
      cursor: pointer;
    }
    .lk-pc-notice:hover {
      border-color: #fbbf24;
      background: #fffbeb;
    }
    .lk-pc-notice-modal {
      position: fixed;
      inset: 0;
      z-index: 99998;
      display: grid;
      place-items: center;
      padding: 28px;
      background: rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .lk-pc-notice-modal-shell {
      position: relative;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      width: min(920px, calc(100vw - 64px));
      height: min(680px, calc(100vh - 64px));
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border: 1px solid rgba(203, 213, 225, 0.9);
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
    }
    .lk-pc-notice-modal-head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
      min-height: 44px;
      padding: 0 52px 0 16px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .lk-pc-notice-modal-close {
      position: absolute;
      top: 7px;
      right: 10px;
      z-index: 10;
      display: grid;
      flex: 0 0 auto;
      width: 30px;
      height: 30px;
      place-items: center;
      border: 1px solid #d8e2ee;
      border-radius: 8px;
      background: #ffffff;
      color: #64748b;
      font-size: 0;
      line-height: 0;
      cursor: pointer;
    }
    .lk-pc-notice-modal-close::before,
    .lk-pc-notice-modal-close::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 13px;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      transform-origin: center;
    }
    .lk-pc-notice-modal-close::before {
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .lk-pc-notice-modal-close::after {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    .lk-pc-notice-modal-close:hover {
      border-color: #fca5a5;
      background: #fff1f2;
      color: #dc2626;
    }
    .lk-pc-notice-modal-frame {
      width: 100%;
      height: 100%;
      border: 0;
      background: #ffffff;
    }
    #linke-personal-center-restore {
      display: none;
      position: fixed;
      top: 14px;
      right: 16px;
      z-index: 99999;
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      background: #ffffff;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
      cursor: pointer;
    }
    html[data-linke-personal-center-original="1"] #linke-personal-center-restore {
      display: none !important;
    }
    .lk-pc-board {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 12px;
      max-width: 1360px;
    }
    .lk-pc-dashboard-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      justify-content: start;
      gap: 12px;
      min-width: 0;
      padding: 4px 2px 14px;
      border-bottom: 0;
    }
    .lk-pc-profile-line {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .lk-pc-profile-copy {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 22px;
      min-width: 0;
    }
    .lk-pc-profile-primary {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px 10px;
      min-width: 0;
    }
    .lk-pc-profile-details {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: center;
      gap: 0;
      min-width: 0;
      max-width: 780px;
      padding-left: 2px;
    }
    .lk-pc-name-inline {
      overflow: hidden;
      max-width: 180px;
      color: #0f172a;
      font-size: 18px;
      font-weight: 850;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lk-pc-id-inline {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 8px;
      border: 1px solid #dbe4f0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.56);
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }
    .lk-pc-profile-meta {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: baseline;
      gap: 7px;
      overflow: hidden;
      min-width: 0;
      padding: 0 16px;
      border: 0;
      border-radius: 0;
      background: transparent;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lk-pc-profile-meta:first-child {
      padding-left: 0;
    }
    .lk-pc-profile-meta + .lk-pc-profile-meta {
      border-left: 1px solid #dbe4f0;
    }
    .lk-pc-profile-meta strong {
      display: block;
      margin: 0;
      color: #94a3b8;
      font-weight: 750;
      font-size: 11px;
      line-height: 1.2;
    }
    .lk-pc-profile-meta span {
      display: block;
      overflow: hidden;
      color: #334155;
      font-size: 12px;
      font-weight: 780;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lk-pc-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 324px;
      gap: 12px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .lk-pc-schedule-card {
      display: block;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border-color: #d8e2ee;
      background: #fbfdff;
    }
    .lk-pc-schedule-card > .lk-pc-section {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      min-height: 0;
    }
    .lk-pc-week-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .lk-pc-week-title-wrap {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .lk-pc-week-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .lk-pc-week-button,
    .lk-pc-week-select {
      min-height: 32px;
      border: 1px solid #d8e2ee;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      font-size: 12px;
      font-weight: 750;
    }
    .lk-pc-week-button {
      padding: 0 10px;
      cursor: pointer;
    }
    .lk-pc-week-button:hover {
      border-color: #93c5fd;
      color: #1d4ed8;
    }
    .lk-pc-week-button:disabled {
      cursor: default;
      opacity: 0.45;
    }
    .lk-pc-week-select {
      width: 166px;
      min-width: 166px;
      height: 32px;
      padding: 0 28px;
      appearance: none;
      -webkit-appearance: none;
      background:
        linear-gradient(180deg, #ffffff 0%, #ffffff 100%) padding-box,
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") right 12px center / 14px 14px no-repeat;
      line-height: normal;
      text-align: center;
      text-align-last: center;
    }
    .lk-pc-week-select option {
      text-align: center;
    }
    .lk-pc-week-table {
      display: grid;
      grid-template-columns: 76px repeat(7, minmax(96px, 1fr));
      min-width: 0;
      height: 100%;
      overflow: auto;
      gap: 1px;
      padding: 1px;
      border: 1px solid #d8e2ee;
      border-radius: 10px;
      background: #dbe5f0;
    }
    .lk-pc-week-head,
    .lk-pc-week-period,
    .lk-pc-week-cell {
      min-width: 0;
      min-height: 82px;
      padding: 8px;
      border: 0;
      background: #ffffff;
    }
    .lk-pc-week-head {
      position: sticky;
      top: 0;
      z-index: 1;
      min-height: 42px;
      background: #f6f9fc;
      color: #475569;
      font-size: 12px;
      font-weight: 850;
      text-align: center;
    }
    .lk-pc-week-head.is-today {
      background: #edf7f6;
      color: #0f766e;
    }
    .lk-pc-week-period {
      display: flex;
      align-items: center;
      background: #f6f9fc;
      color: #475569;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.45;
    }
    .lk-pc-week-cell.is-today {
      background: #fbfefd;
    }
    .lk-pc-week-course {
      display: grid;
      gap: 4px;
      align-content: start;
      padding: 8px;
      border: 1px solid rgba(15, 23, 42, 0.05);
      border-left: 3px solid var(--lk-course-accent, #2563eb);
      border-radius: 8px;
      background: var(--lk-course-bg, #eff6ff);
      color: #172033;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .lk-pc-week-course + .lk-pc-week-course {
      margin-top: 6px;
    }
    .lk-pc-week-course-name {
      overflow: visible;
      font-size: 12px;
      font-weight: 850;
      line-height: 1.35;
      overflow-wrap: anywhere;
      text-overflow: clip;
      white-space: normal;
    }
    .lk-pc-week-course-meta {
      overflow: visible;
      color: #64748b;
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
      text-overflow: clip;
      white-space: normal;
    }
    .lk-pc-week-course[data-tone="0"] {
      --lk-course-accent: #2563eb;
      --lk-course-bg: #eff6ff;
    }
    .lk-pc-week-course[data-tone="1"] {
      --lk-course-accent: #0f766e;
      --lk-course-bg: #ecfdf5;
    }
    .lk-pc-week-course[data-tone="2"] {
      --lk-course-accent: #b45309;
      --lk-course-bg: #fffbeb;
    }
    .lk-pc-week-course[data-tone="3"] {
      --lk-course-accent: #be123c;
      --lk-course-bg: #fff1f2;
    }
    .lk-pc-week-course[data-tone="4"] {
      --lk-course-accent: #6d28d9;
      --lk-course-bg: #f5f3ff;
    }
    .lk-pc-week-course[data-tone="5"] {
      --lk-course-accent: #4d7c0f;
      --lk-course-bg: #f7fee7;
    }
    .lk-pc-week-course[data-tone="6"] {
      --lk-course-accent: #0891b2;
      --lk-course-bg: #ecfeff;
    }
    .lk-pc-week-course[data-tone="7"] {
      --lk-course-accent: #dc2626;
      --lk-course-bg: #fef2f2;
    }
    .lk-pc-week-course[data-tone="8"] {
      --lk-course-accent: #a21caf;
      --lk-course-bg: #fdf4ff;
    }
    .lk-pc-week-course[data-tone="9"] {
      --lk-course-accent: #047857;
      --lk-course-bg: #ecfdf5;
    }
    .lk-pc-week-course[data-tone="10"] {
      --lk-course-accent: #4338ca;
      --lk-course-bg: #eef2ff;
    }
    .lk-pc-week-course[data-tone="11"] {
      --lk-course-accent: #ca8a04;
      --lk-course-bg: #fefce8;
    }
    .lk-pc-week-course[data-tone="12"] {
      --lk-course-accent: #c2410c;
      --lk-course-bg: #fff7ed;
    }
    .lk-pc-week-course[data-tone="13"] {
      --lk-course-accent: #475569;
      --lk-course-bg: #f8fafc;
    }
    .lk-pc-side {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 2px;
    }
    .lk-pc-side .lk-pc-panel {
      flex: 0 0 auto;
      overflow: hidden;
    }
    .lk-pc-side .lk-pc-notice-list {
      overflow: visible;
      padding-right: 0;
    }
    .lk-pc-side .lk-pc-activity-list {
      overflow: visible;
      padding-right: 0;
    }
    .lk-pc-side .lk-pc-course-list {
      gap: 6px;
      overflow: visible;
      padding-right: 0;
    }
    .lk-pc-course-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 8px;
      align-items: center;
      padding: 8px 9px;
      border-radius: 7px;
    }
    .lk-pc-side .lk-pc-course-name {
      font-size: 13px !important;
      line-height: 1.25 !important;
    }
    .lk-pc-course-code {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 750;
      white-space: nowrap;
    }
    .lk-pc-course-meta {
      grid-column: 1 / -1;
      margin-top: 0;
      font-size: 11px;
      line-height: 1.3;
    }
    /* Refined home layout: schedule first, essentials only, and one quiet visual system. */
    #linke-personal-center-dashboard {
      padding: 26px 28px;
      background: #f7f8fa;
    }
    .lk-pc-board {
      max-width: 1440px;
      height: calc(100vh - 52px);
      gap: 20px;
    }
    .lk-pc-dashboard-head {
      padding: 2px 4px 18px;
      border-bottom: 1px solid #e7eaef;
    }
    .lk-pc-profile-copy {
      grid-template-columns: minmax(230px, auto) minmax(0, 1fr);
      gap: 34px;
    }
    .lk-pc-profile-primary {
      display: grid;
      grid-template-columns: auto auto;
      align-items: baseline;
      justify-content: start;
      column-gap: 10px;
      row-gap: 4px;
    }
    .lk-pc-dashboard-kicker {
      grid-column: 1 / -1;
      color: #6a7892;
      font-size: 12px;
      font-weight: 760;
      letter-spacing: .08em;
      line-height: 1.2;
    }
    .lk-pc-name-inline {
      max-width: 210px;
      color: #17223b;
      font-size: 24px;
      font-weight: 780;
      letter-spacing: -.02em;
    }
    .lk-pc-id-inline {
      min-height: 24px;
      padding: 0 9px;
      border-color: #e1e6ee;
      background: #f2f4f7;
      color: #6a7486;
      font-size: 11px;
      font-weight: 700;
    }
    .lk-pc-profile-details {
      max-width: 880px;
      padding-left: 0;
    }
    .lk-pc-profile-meta {
      padding: 0 20px;
    }
    .lk-pc-profile-meta strong {
      color: #8a94a5;
      font-size: 11px;
      font-weight: 650;
    }
    .lk-pc-profile-meta span {
      color: #354159;
      font-size: 13px;
      font-weight: 650;
    }
    .lk-pc-content {
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 20px;
    }
    .lk-pc-card {
      border-color: #e3e7ed;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: none;
    }
    .lk-pc-schedule-card {
      border-color: #e1e6ed;
      background: #ffffff;
    }
    .lk-pc-schedule-card > .lk-pc-section,
    .lk-pc-side .lk-pc-section {
      padding: 19px 20px;
    }
    .lk-pc-section-head {
      margin-bottom: 14px;
    }
    .lk-pc-section-head::before,
    .lk-pc-section-title {
      color: #202b40;
      font-size: 15px;
      font-weight: 760;
      letter-spacing: -.01em;
    }
    .lk-pc-section-meta {
      color: #8792a4;
      font-size: 12px;
      font-weight: 650;
    }
    .lk-pc-week-toolbar {
      margin-bottom: 15px;
    }
    .lk-pc-week-title-wrap {
      gap: 2px;
    }
    .lk-pc-week-controls {
      gap: 6px;
    }
    .lk-pc-week-button,
    .lk-pc-week-select {
      min-height: 30px;
      border-color: #e1e6ed;
      border-radius: 7px;
      color: #4b5870;
      font-size: 12px;
      font-weight: 650;
    }
    .lk-pc-week-button {
      padding: 0 9px;
    }
    .lk-pc-week-button:hover {
      border-color: #afbae9;
      background: #f4f6ff;
      color: #304fc2;
    }
    .lk-pc-week-select {
      width: 154px;
      min-width: 154px;
      padding: 0 24px 0 10px;
    }
    .lk-pc-week-table {
      border-color: #e7ebf0;
      border-radius: 11px;
      background: #edf0f4;
    }
    .lk-pc-week-head,
    .lk-pc-week-period,
    .lk-pc-week-cell {
      padding: 8px;
    }
    .lk-pc-week-head {
      min-height: 40px;
      background: #f8f9fb;
      color: #657188;
      font-size: 11px;
      font-weight: 720;
    }
    .lk-pc-week-head.is-today {
      background: #f0f3ff;
      color: #3d56bf;
    }
    .lk-pc-week-period {
      background: #f8f9fb;
      color: #788398;
      font-size: 11px;
      font-weight: 650;
    }
    .lk-pc-week-cell.is-today {
      background: #fbfcff;
    }
    .lk-pc-week-cell .lk-pc-week-course {
      --lk-course-accent: #6076d8;
      --lk-course-bg: #f4f6ff;
      gap: 3px;
      padding: 8px;
      border-color: rgba(76, 96, 185, .12);
      border-left-width: 2px;
      border-radius: 7px;
      box-shadow: none;
    }
    .lk-pc-week-course-name {
      color: #313d56;
      font-size: 11px;
      font-weight: 720;
    }
    .lk-pc-week-course-meta {
      color: #748099;
      font-size: 10px;
    }
    .lk-pc-side {
      gap: 20px;
      padding-right: 0;
    }
    .lk-pc-updates-panel {
      flex: 1 1 0;
      min-height: 0;
    }
    .lk-pc-updates-panel > .lk-pc-section,
    .lk-pc-courses-panel > .lk-pc-section {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .lk-pc-update-group + .lk-pc-update-group {
      margin-top: 17px;
      padding-top: 15px;
      border-top: 1px solid #edf0f4;
    }
    .lk-pc-update-group-title {
      margin-bottom: 5px;
      color: #8792a4;
      font-size: 11px;
      font-weight: 720;
    }
    .lk-pc-notice-list,
    .lk-pc-activity-list,
    .lk-pc-course-list {
      gap: 0;
      padding-right: 0;
    }
    .lk-pc-notice-list,
    .lk-pc-activity-list {
      max-height: 176px;
      overflow: auto;
    }
    .lk-pc-notice,
    .lk-pc-activity,
    .lk-pc-course-item {
      padding: 10px 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .lk-pc-notice + .lk-pc-notice,
    .lk-pc-activity + .lk-pc-activity,
    .lk-pc-course-item + .lk-pc-course-item {
      border-top: 1px solid #edf0f4;
    }
    .lk-pc-notice:hover {
      border-color: #edf0f4;
      background: #f7f8fc;
    }
    .lk-pc-notice-title,
    .lk-pc-activity-title,
    .lk-pc-course-name {
      color: #3c485f !important;
      font-size: 12px !important;
      font-weight: 650 !important;
      line-height: 1.45 !important;
    }
    .lk-pc-activity-range,
    .lk-pc-course-meta {
      color: #8792a4;
      font-size: 11px;
    }
    .lk-pc-courses-panel {
      flex: 0 0 38%;
      min-height: 0;
    }
    .lk-pc-courses-panel .lk-pc-course-list {
      min-height: 0;
      overflow: auto;
    }
    .lk-pc-courses-panel .lk-pc-course-item {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 3px 8px;
      padding: 9px 0;
    }
    .lk-pc-courses-panel .lk-pc-course-name {
      font-size: 12px !important;
    }
    .lk-pc-course-code {
      color: #99a3b2;
      font-size: 10px;
      font-weight: 600;
    }
    .lk-pc-empty {
      padding: 16px 10px;
      border-color: #e4e8ee;
      border-radius: 8px;
      background: #fafbfc;
      color: #8a94a5;
      font-size: 12px;
    }
    @media (max-width: 1080px) {
      #linke-personal-center-dashboard {
        overflow: auto;
      }
      .lk-pc-board {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto;
        height: auto;
        min-height: calc(100vh - 36px);
      }
      .lk-pc-dashboard-head {
        align-items: flex-start;
        grid-template-columns: 1fr;
      }
      .lk-pc-profile-copy {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .lk-pc-content {
        grid-template-columns: 1fr;
      }
      .lk-pc-profile-details {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .lk-pc-profile-meta {
        padding: 0;
      }
      .lk-pc-profile-meta + .lk-pc-profile-meta {
        border-left: 0;
      }
      .lk-pc-week-table {
        min-height: 520px;
      }
    }
  `
  doc.head.appendChild(style)
}

function installPersonalNoticeDialogStyle(doc) {
  if (!doc || !doc.head || doc.getElementById('linke-personal-notice-dialog-style')) {
    return
  }

  const style = doc.createElement('style')
  style.id = 'linke-personal-notice-dialog-style'
  style.textContent = `
    html[data-linke-personal-notice-dialog="1"] .window-mask,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-shade,
    html[data-linke-personal-notice-dialog="1"] .ui-widget-overlay {
      opacity: 1 !important;
      background: rgba(15, 23, 42, 0.46) !important;
      backdrop-filter: blur(4px);
    }
    html[data-linke-personal-notice-dialog="1"] .window-shadow {
      display: none !important;
    }
    [data-linke-native-notice-shell-hidden="1"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .lk-pc-native-notice-modal {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 36px !important;
      background: rgba(15, 23, 42, 0.46) !important;
      backdrop-filter: blur(4px);
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .lk-pc-native-notice-shell {
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      width: min(900px, calc(100vw - 72px)) !important;
      height: min(76vh, 720px) !important;
      min-height: 420px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      box-shadow: 0 28px 84px rgba(15, 23, 42, 0.34) !important;
      overflow: hidden !important;
    }
    .lk-pc-native-notice-head {
      flex: 0 0 44px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      min-height: 44px !important;
      padding: 0 52px 0 16px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      background: #f8fafc !important;
      color: #0f172a !important;
      box-sizing: border-box !important;
    }
    .lk-pc-native-notice-close {
      position: absolute !important;
      top: 6px !important;
      right: 10px !important;
      z-index: 30 !important;
      flex: 0 0 auto !important;
      display: grid !important;
      place-items: center !important;
      width: 32px !important;
      height: 32px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 10px !important;
      background: #ffffff !important;
      color: #64748b !important;
      font-size: 0 !important;
      line-height: 0 !important;
      cursor: pointer !important;
      pointer-events: auto !important;
    }
    .lk-pc-native-notice-close::before,
    .lk-pc-native-notice-close::after {
      content: "" !important;
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 14px !important;
      height: 2px !important;
      border-radius: 999px !important;
      background: currentColor !important;
      transform-origin: center !important;
    }
    .lk-pc-native-notice-close::before {
      transform: translate(-50%, -50%) rotate(45deg) !important;
    }
    .lk-pc-native-notice-close::after {
      transform: translate(-50%, -50%) rotate(-45deg) !important;
    }
    .lk-pc-native-notice-close:hover {
      border-color: #93c5fd !important;
      background: #eff6ff !important;
      color: #1d4ed8 !important;
    }
    .lk-pc-native-notice-body {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      overflow: auto !important;
    }
    .lk-pc-native-notice-content {
      min-height: 100% !important;
      background: #ffffff !important;
      overflow: auto !important;
    }
    .lk-pc-native-notice-loading {
      display: grid !important;
      place-items: center !important;
      min-height: 100% !important;
      padding: 32px !important;
      color: #64748b !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      box-sizing: border-box !important;
    }
    .lk-pc-native-notice-body iframe {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      border: 0 !important;
      background: #ffffff !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window,
    html[data-linke-personal-notice-dialog="1"] .messager-window,
    html[data-linke-personal-notice-dialog="1"] .window,
    html[data-linke-personal-notice-dialog="1"] .easyui-dialog,
    html[data-linke-personal-notice-dialog="1"] .dialog-window,
    html[data-linke-personal-notice-dialog="1"] .layui-layer,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog,
    html[data-linke-personal-notice-dialog="1"] .artDialog,
    html[data-linke-personal-notice-dialog="1"] .aui_outer,
    html[data-linke-personal-notice-dialog="1"] [role="dialog"]:not(#linke-personal-notice-native-modal):not(#linke-personal-notice-modal):not(.lk-pc-native-notice-modal):not(.lk-pc-notice-modal) {
      display: flex !important;
      flex-direction: column !important;
      position: fixed !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      left: 50% !important;
      width: min(900px, calc(100vw - 72px)) !important;
      max-width: 900px !important;
      height: min(76vh, 720px) !important;
      min-height: 420px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      box-shadow: 0 28px 84px rgba(15, 23, 42, 0.34) !important;
      color: #172033 !important;
      overflow: hidden !important;
      transform: translate(-50%, -50%) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window > .panel-header,
    html[data-linke-personal-notice-dialog="1"] .messager-window > .panel-header,
    html[data-linke-personal-notice-dialog="1"] .window .window-header,
    html[data-linke-personal-notice-dialog="1"] .easyui-dialog .dialog-header,
    html[data-linke-personal-notice-dialog="1"] .dialog-window .dialog-header,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-title,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar,
    html[data-linke-personal-notice-dialog="1"] .aui_titleBar {
      flex: 0 0 56px !important;
      display: flex !important;
      align-items: center !important;
      min-height: 56px !important;
      padding: 0 62px 0 22px !important;
      border: 0 !important;
      border-bottom: 1px solid #e2e8f0 !important;
      background: #f8fafc !important;
      color: #0f172a !important;
      line-height: 1.25 !important;
      font-size: 15px !important;
      font-weight: 850 !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window .panel-title,
    html[data-linke-personal-notice-dialog="1"] .window .panel-title,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-title,
    html[data-linke-personal-notice-dialog="1"] .aui_title {
      color: #0f172a !important;
      font-size: 15px !important;
      font-weight: 850 !important;
      line-height: 1.3 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window .panel-tool,
    html[data-linke-personal-notice-dialog="1"] .window .panel-tool,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-setwin {
      top: 14px !important;
      right: 18px !important;
      width: 30px !important;
      height: 30px !important;
      margin: 0 !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close,
    html[data-linke-personal-notice-dialog="1"] .aui_close {
      position: relative !important;
      display: inline-block !important;
      width: 30px !important;
      height: 30px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 999px !important;
      background: #ffffff !important;
      color: #64748b !important;
      opacity: 0.86 !important;
      font-size: 0 !important;
      line-height: 0 !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close::before,
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close::after,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close::before,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close::after,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close::before,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close::after,
    html[data-linke-personal-notice-dialog="1"] .aui_close::before,
    html[data-linke-personal-notice-dialog="1"] .aui_close::after {
      content: "";
      position: absolute;
      top: 14px;
      left: 8px;
      width: 12px;
      height: 2px;
      border-radius: 999px;
      background: #64748b;
      transform-origin: center;
    }
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close::before,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close::before,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close::before,
    html[data-linke-personal-notice-dialog="1"] .aui_close::before {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
    }
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close::after,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close::after,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close::after,
    html[data-linke-personal-notice-dialog="1"] .aui_close::after {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    html[data-linke-personal-notice-dialog="1"] .panel-tool-close:hover,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-close:hover,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-titlebar-close:hover,
    html[data-linke-personal-notice-dialog="1"] .aui_close:hover {
      border-color: #93c5fd !important;
      background: #eff6ff !important;
      opacity: 1 !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window .window-body,
    html[data-linke-personal-notice-dialog="1"] .panel.window .panel-body,
    html[data-linke-personal-notice-dialog="1"] .messager-window .messager-body,
    html[data-linke-personal-notice-dialog="1"] .messager-window .panel-body,
    html[data-linke-personal-notice-dialog="1"] .easyui-dialog .dialog-body,
    html[data-linke-personal-notice-dialog="1"] .dialog-window .dialog-body,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-content,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-content,
    html[data-linke-personal-notice-dialog="1"] .aui_content {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: #ffffff !important;
      color: #1f2937 !important;
      font-size: 14px !important;
      line-height: 1.7 !important;
      overflow: auto !important;
    }
    html[data-linke-personal-notice-dialog="1"] .panel.window iframe,
    html[data-linke-personal-notice-dialog="1"] .layui-layer-content iframe,
    html[data-linke-personal-notice-dialog="1"] .ui-dialog-content iframe,
    html[data-linke-personal-notice-dialog="1"] .aui_content iframe {
      width: 100% !important;
      height: 100% !important;
      min-height: 520px !important;
      border: 0 !important;
      background: #ffffff !important;
    }
  `
  doc.head.appendChild(style)
}

function getRelatedDocumentsForPersonalNotice(doc, rootWindows = []) {
  const documents = new Set()
  const addDocuments = (rootWindow) => {
    for (const currentDoc of collectAccessibleDocuments(rootWindow)) {
      documents.add(currentDoc)
    }
  }

  for (const rootWindow of rootWindows) {
    try {
      addDocuments(rootWindow)
    } catch {}
  }
  try {
    addDocuments(doc?.defaultView?.top || window.top || window)
  } catch {}
  try {
    addDocuments(doc?.defaultView || window)
  } catch {}
  if (doc) {
    documents.add(doc)
  }

  return Array.from(documents).filter((currentDoc) => currentDoc?.documentElement && currentDoc.head)
}

function getPersonalNoticeTimerWindows(doc) {
  const windows = new Set()
  for (const candidate of [
    doc?.defaultView?.top,
    doc?.defaultView,
    window.top,
    window
  ]) {
    try {
      if (candidate?.setTimeout) {
        windows.add(candidate)
      }
    } catch {}
  }
  return Array.from(windows)
}

function rememberPersonalNoticeDialogIntent(doc, rootWindows = []) {
  if (isPersonalNoticeDialogClosing(doc)) {
    return
  }
  const payload = JSON.stringify({ at: Date.now() })
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc, rootWindows)) {
    try {
      currentDoc.defaultView?.sessionStorage?.setItem(PERSONAL_NOTICE_DIALOG_SESSION_KEY, payload)
    } catch {}
  }
}

function hasRecentPersonalNoticeDialogIntent(doc) {
  if (isPersonalNoticeDialogClosing(doc)) {
    return false
  }
  try {
    const raw = doc?.defaultView?.sessionStorage?.getItem(PERSONAL_NOTICE_DIALOG_SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Date.now() - Number(parsed?.at || 0) < 5 * 60 * 1000
  } catch {
    return false
  }
}

function clearPersonalNoticeDialogMode(doc) {
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc || document, getPersonalNoticeTimerWindows(doc || document))) {
    try {
      delete currentDoc.documentElement.dataset.linkePersonalNoticeDialog
    } catch {}
    try {
      currentDoc.defaultView?.sessionStorage?.removeItem(PERSONAL_NOTICE_DIALOG_SESSION_KEY)
    } catch {}
  }
}

function markPersonalNoticeDialogClosing(doc) {
  const until = Date.now() + PERSONAL_NOTICE_CLOSE_SUPPRESS_MS
  personalNoticeDialogClosedUntil = Math.max(personalNoticeDialogClosedUntil, until)
  personalNoticeOpenContext = null
  personalNoticeCleanupGeneration += 1
  const generation = personalNoticeCleanupGeneration
  const timerWindows = getPersonalNoticeTimerWindows(doc || document)
  for (const currentWindow of timerWindows) {
    try {
      currentWindow.__linkePersonalNoticeDialogClosedUntil = until
      currentWindow.__linkePersonalNoticeCleanupGeneration = generation
      delete currentWindow.__linkePersonalNoticeOpenContext
      delete currentWindow.__linkePersonalNoticeModalRoot
    } catch {}
  }
  try {
    delete doc?.documentElement?.dataset?.linkePersonalNoticeDialog
  } catch {}
  try {
    doc?.defaultView?.sessionStorage?.removeItem(PERSONAL_NOTICE_DIALOG_SESSION_KEY)
  } catch {}
  return generation
}

function isPersonalNoticeDialogClosing(doc) {
  const now = Date.now()
  if (now < personalNoticeDialogClosedUntil) {
    return true
  }
  for (const currentWindow of getPersonalNoticeTimerWindows(doc || document)) {
    try {
      if (now < Number(currentWindow.__linkePersonalNoticeDialogClosedUntil || 0)) {
        return true
      }
    } catch {}
  }
  return false
}

function isLikelyNoticeAnnouncementDocument(doc) {
  if (!doc?.body || doc.querySelector('#Frame0, #linke-personal-center-dashboard, #linke-jw-navigation-root')) {
    return false
  }

  const href = String(doc.location?.href || '')
  if (/(ggxx|ggtz|tzgg|tzxx|notice|gonggao|announce)/i.test(href)) {
    return true
  }

  const text = normalizeText(doc.body.textContent || '')
  return text.length > 80 &&
    text.includes('通知') &&
    /(公告|发布时间|发布人|发布单位|浏览|教务处)/.test(text)
}

function applyPersonalNoticeDialogModeFromContext(doc) {
  if (isPersonalNoticeDialogClosing(doc)) {
    clearPersonalNoticeDialogMode(doc)
    return
  }
  installPersonalNoticeDialogStyle(doc)
  if (hasRecentPersonalNoticeDialogIntent(doc) && isLikelyNoticeAnnouncementDocument(doc)) {
    doc.documentElement.dataset.linkePersonalNoticeDialog = '1'
  }
}

function enablePersonalNoticeDialogStyling(doc) {
  const startedAt = Date.now()
  const timerWindows = getPersonalNoticeTimerWindows(doc)
  let observerApplyScheduled = false
  const apply = () => {
    observerApplyScheduled = false
    if (isPersonalNoticeDialogClosing(doc)) {
      clearPersonalNoticeDialogMode(doc)
      cleanupNativePersonalNoticeArtifactsForModal({ ownerDocument: doc || document })
      return
    }
    rememberPersonalNoticeDialogIntent(doc, timerWindows)
    for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc, timerWindows)) {
      installPersonalNoticeDialogStyle(currentDoc)
      currentDoc.documentElement.dataset.linkePersonalNoticeDialog = '1'
      takeOverStandalonePersonalNoticeIframes(currentDoc)
    }
  }
  const scheduleObserverApply = (observer) => {
    if (Date.now() - startedAt > 4200) {
      try {
        observer?.disconnect?.()
      } catch {}
      return
    }
    if (observerApplyScheduled) {
      return
    }
    observerApplyScheduled = true
    const timerWindow = timerWindows[0] || window
    try {
      timerWindow.setTimeout(apply, 0)
    } catch {
      apply()
    }
  }

  apply()
  for (const delay of [90, 220, 520, 1100, 2200]) {
    for (const timerWindow of timerWindows) {
      try {
        timerWindow.setTimeout(apply, delay)
      } catch {}
    }
  }

  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc, timerWindows)) {
    try {
      const Observer = currentDoc.defaultView?.MutationObserver || MutationObserver
      const observer = new Observer(() => {
        scheduleObserverApply(observer)
      })
      observer.observe(currentDoc.documentElement, {
        childList: true,
        subtree: true
      })
      for (const timerWindow of timerWindows) {
        try {
          timerWindow.setTimeout(() => observer.disconnect(), 4300)
        } catch {}
      }
    } catch {}
  }
}

function getPersonalNoticeContextFromWindow(rootWindow) {
  try {
    const context = rootWindow?.__linkePersonalNoticeOpenContext
    if (context && Date.now() - Number(context.at || 0) < PERSONAL_NOTICE_WINDOW_INTENT_MS) {
      return context
    }
  } catch {}
  if (personalNoticeOpenContext && Date.now() - Number(personalNoticeOpenContext.at || 0) < PERSONAL_NOTICE_WINDOW_INTENT_MS) {
    return personalNoticeOpenContext
  }
  return null
}

function findPersonalNoticeModalRoot(preferredRoot) {
  if (preferredRoot?.ownerDocument?.body?.contains?.(preferredRoot)) {
    return preferredRoot
  }

  const rootWindows = getPersonalNoticeTimerWindows(document)
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(document, rootWindows)) {
    const root = currentDoc.getElementById?.('linke-personal-center-dashboard')
    if (root) {
      return root
    }
  }
  return null
}

function createPersonalNoticeWindowProxy(url) {
  const location = {
    href: String(url || ''),
    assign(value) {
      this.href = String(value || '')
    },
    replace(value) {
      this.href = String(value || '')
    }
  }
  return {
    closed: false,
    location,
    close() {
      this.closed = true
    },
    focus() {},
    blur() {},
    postMessage() {}
  }
}

function resolvePersonalNoticeWindowUrl(rawUrl, sourceDoc) {
  if (!rawUrl) {
    return ''
  }
  const resolved = resolveNoticeUrl(rawUrl, sourceDoc || document)
  if (resolved) {
    return resolved
  }
  try {
    return new URL(String(rawUrl || ''), sourceDoc?.location?.href || window.location.href).href
  } catch {
    return String(rawUrl || '')
  }
}

function handlePersonalNoticeWindowOpenPayload(payload = {}, preferredRoot = null) {
  const url = resolvePersonalNoticeWindowUrl(payload.url || payload.href || '', document)
  const root = findPersonalNoticeModalRoot(preferredRoot)
  scanPersonalNoticeDialogState('personal-notice-window-open', document, {
    url,
    title: normalizeText(payload.title || ''),
    source: normalizeText(payload.source || '')
  })
  if (!root || !url) {
    return false
  }

  enablePersonalNoticeDialogStyling(root.ownerDocument || document)
  const opened = openPersonalNoticeModal(root, {
    title: normalizeText(payload.title || '') || '通知详情',
    url
  })
  if (opened && personalNoticeOpenContext) {
    personalNoticeOpenContext.opened = true
  }
  schedulePersonalNoticeDialogScans(root.ownerDocument || document, 'window-open-modal', {
    url,
    title: normalizeText(payload.title || '')
  })
  return opened
}

function setPersonalNoticeOpenContext(doc, root, notice) {
  const context = {
    at: Date.now(),
    title: normalizeText(notice?.title || '') || '通知详情',
    url: normalizeText(notice?.url || ''),
    opened: false
  }
  personalNoticeCleanupGeneration += 1
  personalNoticeDialogClosedUntil = 0
  personalNoticeOpenContext = context

  const rootWindows = getPersonalNoticeTimerWindows(doc)
  for (const currentWindow of rootWindows) {
    try {
      currentWindow.__linkePersonalNoticeDialogClosedUntil = 0
      currentWindow.__linkePersonalNoticeCleanupGeneration = personalNoticeCleanupGeneration
      currentWindow.__linkePersonalNoticeOpenContext = context
      currentWindow.__linkePersonalNoticeModalRoot = root
    } catch {}
  }

  try {
    ipcRenderer.sendSync('jw:personal-notice-opening-sync', context)
  } catch {
    try {
      ipcRenderer.send('jw:personal-notice-opening', context)
    } catch {}
  }

  for (const currentWindow of rootWindows) {
    try {
      currentWindow.setTimeout(() => {
        try {
          if (currentWindow.__linkePersonalNoticeOpenContext === context) {
            delete currentWindow.__linkePersonalNoticeOpenContext
          }
        } catch {}
      }, PERSONAL_NOTICE_WINDOW_INTENT_MS + 500)
    } catch {}
  }
  return context
}

function installPersonalNoticeWindowOpenInterceptor(doc, root) {
  const rootWindows = getPersonalNoticeTimerWindows(doc)
  for (const currentWindow of rootWindows) {
    try {
      if (!currentWindow || currentWindow.__linkePersonalNoticeWindowOpenPatched) {
        continue
      }
      const nativeOpen = currentWindow.open?.bind(currentWindow)
      currentWindow.__linkePersonalNoticeWindowOpenPatched = true
      currentWindow.__linkePersonalNoticeNativeWindowOpen = nativeOpen
      currentWindow.open = function patchedPersonalNoticeWindowOpen(rawUrl, target, features) {
        const context = getPersonalNoticeContextFromWindow(currentWindow)
        if (!context || !rawUrl) {
          return nativeOpen ? nativeOpen(rawUrl, target, features) : null
        }

        const url = resolvePersonalNoticeWindowUrl(rawUrl, currentWindow.document)
        handlePersonalNoticeWindowOpenPayload({
          url,
          title: context.title,
          target,
          features,
          source: 'window.open'
        }, currentWindow.__linkePersonalNoticeModalRoot || root)
        return createPersonalNoticeWindowProxy(url)
      }
    } catch {}
  }
}

function summarizePersonalNoticeDialogCandidate(element, doc) {
  const win = doc?.defaultView || window
  const rect = element.getBoundingClientRect?.()
  const style = win.getComputedStyle?.(element)
  return {
    tagName: String(element.tagName || ''),
    id: String(element.id || '').slice(0, 80),
    className: String(element.className || '').slice(0, 180),
    role: String(element.getAttribute?.('role') || '').slice(0, 80),
    src: String(element.getAttribute?.('src') || element.src || '').slice(0, 360),
    text: normalizeText(element.innerText || element.textContent || '').slice(0, 260),
    display: String(style?.display || ''),
    visibility: String(style?.visibility || ''),
    position: String(style?.position || ''),
    zIndex: String(style?.zIndex || ''),
    opacity: String(style?.opacity || ''),
    rect: rect
      ? {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      : null
  }
}

function scanPersonalNoticeDialogState(stage, doc, details = {}) {
  if (!isPersonalNoticeDiagnosticEnabled(doc || document)) {
    return
  }
  try {
    const rootWindows = getPersonalNoticeTimerWindows(doc || document)
    const documents = getRelatedDocumentsForPersonalNotice(doc || document, rootWindows)
    const selector = [
      '#linke-personal-notice-modal',
      '.lk-pc-notice-modal',
      '.window-mask',
      '.window-shadow',
      '.panel.window',
      '.messager-window',
      '.window',
      '.easyui-dialog',
      '.dialog-window',
      '.layui-layer',
      '.layui-layer-shade',
      '.ui-dialog',
      '.ui-widget-overlay',
      '.artDialog',
      '.aui_outer',
      '[role="dialog"]',
      'iframe'
    ].join(',')
    const candidates = []
    for (const currentDoc of documents) {
      const docSummary = {
        url: String(currentDoc.location?.href || '').slice(0, 360),
        title: String(currentDoc.title || '').slice(0, 120),
        hasNoticeDialogFlag: currentDoc.documentElement?.dataset?.linkePersonalNoticeDialog === '1',
        hasPersonalCenter: !!currentDoc.getElementById?.('linke-personal-center-dashboard')
      }
      for (const element of Array.from(currentDoc.querySelectorAll?.(selector) || []).slice(0, 40)) {
        candidates.push({
          doc: docSummary,
          element: summarizePersonalNoticeDialogCandidate(element, currentDoc)
        })
        if (candidates.length >= 60) {
          break
        }
      }
      addBackdropCandidatesToDialogScan(currentDoc, candidates)
      if (candidates.length >= 60) {
        break
      }
    }
    sendNavigationDebug(stage, {
      ...details,
      candidateCount: candidates.length,
      candidates
    })
  } catch {}
}

function schedulePersonalNoticeDialogScans(doc, reason, details = {}) {
  if (!isPersonalNoticeDiagnosticEnabled(doc || document)) {
    return
  }
  const rootWindows = getPersonalNoticeTimerWindows(doc || document)
  for (const delay of [0, 80, 220, 520, 1000, 1800, 3000]) {
    for (const currentWindow of rootWindows) {
      try {
        currentWindow.setTimeout(() => {
          scanPersonalNoticeDialogState(`personal-notice-dialog-scan:${reason}`, doc || document, {
            ...details,
            delay
          })
        }, delay)
      } catch {}
    }
  }
}

function isPersonalNoticeDetailFrame(frame) {
  if (!frame) {
    return false
  }
  const id = String(frame.id || frame.name || '')
  if (/^Frame0$/i.test(id)) {
    return false
  }
  const src = String(frame.getAttribute?.('src') || frame.src || '')
  return /\/jsxsd\/framework\/main_index_[^/?#]*\.jsp/i.test(src) ||
    /\/jsxsd\/framework\/.*(?:tzgg|ggxx|notice|gonggao|announce).*\.jsp/i.test(src)
}

function isInsidePersonalNoticeModal(element) {
  return Boolean(element?.closest?.('#linke-personal-notice-native-modal, #linke-personal-notice-modal'))
}

function getNativePersonalNoticeShellTitle(element) {
  return normalizeText(
    element?.querySelector?.('.panel-title, .window-title, .layui-layer-title, .ui-dialog-title, .aui_title, [class*="title"], [class*="Title"]')?.textContent ||
    element?.getAttribute?.('title') ||
    element?.textContent ||
    ''
  ).slice(0, 80)
}

function isNativePersonalNoticeShellLike(element) {
  if (!element || isInsidePersonalNoticeModal(element) || isPersonalCenterGeneratedNode(element)) {
    return false
  }
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('role') || ''}`
  if (/panel|window|dialog|layui-layer|ui-dialog|artDialog|aui/i.test(marker)) {
    return true
  }
  return Boolean(element.querySelector?.('.panel-header, .window-header, .dialog-header, .panel-title, .panel-tool-close, .layui-layer-title, .ui-dialog-titlebar, .aui_titleBar'))
}

function findNativePersonalNoticeShell(frame, doc) {
  let current = frame?.parentElement || null
  let shell = null
  for (let depth = 0; current && current !== doc?.body && depth < 10; depth += 1, current = current.parentElement) {
    if (isNativePersonalNoticeShellLike(current)) {
      shell = current
    }
  }
  return shell
}

function rememberHiddenNativeNoticeNode(modal, node) {
  if (!modal || !node || node === modal || isInsidePersonalNoticeModal(node)) {
    return
  }
  if (!modal.__linkeNativeNoticeHiddenNodes) {
    modal.__linkeNativeNoticeHiddenNodes = []
  }
  if (!modal.__linkeNativeNoticeHiddenNodes.includes(node)) {
    modal.__linkeNativeNoticeHiddenNodes.push(node)
  }
}

function hideNativeNoticeNode(node, modal) {
  if (!node || isInsidePersonalNoticeModal(node)) {
    return false
  }
  node.dataset.linkeNativeNoticeShellHidden = '1'
  node.setAttribute?.('aria-hidden', 'true')
  try {
    node.style.setProperty('display', 'none', 'important')
    node.style.setProperty('visibility', 'hidden', 'important')
    node.style.setProperty('opacity', '0', 'important')
    node.style.setProperty('pointer-events', 'none', 'important')
  } catch {}
  rememberHiddenNativeNoticeNode(modal, node)
  return true
}

function parseCssAlphaColor(value) {
  const text = String(value || '').trim()
  const rgba = text.match(/^rgba?\(([^)]+)\)$/i)
  if (!rgba) {
    return { alpha: 0, darkness: 255 }
  }
  const parts = rgba[1].split(',').map((part) => Number.parseFloat(part.trim()))
  const red = Number.isFinite(parts[0]) ? parts[0] : 255
  const green = Number.isFinite(parts[1]) ? parts[1] : 255
  const blue = Number.isFinite(parts[2]) ? parts[2] : 255
  const alpha = parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1
  return {
    alpha,
    darkness: (red + green + blue) / 3
  }
}

function isLikelyNativeNoticeBackdrop(element, doc) {
  if (!element || element === doc?.body || element === doc?.documentElement || isInsidePersonalNoticeModal(element)) {
    return false
  }
  const win = doc?.defaultView || window
  const rect = element.getBoundingClientRect?.()
  if (!rect || rect.width < Math.max(240, win.innerWidth * 0.45) || rect.height < Math.max(180, win.innerHeight * 0.35)) {
    return false
  }

  const style = win.getComputedStyle?.(element)
  if (!style || style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false
  }
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('role') || ''}`
  const markerLooksLikeBackdrop = /mask|shade|overlay|backdrop|cover|modal|zhezhao|shadow|遮罩/i.test(marker)
  const positionLooksLikeOverlay = ['fixed', 'absolute'].includes(style.position)
  const opacity = Number.parseFloat(style.opacity || '1')
  const color = parseCssAlphaColor(style.backgroundColor)
  const hasDimBackground = color.alpha >= 0.08 && color.darkness <= 90
  const hasDimOpacity = Number.isFinite(opacity) && opacity > 0 && opacity < 0.92
  const zIndex = Number.parseInt(style.zIndex || '0', 10)
  const hasOverlayZIndex = Number.isFinite(zIndex) && zIndex >= 10

  return (markerLooksLikeBackdrop || positionLooksLikeOverlay || hasOverlayZIndex) &&
    (hasDimBackground || hasDimOpacity || markerLooksLikeBackdrop)
}

function hideNativePersonalNoticeBackdrops(doc, modal) {
  const explicitSelector = [
    '.window-mask',
    '.window-shadow',
    '.layui-layer-shade',
    '.ui-widget-overlay',
    '.modal-backdrop',
    '[class*="mask" i]',
    '[class*="shade" i]',
    '[class*="overlay" i]',
    '[class*="backdrop" i]',
    '[class*="shadow" i]',
    '[id*="mask" i]',
    '[id*="shade" i]',
    '[id*="overlay" i]',
    '[id*="backdrop" i]'
  ].join(',')
  const candidates = new Set(Array.from(doc?.querySelectorAll?.(explicitSelector) || []))
  for (const node of Array.from(doc?.body?.querySelectorAll?.('div, section, table') || [])) {
    if (isLikelyNativeNoticeBackdrop(node, doc)) {
      candidates.add(node)
    }
  }
  for (const node of candidates) {
    const marker = `${node.id || ''} ${node.className || ''}`
    if (isLikelyNativeNoticeBackdrop(node, doc) || /mask|shade|overlay|backdrop|window-shadow/i.test(marker)) {
      hideNativeNoticeNode(node, modal)
    }
  }
}

function collectLikelyNativeNoticeBackdrops(doc) {
  const candidates = []
  for (const node of Array.from(doc?.body?.querySelectorAll?.('div, section, table') || [])) {
    if (isLikelyNativeNoticeBackdrop(node, doc)) {
      candidates.push(node)
    }
    if (candidates.length >= 16) {
      break
    }
  }
  return candidates
}

function debugBackdropCandidates(doc, candidates) {
  for (const node of collectLikelyNativeNoticeBackdrops(doc)) {
    candidates.push({
      doc: {
        url: String(doc.location?.href || '').slice(0, 360),
        title: String(doc.title || '').slice(0, 120),
        hasNoticeDialogFlag: doc.documentElement?.dataset?.linkePersonalNoticeDialog === '1',
        hasPersonalCenter: !!doc.getElementById?.('linke-personal-center-dashboard')
      },
      element: summarizePersonalNoticeDialogCandidate(node, doc)
    })
  }
}

function addBackdropCandidatesToDialogScan(doc, candidates) {
  const before = candidates.length
  debugBackdropCandidates(doc, candidates)
  if (candidates.length > before) {
    return true
  }
  return false
}

function isVisibleNativeNoticeDialogShell(shell) {
  if (!shell || isInsidePersonalNoticeModal(shell)) {
    return false
  }

  const doc = shell.ownerDocument || document
  const win = doc.defaultView || window
  const rect = shell.getBoundingClientRect?.()
  if (!rect || rect.width < 300 || rect.height < 180) {
    return false
  }
  const style = win.getComputedStyle?.(shell)
  if (!style || style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false
  }
  const zIndex = Number.parseInt(style.zIndex || '0', 10)
  return ['fixed', 'absolute'].includes(style.position) || (Number.isFinite(zIndex) && zIndex >= 10)
}

function hideVisibleNativePersonalNoticeShells(doc, modal) {
  const selector = '.panel.window, .messager-window, .window, .easyui-dialog, .dialog-window, .layui-layer, .ui-dialog, .artDialog, .aui_outer, [role="dialog"], .panel'
  for (const shell of Array.from(doc?.querySelectorAll?.(selector) || [])) {
    if (!isNativePersonalNoticeShellLike(shell)) {
      continue
    }
    const title = getNativePersonalNoticeShellTitle(shell)
    const visibleLargeShell = isVisibleNativeNoticeDialogShell(shell)
    const containsNoticeFrame = !!shell.querySelector?.('iframe') &&
      Array.from(shell.querySelectorAll('iframe')).some(isPersonalNoticeDetailFrame)
    if (/通知|公告/.test(title) || containsNoticeFrame || shell.dataset.linkeNativeNoticeShellHidden === '1') {
      if (visibleLargeShell || containsNoticeFrame || shell.dataset.linkeNativeNoticeShellHidden === '1') {
        hideNativeNoticeNode(shell, modal)
      }
    }
  }
  hideNativePersonalNoticeBackdrops(doc, modal)
}

function removeNodeSafely(node) {
  if (!node || node === node.ownerDocument?.body || node === node.ownerDocument?.documentElement) {
    return false
  }
  try {
    node.remove?.()
    return true
  } catch {}
  try {
    node.style?.setProperty?.('display', 'none', 'important')
    node.style?.setProperty?.('pointer-events', 'none', 'important')
    return true
  } catch {}
  return false
}

function requestNativePersonalNoticeFrameworkClose(node) {
  if (!node || isInsidePersonalNoticeModal(node)) {
    return false
  }

  let requested = false
  const doc = node.ownerDocument || document
  const win = doc.defaultView || window
  const closeSelector = [
    '.panel-tool-close',
    '.window-close',
    '.layui-layer-close',
    '.ui-dialog-titlebar-close',
    '.aui_close',
    '[class*="close" i]',
    '[title*="关闭"]'
  ].join(',')

  const closeTargets = []
  if (node.matches?.(closeSelector)) {
    closeTargets.push(node)
  }
  closeTargets.push(...Array.from(node.querySelectorAll?.(closeSelector) || []))
  for (const target of closeTargets.slice(0, 6)) {
    try {
      dispatchNativeNavigationClick(target)
      requested = true
    } catch {}
  }

  try {
    const jquery = win?.jQuery || win?.$
    if (jquery?.fn) {
      for (const method of ['dialog', 'window', 'panel']) {
        if (typeof jquery.fn[method] !== 'function') {
          continue
        }
        try {
          jquery(node)[method]('close')
          requested = true
        } catch {}
      }
    }
  } catch {}

  return requested
}

function restorePersonalNoticeDocumentInteractivity(doc) {
  if (!doc?.body) {
    return 0
  }

  let changed = 0
  clearPersonalNoticeDialogMode(doc)

  for (const node of [doc.documentElement, doc.body]) {
    try {
      node.style?.removeProperty?.('pointer-events')
      node.style?.removeProperty?.('user-select')
      node.style?.removeProperty?.('overflow')
      node.style?.removeProperty?.('overflow-x')
      node.style?.removeProperty?.('overflow-y')
      node.classList?.remove?.('modal-open', 'layui-layer-noscroll', 'noscroll', 'no-scroll', 'overflow-hidden')
      node.removeAttribute?.('inert')
      changed += 1
    } catch {}
  }

  for (const node of Array.from(doc.querySelectorAll('[inert], #Frame0, frame, iframe')).slice(0, 80)) {
    if (isInsidePersonalNoticeModal(node)) {
      continue
    }
    try {
      node.removeAttribute?.('inert')
      node.style?.removeProperty?.('pointer-events')
      if (/^Frame0$/i.test(String(node.id || node.name || ''))) {
        node.style?.removeProperty?.('user-select')
      }
      changed += 1
    } catch {}
  }

  return changed
}

function hideImmediatePersonalNoticeEventBlockers(doc) {
  if (!doc?.body) {
    return 0
  }

  const selector = [
    '.window-mask',
    '.window-shadow',
    '.layui-layer-shade',
    '.ui-widget-overlay',
    '.modal-backdrop',
    '.lk-pc-native-notice-backdrop',
    '.lk-pc-notice-modal-backdrop',
    '[data-linke-native-notice-shell-hidden="1"]',
    '[class*="mask" i]',
    '[class*="shade" i]',
    '[class*="overlay" i]',
    '[class*="backdrop" i]',
    '[id*="mask" i]',
    '[id*="shade" i]',
    '[id*="overlay" i]',
    '[id*="backdrop" i]'
  ].join(',')
  let changed = 0
  for (const node of Array.from(doc.querySelectorAll(selector)).slice(0, 120)) {
    if (isInsidePersonalNoticeModal(node)) {
      continue
    }
    try {
      node.style?.setProperty?.('display', 'none', 'important')
      node.style?.setProperty?.('visibility', 'hidden', 'important')
      node.style?.setProperty?.('pointer-events', 'none', 'important')
      changed += 1
    } catch {}
  }
  return changed
}

function restorePersonalNoticeInteractivityImmediately(sourceDoc) {
  const doc = sourceDoc || document
  const timerWindows = getPersonalNoticeTimerWindows(doc)
  let changed = 0
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc, timerWindows)) {
    changed += restorePersonalNoticeDocumentInteractivity(currentDoc)
    changed += hideImmediatePersonalNoticeEventBlockers(currentDoc)
  }
  return changed
}

function isResidualPersonalNoticeEventBlocker(element, doc) {
  if (!element ||
    element === doc?.body ||
    element === doc?.documentElement ||
    isInsidePersonalNoticeModal(element) ||
    isPersonalCenterGeneratedNode(element)
  ) {
    return false
  }
  if (/^Frame0$/i.test(String(element.id || element.name || '')) || element.closest?.('#Frame0') || element.querySelector?.('#Frame0')) {
    return false
  }

  const win = doc?.defaultView || window
  const rect = element.getBoundingClientRect?.()
  if (!rect || rect.width < Math.max(260, win.innerWidth * 0.5) || rect.height < Math.max(220, win.innerHeight * 0.45)) {
    return false
  }

  const style = win.getComputedStyle?.(element)
  if (!style || style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false
  }

  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('role') || ''}`
  const markerLooksModal = /mask|shade|overlay|backdrop|cover|modal|dialog|window|shadow|遮罩/i.test(marker)
  const positionLooksOverlay = ['fixed', 'absolute'].includes(style.position)
  const zIndex = Number.parseInt(style.zIndex || '0', 10)
  const text = normalizeText(element.innerText || element.textContent || '')
  const hasSparseText = text.length <= 40

  return markerLooksModal || (positionLooksOverlay && Number.isFinite(zIndex) && zIndex >= 10 && hasSparseText)
}

function removeResidualPersonalNoticeEventBlockers(doc) {
  if (!doc?.body) {
    return 0
  }

  const win = doc.defaultView || window
  const samplePoints = [
    [win.innerWidth / 2, win.innerHeight / 2],
    [win.innerWidth / 2, Math.min(win.innerHeight - 24, 120)],
    [Math.min(win.innerWidth - 24, 320), win.innerHeight / 2],
    [Math.min(win.innerWidth - 24, 720), win.innerHeight / 2],
    [win.innerWidth - 32, win.innerHeight - 32]
  ]
  const blockers = new Set()
  for (const [x, y] of samplePoints) {
    for (const element of Array.from(doc.elementsFromPoint?.(x, y) || []).slice(0, 8)) {
      if (isResidualPersonalNoticeEventBlocker(element, doc)) {
        blockers.add(element)
        break
      }
    }
  }

  let removed = 0
  for (const blocker of blockers) {
    if (removeNodeSafely(blocker)) {
      removed += 1
    }
  }
  return removed
}

function cleanupNativePersonalNoticeArtifacts(doc) {
  if (!doc?.body) {
    return 0
  }

  let removed = 0
  removed += restorePersonalNoticeDocumentInteractivity(doc)
  const explicitSelector = [
    '[data-linke-native-notice-shell-hidden="1"]',
    '.window-mask',
    '.window-shadow',
    '.layui-layer-shade',
    '.ui-widget-overlay',
    '.modal-backdrop',
    '[class*="mask" i]',
    '[class*="shade" i]',
    '[class*="overlay" i]',
    '[class*="backdrop" i]',
    '[id*="mask" i]',
    '[id*="shade" i]',
    '[id*="overlay" i]',
    '[id*="backdrop" i]'
  ].join(',')
  for (const node of Array.from(doc.querySelectorAll(explicitSelector))) {
    if (!isInsidePersonalNoticeModal(node) && removeNodeSafely(node)) {
      removed += 1
    }
  }

  for (const node of collectLikelyNativeNoticeBackdrops(doc)) {
    if (removeNodeSafely(node)) {
      removed += 1
    }
  }

  const shellSelector = '.panel.window, .messager-window, .window, .easyui-dialog, .dialog-window, .layui-layer, .ui-dialog, .artDialog, .aui_outer, [role="dialog"], .panel'
  for (const shell of Array.from(doc.querySelectorAll(shellSelector))) {
    if (!isNativePersonalNoticeShellLike(shell)) {
      continue
    }
    const title = getNativePersonalNoticeShellTitle(shell)
    const containsNoticeFrame = Array.from(shell.querySelectorAll?.('iframe') || []).some(isPersonalNoticeDetailFrame)
    const wasHiddenByTakeover = shell.dataset.linkeNativeNoticeShellHidden === '1'
    if (wasHiddenByTakeover || containsNoticeFrame || (/通知|公告/.test(title) && isVisibleNativeNoticeDialogShell(shell))) {
      requestNativePersonalNoticeFrameworkClose(shell)
      if (removeNodeSafely(shell)) {
        removed += 1
      }
    }
  }

  removed += removeResidualPersonalNoticeEventBlockers(doc)
  return removed
}

function cleanupNativePersonalNoticeArtifactsForModal(modal) {
  const sourceDoc = modal?.ownerDocument || document
  const timerWindows = getPersonalNoticeTimerWindows(sourceDoc)
  let removed = 0
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(sourceDoc, timerWindows)) {
    removed += cleanupNativePersonalNoticeArtifacts(currentDoc)
  }
  return removed
}

function watchNativePersonalNoticeModalRemoval(modal) {
  if (!modal || modal.__linkeNativeNoticeRemovalWatcherInstalled) {
    return
  }
  modal.__linkeNativeNoticeRemovalWatcherInstalled = true
  const sourceDoc = modal.ownerDocument || document
  const win = sourceDoc.defaultView || window
  const startedAt = Date.now()
  const check = () => {
    let closed = false
    try {
      closed = !modal.isConnected || modal.style.display === 'none'
    } catch {
      closed = true
    }
    if (closed) {
      closeNativePersonalNoticeModal(modal)
      return
    }
    if (Date.now() - startedAt < 10 * 60 * 1000) {
      try {
        win.setTimeout(check, 120)
      } catch {}
    }
  }
  try {
    win.setTimeout(check, 120)
  } catch {}
}

function handleNativePersonalNoticeImmediateClose(modal) {
  if (!modal || modal.__linkeNativeNoticeImmediateCloseHandled) {
    return
  }

  modal.__linkeNativeNoticeImmediateCloseHandled = true
  const sourceDoc = modal.ownerDocument || document
  markPersonalNoticeDialogClosing(sourceDoc)
  try {
    modal.__linkeNativeNoticePlaceholder?.remove?.()
  } catch {}
  try {
    modal.style.setProperty('display', 'none', 'important')
  } catch {}
  restorePersonalNoticeInteractivityImmediately(sourceDoc)
  try {
    modal.remove()
  } catch {}
  try {
    ;(sourceDoc.defaultView || window).setTimeout(() => closeNativePersonalNoticeModal(modal), 0)
  } catch {}
}

function installNativePersonalNoticeImmediateClose(modal) {
  if (!modal || modal.__linkeNativeNoticeImmediateCloseInstalled) {
    return
  }

  modal.__linkeNativeNoticeImmediateCloseInstalled = true
  const closeButton = modal.querySelector?.('[data-linke-native-notice-close]')
  if (!closeButton) {
    return
  }
  const onClose = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    handleNativePersonalNoticeImmediateClose(modal)
  }
  closeButton.addEventListener('pointerdown', onClose, true)
  closeButton.addEventListener('click', onClose, true)
  closeButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClose(event)
    }
  }, true)
}

function closeNativePersonalNoticeModal(modal) {
  if (!modal) {
    return
  }
  const sourceDoc = modal.ownerDocument || document
  const hiddenNodes = Array.from(modal.__linkeNativeNoticeHiddenNodes || [])
  const placeholder = modal.__linkeNativeNoticePlaceholder || null
  const until = Date.now() + PERSONAL_NOTICE_CLOSE_SUPPRESS_MS
  personalNoticeDialogClosedUntil = Math.max(personalNoticeDialogClosedUntil, until)
  personalNoticeOpenContext = null
  personalNoticeCleanupGeneration += 1
  const generation = personalNoticeCleanupGeneration
  modal.style.setProperty('display', 'none', 'important')
  try {
    placeholder?.remove?.()
  } catch {}
  modal.remove()
  const win = sourceDoc.defaultView || window
  restorePersonalNoticeInteractivityImmediately(sourceDoc)

  const runCleanup = (reason) => {
    if (generation !== personalNoticeCleanupGeneration) {
      return 0
    }
    try {
      sourceDoc.defaultView.__linkePersonalNoticeDialogClosedUntil = until
      sourceDoc.defaultView.__linkePersonalNoticeCleanupGeneration = generation
      delete sourceDoc.defaultView.__linkePersonalNoticeOpenContext
      delete sourceDoc.defaultView.__linkePersonalNoticeModalRoot
    } catch {}
    let removed = 0
    for (const node of hiddenNodes) {
      requestNativePersonalNoticeFrameworkClose(node)
      if (removeNodeSafely(node)) {
        removed += 1
      }
    }
    removed += cleanupNativePersonalNoticeArtifactsForModal({ ownerDocument: sourceDoc })
    scanPersonalNoticeDialogState('personal-notice-native-close-cleanup', sourceDoc, {
      removed,
      reason,
      generation
    })
    return removed
  }

  for (const delay of [0, 220, 900]) {
    try {
      win.setTimeout(() => runCleanup(`delay-${delay}`), delay)
    } catch {}
  }
}

function resetPersonalNoticeDetailFrameScroll(frame, options = {}) {
  if (!frame) {
    return false
  }
  const force = options.force === true
  if (!force && frame.dataset?.linkePersonalNoticeInitialScrollReset === '1') {
    return false
  }
  try {
    frame.dataset.linkePersonalNoticeInitialScrollReset = '1'
  } catch {}
  try {
    frame?.contentWindow?.scrollTo?.(0, 0)
  } catch {}
  try {
    const detailDoc = frame?.contentDocument
    if (detailDoc?.scrollingElement) {
      detailDoc.scrollingElement.scrollTop = 0
      detailDoc.scrollingElement.scrollLeft = 0
    }
    if (detailDoc?.body) {
      detailDoc.body.scrollTop = 0
      detailDoc.body.scrollLeft = 0
    }
    if (detailDoc?.documentElement) {
      detailDoc.documentElement.scrollTop = 0
      detailDoc.documentElement.scrollLeft = 0
    }
  } catch {}
  return true
}

function closeAllPersonalNoticeDialogs(reason = 'manual') {
  const timerWindows = getPersonalNoticeTimerWindows(document)
  const docs = new Set([
    ...collectAccessibleDocuments(),
    ...getRelatedDocumentsForPersonalNotice(document, timerWindows)
  ])
  markPersonalNoticeDialogClosing(document)

  let removed = 0
  for (const currentDoc of docs) {
    for (const modal of Array.from(currentDoc.querySelectorAll?.('#linke-personal-notice-native-modal') || [])) {
      handleNativePersonalNoticeImmediateClose(modal)
      removed += 1
    }
    for (const modal of Array.from(currentDoc.querySelectorAll?.('#linke-personal-notice-modal, .lk-pc-notice-modal') || [])) {
      if (removeNodeSafely(modal)) {
        removed += 1
      }
    }
    removed += cleanupNativePersonalNoticeArtifacts(currentDoc)
    removed += restorePersonalNoticeInteractivityImmediately(currentDoc)
  }

  scanPersonalNoticeDialogState('personal-notice-close-all', document, {
    reason,
    removed
  })
  return removed
}

function createNativePersonalNoticeModal(doc) {
  if (!doc?.body) {
    return null
  }

  const modal = doc.createElement('section')
  modal.id = 'linke-personal-notice-native-modal'
  modal.className = 'lk-pc-native-notice-modal'
  modal.innerHTML = `
    <div class="lk-pc-native-notice-shell">
      <button type="button" class="lk-pc-native-notice-close" data-linke-native-notice-close="1" aria-label="关闭通知详情" onclick="var m=this.closest('#linke-personal-notice-native-modal'); if(m){m.style.setProperty('display','none','important'); m.remove();} return false;">×</button>
      <div class="lk-pc-native-notice-head" aria-hidden="true"></div>
      <div class="lk-pc-native-notice-body"></div>
    </div>
  `
  doc.body.appendChild(modal)
  return modal
}

function getNativePersonalNoticeContentElement(shell) {
  if (!shell) {
    return null
  }
  const selector = [
    '.window-body',
    '.panel-body',
    '.messager-body',
    '.layui-layer-content',
    '.ui-dialog-content',
    '.aui_content',
    '.dialog-body'
  ].join(',')
  const candidates = Array.from(shell.querySelectorAll?.(selector) || [])
    .filter((node) => !node.querySelector?.('iframe') && normalizeText(node.textContent || '').length > 0)
  if (candidates.length) {
    return candidates
      .sort((first, second) => normalizeText(second.textContent || '').length - normalizeText(first.textContent || '').length)[0]
  }
  if (!shell.querySelector?.('iframe') && normalizeText(shell.textContent || '').length > 0) {
    return shell
  }
  return null
}

function takeOverVisibleNativePersonalNoticeShellContent(doc) {
  if (!doc?.body || doc.getElementById('linke-personal-notice-native-modal')) {
    return false
  }

  const selector = '.panel.window, .messager-window, .window, .easyui-dialog, .dialog-window, .layui-layer, .ui-dialog, .artDialog, .aui_outer, [role="dialog"], .panel'
  for (const shell of Array.from(doc.querySelectorAll?.(selector) || [])) {
    if (!isNativePersonalNoticeShellLike(shell) || !isVisibleNativeNoticeDialogShell(shell)) {
      continue
    }
    const title = getNativePersonalNoticeShellTitle(shell)
    const text = normalizeText(shell.textContent || '')
    if (!/通知|公告/.test(`${title} ${text}`)) {
      continue
    }
    const content = getNativePersonalNoticeContentElement(shell)
    if (!content) {
      continue
    }

    const modal = createNativePersonalNoticeModal(doc)
    const body = modal?.querySelector?.('.lk-pc-native-notice-body')
    if (!modal || !body) {
      modal?.remove?.()
      return false
    }

    const contentContainer = doc.createElement('div')
    contentContainer.className = 'lk-pc-native-notice-content'
    while (content.firstChild) {
      contentContainer.appendChild(content.firstChild)
    }
    body.appendChild(contentContainer)
    hideNativeNoticeNode(shell, modal)
    hideVisibleNativePersonalNoticeShells(doc, modal)
    installNativePersonalNoticeImmediateClose(modal)
    watchNativePersonalNoticeModalRemoval(modal)
    modal.querySelector('[data-linke-native-notice-close]')?.focus?.()
    scanPersonalNoticeDialogState('personal-notice-native-content-taken-over', doc, {
      title,
      text: text.slice(0, 180)
    })
    return true
  }
  return false
}

function takeOverStandalonePersonalNoticeIframes(doc) {
  if (!doc?.body || !doc.documentElement?.dataset?.linkePersonalNoticeDialog) {
    return false
  }

  installPersonalNoticeDialogStyle(doc)
  const existingModal = doc.getElementById('linke-personal-notice-native-modal')
  const existingFrame = existingModal?.querySelector?.('iframe')
  if (existingFrame) {
    hideVisibleNativePersonalNoticeShells(doc, existingModal)
    resetPersonalNoticeDetailFrameScroll(existingFrame)
    installNativePersonalNoticeImmediateClose(existingModal)
    watchNativePersonalNoticeModalRemoval(existingModal)
    return true
  }

  const frame = Array.from(doc.querySelectorAll('iframe'))
    .find((candidate) => isPersonalNoticeDetailFrame(candidate) &&
      !candidate.closest('#linke-personal-notice-native-modal, #linke-personal-notice-modal'))
  if (!frame) {
    return takeOverVisibleNativePersonalNoticeShellContent(doc)
  }

  const context = getPersonalNoticeContextFromWindow(doc.defaultView || window)
  if (context) {
    context.opened = true
  }
  if (personalNoticeOpenContext) {
    personalNoticeOpenContext.opened = true
  }
  const nativeShell = findNativePersonalNoticeShell(frame, doc)
  const modal = createNativePersonalNoticeModal(doc)
  if (!modal) {
    return false
  }

  const placeholder = doc.createComment('linke native notice frame placeholder')
  frame.parentNode?.insertBefore(placeholder, frame)
  modal.__linkeNativeNoticePlaceholder = placeholder
  modal.querySelector('.lk-pc-native-notice-body')?.appendChild(frame)
  resetPersonalNoticeDetailFrameScroll(frame, { force: true })
  if (nativeShell) {
    hideNativeNoticeNode(nativeShell, modal)
  }
  hideVisibleNativePersonalNoticeShells(doc, modal)
  installNativePersonalNoticeImmediateClose(modal)
  watchNativePersonalNoticeModalRemoval(modal)
  modal.querySelector('[data-linke-native-notice-close]')?.focus?.()
  scanPersonalNoticeDialogState('personal-notice-native-frame-taken-over', doc, {
    title: context?.title || '',
    frameSrc: String(frame.getAttribute?.('src') || frame.src || '').slice(0, 360)
  })
  return true
}

function renderWeekOptions(totalWeeks, selectedWeek, currentWeek) {
  return Array.from({ length: totalWeeks }, (_item, index) => index + 1)
    .map((week) => `<option value="${week}" ${week === selectedWeek ? 'selected' : ''}>第${week}周${week === currentWeek ? '（本周）' : ''}</option>`)
    .join('')
}

function hashScheduleCourseKey(text) {
  let hash = 2166136261
  for (const char of text) {
    hash ^= char.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash >>> 0
}

function createScheduleCourseToneMap(entries) {
  const toneMap = new Map()
  const usedTones = new Set()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const key = getScheduleCourseColorKey(entry?.course)
    if (!key || toneMap.has(key)) {
      continue
    }

    const baseTone = hashScheduleCourseKey(key) % SCHEDULE_COURSE_TONE_COUNT
    let tone = baseTone
    if (usedTones.size < SCHEDULE_COURSE_TONE_COUNT) {
      for (let offset = 0; offset < SCHEDULE_COURSE_TONE_COUNT; offset += 1) {
        const candidate = (baseTone + offset) % SCHEDULE_COURSE_TONE_COUNT
        if (!usedTones.has(candidate)) {
          tone = candidate
          break
        }
      }
    }

    toneMap.set(key, tone)
    usedTones.add(tone)
  }
  return toneMap
}

function getScheduleCourseTone(value, toneMap = null) {
  const text = getScheduleCourseColorKey(value)
  if (toneMap?.has(text)) {
    return toneMap.get(text)
  }
  return hashScheduleCourseKey(text) % SCHEDULE_COURSE_TONE_COUNT
}

function renderWeekSchedule(data, selectedWeek) {
  const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
  const periods = data.periods.length ? data.periods : ['第一、二节', '第三、四节', '第五、六节', '第七、八节', '第九~十一节']
  const week = clampWeek(selectedWeek, data.totalWeeks)
  const activeEntries = data.schedule.filter((entry) => isScheduleEntryInWeek(entry, week, data.totalWeeks))
  const hasCourse = activeEntries.length > 0
  const courseToneMap = createScheduleCourseToneMap(data.schedule)
  const courseRows = periods.map((period) => days.map((day) => {
    const courses = activeEntries.filter((entry) => entry.period === period && entry.day === day)
    return `
      <div class="lk-pc-week-cell ${day === data.todayLabel && week === data.currentWeek ? 'is-today' : ''}">
        ${courses.map((entry) => {
          const visibleMeta = [entry.teacher, entry.location].filter(Boolean).join(' · ')
          const titleText = [entry.course, entry.teacher, entry.location, entry.weeks].filter(Boolean).join(' · ')
          return `
          <div class="lk-pc-week-course" data-tone="${getScheduleCourseTone(entry.course, courseToneMap)}" title="${escapeHtml(titleText)}">
            <div class="lk-pc-week-course-name">${escapeHtml(entry.course)}</div>
            ${visibleMeta ? `<div class="lk-pc-week-course-meta">${escapeHtml(visibleMeta)}</div>` : ''}
          </div>
        `
        }).join('')}
      </div>
    `
  }))

  return `
    <div class="lk-pc-week-toolbar">
      <div class="lk-pc-week-title-wrap">
        <div class="lk-pc-section-title" role="heading" aria-level="2">课程表</div>
      </div>
      <div class="lk-pc-week-controls">
        <button class="lk-pc-week-button" type="button" data-linke-week-step="-1" ${week <= 1 ? 'disabled' : ''}>上一周</button>
        <select class="lk-pc-week-select" data-linke-week-select="1">${renderWeekOptions(data.totalWeeks, week, data.currentWeek)}</select>
        <button class="lk-pc-week-button" type="button" data-linke-week-step="1" ${week >= data.totalWeeks ? 'disabled' : ''}>下一周</button>
      </div>
    </div>
    ${hasCourse ? `
      <div class="lk-pc-week-table">
        <div class="lk-pc-week-head">节次</div>
        ${days.map((day) => `<div class="lk-pc-week-head ${day === data.todayLabel && week === data.currentWeek ? 'is-today' : ''}">${escapeHtml(day)}</div>`).join('')}
        ${periods.map((period, periodIndex) => `
          <div class="lk-pc-week-period">${escapeHtml(period)}</div>
          ${courseRows[periodIndex].join('')}
        `).join('')}
      </div>
    ` : '<div class="lk-pc-empty">本周暂无课程安排</div>'}
  `
}

function getRenderableNotices(notices) {
  const seen = new Set()
  return (Array.isArray(notices) ? notices : [])
    .map((notice, index) => ({
      notice,
      index,
      title: normalizeText(notice?.title).replace(/^[·•\-\s]+/, '').trim()
    }))
    .filter((item) => !isInvalidNoticeTitle(item.title))
    .filter((item) => {
      const key = item.title.replace(/\s+/g, '')
      if (!key || seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

function renderNotices(notices) {
  const visibleNotices = getRenderableNotices(notices)
  if (!visibleNotices.length) {
    return '<div class="lk-pc-empty">暂无通知</div>'
  }
  return `<div class="lk-pc-notice-list">${visibleNotices.map(({ title, index }) => `
    <div class="lk-pc-notice" data-linke-personal-notice-index="${index}">
      <div class="lk-pc-notice-title">${escapeHtml(title)}</div>
    </div>
  `).join('')}</div>`
}

function renderActivities(activities) {
  const visibleActivities = (Array.isArray(activities) ? activities : [])
    .map((activity) => ({
      title: cleanActivityTitle(activity?.title),
      range: normalizeText(activity?.range)
    }))
    .filter((activity) => isActivityTitle(activity.title) && activity.range)
  if (!visibleActivities.length) {
    return '<div class="lk-pc-empty">暂无活动安排</div>'
  }
  return `<div class="lk-pc-activity-list">${visibleActivities.map((activity) => `
    <div class="lk-pc-activity">
      <div class="lk-pc-activity-title">${escapeHtml(activity.title)}</div>
      <div class="lk-pc-activity-range">${escapeHtml(activity.range)}</div>
    </div>
  `).join('')}</div>`
}

function renderSemesterCourses(courses) {
  const visibleCourses = (Array.isArray(courses) ? courses : [])
    .map((course) => ({
      ...course,
      name: normalizeText(course?.name),
      code: normalizeText(course?.code),
      credit: normalizeText(course?.credit),
      hours: normalizeText(course?.hours),
      teacher: normalizeText(course?.teacher),
      weeks: normalizeText(course?.weeks)
    }))
    .filter((course) => course.name)
  if (!visibleCourses.length) {
    return '<div class="lk-pc-empty">暂无课程列表</div>'
  }
  return `<div class="lk-pc-course-list">${visibleCourses.map((course) => {
    const meta = [
      course.teacher || '',
      course.credit ? `学分 ${course.credit}` : '',
      course.hours ? `学时 ${course.hours}` : '',
      !course.credit && !course.hours && course.weeks ? course.weeks : ''
    ].filter(Boolean).join(' · ')
    return `
      <div class="lk-pc-course-item">
        <div class="lk-pc-course-name">${escapeHtml(course.name)}</div>
        ${course.code ? `<div class="lk-pc-course-code">${escapeHtml(course.code)}</div>` : ''}
        ${meta ? `<div class="lk-pc-course-meta">${escapeHtml(meta)}</div>` : ''}
      </div>
    `
  }).join('')}</div>`
}

function updatePersonalCenterWeek(root, data, nextWeek) {
  const week = clampWeek(nextWeek, data.totalWeeks)
  const target = root.querySelector('[data-linke-week-schedule]')
  if (!target) {
    return
  }
  root.dataset.linkeSelectedWeek = String(week)
  target.innerHTML = renderWeekSchedule(data, week)
  refreshPersonalCenterCourseSearch(root.ownerDocument || document)
}

function renderPersonalCenterDashboard(data) {
  const profile = data.profile
  const selectedWeek = clampWeek(data.selectedWeek || data.currentWeek, data.totalWeeks)
  const semesterCourseCount = (Array.isArray(data.courses) ? data.courses : [])
    .filter((course) => normalizeText(course?.name))
    .length
  return `
    <div class="lk-pc-board">
      <section class="lk-pc-dashboard-head">
        <div class="lk-pc-profile-line" aria-label="个人信息">
          <div class="lk-pc-profile-copy">
            <div class="lk-pc-profile-primary">
              <span class="lk-pc-dashboard-kicker">教务主页</span>
              <span class="lk-pc-name-inline">${escapeHtml(profile.name || '同学')}</span>
              <span class="lk-pc-id-inline">${escapeHtml(profile.studentId || '-')}</span>
            </div>
            <div class="lk-pc-profile-details">
              <span class="lk-pc-profile-meta"><strong>学院</strong><span>${escapeHtml(profile.college || '-')}</span></span>
              <span class="lk-pc-profile-meta"><strong>专业</strong><span>${escapeHtml(profile.major || '-')}</span></span>
              <span class="lk-pc-profile-meta"><strong>班级</strong><span>${escapeHtml(profile.className || '-')}</span></span>
            </div>
          </div>
        </div>
      </section>
      <section class="lk-pc-content">
        <section class="lk-pc-card lk-pc-schedule-card">
          <div class="lk-pc-section" data-linke-week-schedule="1">
            ${renderWeekSchedule(data, selectedWeek)}
          </div>
        </section>
        <aside class="lk-pc-side">
          <section class="lk-pc-card lk-pc-panel lk-pc-updates-panel">
            <div class="lk-pc-section">
              <div class="lk-pc-section-head" data-title="教务动态">
                <div class="lk-pc-section-title" role="heading" aria-level="2">教务动态</div>
              </div>
              <div class="lk-pc-update-group">
                <div class="lk-pc-update-group-title">通知</div>
                ${renderNotices(data.notices)}
              </div>
              <div class="lk-pc-update-group lk-pc-activity-group">
                <div class="lk-pc-update-group-title">教学活动</div>
                ${renderActivities(data.activities)}
              </div>
            </div>
          </section>
          <section class="lk-pc-card lk-pc-panel lk-pc-courses-panel">
            <div class="lk-pc-section">
              <div class="lk-pc-section-head" data-title="本学期课程">
                <div class="lk-pc-section-title" role="heading" aria-level="2">本学期课程</div>
                <span class="lk-pc-section-meta">${escapeHtml(String(semesterCourseCount))} 门</span>
              </div>
              ${renderSemesterCourses(data.courses)}
            </div>
          </section>
        </aside>
      </section>
    </div>
  `
}

function closePersonalNoticeModal(root) {
  root?.querySelector?.('#linke-personal-notice-modal')?.remove()
  const sourceDoc = root?.ownerDocument || document
  const timerWindows = getPersonalNoticeTimerWindows(sourceDoc)
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(sourceDoc, timerWindows)) {
    currentDoc.getElementById?.('linke-personal-notice-modal')?.remove()
    closeNativePersonalNoticeModal(currentDoc.getElementById?.('linke-personal-notice-native-modal'))
  }
}

function hasPersonalNoticeModalInRelatedDocuments(doc) {
  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc || document, getPersonalNoticeTimerWindows(doc || document))) {
    if (currentDoc.getElementById?.('linke-personal-notice-native-modal') ||
      currentDoc.getElementById?.('linke-personal-notice-modal')) {
      return true
    }
  }
  return false
}

function schedulePersonalNoticeNativeClickRetry(doc, target, context) {
  const timerWindows = getPersonalNoticeTimerWindows(doc || document)
  const timerWindow = timerWindows[0] || window
  for (const delay of [520, 1250]) {
    try {
      timerWindow.setTimeout(() => {
        if (!context ||
          context.opened ||
          personalNoticeOpenContext !== context ||
          Date.now() - Number(context.at || 0) > PERSONAL_NOTICE_WINDOW_INTENT_MS ||
          hasPersonalNoticeModalInRelatedDocuments(doc)
        ) {
          return
        }
        const retryTarget = target?.isConnected ? target : findFreshPersonalNoticeTarget(doc, context)
        if (!retryTarget) {
          return
        }
        scanPersonalNoticeDialogState('personal-notice-native-click-retry', doc, {
          title: normalizeText(context.title || ''),
          delay
        })
        dispatchNativeNavigationClick(retryTarget)
        scheduleNativeChromeCompactionBurst()
      }, delay)
    } catch {}
  }
}

function findFreshPersonalNoticeTarget(doc, notice) {
  if (notice?.element?.isConnected) {
    return notice.element
  }

  const titleKey = normalizeText(notice?.title || '').replace(/\s+/g, '')
  if (!titleKey) {
    return null
  }

  for (const currentDoc of getRelatedDocumentsForPersonalNotice(doc || document, getPersonalNoticeTimerWindows(doc || document))) {
    try {
      const match = extractNotices(currentDoc)
        .find((item) => normalizeText(item?.title || '').replace(/\s+/g, '') === titleKey && item?.element?.isConnected)
      if (match?.element) {
        return match.element
      }
    } catch {}
  }
  return null
}

function openPersonalNoticeThroughNativeTarget(root, doc, notice) {
  const target = findFreshPersonalNoticeTarget(doc, notice)
  if (!root || !target) {
    return false
  }

  const activeNotice = {
    ...notice,
    element: target,
    url: normalizeText(notice?.url || '') || getNoticeTargetUrl(target)
  }
  closePersonalNoticeModal(root)
  const context = setPersonalNoticeOpenContext(doc, root, activeNotice)
  installPersonalNoticeWindowOpenInterceptor(doc, root)
  enablePersonalNoticeDialogStyling(doc)
  scanPersonalNoticeDialogState('personal-notice-native-click', doc, {
    title: normalizeText(activeNotice.title || ''),
    url: normalizeText(activeNotice.url || ''),
    element: summarizePersonalNoticeElement(target)
  })
  schedulePersonalNoticeDialogScans(doc, 'native-click', {
    title: normalizeText(activeNotice.title || ''),
    url: normalizeText(activeNotice.url || '')
  })
  dispatchNativeNavigationClick(target)
  schedulePersonalNoticeNativeClickRetry(doc, target, context)
  scheduleNativeChromeCompactionBurst()
  return true
}

function openPersonalNoticeModal(root, notice) {
  const url = normalizeText(notice?.url)
  if (!root || !url) {
    return false
  }

  closePersonalNoticeModal(root)
  const modal = root.ownerDocument.createElement('section')
  modal.id = 'linke-personal-notice-modal'
  modal.className = 'lk-pc-notice-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.innerHTML = `
    <div class="lk-pc-notice-modal-shell">
      <button type="button" class="lk-pc-notice-modal-close" data-linke-personal-notice-close="1" aria-label="关闭通知详情">×</button>
      <div class="lk-pc-notice-modal-head" aria-hidden="true"></div>
      <iframe class="lk-pc-notice-modal-frame" src="${escapeHtml(url)}" title="${escapeHtml(notice.title || '通知详情')}"></iframe>
    </div>
  `
  root.appendChild(modal)
  modal.querySelector('[data-linke-personal-notice-close]')?.focus?.()
  return true
}

function bindPersonalCenterDashboard(doc, data) {
  const root = doc.getElementById('linke-personal-center-dashboard')
  if (!root) {
    return
  }
  root.__linkePersonalCenterData = data
  if (root.__linkePersonalCenterBound) {
    return
  }

  root.__linkePersonalCenterBound = true
  root.addEventListener('click', (event) => {
    const closeNotice = event.target.closest('[data-linke-personal-notice-close]')
    if (closeNotice) {
      event.preventDefault()
      event.stopPropagation()
      closePersonalNoticeModal(root)
      return
    }

    const noticeModalBackdrop = event.target.classList?.contains('lk-pc-notice-modal')
    if (noticeModalBackdrop) {
      event.preventDefault()
      event.stopPropagation()
      closePersonalNoticeModal(root)
      return
    }

    const notice = event.target.closest('[data-linke-personal-notice-index]')
    if (notice) {
      event.preventDefault()
      event.stopPropagation()
      const item = root.__linkePersonalCenterData?.notices?.[Number.parseInt(notice.dataset.linkePersonalNoticeIndex, 10)]
      if (openPersonalNoticeThroughNativeTarget(root, doc, item)) {
        return
      }
      if (item?.url) {
        openPersonalNoticeModal(root, item)
      }
      return
    }

    const stepButton = event.target.closest('[data-linke-week-step]')
    if (stepButton) {
      event.preventDefault()
      event.stopPropagation()
      const currentWeek = Number.parseInt(root.dataset.linkeSelectedWeek || String(root.__linkePersonalCenterData?.currentWeek || 1), 10)
      const step = Number.parseInt(stepButton.dataset.linkeWeekStep || '0', 10)
      updatePersonalCenterWeek(root, root.__linkePersonalCenterData, currentWeek + step)
    }
  })

  root.addEventListener('change', (event) => {
    const weekSelect = event.target.closest('[data-linke-week-select]')
    if (!weekSelect) {
      return
    }
    updatePersonalCenterWeek(root, root.__linkePersonalCenterData, weekSelect.value)
  })

  root.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.querySelector('#linke-personal-notice-modal')) {
      event.preventDefault()
      closePersonalNoticeModal(root)
    }
  })
}

function schedulePersonalCenterNoticeRetry(doc, root) {
  if (!doc || !root || root.dataset.linkeNoticeRetryScheduled === '1') {
    return
  }

  root.dataset.linkeNoticeRetryScheduled = '1'
  const win = getWindowFromDocument(doc) || window
  win.setTimeout(() => {
    if (root.isConnected) {
      delete root.dataset.linkeNoticeRetryScheduled
    }
    ensurePersonalCenterDashboard(doc)
  }, 900)
}

function ensurePersonalCenterDashboard(doc) {
  if (!isPersonalCenterDocument(doc)) {
    return false
  }
  if (isJwOriginalModeEnabled(doc)) {
    return false
  }
  delete doc.documentElement.dataset.linkePersonalCenterOriginal

  let root = doc.getElementById('linke-personal-center-dashboard')
  const previousScheduleCount = Number.parseInt(root?.dataset?.linkeScheduleCount || '-1', 10)
  const previousNoticeCount = Number.parseInt(root?.dataset?.linkeNoticeCount || '-1', 10)
  const previousNoticeRetryCount = Number.parseInt(root?.dataset?.linkeNoticeRetryCount || '0', 10)
  const previousProfileComplete = root?.dataset?.linkeProfileComplete === '1'
  const shouldRetryMissingNotices = previousNoticeCount >= 0 &&
    previousNoticeCount < PERSONAL_NOTICE_LIMIT &&
    previousNoticeRetryCount < 8
  if (root?.dataset?.linkeRendered === '1' && previousScheduleCount > 0 && previousProfileComplete && !shouldRetryMissingNotices) {
    installPersonalCenterDashboardStyle(doc)
    delete doc.documentElement.dataset.linkePersonalCenterOriginal
    doc.documentElement.dataset.linkePersonalCenterCustomized = '1'
    removePersonalCenterRestoreButton(doc)
    restoreGeneratedDashboardHiddenContent(doc)
    refreshPersonalCenterCourseSearch(doc)
    return true
  }

  const data = getPersonalCenterData(doc)
  if (!data.schedule.length && !data.courses.length && !data.notices.length && !data.activities.length) {
    return false
  }

  installPersonalCenterDashboardStyle(doc)
  removePersonalCenterRestoreButton(doc)
  if (!root) {
    root = doc.createElement('main')
    root.id = 'linke-personal-center-dashboard'
    doc.body.appendChild(root)
  }

  data.selectedWeek = clampWeek(root.dataset.linkeSelectedWeek || data.currentWeek, data.totalWeeks)
  root.innerHTML = renderPersonalCenterDashboard(data)
  root.dataset.linkeRendered = '1'
  root.dataset.linkeScheduleCount = String(data.schedule.length)
  root.dataset.linkeNoticeCount = String(data.notices.length)
  root.dataset.linkeNoticeRetryCount = data.notices.length >= PERSONAL_NOTICE_LIMIT
    ? '0'
    : String(Math.min(8, Math.max(0, previousNoticeRetryCount) + 1))
  root.dataset.linkeSelectedWeek = String(data.selectedWeek)
  root.dataset.linkeProfileComplete = data.profile.college && data.profile.major && data.profile.className ? '1' : '0'
  restoreGeneratedDashboardHiddenContent(doc)
  bindPersonalCenterDashboard(doc, data)
  if (data.notices.length < PERSONAL_NOTICE_LIMIT && Number.parseInt(root.dataset.linkeNoticeRetryCount || '0', 10) < 8) {
    schedulePersonalCenterNoticeRetry(doc, root)
  }
  doc.documentElement.dataset.linkePersonalCenterCustomized = '1'
  refreshPersonalCenterCourseSearch(doc)
  return true
}

function installContentFrameCompactionHooks(doc) {
  if (!doc || !doc.body) {
    return
  }

  for (const frame of Array.from(doc.querySelectorAll('iframe, frame'))) {
    if (frame.dataset.linkeNativeContentCompactionBound === '1') {
      continue
    }
    frame.dataset.linkeNativeContentCompactionBound = '1'
    frame.addEventListener('load', () => {
      scheduleNativeChromeCompaction(80)
      schedulePersonalCenterCustomizedTakeover(140)
      window.setTimeout(runNativeChromeCompaction, 360)
    })
  }
}

function compactNativeTopChrome(doc) {
  if (!doc || !doc.body || !doc.getElementById('Frame0')) {
    return false
  }

  let changed = false
  for (const selector of ['#mainNorthPanle', '#mainTagPanle']) {
    const element = doc.querySelector(selector)
    if (!element) {
      continue
    }

    element.dataset.linkeNativeChromeHidden = '1'
    setManagedStyle(element, 'display', 'none')
    setManagedStyle(element, 'height', '0px')
    setManagedStyle(element, 'min-height', '0px')
    setManagedStyle(element, 'max-height', '0px')
    setManagedStyle(element, 'margin', '0')
    setManagedStyle(element, 'padding', '0')
    setManagedStyle(element, 'border', '0')
    setManagedStyle(element, 'overflow', 'hidden')
    changed = true
  }

  const win = getWindowFromDocument(doc)
  const viewportHeight = Math.max(240, Math.round(win?.innerHeight || doc.documentElement.clientHeight || 720))
  const viewportWidth = Math.max(320, Math.round(win?.innerWidth || doc.documentElement.clientWidth || 960))
  const expandContentNode = (element) => {
    if (!element) {
      return
    }
    element.dataset.linkeNativeChromeCompacted = '1'
    setManagedStyle(element, 'top', '0px')
    setManagedStyle(element, 'left', '0px')
    setManagedStyle(element, 'right', '0px')
    setManagedStyle(element, 'width', `${viewportWidth}px`)
    setManagedStyle(element, 'height', `${viewportHeight}px`)
    setManagedStyle(element, 'min-height', `${viewportHeight}px`)
    setManagedStyle(element, 'max-height', 'none')
    setManagedStyle(element, 'overflow', 'hidden')
    changed = true
  }

  const centerPanel = doc.getElementById('mainCenterPanle')
  if (centerPanel) {
    centerPanel.dataset.linkeNativeChromeCompacted = '1'
    setManagedStyle(centerPanel, 'position', 'relative')
    setManagedStyle(centerPanel, 'top', '0px')
    setManagedStyle(centerPanel, 'left', '0px')
    setManagedStyle(centerPanel, 'right', '0px')
    setManagedStyle(centerPanel, 'width', `${viewportWidth}px`)
    setManagedStyle(centerPanel, 'height', `${viewportHeight}px`)
    setManagedStyle(centerPanel, 'overflow', 'hidden')
    changed = true
  }

  const contentPanel = doc.getElementById('mainContentPanle')
  if (contentPanel) {
    contentPanel.dataset.linkeNativeChromeCompacted = '1'
    setManagedStyle(contentPanel, 'position', 'relative')
    setManagedStyle(contentPanel, 'top', '0px')
    setManagedStyle(contentPanel, 'left', '0px')
    setManagedStyle(contentPanel, 'right', '0px')
    setManagedStyle(contentPanel, 'width', `${viewportWidth}px`)
    setManagedStyle(contentPanel, 'height', `${viewportHeight}px`)
    setManagedStyle(contentPanel, 'overflow', 'hidden')
    changed = true
  }

  for (const element of Array.from(doc.querySelectorAll([
    '#mainContentPanle .tabs-panels',
    '#mainContentPanle .tabs-panels > .panel',
    '#mainContentPanle .panel-body',
    '#mainContentPanle .panel-body-noheader',
    '#mainContentPanle .layout-body'
  ].join(',')))) {
    expandContentNode(element)
  }

  const frame = doc.querySelector('iframe#Frame0, iframe[name="Frame0"]')
  if (frame) {
    frame.dataset.linkeNativeChromeCompacted = '1'
    setManagedStyle(frame, 'position', 'absolute')
    setManagedStyle(frame, 'top', '0px')
    setManagedStyle(frame, 'left', '0px')
    setManagedStyle(frame, 'right', '0px')
    setManagedStyle(frame, 'bottom', '0px')
    setManagedStyle(frame, 'width', `${viewportWidth}px`)
    setManagedStyle(frame, 'height', `${viewportHeight}px`)
    changed = true
  }

  return changed
}

function collapseNativeNavigationSource(source) {
  if (!source) {
    return
  }

  const collapsedWidth = '0px'
  try {
    if (source.frameElement) {
      const frameElement = source.frameElement

      frameElement.dataset.linkeNativeFrameCollapsed = '1'
      frameElement.setAttribute('width', '0')
      frameElement.setAttribute('scrolling', 'no')
      collapseBoxElement(frameElement, collapsedWidth)
      const collapsedFrameSet = collapseFrameSetSlot(frameElement)
      const frameContainer = findCollapsibleFrameContainer(frameElement)
      if (frameContainer && !collapsedFrameSet) {
        frameContainer.dataset.linkeNativeFrameCollapsed = '1'
        collapseBoxElement(frameContainer, collapsedWidth)
        resizeKnownCenterPanels(frameContainer, collapsedWidth)
        collapseSiblingSplitters(frameContainer)
      }
      collapseResidualNavigationSpace(source)
      return
    }

    const layoutHost = findNavigationLayoutHost(source.host)
    for (const target of new Set([layoutHost, source.host])) {
      collapseLeftPanelElement(target)
    }
    resizeKnownCenterPanels(layoutHost, collapsedWidth)
    collapseSiblingSplitters(layoutHost)
    collapseResidualNavigationSpace(source)
  } catch {}
}

function resizeNavigationHost(source) {
  const width = `${NAVIGATION_PANEL_WIDTH}px`

  try {
    if (source.frameElement) {
      const frameElement = source.frameElement
      const parent = frameElement.parentElement
      const columns = parent && parent.tagName &&
        parent.tagName.toLowerCase() === 'frameset' &&
        parent.getAttribute('cols')
      if (columns) {
        const frameChildren = Array.from(parent.children)
          .filter((child) => /^(frame|iframe)$/i.test(child.tagName || ''))
        const frameIndex = frameChildren.indexOf(frameElement)
        const parts = columns.split(',').map((part) => part.trim())
        if (frameIndex >= 0 && parts.length === frameChildren.length) {
          parts[frameIndex] = String(NAVIGATION_PANEL_WIDTH)
          parent.setAttribute('cols', parts.join(','))
          frameElement.setAttribute('width', String(NAVIGATION_PANEL_WIDTH))
        }
        return
      }

      frameElement.setAttribute('width', String(NAVIGATION_PANEL_WIDTH))
      frameElement.style.setProperty('width', width, 'important')
      return
    }

    const layoutHost = findNavigationLayoutHost(source.host)
    for (const target of new Set([layoutHost, source.host])) {
      applyNavigationPanelWidth(target, width)
    }
    resizeKnownCenterPanels(layoutHost, width)
  } catch {}
}

function ensureNavigationStyle(doc) {
  if (doc.getElementById('linke-jw-navigation-style')) {
    return
  }

  const style = doc.createElement('style')
  style.id = 'linke-jw-navigation-style'
  style.textContent = `
    #linke-jw-navigation-root {
      width: 100%;
      max-width: 100%;
      height: 100vh;
      background: #f8fafc;
      color: #172033;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
      text-align: left;
    }
    #linke-jw-navigation-root * {
      box-sizing: border-box;
    }
    .linke-jw-nav-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      min-height: 0;
      padding: 12px;
      border-right: 1px solid #dbe4f0;
      background: #f8fafc;
      overflow-x: hidden;
      overflow-y: hidden;
      position: relative;
    }
    .linke-jw-nav-title {
      flex: 0 0 auto;
      margin: 0 0 10px;
      color: #172033;
      font-size: 16px;
      font-weight: 750;
      line-height: 1.3;
    }
    .linke-jw-nav-meta {
      flex: 0 0 auto;
      margin: -4px 0 12px;
      color: #8792a2;
      font-size: 12px;
      line-height: 1.4;
    }
    .linke-jw-nav-list {
      flex: 1 1 auto;
      min-height: 0;
      padding-right: 4px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      position: relative;
      scrollbar-gutter: stable;
      -webkit-overflow-scrolling: touch;
    }
    .linke-jw-nav-group {
      display: block;
      margin: 0 0 8px;
      border: 1px solid #e3e8f2;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
      position: relative;
    }
    .linke-jw-nav-group summary {
      cursor: pointer;
      display: block;
      padding: 9px 10px;
      color: #4b5563;
      font-size: 13px;
      font-weight: 750;
      line-height: 1.35;
      list-style: none;
      white-space: normal;
    }
    .linke-jw-nav-group summary::-webkit-details-marker {
      display: none;
    }
    .linke-jw-nav-item {
      display: block;
      width: 100%;
      min-height: 32px;
      border: 0;
      border-top: 1px solid #eef2f7;
      background: #ffffff;
      color: #172033;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      line-height: 1.35;
      position: relative;
      text-align: left;
    }
    .linke-jw-nav-item:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }
    .linke-jw-nav-item span {
      display: block;
      padding: 8px 10px;
      overflow: visible;
      white-space: normal;
      word-break: break-word;
    }
    .linke-jw-nav-empty {
      padding: 12px;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.5;
    }
  `
  doc.head.appendChild(style)
}

function ensureNavigationRoot(source) {
  const doc = source.doc
  const host = source.host
  ensureNavigationStyle(doc)
  resizeNavigationHost(source)

  let root = doc.getElementById('linke-jw-navigation-root')
  if (!root) {
    root = doc.createElement('div')
    root.id = 'linke-jw-navigation-root'
  }

  root.style.removeProperty('display')
  if (root.parentElement !== host) {
    host.insertBefore(root, host.firstChild)
  }

  host.dataset.linkeNativeNavHost = '1'
  if (host === doc.body) {
    doc.documentElement.style.height = '100%'
    doc.body.style.height = '100%'
    doc.body.style.margin = '0'
    doc.body.style.overflow = 'hidden'
  }
  host.style.setProperty('display', 'block', 'important')
  host.style.setProperty('overflow', 'hidden', 'important')
  return root
}

function hideNativeNavigationChildren(source, root) {
  for (const child of Array.from(source.host.children)) {
    if (child === root) {
      continue
    }
    child.dataset.linkeNativeNavHidden = '1'
    child.setAttribute('aria-hidden', 'true')
    child.style.setProperty('display', 'none', 'important')
  }
}

function bindNavigationScrolling(root) {
  if (root.__linkeNavWheelHandler) {
    root.removeEventListener('wheel', root.__linkeNavWheelHandler, { capture: true })
  }

  const wheelHandler = (event) => {
    const scroller = root.querySelector('.linke-jw-nav-list')
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const verticalDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX
    scroller.scrollTop += verticalDelta
  }

  root.__linkeNavWheelHandler = wheelHandler
  root.addEventListener('wheel', wheelHandler, { passive: false, capture: true })
}

function renderCustomNavigation(catalog, source, mode = 'fresh') {
  if (!hasNavigationCatalog(catalog) || !source) {
    return false
  }

  const root = ensureNavigationRoot(source)
  hideNativeNavigationChildren(source, root)
  const itemCount = catalog.groups.reduce((count, group) => count + (group.items || []).length, 0)
  const meta = mode === 'cached'
    ? `已使用本地缓存目录，共 ${itemCount} 项`
    : `已接管教务原导航，共 ${itemCount} 项`
  const groupsHtml = catalog.groups.map((group) => `
    <details class="linke-jw-nav-group" open>
      <summary>${escapeHtml(group.title)}</summary>
      ${(group.items || []).map((item) => `
        <button class="linke-jw-nav-item" type="button" data-linke-nav-id="${escapeHtml(item.id)}" ${item.disabled ? 'disabled' : ''}>
          <span style="padding-left:${10 + Math.max(0, Math.min(3, item.level || 0)) * 14}px">${escapeHtml(item.title)}</span>
        </button>
      `).join('')}
    </details>
  `).join('')

  root.innerHTML = `
    <nav class="linke-jw-nav-shell" aria-label="林课教务导航">
      <h2 class="linke-jw-nav-title">教务导航</h2>
      <div class="linke-jw-nav-meta">${escapeHtml(meta)}</div>
      <div class="linke-jw-nav-list" tabindex="0">
        ${groupsHtml || '<div class="linke-jw-nav-empty">暂无可用导航</div>'}
      </div>
    </nav>
  `
  bindNavigationScrolling(root)
  root.onclick = (event) => {
    const button = event.target && event.target.closest && event.target.closest('[data-linke-nav-id]')
    if (!button || button.disabled) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    clickNativeNavigationItem(button.dataset.linkeNavId)
  }
  document.documentElement.dataset.linkeNavigationTakeover = '1'
  navigationRendered = true
  return true
}

async function loadNavigationCache() {
  if (navigationCacheLoaded) {
    return navigationCatalog
  }

  navigationCacheLoaded = true
  try {
    const cache = await ipcRenderer.invoke('jw:navigation-cache:get')
    if (hasNavigationCatalog(cache)) {
      navigationCatalog = cache
    }
  } catch {}

  return navigationCatalog
}

async function saveNavigationCatalog(catalog) {
  if (!hasNavigationCatalog(catalog)) {
    return
  }

  try {
    const cache = await ipcRenderer.invoke('jw:navigation-cache:save', {
      strategy: catalog.strategy,
      sourceMode: catalog.sourceMode,
      groups: catalog.groups
    })
    if (hasNavigationCatalog(cache)) {
      navigationCatalog = cache
    }
  } catch {}
}

async function scanNativeNavigation(options = {}) {
  if (!isTopFrame() || !isAllowedPage()) {
    sendNavigationDebug('skipped-page', {
      isTopFrame: isTopFrame(),
      isAllowedPage: isAllowedPage()
    })
    return
  }

  if (isJwOriginalModeEnabled(document)) {
    setJwOriginalMode(true)
    sendNavigationDebug('original-mode')
    return
  }

  if (isLoginOrEntryPage()) {
    restoreLoginPageLayout()
    sendNavigationDebug('login-page')
    return
  }

  runNativeChromeCompaction()

  if (navigationRendered && !options.force) {
    return
  }

  await loadNavigationCache()

  for (const doc of collectAccessibleDocuments()) {
    cleanupInvalidNavigationTakeover(doc)
  }

  const sources = findNavigationSources()
  if (sources.length === 0) {
    sendNavigationDebug('no-source', {
      documents: summarizeNavigationScan()
    })
    return
  }

  const source = sources[0]

  if (options.preferCache === true && navigationRendered && isNativeNavigationCatalog(navigationCatalog)) {
    return
  }

  const nativeCatalog = collectNavigationCatalogFromHtmlTree(source)
  if (isNativeNavigationCatalog(nativeCatalog)) {
    navigationCatalog = nativeCatalog
    await saveNavigationCatalog(nativeCatalog)
    collapseNativeNavigationSource(source)
    navigationRendered = true
    sendNavigationDebug('saved', {
      groupCount: nativeCatalog.groups.length,
      itemCount: nativeCatalog.groups.reduce((count, group) => count + (group.items || []).length, 0),
      groups: nativeCatalog.groups.map((group) => ({
        title: group.title,
        itemCount: (group.items || []).length,
        items: (group.items || []).slice(0, 24).map((item) => item.title)
      }))
    })
    return
  }

  sendNavigationDebug('structured-empty', {
    source: summarizeNavigationSource(source)
  })

  if (navigationRendered && isNativeNavigationCatalog(navigationCatalog)) {
    return
  }
}

function scheduleNavigationScan(delay = 500, options = {}) {
  window.clearTimeout(navigationScanTimer)
  navigationScanTimer = window.setTimeout(() => {
    scanNativeNavigation(options)
  }, delay)
}

async function clickNativeNavigationItem(id, retry = true) {
  if (String(id || '') === PERSONAL_CENTER_NAVIGATION_ID) {
    return openPersonalCenterPage()
  }

  let entry = navigationRegistry.get(String(id || ''))
  if (!entry || !entry.element) {
    if (!retry) {
      return false
    }
    await scanNativeNavigation({ preferCache: false, force: true })
    entry = navigationRegistry.get(String(id || ''))
    if (!entry || !entry.element) {
      return false
    }
  }

  const element = entry.element
  try {
    dispatchNativeNavigationClick(element)
    scheduleNativeChromeCompaction(120)
  } catch {
    if (entry.href && !/^javascript:/i.test(entry.href)) {
      entry.doc.defaultView.location.href = new URL(entry.href, entry.doc.location.href).toString()
      scheduleNativeChromeCompaction(120)
    }
  }
  return true
}

function openPersonalCenterPage() {
  if (!isTopFrame() || !isAllowedPage()) {
    return false
  }

  const attemptedNativeAction = triggerNativePersonalCenterNavigation()
  const forced = forcePersonalCenterFrame({ hardReload: true, reload: true })
  window.setTimeout(() => {
    triggerNativePersonalCenterNavigation()
    forcePersonalCenterFrame({ reload: false })
  }, 120)
  scheduleNativeChromeCompactionBurst()
  return forced || attemptedNativeAction
}

function getPersonalCenterFrameUrl() {
  return new URL(PERSONAL_CENTER_FRAME_PATH, window.location.href).toString()
}

function isPersonalCenterFrameUrl(value) {
  try {
    return PERSONAL_CENTER_FRAME_PATTERN.test(new URL(String(value || ''), window.location.href).pathname)
  } catch {
    return PERSONAL_CENTER_FRAME_PATTERN.test(String(value || ''))
  }
}

function triggerNativePersonalCenterNavigation() {
  let attemptedNativeAction = false
  const tag = document.getElementById('tag_grzx')
  try {
    if (typeof window.showMenu === 'function' && tag) {
      window.showMenu('mainContent', '0', tag)
      attemptedNativeAction = true
    }
  } catch {}

  const button = document.getElementById('btn_gotoGrzx')
  if (button) {
    dispatchNativeNavigationClick(button)
    attemptedNativeAction = true
  }
  return attemptedNativeAction
}

function getFrameCurrentUrl(frame) {
  if (!frame) {
    return ''
  }
  try {
    const currentHref = frame.contentWindow?.location?.href
    if (currentHref && currentHref !== 'about:blank') {
      return currentHref
    }
  } catch {}
  return String(frame.getAttribute?.('src') || frame.src || '')
}

function isPersonalCenterFrame(frame) {
  return isPersonalCenterFrameUrl(getFrameCurrentUrl(frame))
}

function findPersonalCenterContentFrames() {
  const selectors = [
    'iframe#Frame0',
    'iframe[name="Frame0"]',
    'frame#Frame0',
    'frame[name="Frame0"]',
    '#mainContentPanle iframe',
    '#mainContentPanle frame',
    '#mainContent iframe',
    '#mainContent frame',
    '.tabs-panels iframe',
    '.tabs-panels frame'
  ].join(',')
  return Array.from(document.querySelectorAll(selectors))
}

function loadPersonalCenterFrame(frame, targetUrl, options = {}) {
  if (!frame) {
    return false
  }
  if (!options.reload && isPersonalCenterFrame(frame)) {
    return true
  }

  const assignTarget = () => {
    try {
      frame.setAttribute('src', targetUrl)
    } catch {}
    try {
      frame.src = targetUrl
    } catch {}
    try {
      frame.contentWindow?.location?.replace(targetUrl)
    } catch {}
  }

  if (options.hardReload) {
    try {
      frame.contentWindow?.stop?.()
    } catch {}
    try {
      frame.setAttribute('src', 'about:blank')
    } catch {}
    try {
      frame.src = 'about:blank'
    } catch {}
    window.setTimeout(assignTarget, 30)
    return true
  }

  assignTarget()
  return true
}

function resetModeSwitchToPersonalCenter(options = {}) {
  if (!isTopFrame() || !isAllowedPage() || isLoginOrEntryPage()) {
    return false
  }

  const attemptedNativeAction = triggerNativePersonalCenterNavigation()
  const forced = forcePersonalCenterFrame({ hardReload: true, reload: true })
  for (const delay of [180, 520, 900]) {
    window.setTimeout(() => {
      if (!isTopFrame() || !isAllowedPage() || isLoginOrEntryPage()) {
        return
      }
      if (options.customized && isJwOriginalModeEnabled(document)) {
        return
      }
      triggerNativePersonalCenterNavigation()
      forcePersonalCenterFrame({ reload: false })
      if (options.customized) {
        schedulePersonalCenterCustomizedTakeover(100)
        scheduleNativeChromeCompaction(80)
      }
    }, delay)
  }
  return forced || attemptedNativeAction
}

function forcePersonalCenterFrame(options = {}) {
  const tag = document.getElementById('tag_grzx')
  if (tag) {
    const tabs = tag.closest('.tabs')
    if (tabs) {
      for (const tab of tabs.querySelectorAll('li.tabs-selected')) {
        tab.classList.remove('tabs-selected')
      }
    }
    const tabItem = tag.closest('li')
    if (tabItem) {
      tabItem.classList.add('tabs-selected')
    }
    const title = tag.querySelector('.tabs-title')
    if (title) {
      title.textContent = JW_HOME_TITLE
    }
  }

  const targetUrl = getPersonalCenterFrameUrl()
  for (const contentFrame of findPersonalCenterContentFrames()) {
    if (loadPersonalCenterFrame(contentFrame, targetUrl, options)) {
      return true
    }
  }

  return false
}

async function clickNativeNavigationItemByHint(hint = {}) {
  const title = String(hint.title || '').trim()
  if (!title) {
    return false
  }

  await loadNavigationCache()
  const sources = findNavigationSources()
  const source = sources[0]
  if (!source) {
    return false
  }

  const catalog = collectNavigationCatalogFromHtmlTree(source)
  const expectedId = String(hint.id || '')
  let targetId = expectedId && navigationRegistry.has(expectedId) ? expectedId : ''
  if (!targetId && hasNavigationCatalog(catalog)) {
    for (const group of catalog.groups) {
      const item = (group.items || []).find((candidate) => normalizeNavigationTitleKey(candidate.title) === normalizeNavigationTitleKey(title))
      if (item) {
        targetId = item.id
        break
      }
    }
  }

  if (!targetId) {
    return false
  }

  const clicked = await clickNativeNavigationItem(targetId, false)
  collapseNativeNavigationSource(source)
  return clicked
}

let navigationBootTimer
let navigationBootAttempts = 0
let navigationScanTimer
let nativeChromeCompactionTimer
let navigationRegistry = new Map()
let navigationCatalog = null
let navigationCacheLoaded = false
let navigationRendered = false

function restoreLoginPageLayout() {
  window.clearTimeout(navigationScanTimer)
  window.clearTimeout(nativeChromeCompactionTimer)
  window.clearInterval(navigationBootTimer)
  navigationRegistry.clear()
  navigationRendered = false
  try {
    for (const doc of Array.from(new Set(collectAccessibleDocuments()))) {
      restoreNativeChromeCompaction(doc)
      removeJwOriginalRestoreButton(doc)
      removePersonalCenterRestoreButton(doc)
    }
  } catch {}
}

function runNativeChromeCompaction() {
  try {
    if (isJwOriginalModeEnabled(document)) {
      setJwOriginalMode(true)
      return
    }
    if (isLoginOrEntryPage()) {
      restoreLoginPageLayout()
      return
    }
    for (const doc of Array.from(new Set(collectAccessibleDocuments()))) {
      applyPersonalNoticeDialogModeFromContext(doc)
      installContentFrameCompactionHooks(doc)
      installCustomizedNativeLayoutStyle(doc)
      compactNativeTopChrome(doc)
      compactNativeContentPageHeader(doc)
      collapseKnownLeftNavigationPanels(doc)
      expandKnownCenterPanels(doc)
      expandKnownContentFrames(doc)
      resetCustomizedContentOffsets(doc)
      applyPersonalCenterCustomizedTakeover(doc)
    }
  } catch {}
}

function scheduleNativeChromeCompaction(delay = 120) {
  window.clearTimeout(nativeChromeCompactionTimer)
  nativeChromeCompactionTimer = window.setTimeout(runNativeChromeCompaction, delay)
}

function scheduleNativeChromeCompactionBurst() {
  for (const delay of [80, 300, 800]) {
    window.setTimeout(runNativeChromeCompaction, delay)
  }
}

function bootCustomNavigation() {
  if (!isTopFrame() || !isAllowedPage()) {
    return
  }

  if (isJwOriginalModeEnabled(document)) {
    setJwOriginalMode(true)
    return
  }

  if (isLoginOrEntryPage()) {
    restoreLoginPageLayout()
    return
  }

  runNativeChromeCompaction()
  scheduleNativeChromeCompactionBurst()
  loadNavigationCache().then(() => scheduleNavigationScan(150))
  scheduleNavigationScan(500)
  window.clearInterval(navigationBootTimer)
  navigationBootAttempts = 0
  navigationBootTimer = window.setInterval(() => {
    navigationBootAttempts += 1
    scheduleNavigationScan(100, { preferCache: true })
    if (navigationRendered || navigationBootAttempts >= 30) {
      window.clearInterval(navigationBootTimer)
    }
  }, 1000)
}

const COURSE_SEARCH_LABEL_PATTERN = /^(课程名称|课程名|课程)\s*[:：]?\s*(.+)$/
const COURSE_SEARCH_NEGATIVE_LABEL_PATTERN = /课程(编号|代码|性质|属性|类别|类型|学分|成绩|绩点|容量|时间|地点|周次|教师|老师|状态|列表|表|中心|查询|管理|评价|安排|号|ID)$/i
const COURSE_SEARCH_COURSE_HEADER_TEXTS = new Set([
  '课程',
  '课程名',
  '课程名称',
  '课程全称',
  '课程简称',
  '课程中文名',
  '课程中文名称',
  '中文课程名',
  '中文课程名称',
  '课程英文名',
  '课程英文名称',
  '英文课程名',
  '英文课程名称',
  '开课名称',
  '开课课程',
  '开课课程名',
  '开课课程名称',
  '任课课程',
  '任课课程名',
  '任课课程名称',
  '授课课程',
  '授课课程名',
  '授课课程名称',
  '上课课程',
  '上课课程名',
  '上课课程名称',
  '选课课程',
  '选课课程名',
  '选课课程名称',
  '已选课程',
  '已选课程名',
  '已选课程名称',
  '所选课程',
  '所选课程名',
  '所选课程名称',
  '课程环节名称',
  '课程或环节名称',
  '课程环节名'
])
const COURSE_SEARCH_NEGATIVE_HEADER_TEXTS = new Set([
  '课程编号',
  '课程代码',
  '课程号',
  '课程id',
  '课程ID',
  '课程性质',
  '课程属性',
  '课程类别',
  '课程类型',
  '课程分类',
  '课程归属',
  '课程层次',
  '课程模块',
  '课程组',
  '课程表',
  '课程列表',
  '课程管理',
  '课程查询',
  '课程评价',
  '课程安排',
  '课程状态',
  '课程容量',
  '课程学分',
  '课程成绩',
  '课程绩点',
  '课程时间',
  '课程地点',
  '课程周次',
  '课程节次',
  '选课编码',
  '选课编号',
  '选课号',
  '上课班级',
  '上课时间',
  '上课地点',
  '上课周次',
  '上课节次',
  '上课校区',
  '上课院区',
  '授课教师',
  '任课教师',
  '教师',
  '老师',
  '教工号',
  '教师工号',
  '授课教师工号',
  '教学班',
  '教学班号',
  '教学班名称',
  '教学班编号',
  '专业',
  '专业名称',
  '所属专业',
  '年级',
  '班级',
  '行政班',
  '行政班级',
  '学院',
  '院系',
  '校区',
  '教材',
  '教材名称',
  '教材名',
  'ISBN',
  'ISBN号',
  'ISBN书号',
  '作者',
  '出版社',
  '版次',
  '定价',
  '学分',
  '绩点',
  '成绩',
  '考试性质',
  '考试方式',
  '状态',
  '操作',
  '备注'
])
const COURSE_SEARCH_TEACHER_HEADER_TEXTS = new Set([
  '教师',
  '老师',
  '教师姓名',
  '教师名称',
  '老师姓名',
  '任课教师',
  '任课老师',
  '任课教师姓名',
  '上课教师',
  '上课老师',
  '上课教师姓名',
  '授课教师',
  '授课老师',
  '授课教师姓名',
  '主讲教师',
  '主讲老师',
  '主讲教师姓名',
  '开课教师',
  '开课老师'
])
const COURSE_SEARCH_BLOCKED_TEXT = new Set([
  '课程',
  '课程名称',
  '课程名',
  '编号',
  '代码',
  '编码',
  '课程编号',
  '课程代码',
  '课程性质',
  '课程属性',
  '课程类别',
  '课程类型',
  '课程表',
  '我的课程',
  '本学期课程',
  '课程列表',
  '成绩查询',
  '学生评价',
  '选课中心',
  '退选课',
  '选课',
  '退课',
  '查询',
  '搜索',
  '保存',
  '提交',
  '取消',
  '关闭',
  '详情',
  '更多',
  '通知',
  '公告',
  '小计',
  '合计',
  '总计',
  '必修',
  '选修',
  '通选',
  '正常考试',
  '实践必修',
  '通识必修课',
  '通识选修课',
  '专业必修课',
  '否',
  '是'
])
const COURSE_SEARCH_CONTEXT_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'option',
  'script',
  'style',
  '[contenteditable="true"]',
  '[data-linke-course-search-link="1"]',
  '[data-linke-course-search-enhanced="1"]'
].join(',')
const COURSE_SEARCH_STRUCTURAL_SELECTOR = [
  '.lk-pc-course-name',
  '.lk-pc-week-course-name',
  '.course-name',
  '.lesson-name',
  '[data-course-name]',
  '[data-lesson-name]'
].join(',')
let linkeCollectionHighlightItems = []
let linkeCollectionHighlightMatchKeys = new Set()
let linkeCollectionHighlightSignature = ''

function installCourseSearchStyle(doc = document) {
  if (!doc?.head || doc.getElementById('linke-course-search-style')) {
    return
  }
  const style = doc.createElement('style')
  style.id = 'linke-course-search-style'
  style.textContent = `
    .linke-course-search-link {
      display: inline;
      padding: 0;
      border: 0;
      border-bottom: 1px dashed #1e3a8a;
      background: transparent;
      color: #1e3a8a;
      font: inherit;
      line-height: inherit;
      cursor: pointer;
      text-decoration: none;
    }

	    .linke-course-search-link.linke-teacher-search-link {
	      border-bottom-color: #047857;
	      color: #047857;
	    }

	    .linke-course-search-link:hover,
	    .linke-course-search-link:focus-visible {
	      border-bottom-style: solid;
	      color: #172554;
	      outline: none;
	    }

	    .linke-course-search-link.linke-teacher-search-link:hover,
	    .linke-course-search-link.linke-teacher-search-link:focus-visible {
	      border-bottom-color: #065f46;
	      color: #065f46;
	    }

	    tr.linke-collection-course-row > td,
	    tr.linke-collection-course-row > th {
	      background: #fff7ed !important;
	      box-shadow:
	        inset 0 1px rgba(217, 119, 6, 0.42),
	        inset 0 -1px rgba(217, 119, 6, 0.42);
	    }

	    tr.linke-collection-course-row > td:first-child,
	    tr.linke-collection-course-row > th:first-child {
	      position: relative;
	      overflow: visible;
	      box-shadow:
	        inset 4px 0 #d97706,
	        inset 0 1px rgba(217, 119, 6, 0.5),
	        inset 0 -1px rgba(217, 119, 6, 0.5);
	    }

	    tr.linke-collection-course-row > td:last-child,
	    tr.linke-collection-course-row > th:last-child {
	      box-shadow:
	        inset -1px 0 rgba(217, 119, 6, 0.42),
	        inset 0 1px rgba(217, 119, 6, 0.42),
	        inset 0 -1px rgba(217, 119, 6, 0.42);
	    }

	    tr.linke-collection-course-row .linke-course-search-link {
	      border-bottom-color: #d97706;
	      color: #92400e;
	      font-weight: 700;
	    }

	    tr.linke-collection-course-row .linke-course-search-link.linke-teacher-search-link {
	      border-bottom-color: #047857;
	      color: #047857;
	      font-weight: 700;
	    }

	    .linke-collection-record-tag {
	      display: inline-flex;
	      align-items: center;
	      gap: 4px;
	      position: absolute;
	      top: -13px;
	      left: 7px;
	      z-index: 30;
	      padding: 2px 8px 2px 7px;
	      border-radius: 8px 8px 8px 0;
	      background: #d97706;
	      color: #fff7ed;
	      font-size: 11px;
	      font-weight: 700;
	      line-height: 1.5;
	      box-shadow: 0 3px 8px rgba(146, 64, 14, 0.22);
	      white-space: nowrap;
	      pointer-events: none;
	    }

	    .linke-collection-record-tag::before {
	      content: "";
	      width: 8px;
	      height: 11px;
	      border-radius: 2px 2px 1px 1px;
	      background: currentColor;
	      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%);
	      flex: 0 0 auto;
	    }

	    .lk-pc-week-course.linke-collection-course-card,
	    .lk-pc-course-item.linke-collection-course-card {
	      position: relative !important;
	      border-color: rgba(245, 158, 11, 0.8) !important;
	      background: #fff7ed !important;
	      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.12) !important;
	    }

	    .lk-pc-week-course.linke-collection-course-card::after,
	    .lk-pc-course-item.linke-collection-course-card::after {
	      content: "已收藏";
	      position: absolute;
	      top: 5px;
	      right: 6px;
	      padding: 1px 5px;
	      border-radius: 999px;
	      background: #fffbeb;
	      color: #92400e;
	      font-size: 10px;
	      font-weight: 700;
	      line-height: 1.4;
	      box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.28);
	    }
	  `
  doc.head.appendChild(style)
}

function normalizeCourseSearchKeyword(value) {
  return normalizeText(value)
    .replace(/^课程(名称|名)?\s*[:：]\s*/, '')
    .replace(/^(名称|课程)\s*[:：]\s*/, '')
    .replace(/\s*(查看|详情|搜索|进入林课|林课).*$/, '')
    .replace(/[;；，,。]+$/g, '')
    .trim()
}

function isBlockedCourseSearchText(value, { loose = false } = {}) {
  const text = normalizeCourseSearchKeyword(value)
  if (!text || text.length < 2 || text.length > 60) return true
  if (COURSE_SEARCH_BLOCKED_TEXT.has(text)) return true
  if (/^\d+$/.test(text)) return true
  if (/^\d{4}-\d{4}-\d$/.test(text)) return true
  if (/^\d{4}.+(班|学院|专业)$/.test(text)) return true
  if (/^https?:\/\//i.test(text)) return true
  if (/^[\dA-Za-z_-]{5,}$/.test(text) && !/[\u4e00-\u9fa5]/.test(text)) return true
  if (/^(优秀|良好|中等|及格|不及格|合格|不合格|通过|未通过)$/.test(text)) return true
  if (/^(星期[一二三四五六日天]|第?\d+节|上午|下午|晚上)$/.test(text)) return true
  if (/^(序号|开课学期|成绩|学分|绩点|考试性质|辅修课程|状态|教师|老师|任课教师)$/.test(text)) return true
  if (/学分\s*\d|学时\s*\d|周\/节次|上课地点|上课周次|课程编号|课程代码/.test(text)) return true
  if (loose && !/[\u4e00-\u9fa5]/.test(text)) return true
  return false
}

function isLikelyCourseNameText(value, { tableColumn = false } = {}) {
  const text = normalizeCourseSearchKeyword(value)
  if (isBlockedCourseSearchText(text, { loose: !tableColumn })) return false
  if (tableColumn) return true
  return /(论|学|语|法|史|课|体育|数学|英语|技能|指导|教育|会计|微积分|代数|哲学|艺术|计算机|人工智能|心理|文化|理论|实践|概论|军事|数据|程序|设计|经济|管理)/.test(text)
}

function isCourseSearchBlockedContainer(element) {
  if (!element || element.nodeType !== 1) return true
  if (element.closest(COURSE_SEARCH_CONTEXT_SELECTOR)) return true
  if (element.closest('#mainMenu, #mainNorthPanle, #mainTagPanle, .Nsb_menu, .tabs-header, .panel-header')) return true
  return false
}

function normalizeCourseSearchHeader(value) {
  return normalizeText(value)
    .replace(/[-_—–＝=·•.。…]+/g, '')
    .replace(/[：:／\/\\|（）()\[\]【】{}<>《》“”"'‘’`~,，;；]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function isNegativeCourseSearchHeader(value) {
  const header = normalizeCourseSearchHeader(value)
  if (!header) return true
  if (COURSE_SEARCH_NEGATIVE_HEADER_TEXTS.has(header)) return true
  if (COURSE_SEARCH_NEGATIVE_LABEL_PATTERN.test(header)) return true
  if (/(编号|代码|编码|课程号|课号|ID|id|性质|属性|类别|类型|分类|归属|层次|模块|学分|学时|成绩|绩点|容量|人数|状态|操作|备注)$/.test(header)) return true
  if (/(教师|老师|教工|教材|ISBN|书号|作者|出版社|版次|定价|班级|专业|学院|院系|年级|校区)$/.test(header)) return true
  if (/^(上课|授课|任课).*(时间|地点|周次|节次|班级|教师|老师|教工)$/.test(header)) return true
  return false
}

function isCourseNameColumnHeader(value) {
  const header = normalizeCourseSearchHeader(value)
  if (!header || isNegativeCourseSearchHeader(header)) return false
  if (COURSE_SEARCH_COURSE_HEADER_TEXTS.has(header)) return true
  if (/^课程(中文|英文)?(名称|名|全称|简称)$/.test(header)) return true
  if (/^(中文|英文)课程(名称|名|全称|简称)$/.test(header)) return true
  if (/^(开课|任课|授课|上课|选课|已选|所选)课程(名称|名|全称|简称)?$/.test(header)) return true
  if (/^课程.*(名称|名)$/.test(header) && !isNegativeCourseSearchHeader(header)) return true
  return false
}

function isTeacherNameColumnHeader(value) {
  const header = normalizeCourseSearchHeader(value)
  if (!header) return false
  if (/(工号|编号|代码|职称|学院|单位|部门|时间|地点)$/.test(header)) return false
  if (COURSE_SEARCH_TEACHER_HEADER_TEXTS.has(header)) return true
  return /^(任课|上课|授课|主讲|开课)?(教师|老师)(姓名|名称)?$/.test(header)
}

function normalizeCollectionHighlightPart(value) {
  return normalizeText(value)
    .replace(/\s+/g, '')
    .replace(/[，、；;]/g, ',')
    .trim()
}

function buildCollectionHighlightMatchKey(courseName, teacherName) {
  const course = normalizeCollectionHighlightPart(courseName)
  const teacher = normalizeCollectionHighlightPart(teacherName)
  return course && teacher ? `${course}|${teacher}` : ''
}

function normalizeCollectionHighlightPayload(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const keys = new Set(Array.isArray(payload.matchKeys)
    ? payload.matchKeys.map((key) => normalizeText(key)).filter(Boolean)
    : [])
  const normalizedItems = []
  for (const item of items) {
    const courseName = normalizeText(item?.courseName || item?.lessonName || '')
    const teacherName = normalizeText(item?.teacherName || '')
    const matchKey = normalizeText(item?.matchKey || buildCollectionHighlightMatchKey(courseName, teacherName))
    if (!matchKey) continue
    keys.add(matchKey)
    normalizedItems.push({
      courseId: normalizeText(item?.courseId || item?.md5Hash || ''),
      courseName,
      teacherName,
      matchKey
    })
  }
  return { items: normalizedItems, matchKeys: keys }
}

function getCollectionHighlightSignature(matchKeys) {
  return Array.from(matchKeys || []).sort().join('\n')
}

function findCollectionHighlightMatch(courseName, teacherName) {
  const matchKey = buildCollectionHighlightMatchKey(courseName, teacherName)
  if (!matchKey || !linkeCollectionHighlightMatchKeys.has(matchKey)) return null
  return linkeCollectionHighlightItems.find((item) => item.matchKey === matchKey) || { matchKey, courseName, teacherName }
}

function sendCourseSearchRequest(keyword, source = 'jw-course-name') {
  const normalizedKeyword = normalizeCourseSearchKeyword(keyword)
  if (isBlockedCourseSearchText(normalizedKeyword)) return
  ipcRenderer.send('jw:course-search-request', {
    keyword: normalizedKeyword,
    source,
    url: window.location.href,
    title: document.title || ''
  })
}

function createCourseSearchLink(doc, keyword, source) {
  const link = doc.createElement('span')
  link.className = 'linke-course-search-link'
  link.dataset.linkeCourseSearchLink = '1'
  link.dataset.linkeCourseSearchKeyword = keyword
  link.dataset.linkeCourseSearchSource = source
  if (source.includes('teacher')) {
    link.classList.add('linke-teacher-search-link')
  }
  link.textContent = keyword
  link.role = 'button'
  link.tabIndex = 0
  link.title = `在林课数据库搜索：${keyword}`
  link.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    sendCourseSearchRequest(keyword, source)
  })
  link.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    sendCourseSearchRequest(keyword, source)
  })
  return link
}

function enhanceCourseElement(element, keyword, source = 'course-element') {
  if (!element || element.dataset?.linkeCourseSearchEnhanced === '1') return false
  const doc = element.ownerDocument || document
  const normalizedKeyword = normalizeCourseSearchKeyword(keyword || element.textContent)
  const isTrustedCourseSource = source.includes('table') || source.includes('structural')
  if (!isLikelyCourseNameText(normalizedKeyword, { tableColumn: isTrustedCourseSource })) return false
  if (isCourseSearchBlockedContainer(element) && !element.matches(COURSE_SEARCH_STRUCTURAL_SELECTOR)) return false
  installCourseSearchStyle(doc)
  element.dataset.linkeCourseSearchEnhanced = '1'
  element.textContent = ''
  element.appendChild(createCourseSearchLink(doc, normalizedKeyword, source))
  return true
}

function enhanceTeacherElement(element, keyword, source = 'teacher-element') {
  if (!element || element.dataset?.linkeCourseSearchEnhanced === '1') return false
  const doc = element.ownerDocument || document
  const normalizedKeyword = normalizeCourseSearchKeyword(keyword || element.textContent)
  if (isBlockedCourseSearchText(normalizedKeyword, { loose: false })) return false
  if (isCourseSearchBlockedContainer(element)) return false
  installCourseSearchStyle(doc)
  element.dataset.linkeCourseSearchEnhanced = '1'
  element.textContent = ''
  element.appendChild(createCourseSearchLink(doc, normalizedKeyword, source))
  return true
}

function getCourseColumnIndexes(cells) {
  const indexes = []
  cells.forEach((cell, index) => {
    if (!cell) return
    if (isCourseNameColumnHeader(cell.textContent)) {
      indexes.push(index)
    }
  })
  return indexes
}

function getTeacherColumnIndexes(cells) {
  const indexes = []
  cells.forEach((cell, index) => {
    if (!cell) return
    if (isTeacherNameColumnHeader(cell.textContent)) {
      indexes.push(index)
    }
  })
  return indexes
}

function clearCollectionHighlightsInDocument(doc = document) {
  if (!doc?.body) return
  for (const row of Array.from(doc.querySelectorAll('.linke-collection-course-row'))) {
    row.classList.remove('linke-collection-course-row')
    delete row.dataset.linkeCollectionCourseMatched
    delete row.dataset.linkeCollectionCourseName
    delete row.dataset.linkeCollectionTeacherName
    if (row.dataset.linkeCollectionOriginalTitle != null) {
      row.setAttribute('title', row.dataset.linkeCollectionOriginalTitle)
      delete row.dataset.linkeCollectionOriginalTitle
    } else {
      row.removeAttribute('title')
    }
  }
  for (const tag of Array.from(doc.querySelectorAll('.linke-collection-record-tag'))) {
    tag.remove()
  }
  for (const card of Array.from(doc.querySelectorAll('.linke-collection-course-card'))) {
    card.classList.remove('linke-collection-course-card')
    delete card.dataset.linkeCollectionCourseMatched
    delete card.dataset.linkeCollectionCourseName
    delete card.dataset.linkeCollectionTeacherName
    if (card.dataset.linkeCollectionOriginalTitle != null) {
      card.setAttribute('title', card.dataset.linkeCollectionOriginalTitle)
      delete card.dataset.linkeCollectionOriginalTitle
    }
  }
}

function getStructuralCourseName(element) {
  return normalizeText(
    element?.dataset?.courseName ||
    element?.dataset?.lessonName ||
    element?.querySelector?.('.lk-pc-week-course-name, .lk-pc-course-name, [data-course-name], [data-lesson-name]')?.textContent ||
    ''
  )
}

function getStructuralTeacherName(element) {
  const raw = normalizeText(
    element?.dataset?.teacherName ||
    element?.dataset?.teacher ||
    element?.querySelector?.('.lk-pc-week-course-teacher, .lk-pc-course-teacher, [data-teacher-name], [data-teacher]')?.textContent ||
    ''
  )
  if (raw) return raw
  const meta = normalizeText(element?.querySelector?.('.lk-pc-week-course-meta, .lk-pc-course-meta')?.textContent || '')
  return meta.split(/[·|｜]/).map((part) => normalizeText(part)).find(Boolean) || ''
}

function applyCollectionHighlightsToStructuralCards(doc = document) {
  if (!doc?.body || linkeCollectionHighlightMatchKeys.size === 0) return
  for (const element of Array.from(doc.querySelectorAll('.lk-pc-week-course, .lk-pc-course-item'))) {
    const courseName = getStructuralCourseName(element)
    const teacherName = getStructuralTeacherName(element)
    if (courseName && teacherName) {
      markCollectionMatchedElement(element, courseName, teacherName)
    }
  }
}

function prepareCollectionHighlightsInDocument(doc = document) {
  if (linkeCollectionHighlightMatchKeys.size > 0) {
    installCourseSearchStyle(doc)
  }
}

function markCollectionMatchedElement(element, courseName, teacherName) {
  if (!element) return false
  const match = findCollectionHighlightMatch(courseName, teacherName)
  if (!match) return false
  element.classList.add(element.tagName === 'TR' ? 'linke-collection-course-row' : 'linke-collection-course-card')
  element.dataset.linkeCollectionCourseMatched = '1'
  element.dataset.linkeCollectionCourseName = normalizeText(courseName)
  element.dataset.linkeCollectionTeacherName = normalizeText(teacherName)
  if (element.dataset.linkeCollectionOriginalTitle == null) {
    element.dataset.linkeCollectionOriginalTitle = element.getAttribute('title') || ''
  }
  element.setAttribute('title', `已收藏：${normalizeText(courseName)} ${normalizeText(teacherName)}`)
  if (element.tagName === 'TR') {
    addCollectionRecordTagToRow(element, courseName, teacherName)
  }
  return true
}

function addCollectionRecordTagToRow(row, courseName, teacherName) {
  if (!row || row.querySelector?.('.linke-collection-record-tag')) return
  const firstCell = Array.from(row.children || []).find((child) => /^(TD|TH)$/i.test(child.tagName))
  if (!firstCell) return
  const doc = row.ownerDocument || document
  const tag = doc.createElement('span')
  tag.className = 'linke-collection-record-tag'
  tag.textContent = '已收藏记录'
  tag.title = `已收藏记录：${normalizeText(courseName)} ${normalizeText(teacherName)}`
  firstCell.appendChild(tag)
}

function getTableCellSpan(cell, attrName, propertyName) {
  const rawValue = cell?.getAttribute?.(attrName) || cell?.[propertyName]
  const value = Number.parseInt(rawValue, 10)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function buildTableVisualRows(rows) {
  const rowSpanSlots = []
  return rows.map((row) => {
    const visualCells = []
    let visualColumn = 0
    const cells = Array.from(row.children).filter((child) => /^(TD|TH)$/i.test(child.tagName))
    const occupiedColumns = rowSpanSlots.map((count) => count > 0)
    const nextRowSpanSlots = []

    for (const cell of cells) {
      while (occupiedColumns[visualColumn]) {
        visualCells[visualColumn] = null
        visualColumn += 1
      }

      const colSpan = getTableCellSpan(cell, 'colspan', 'colSpan')
      const rowSpan = getTableCellSpan(cell, 'rowspan', 'rowSpan')
      for (let offset = 0; offset < colSpan; offset += 1) {
        visualCells[visualColumn + offset] = cell
        if (rowSpan > 1) {
          nextRowSpanSlots[visualColumn + offset] = Math.max(nextRowSpanSlots[visualColumn + offset] || 0, rowSpan - 1)
        }
      }
      visualColumn += colSpan
    }

    for (let index = 0; index < rowSpanSlots.length; index += 1) {
      rowSpanSlots[index] = Math.max(0, (rowSpanSlots[index] || 0) - 1)
    }
    for (let index = 0; index < nextRowSpanSlots.length; index += 1) {
      if (nextRowSpanSlots[index] > 0) {
        rowSpanSlots[index] = Math.max(rowSpanSlots[index] || 0, nextRowSpanSlots[index])
      }
    }

    return visualCells
  })
}

function enhanceCourseTables(doc) {
  for (const table of Array.from(doc.querySelectorAll('table'))) {
    const rows = Array.from(table.querySelectorAll('tr'))
    const visualRows = buildTableVisualRows(rows)
    let courseIndexes = []
    let teacherIndexes = []
    let headerRowIndex = -1
    visualRows.some((cells, rowIndex) => {
      courseIndexes = getCourseColumnIndexes(cells)
      if (courseIndexes.length > 0) {
        teacherIndexes = getTeacherColumnIndexes(cells)
        headerRowIndex = rowIndex
        return true
      }
      return false
    })
    if (courseIndexes.length === 0) {
      continue
    }
    visualRows.forEach((cells, rowIndex) => {
      if (rowIndex <= headerRowIndex) return
      const row = rows[rowIndex]
      const teacherName = teacherIndexes
        .map((index) => normalizeText(cells[index]?.textContent || ''))
        .find(Boolean) || ''
      teacherIndexes.forEach((index) => {
        const cell = cells[index]
        if (!cell) return
        const teacherKeyword = normalizeText(cell.textContent)
        enhanceTeacherElement(cell, teacherKeyword, 'table-teacher-column')
      })
      courseIndexes.forEach((index) => {
        const cell = cells[index]
        if (!cell) return
        const courseName = normalizeCourseSearchKeyword(cell.textContent)
        if (teacherName && courseName) {
          markCollectionMatchedElement(row, courseName, teacherName)
        }
        enhanceCourseElement(cell, courseName, 'table-course-column')
      })
    })
  }
}

function enhanceLabeledCourseText(doc) {
  const candidates = Array.from(doc.querySelectorAll('td, th, div, span, p, li')).slice(0, 800)
  for (const element of candidates) {
    if (element.dataset?.linkeCourseSearchEnhanced === '1') continue
    if (isCourseSearchBlockedContainer(element)) continue
    if (/^TH$/i.test(element.tagName)) continue
    if (element.children.length > 0) continue
    const text = normalizeText(element.textContent)
    const match = text.match(COURSE_SEARCH_LABEL_PATTERN)
    if (!match) continue
    const keyword = normalizeCourseSearchKeyword(match[2])
    if (isNegativeCourseSearchHeader(keyword)) continue
    if (!isLikelyCourseNameText(keyword, { tableColumn: true })) continue
    installCourseSearchStyle(doc)
    element.dataset.linkeCourseSearchEnhanced = '1'
    element.textContent = `${match[1]}：`
    element.appendChild(createCourseSearchLink(doc, keyword, 'labeled-course-text'))
  }
}

function enhanceStructuralCourseNames(doc) {
  for (const element of Array.from(doc.querySelectorAll(COURSE_SEARCH_STRUCTURAL_SELECTOR))) {
    enhanceCourseElement(element, element.dataset.courseName || element.dataset.lessonName || element.textContent, 'structural-course-name')
  }
}

function enhanceCourseSearchInDocument(doc = document) {
  if (!doc?.body || isJwOriginalModeEnabled(doc) || isLikelyLoginEntryLocation()) return
  prepareCollectionHighlightsInDocument(doc)
  enhanceStructuralCourseNames(doc)
  enhanceCourseTables(doc)
  enhanceLabeledCourseText(doc)
  applyCollectionHighlightsToStructuralCards(doc)
}

function enhanceCourseSearchAcrossDocuments() {
  const docs = isTopFrame() ? collectAccessibleDocuments() : [document]
  for (const doc of docs) {
    try {
      if (isAllowedDocument(doc)) {
        enhanceCourseSearchInDocument(doc)
      }
    } catch {}
  }
}

function cleanupCourseAugmentationsInDocument(doc = document) {
  if (!doc?.body) {
    return
  }

  for (const link of doc.querySelectorAll('[data-linke-course-search-link="1"]')) {
    link.replaceWith(doc.createTextNode(link.textContent || ''))
  }

  for (const wrapper of doc.querySelectorAll('[data-linke-injected-wrapper="1"]')) {
    wrapper.remove()
  }

  for (const action of doc.querySelectorAll('[data-linke-course-action]')) {
    action.remove()
  }

  for (const node of doc.querySelectorAll('[data-linke-injected="1"]')) {
    delete node.dataset.linkeInjected
  }

  for (const node of doc.querySelectorAll('[data-linke-course-search-enhanced="1"]')) {
    delete node.dataset.linkeCourseSearchEnhanced
  }
}

function cleanupCourseAugmentations() {
  cleanupCourseAugmentationsInDocument(document)
}

function resetCourseAugmentationState() {
  if (jwOriginalMode || isJwOriginalModeEnabled(document)) {
    const docs = isTopFrame() ? collectAccessibleDocuments() : [document]
    for (const doc of docs) {
      try {
        clearCollectionHighlightsInDocument(doc)
      } catch {}
    }
    cleanupCourseAugmentations()
    return
  }
  enhanceCourseSearchAcrossDocuments()
}

let scanTimer
function scheduleScan() {
  window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(resetCourseAugmentationState, 300)
}

if (isAllowedPage()) {
  window.addEventListener('DOMContentLoaded', scheduleScan)
  window.addEventListener('DOMContentLoaded', installLoginCredentialCapture)
  window.addEventListener('DOMContentLoaded', bootCredentialAutoFill)
  window.addEventListener('DOMContentLoaded', bootCaptchaAutoFill)
  window.addEventListener('DOMContentLoaded', bootCustomNavigation)
  window.addEventListener('DOMContentLoaded', runNativeChromeCompaction)
  window.addEventListener('resize', () => scheduleNativeChromeCompaction(80))
  window.addEventListener('load', scheduleScan)
  window.addEventListener('load', () => {
    installLoginCredentialCapture()
    rememberPendingCredentialsAfterLogin()
    bootCredentialAutoFill()
    bootCaptchaAutoFill()
    bootCustomNavigation()
    scheduleCredentialFill(200)
    scheduleCaptchaRecognize(400)
    scheduleNavigationScan(600)
    scheduleNativeChromeCompactionBurst()
  })

  ipcRenderer.on('credentials:changed', (_event, payload = {}) => {
    scheduleCredentialFillWithOptions(100, { force: !!payload.force })
  })

  ipcRenderer.on('jw:original-mode', (_event, payload = {}) => {
    setJwOriginalMode(!!payload.enabled)
  })

  ipcRenderer.on('jw:personal-notice-window-open', (_event, payload = {}) => {
    handlePersonalNoticeWindowOpenPayload({
      ...payload,
      source: payload.source || 'main-window-open-handler'
    })
  })

  ipcRenderer.on('linke:collection-highlights', (_event, payload = {}) => {
    const normalized = normalizeCollectionHighlightPayload(payload)
    const nextSignature = getCollectionHighlightSignature(normalized.matchKeys)
    if (nextSignature === linkeCollectionHighlightSignature) {
      return
    }
    const shouldClearExistingHighlights = nextSignature !== linkeCollectionHighlightSignature
    linkeCollectionHighlightItems = normalized.items
    linkeCollectionHighlightMatchKeys = normalized.matchKeys
    linkeCollectionHighlightSignature = nextSignature
    if (shouldClearExistingHighlights) {
      const docs = isTopFrame() ? collectAccessibleDocuments() : [document]
      for (const doc of docs) {
        try {
          clearCollectionHighlightsInDocument(doc)
        } catch {}
      }
    }
    scheduleScan()
  })

  if (isTopFrame()) {
    ipcRenderer.on('jw:navigation:open', (_event, payload = {}) => {
      clickNativeNavigationItem(payload.id, false).then((clicked) => {
        if (!clicked) {
          return clickNativeNavigationItemByHint(payload)
        }
        return true
      })
    })
  }

  bootCredentialAutoFill()
  bootCaptchaAutoFill()
  bootCustomNavigation()
  installLoginCredentialCapture()
  rememberPendingCredentialsAfterLogin()

  const captchaObserver = new MutationObserver(() => scheduleCaptchaRecognize(700))
  captchaObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  })

  const courseSearchObserver = new MutationObserver(() => scheduleScan())
  courseSearchObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  const personalCenterObserver = new MutationObserver((records = []) => {
    if (!jwOriginalMode && PERSONAL_CENTER_FRAME_PATTERN.test(window.location.pathname)) {
      const onlyGeneratedDashboardChanged = records.length > 0 && records.every((record) => {
        const target = record.target?.nodeType === 1 ? record.target : record.target?.parentElement
        return !!target?.closest?.('#linke-personal-center-dashboard, #linke-personal-notice-modal, #linke-personal-notice-native-modal')
      })
      if (onlyGeneratedDashboardChanged) {
        return
      }
      schedulePersonalCenterCustomizedTakeover(220)
    }
  })
  personalCenterObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  })

  if (isTopFrame()) {
    const navigationObserver = new MutationObserver(() => {
      scheduleNativeChromeCompaction(120)
      scheduleNavigationScan(900)
    })
    navigationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'src']
    })
  }
}
