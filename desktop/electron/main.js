import { app, BaseWindow, Menu, WebContentsView, ipcMain, screen, session, shell } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const desktopRoot = path.resolve(__dirname, '..')
const appIconPath = path.join(desktopRoot, 'public', 'app-icon.png')

const APP_SIDEBAR_EXPANDED_WIDTH = 0
const APP_SIDEBAR_COLLAPSED_WIDTH = 0
const APP_TITLEBAR_HEIGHT = 44
const APP_JW_NAVIGATION_WIDTH = 260
const APP_JW_AGENT_PANEL_WIDTH = 430
const APP_JW_PAGE_HEADER_HEIGHT = 44
const DEFAULT_WINDOW_WIDTH = 1280
const DEFAULT_WINDOW_HEIGHT = 840
const DEFAULT_JW_URL = 'http://jw.sdufe.edu.cn/'
const DEFAULT_TAB_TITLES_BY_URL = new Map([
  [DEFAULT_JW_URL, '登录']
])
const JW_BASE_URL = 'http://jw.sdufe.edu.cn'
const JW_EVALUATION_CACHE_TTL = 5 * 60 * 1000
const JW_EVALUATION_SNAPSHOT_VERSION = 1
const JW_EVALUATION_SNAPSHOT_MAX_COURSES = 500
const JW_REQUEST_TIMEOUT_MS = 15_000
const APP_API_REQUEST_TIMEOUT_MS = 15_000
const APP_API_BASE_URL = 'https://api.linketeam.com/Api/public/index.php'
const APP_API_SIGN_KEY = 'Linke'
const LINKE_COMMENT_PAGE_SIZE = 50
const SETTINGS_FILE_NAME = 'desktop-settings.json'
const LOCAL_SECRET_FILE_NAME = 'desktop-secret.key'
const NAVIGATION_CATALOG_STRATEGY = 'native-left-source-v8-data-code-tree'
const ALLOWED_JW_HOSTS = new Set([
  'jw.sdufe.edu.cn'
])
const WORKSPACE_FEATURES = new Set(['browser'])
const WEB_WORKSPACE_FEATURES = new Set(['browser'])
const NAVIGATION_GROUPS = [
  { key: 'desktop', title: '我的桌面', pattern: /我的桌面|首页|主页|桌面|通知|公告|消息|日历/ },
  { key: 'studentRecord', title: '学籍成绩', pattern: /学籍|成绩|绩点|个人信息|学生信息|注册|照片|档案|学历|学位/ },
  { key: 'training', title: '培养管理', pattern: /培养|方案|课表|课程表|课表查询|教学安排|教学计划|教学任务|上课|课程|选课|退课|补选|教材/ },
  { key: 'examRegistration', title: '考试报名', pattern: /考试|报名|考场|准考证|缓考|补考|重修|等级考试|四六级/ },
  { key: 'practice', title: '实践环节', pattern: /实践|实习|实验|创新|创业|毕业|论文|设计|社会实践/ },
  { key: 'evaluation', title: '教学评价', pattern: /评价|评教|教学评价|调查|问卷|反馈/ },
  { key: 'exchangeApplication', title: '交流申请', pattern: /交流|交换|访学|申请|审批|证明|下载|打印|缴费|预约/ }
]

app.setName('林课桌面端')

let mainWindow
let appView
let jwView
let appSidebarWidth = APP_SIDEBAR_EXPANDED_WIDTH
let activeWorkspaceFeature = 'browser'
let jwNavigationPanelCollapsed = false
let jwAgentPanelOpen = false
let activeBrowserTabId = ''
let browserTabSequence = 0
let browserTabs = []
let webViewByTabId = new Map()
let lastActiveBrowserTabByFeature = new Map()
let pendingWebNavigation = null
let windowStateSaveTimer
let jwOriginalMode = false
let jwEvaluationCoursesCache = null
let jwEvaluationCoursesLoadPromise = null
let jwMyCoursesCache = null
let recentJwPersonalNoticeWindowIntent = null
let linkeCollectionHighlightPayload = { items: [], matchKeys: [], courseIds: [], count: 0, updatedAt: 0 }
let linkeCollectionHighlightRefreshPromise = null
const LINKE_COLLECTION_HIGHLIGHT_TTL = 5 * 60 * 1000
const JW_HOME_TITLE = '教务主页'
const LEGACY_PERSONAL_CENTER_TITLE = '个人中心'
const DEFAULT_JW_PAGE_CONTEXT = {
  title: JW_HOME_TITLE,
  groupTitle: '',
  parentTitle: '',
  breadcrumbTitles: [JW_HOME_TITLE]
}
let activeJwPageContext = {
  ...DEFAULT_JW_PAGE_CONTEXT
}

function isDev() {
  return !app.isPackaged && !process.argv.includes('--load-dist')
}

function isDebugEnabled() {
  return process.env.LINKE_DESKTOP_DEBUG === '1' || process.argv.includes('--debug')
}

function getAppUrl() {
  if (isDev()) {
    return 'http://127.0.0.1:5173'
  }

  return pathToFileURL(path.join(desktopRoot, 'dist/index.html')).toString()
}

function normalizeHttpUrl(rawUrl, fallbackUrl, allowedHosts) {
  const value = String(rawUrl || '').trim()
  if (!value) {
    return fallbackUrl
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)
    ? value
    : `http://${value}`
  const parsed = new URL(withProtocol)

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.')
  }

  if (allowedHosts && !allowedHosts.has(parsed.hostname)) {
    throw new Error(`Host is not allowed: ${parsed.hostname}`)
  }

  return parsed.toString()
}

function normalizeJwUrl(rawUrl) {
  return normalizeHttpUrl(rawUrl, DEFAULT_JW_URL, ALLOWED_JW_HOSTS)
}

function normalizeWorkspaceFeature(value) {
  const feature = String(value || '')
  return WORKSPACE_FEATURES.has(feature) ? feature : 'browser'
}

function getWebViewByWebContentsId(webContentsId) {
  for (const view of webViewByTabId.values()) {
    if (view && !view.webContents.isDestroyed() && view.webContents.id === webContentsId) {
      return view
    }
  }
  return null
}

function assertJwSender(event) {
  const view = getWebViewByWebContentsId(event.sender.id)
  if (!view) {
    throw new Error('Invalid sender.')
  }
  return view
}

function assertAppSender(event) {
  if (!appView || event.sender.id !== appView.webContents.id) {
    throw new Error('Invalid sender.')
  }
}

function assertAppOrManagedWebViewSender(event) {
  if (appView && event.sender.id === appView.webContents.id) {
    return
  }
  assertJwSender(event)
}

function sendToJw(channel, payload) {
  if (jwView && !jwView.webContents.isDestroyed()) {
    jwView.webContents.send(channel, payload)
  }
}

function sendLinkeCollectionHighlightsToView(view = jwView) {
  if (view && !view.webContents.isDestroyed()) {
    view.webContents.send('linke:collection-highlights', linkeCollectionHighlightPayload)
  }
}

function scheduleLinkeCollectionHighlightRefresh({ force = false } = {}) {
  refreshLinkeCollectionHighlights({ force }).catch(() => {})
}

function sendJwOriginalModeToView(view = jwView) {
  if (view && !view.webContents.isDestroyed()) {
    view.webContents.send('jw:original-mode', { enabled: jwOriginalMode })
  }
}

function rememberJwPersonalNoticeWindowIntent(payload = {}) {
  recentJwPersonalNoticeWindowIntent = {
    title: String(payload.title || '通知详情'),
    url: String(payload.url || ''),
    until: Date.now() + 4000
  }
}

function consumeJwPersonalNoticeWindowIntent(url) {
  const intent = recentJwPersonalNoticeWindowIntent
  if (!intent || Date.now() > Number(intent.until || 0)) {
    return null
  }
  recentJwPersonalNoticeWindowIntent = null
  return {
    title: intent.title || '通知详情',
    url: String(url || intent.url || '')
  }
}

function applyJwOriginalMode(enabled) {
  jwOriginalMode = !!enabled
  setActiveJwPageContext()
  sendJwOriginalModeToView()
  layoutViews()
  publishJwState()
  return getJwState()
}

function clearWebNavigationHistory(view = jwView) {
  try {
    if (view && !view.webContents.isDestroyed()) {
      view.webContents.navigationHistory.clear()
    }
  } catch {}
}

function markPendingWebNavigation(tab, targetUrl = tab?.url) {
  pendingWebNavigation = {
    tabId: tab.id,
    feature: tab.feature,
    url: String(targetUrl || tab.url || '')
  }
  tab.loading = true
}

function clearPendingWebNavigation(tabId) {
  if (!tabId || pendingWebNavigation?.tabId === tabId) {
    pendingWebNavigation = null
  }
}

function getHiddenWebViewBounds(bounds) {
  return {
    x: bounds.width + 16,
    y: bounds.height + 16,
    width: 1,
    height: 1
  }
}

function shouldHideWebViewForPendingNavigation() {
  if (!pendingWebNavigation || pendingWebNavigation.tabId !== activeBrowserTabId) {
    return false
  }
  if (!jwView || jwView.webContents.isDestroyed()) {
    return false
  }

  const activeTab = getActiveBrowserTab()
  if (isBlankBrowserTab(activeTab)) {
    return true
  }

  const currentUrl = jwView.webContents.getURL()
  return !currentUrl || currentUrl === 'about:blank'
}

function shouldHideWebViewForLoadError() {
  const activeTab = getActiveBrowserTab()
  return !!activeTab?.loadError
}

function areSameWebUrl(first, second) {
  try {
    return new URL(String(first || '')).toString() === new URL(String(second || '')).toString()
  } catch {
    return String(first || '') === String(second || '')
  }
}

function getStableTabTitleForUrl(url, fallbackFeature) {
  try {
    const normalizedUrl = new URL(String(url || '')).toString()
    for (const [knownUrl, title] of DEFAULT_TAB_TITLES_BY_URL.entries()) {
      if (new URL(knownUrl).toString() === normalizedUrl) {
        return title
      }
    }
  } catch {}

  return getFeatureDefaultTitle(fallbackFeature)
}

function createManagedWebView() {
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'jw-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      // The jw content page lives in Frame0; preload must run there before first paint to avoid title-bar flash.
      nodeIntegrationInSubFrames: true,
      partition: 'persist:linke-jw'
    }
  })

  view.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url).catch(() => {})
      }
    }
  })

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      const noticeIntent = consumeJwPersonalNoticeWindowIntent(url)
      if (noticeIntent) {
        view.webContents.send('jw:personal-notice-window-open', {
          ...noticeIntent,
          source: 'setWindowOpenHandler'
        })
        return { action: 'deny' }
      }
      openBrowserTab(url, {
        feature: getFeatureForUrl(url)
      }).catch(() => {})
    } else if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url).catch(() => {})
    }
    return { action: 'deny' }
  })

  for (const eventName of ['did-start-loading', 'did-stop-loading', 'did-navigate', 'did-navigate-in-page', 'page-title-updated']) {
    view.webContents.on(eventName, () => publishJwStateAndLayout(view))
  }
  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame === false || errorCode === -3) {
      return
    }

    const tab = getBrowserTabForWebView(view)
    if (!tab) {
      return
    }

    clearPendingWebNavigation(tab.id)
    tab.loading = false
    tab.loadError = {
      code: errorCode,
      description: errorDescription || 'ERR_FAILED',
      url: String(validatedURL || tab.url || '')
    }
    if (validatedURL) {
      tab.url = String(validatedURL)
      tab.feature = getFeatureForUrl(tab.url)
      tab.isBlank = false
    }
    tab.title = errorDescription ? `无法打开：${errorDescription}` : '无法打开该网页'
    layoutViews()
    sendToApp('browser:state', getJwState())
  })
    view.webContents.on('dom-ready', () => {
      sendJwOriginalModeToView(view)
      sendLinkeCollectionHighlightsToView(view)
      scheduleLinkeCollectionHighlightRefresh()
    })
    view.webContents.on('did-finish-load', () => {
      sendJwOriginalModeToView(view)
      sendLinkeCollectionHighlightsToView(view)
      scheduleLinkeCollectionHighlightRefresh()
    })
    view.webContents.on('did-frame-finish-load', () => {
      scheduleLinkeCollectionHighlightRefresh()
    })
  view.webContents.once('destroyed', () => handleManagedWebViewDestroyed(view))

  return view
}

function ensureWebViewForTab(tab) {
  if (!tab || !mainWindow) {
    return null
  }

  const existingView = webViewByTabId.get(tab.id)
  if (existingView && !existingView.webContents.isDestroyed()) {
    tab.view = existingView
    return existingView
  }

  const view = createManagedWebView()
  tab.view = view
  webViewByTabId.set(tab.id, view)
  mainWindow.contentView.addChildView(view)
  return view
}

function getBrowserTabForWebView(view) {
  if (!view) {
    return null
  }
  return browserTabs.find((tab) => webViewByTabId.get(tab.id) === view) || null
}

function getNextTabAfterClosed(closedTab, sameFeatureIndex) {
  const sameFeatureTabs = browserTabs.filter((tab) => tab.feature === closedTab.feature)
  if (sameFeatureTabs.length > 0) {
    return sameFeatureTabs[Math.min(Math.max(0, sameFeatureIndex), sameFeatureTabs.length - 1)]
  }
  return browserTabs[0] || null
}

function handleManagedWebViewDestroyed(view) {
  const tab = getBrowserTabForWebView(view)
  if (!tab) {
    return
  }

  const tabIndex = browserTabs.findIndex((item) => item.id === tab.id)
  const sameFeatureIndex = browserTabs
    .filter((item) => item.feature === tab.feature)
    .findIndex((item) => item.id === tab.id)
  const wasActive = activeBrowserTabId === tab.id || jwView === view

  clearPendingWebNavigation(tab.id)
  webViewByTabId.delete(tab.id)
  tab.view = null
  if (tabIndex >= 0) {
    browserTabs.splice(tabIndex, 1)
  }
  if (lastActiveBrowserTabByFeature.get(tab.feature) === tab.id) {
    lastActiveBrowserTabByFeature.delete(tab.feature)
  }
  try {
    mainWindow?.contentView.removeChildView(view)
  } catch {}

  if (!wasActive) {
    layoutViews()
    publishJwState()
    return
  }

  jwView = null
  if (browserTabs.length <= 0) {
    initializeBrowserTabs()
  }
  const nextTab = getNextTabAfterClosed(tab, sameFeatureIndex)
  if (nextTab) {
    activateBrowserTab(nextTab.id).catch(() => {
      layoutViews()
      publishJwState()
    })
    return
  }

  layoutViews()
  publishJwState()
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE_NAME)
}

function getLocalSecretFilePath() {
  return path.join(app.getPath('userData'), LOCAL_SECRET_FILE_NAME)
}

function readOrCreateLocalSecretKey() {
  const filePath = getLocalSecretFilePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  if (fs.existsSync(filePath)) {
    const stored = Buffer.from(fs.readFileSync(filePath, 'utf8').trim(), 'base64')
    if (stored.length === 32) {
      return stored
    }
  }

  const key = randomBytes(32)
  fs.writeFileSync(filePath, key.toString('base64'), { encoding: 'utf8', mode: 0o600 })
  try {
    fs.chmodSync(filePath, 0o600)
  } catch {}
  return key
}

function readSettingsFile() {
  try {
    const filePath = getSettingsFilePath()
    if (!fs.existsSync(filePath)) {
      return {}
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

function writeSettingsFile(settings) {
  const filePath = getSettingsFilePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8')
}

function sanitizeWindowBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') {
    return null
  }

  const x = Number.parseInt(bounds.x, 10)
  const y = Number.parseInt(bounds.y, 10)
  const width = Number.parseInt(bounds.width, 10)
  const height = Number.parseInt(bounds.height, 10)

  if (![x, y, width, height].every(Number.isFinite)) {
    return null
  }

  return {
    x,
    y,
    width: Math.max(1120, width),
    height: Math.max(680, height)
  }
}

function rectanglesIntersect(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
}

function hasVisibleWindowArea(bounds) {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea || display.bounds
    return rectanglesIntersect(bounds, area)
  })
}

function getInitialWindowBounds() {
  const settings = readSettingsFile()
  const savedBounds = sanitizeWindowBounds(settings.windowState?.bounds)

  if (savedBounds && hasVisibleWindowArea(savedBounds)) {
    return savedBounds
  }

  return {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT
  }
}

function saveWindowState() {
  if (!mainWindow) {
    return
  }

  try {
    const bounds = sanitizeWindowBounds(mainWindow.getBounds())
    if (!bounds) {
      return
    }

    const display = screen.getDisplayMatching(bounds)
    const settings = readSettingsFile()
    settings.windowState = {
      bounds,
      displayId: display?.id ?? null,
      updatedAt: new Date().toISOString()
    }
    writeSettingsFile(settings)
  } catch {}
}

function scheduleWindowStateSave() {
  clearTimeout(windowStateSaveTimer)
  windowStateSaveTimer = setTimeout(saveWindowState, 400)
}

function encryptPassword(password) {
  const value = String(password || '')
  if (!value) {
    return { scheme: 'empty', value: '' }
  }
  try {
    const key = readOrCreateLocalSecretKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
      scheme: 'local-aes-256-gcm',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      value: ciphertext.toString('base64')
    }
  } catch (error) {
    throw new Error('本地加密存储写入失败，无法保存教务密码。')
  }
}

function decryptPassword(stored) {
  if (!stored) {
    return ''
  }
  if (typeof stored === 'string') {
    return stored
  }
  try {
    if (stored.scheme === 'local-aes-256-gcm' && stored.value && stored.iv && stored.tag) {
      const key = readOrCreateLocalSecretKey()
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(String(stored.iv), 'base64')
      )
      decipher.setAuthTag(Buffer.from(String(stored.tag), 'base64'))
      return Buffer.concat([
        decipher.update(Buffer.from(String(stored.value), 'base64')),
        decipher.final()
      ]).toString('utf8')
    }
    if (stored.scheme === 'safeStorage') {
      return ''
    }
    if (stored.scheme === 'plain') {
      return String(stored.value || '')
    }
  } catch {
    return ''
  }
  return ''
}

function readCredentials() {
  const settings = readSettingsFile()
  const credentials = settings.credentials || {}
  const account = String(credentials.account || '')
  const password = decryptPassword(credentials.password)
  const requiresResave = credentials.password?.scheme === 'safeStorage'
  return {
    account,
    password,
    hasCredentials: !!(account || password),
    storageScheme: 'local-aes-256-gcm',
    requiresResave,
    updatedAt: credentials.updatedAt || ''
  }
}

function saveCredentials(payload = {}) {
  const settings = readSettingsFile()
  const account = String(payload.account || '').trim()
  const password = String(payload.password || '')
  settings.credentials = {
    account,
    password: encryptPassword(password),
    updatedAt: new Date().toISOString()
  }
  writeSettingsFile(settings)
  return readCredentials()
}

function clearCredentials() {
  const settings = readSettingsFile()
  delete settings.credentials
  writeSettingsFile(settings)
  return readCredentials()
}

function cloneJwEvaluationCourses(courses) {
  try {
    return JSON.parse(JSON.stringify(
      Array.isArray(courses) ? courses.slice(0, JW_EVALUATION_SNAPSHOT_MAX_COURSES) : []
    ))
  } catch {
    return []
  }
}

function buildJwEvaluationPayload({
  message = '',
  termList = [],
  courses = [],
  evaluationStatusKnown = false,
  userBound = false,
  updatedAt = new Date().toISOString()
} = {}) {
  const rows = Array.isArray(courses) ? courses : []
  const evaluated = rows.filter((course) => course?.isEvaluated === true)
  const pending = evaluationStatusKnown ? rows.filter((course) => course?.isEvaluated !== true) : []
  return {
    status: 'ready',
    message: String(message || ''),
    termList: Array.from(new Set((Array.isArray(termList) ? termList : [])
      .map((term) => String(term || '').trim())
      .filter(Boolean))).sort().reverse(),
    courses: rows,
    pending,
    evaluated,
    totalCount: rows.length,
    pendingCount: pending.length,
    evaluatedCount: evaluated.length,
    evaluationStatusKnown: evaluationStatusKnown === true,
    userBound: userBound === true,
    updatedAt: String(updatedAt || new Date().toISOString())
  }
}

function readJwEvaluationSnapshot() {
  const settings = readSettingsFile()
  const snapshot = settings.jwEvaluationSnapshot
  const account = readCredentials().account
  if (
    !snapshot ||
    snapshot.version !== JW_EVALUATION_SNAPSHOT_VERSION ||
    !account ||
    String(snapshot.account || '') !== account
  ) {
    return null
  }

  const payload = snapshot.payload || {}
  return buildJwEvaluationPayload({
    ...payload,
    courses: cloneJwEvaluationCourses(payload.courses),
    updatedAt: snapshot.updatedAt || payload.updatedAt
  })
}

function saveJwEvaluationSnapshot(payload) {
  const account = readCredentials().account
  if (!account || !payload) {
    return
  }

  const settings = readSettingsFile()
  const snapshotPayload = buildJwEvaluationPayload({
    ...payload,
    courses: cloneJwEvaluationCourses(payload.courses)
  })
  settings.jwEvaluationSnapshot = {
    version: JW_EVALUATION_SNAPSHOT_VERSION,
    account,
    updatedAt: snapshotPayload.updatedAt,
    payload: snapshotPayload
  }
  writeSettingsFile(settings)
}

function getCachedJwEvaluationPayload() {
  if (jwEvaluationCoursesCache?.payload) {
    return jwEvaluationCoursesCache.payload
  }

  const snapshot = readJwEvaluationSnapshot()
  if (snapshot) {
    jwEvaluationCoursesCache = {
      cachedAt: Date.now(),
      payload: snapshot
    }
  }
  return snapshot
}

function cacheJwEvaluationPayload(payload, { persist = false } = {}) {
  jwEvaluationCoursesCache = {
    cachedAt: Date.now(),
    payload
  }
  if (persist) {
    saveJwEvaluationSnapshot(payload)
  }
  return payload
}

function clearJwEvaluationSnapshot() {
  jwEvaluationCoursesCache = null
  const settings = readSettingsFile()
  if (settings.jwEvaluationSnapshot) {
    delete settings.jwEvaluationSnapshot
    writeSettingsFile(settings)
  }
}

function normalizeNavigationTitle(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[>»›]/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim()
}

function getNavigationGroupForTitle(title) {
  for (const group of NAVIGATION_GROUPS) {
    if (group.pattern.test(title)) {
      return group
    }
  }
  return NAVIGATION_GROUPS.find((group) => group.key === 'training')
}

function markNavigationBranchItemsDisabled(items = []) {
  return items.map((item, index) => {
    const next = items[index + 1]
    const hasChild = next && Number(next.level || 0) > Number(item.level || 0)
    return hasChild ? { ...item, disabled: true } : item
  })
}

function sanitizeNavigationItems(items = [], groupIndex = 0) {
  const seenTitles = new Set()
  const sanitized = Array.isArray(items)
    ? items.slice(0, 120).map((item, itemIndex) => ({
        id: String(item.id || `item-${groupIndex}-${itemIndex}`).slice(0, 120),
        title: String(item.title || '').slice(0, 48),
        level: Math.max(0, Math.min(3, Number.parseInt(item.level, 10) || 0)),
        disabled: item.disabled === true
      })).filter((item) => {
        const titleKey = normalizeNavigationTitle(item.title)
        if (!titleKey || seenTitles.has(titleKey)) {
          return false
        }
        seenTitles.add(titleKey)
        return true
      })
    : []
  return markNavigationBranchItemsDisabled(sanitized)
}

function sanitizeNativeNavigationGroups(groups = []) {
  const seenTitles = new Set()
  return groups.slice(0, 12).map((group, groupIndex) => {
    const items = sanitizeNavigationItems(group.items, groupIndex).filter((item) => {
      const titleKey = normalizeNavigationTitle(item.title)
      if (!titleKey || seenTitles.has(titleKey)) {
        return false
      }
      seenTitles.add(titleKey)
      return true
    })

    return {
      key: String(group.key || `native-${groupIndex}`).slice(0, 80),
      title: String(group.title || '').slice(0, 32),
      items
    }
  }).filter((group) => group.title && group.items.length > 0)
}

function sanitizeLegacyNavigationGroups(groups = []) {
  const grouped = new Map(NAVIGATION_GROUPS.map((group) => [group.key, {
    key: group.key,
    title: group.title,
    items: [],
    seenTitles: new Set()
  }]))

  groups.slice(0, 24).forEach((group, groupIndex) => {
    if (!Array.isArray(group.items)) {
      return
    }

    group.items.slice(0, 120).forEach((item, itemIndex) => {
      const title = String(item.title || '').slice(0, 48)
      const titleKey = normalizeNavigationTitle(title)
      if (!titleKey) {
        return
      }

      const targetGroup = getNavigationGroupForTitle(title)
      const bucket = grouped.get(targetGroup.key)
      if (!bucket || bucket.seenTitles.has(titleKey)) {
        return
      }

      bucket.seenTitles.add(titleKey)
      bucket.items.push({
        id: String(item.id || `item-${groupIndex}-${itemIndex}`).slice(0, 120),
        title,
        level: Math.max(0, Math.min(3, Number.parseInt(item.level, 10) || 0)),
        disabled: item.disabled === true
      })
    })
  })

  return Array.from(grouped.values())
    .map(({ seenTitles, ...group }) => group)
    .filter((group) => group.items.length > 0)
}

function sanitizeNavigationGroups(groups = []) {
  if (!Array.isArray(groups)) {
    return []
  }

  if (groups.some((group) => String(group.key || '').startsWith('native-'))) {
    return sanitizeNativeNavigationGroups(groups)
  }

  return sanitizeLegacyNavigationGroups(groups)
}

function readJwNavigationCache() {
  const settings = readSettingsFile()
  const cache = settings.jwNavigation || {}
  return {
    version: 1,
    strategy: cache.strategy || '',
    sourceMode: cache.sourceMode || '',
    updatedAt: cache.updatedAt || '',
    sourceHost: cache.sourceHost || 'jw.sdufe.edu.cn',
    groups: sanitizeNavigationGroups(cache.groups)
  }
}

function hasTrustedJwNavigationCatalog(catalog) {
  return catalog?.strategy === NAVIGATION_CATALOG_STRATEGY &&
    catalog.sourceMode === 'structured' &&
    Array.isArray(catalog.groups) &&
    catalog.groups.some((group) => Array.isArray(group.items) && group.items.length > 0)
}

function readTrustedJwNavigationCache() {
  const cache = readJwNavigationCache()
  return hasTrustedJwNavigationCatalog(cache)
    ? cache
    : { ...cache, groups: [] }
}

function saveJwNavigationCache(payload = {}) {
  const settings = readSettingsFile()
  settings.jwNavigation = {
    version: 1,
    strategy: payload.strategy === NAVIGATION_CATALOG_STRATEGY ? payload.strategy : '',
    sourceMode: payload.sourceMode === 'structured' ? 'structured' : '',
    updatedAt: new Date().toISOString(),
    sourceHost: 'jw.sdufe.edu.cn',
    groups: sanitizeNavigationGroups(payload.groups)
  }
  writeSettingsFile(settings)
  return readJwNavigationCache()
}

function sanitizeNavigationFavoriteItems(items = []) {
  const seenIds = new Set()
  return Array.isArray(items)
    ? items.slice(0, 240).map((item) => ({
        id: String(item.id || '').slice(0, 120),
        title: String(item.title || '').slice(0, 48),
        groupTitle: String(item.groupTitle || '').slice(0, 32),
        updatedAt: String(item.updatedAt || '').slice(0, 40)
      })).filter((item) => {
        if (!item.id || seenIds.has(item.id)) {
          return false
        }
        seenIds.add(item.id)
        return true
      }).slice(0, 200)
    : []
}

function readJwNavigationFavorites() {
  const settings = readSettingsFile()
  const favorites = settings.jwNavigationFavorites || {}
  return {
    version: 1,
    updatedAt: String(favorites.updatedAt || ''),
    items: sanitizeNavigationFavoriteItems(favorites.items)
  }
}

function toggleJwNavigationFavorite(payload = {}) {
  const id = String(payload.id || '').slice(0, 120)
  if (!id) {
    return readJwNavigationFavorites()
  }

  const settings = readSettingsFile()
  const current = sanitizeNavigationFavoriteItems(settings.jwNavigationFavorites?.items)
  const existingIndex = current.findIndex((item) => item.id === id)
  if (existingIndex >= 0) {
    current.splice(existingIndex, 1)
  } else {
    current.unshift({
      id,
      title: String(payload.title || '').slice(0, 48),
      groupTitle: String(payload.groupTitle || '').slice(0, 32),
      updatedAt: new Date().toISOString()
    })
  }

  settings.jwNavigationFavorites = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: sanitizeNavigationFavoriteItems(current)
  }
  writeSettingsFile(settings)
  return readJwNavigationFavorites()
}

function saveJwNavigationDebug(payload = {}) {
  const settings = readSettingsFile()
  settings.jwNavigationDebug = {
    ...payload,
    at: new Date().toISOString()
  }
  writeSettingsFile(settings)
}

function generateAppApiSign(service) {
  const signTime = Math.floor(Date.now() / 1000)
  const signMain = createHash('md5').update(`${APP_API_SIGN_KEY}${service}${signTime}`).digest('hex')
  return { signMain, signTime }
}

function toFormUrlEncoded(data = {}) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] == null ? '' : String(data[key]))}`)
    .join('&')
}

async function fetchWithTimeout(url, options, { timeoutMs, serviceName }) {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } catch (error) {
    if (timedOut || error?.name === 'AbortError') {
      throw new Error(`${serviceName}响应超时，请稍后重试`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readWithTimeout(read, { timeoutMs, serviceName }) {
  let timeoutId = 0
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${serviceName}响应超时，请稍后重试`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([read(), timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

async function requestAppApiJson(service, data = {}) {
  const { signMain, signTime } = generateAppApiSign(service)
  const url = new URL(APP_API_BASE_URL)
  url.searchParams.set('service', service)
  url.searchParams.set('signMain', signMain)
  url.searchParams.set('signTime', String(signTime))

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(data)
  }, {
    timeoutMs: APP_API_REQUEST_TIMEOUT_MS,
    serviceName: '林课服务'
  })

  const rawBody = await readWithTimeout(() => response.text(), {
    timeoutMs: APP_API_REQUEST_TIMEOUT_MS,
    serviceName: '林课服务'
  })
  if (!response.ok) {
    throw new Error(`API HTTP ${response.status}`)
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch (error) {
    throw new Error('API returned invalid JSON.')
  }

  if (body && body.ret == 200) {
    return body.data
  }

  throw new Error(body?.data?.error || body?.msg || 'API request failed.')
}

async function requestAppApiForm(service, data = {}) {
  const { signMain, signTime } = generateAppApiSign(service)
  const url = new URL(APP_API_BASE_URL)
  url.searchParams.set('service', service)
  url.searchParams.set('signMain', signMain)
  url.searchParams.set('signTime', String(signTime))

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: toFormUrlEncoded(data)
  }, {
    timeoutMs: APP_API_REQUEST_TIMEOUT_MS,
    serviceName: '林课服务'
  })

  const rawBody = await readWithTimeout(() => response.text(), {
    timeoutMs: APP_API_REQUEST_TIMEOUT_MS,
    serviceName: '林课服务'
  })
  if (!response.ok) {
    throw new Error(`API HTTP ${response.status}`)
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw new Error('API returned invalid JSON.')
  }

  if (body && body.ret == 200) {
    return body.data
  }

  throw new Error(body?.data?.error || body?.msg || 'API request failed.')
}

function md5Hex(value) {
  return createHash('md5').update(String(value || '')).digest('hex').toLowerCase()
}

function stripJwHtmlWhitespace(html) {
  return String(html || '').replace(/[\s　\t\n\r]/g, '')
}

async function readResponseText(response) {
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = String(response.headers.get('content-type') || '')
  const headerText = buffer.subarray(0, 2048).toString('latin1')
  if (/gb2312|gbk|gb18030/i.test(`${contentType}\n${headerText}`)) {
    try {
      return new TextDecoder('gb18030').decode(buffer)
    } catch {
      return buffer.toString('utf8')
    }
  }
  return buffer.toString('utf8')
}

function isJwLoginPageHtml(html) {
  const text = String(html || '')
  return text.includes('RANDOMCODE') && (text.includes('userAccount') || text.includes('userPassword'))
}

async function getJwCookieHeader() {
  const jwSession = session.fromPartition('persist:linke-jw')
  const cookies = await jwSession.cookies.get({ url: JW_BASE_URL })
  const pairs = cookies
    .filter((cookie) => cookie?.name && cookie?.value)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
  const header = pairs.join('; ')
  const jsessionCookie = cookies.find((cookie) => String(cookie?.name || '').toUpperCase() === 'JSESSIONID')
  return {
    header,
    jsessionId: jsessionCookie?.value || ''
  }
}

async function requestJwHtml(pathname, body = '') {
  const { header } = await getJwCookieHeader()
  if (!header) {
    throw new Error('请先登录教务系统')
  }

  const response = await fetchWithTimeout(`${JW_BASE_URL}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: header,
      Referer: `${JW_BASE_URL}/jsxsd/framework/xsMain_new.jsp`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body || undefined,
    redirect: 'follow'
  }, {
    timeoutMs: JW_REQUEST_TIMEOUT_MS,
    serviceName: '教务系统'
  })

  const html = await readWithTimeout(() => readResponseText(response), {
    timeoutMs: JW_REQUEST_TIMEOUT_MS,
    serviceName: '教务系统'
  })
  if (!response.ok) {
    throw new Error(`教务系统返回 HTTP ${response.status}`)
  }
  if (isJwLoginPageHtml(html)) {
    throw new Error('教务登录状态已失效，请重新登录')
  }
  return html
}

async function mapWithConcurrency(items, limit, mapper) {
  const list = Array.isArray(items) ? items : []
  const concurrency = Math.max(1, Math.min(Number.parseInt(limit, 10) || 1, list.length || 1))
  const results = new Array(list.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < list.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(list[index], index)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

function parseJwScoreTerms(html) {
  return parseJwScoreData(html, { courseType: '' }).termList
}

function normalizeJwScoreText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
}

function parseJwTableRows(html) {
  const rows = []
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  for (const rowMatch of String(html || '').matchAll(rowRegex)) {
    const cells = []
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
    for (const cellMatch of String(rowMatch[1] || '').matchAll(cellRegex)) {
      cells.push(normalizeJwScoreText(cellMatch[1]))
    }
    if (cells.some(Boolean)) {
      rows.push(cells)
    }
  }
  return rows
}

function getJwScoreTableColumnMap(cells) {
  const normalizedCells = cells.map((cell) => String(cell || '').replace(/\s/g, ''))
  const findColumn = (patterns) => normalizedCells.findIndex((cell) => (
    patterns.some((pattern) => pattern.test(cell))
  ))
  const termIndex = findColumn([/学年学期/, /开课学期/, /^学期$/, /学期/])
  const courseCodeIndex = findColumn([/课程(?:编号|代码|号)/, /课程ID/i])
  const scoreIndex = normalizedCells.findIndex((cell) => (
    /成绩/.test(cell) && !/绩点|成绩性质/.test(cell)
  ))
  const natureIndex = findColumn([/课程(?:性质|属性|类别|类型)/])

  if (termIndex < 0 || courseCodeIndex < 0 || scoreIndex < 0) {
    return null
  }

  return {
    termIndex,
    courseCodeIndex,
    scoreIndex,
    natureIndex
  }
}

function isValidJwScoreText(value) {
  const text = normalizeJwScoreText(value)
  if (!text) return false
  const numericScore = Number(text)
  if (!Number.isNaN(numericScore)) {
    return numericScore >= 0 && numericScore <= 100
  }
  const invalidTexts = new Set([
    '-',
    '--',
    '---',
    '—',
    '暂无',
    '暂未录入',
    '未录入',
    '未公布',
    '无'
  ])
  return !invalidTexts.has(text)
}

function parseJwScoreData(html, { courseType = '' } = {}) {
  const normalized = stripJwHtmlWhitespace(html)
  const termLike = /^\d{4}-\d{4}-\d$/
  const termSet = new Set()
  const scoreKeys = new Set()
  const courseTypeFilter = String(courseType || '').trim()

  const addScoreRow = ({ term, courseCode, scoreText, nature }) => {
    const normalizedTerm = String(term || '').trim()
    const normalizedCourseCode = String(courseCode || '').trim()
    const normalizedNature = String(nature || '').trim()
    if (
      (courseTypeFilter && normalizedNature !== courseTypeFilter) ||
      !termLike.test(normalizedTerm) ||
      !normalizedCourseCode ||
      !isValidJwScoreText(scoreText)
    ) {
      return
    }
    termSet.add(normalizedTerm)
    scoreKeys.add(`${normalizedTerm}\u0000${normalizedCourseCode}`)
  }

  const scoreRegex1 = /<tr><td>.*?<\/td><td>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><!--控制成绩显示--><tdstyle=.*?><ahref=.*?>(.*?)<\/a><\/td><\/td><td>.*?<\/td><!--控制绩点显示--><td>.*?<\/td><td>.*?<\/td><td>(.*?)<\/td><td>.*?<\/td><td>.*?<\/td><\/tr>/g
  const matches1 = Array.from(normalized.matchAll(scoreRegex1))
  matches1.forEach((match) => {
    const col1 = String(match[1] || '').trim()
    const col2 = String(match[2] || '').trim()
    const scoreText = String(match[4] || '').trim()
    const nature = String(match[5] || '').trim()
    if (termLike.test(col1)) {
      addScoreRow({ term: col1, courseCode: col2, scoreText, nature })
    } else if (termLike.test(col2)) {
      addScoreRow({ term: col2, courseCode: col1, scoreText, nature })
    }
  })

  if (scoreKeys.size === 0) {
    const scoreRegex2 = /<tdalign=.*?>(.*?)<\/td><tdalign=.*?>(.*?)<\/td><!--控制成绩显示--><tdstyle=.*?><ahref=.*?>(.*?)<\/a><\/td><\/td><td>.*?<\/td><!--控制绩点显示--><td>.*?<\/td><td>.*?<\/td><td>(.*?)<\/td><td>.*?<\/td><td>.*?<\/td>/g
    const matches2 = Array.from(normalized.matchAll(scoreRegex2))
    matches2.forEach((match) => {
      const courseCode = String(match[1] || '').trim()
      const term = String(match[2] || '').trim()
      const scoreText = String(match[3] || '').trim()
      const nature = String(match[4] || '').trim()
      addScoreRow({ term, courseCode, scoreText, nature })
    })
  }

  if (scoreKeys.size === 0) {
    let columnMap = null
    for (const cells of parseJwTableRows(html)) {
      const nextColumnMap = getJwScoreTableColumnMap(cells)
      if (nextColumnMap) {
        columnMap = nextColumnMap
        continue
      }
      if (!columnMap) {
        continue
      }
      addScoreRow({
        term: cells[columnMap.termIndex],
        courseCode: cells[columnMap.courseCodeIndex],
        scoreText: cells[columnMap.scoreIndex],
        nature: columnMap.natureIndex >= 0 ? cells[columnMap.natureIndex] : ''
      })
    }
  }

  return {
    termList: Array.from(termSet).sort(),
    scoreKeys
  }
}

function parseJwScheduleSelectedTerm(html) {
  const normalized = String(html || '')
  const optionRegex = /<option\s+value=["'](\d{4}-\d{4}-\d)["'][^>]*>(.*?)<\/option>/g
  const matches = Array.from(normalized.matchAll(optionRegex))
  if (matches.length === 0) return ''
  const selected = matches.find((match) => /selected=["']?selected["']?/i.test(match[0]) || /\sselected(?:\s|>|=)/i.test(match[0]))
  return String((selected || matches[0])?.[1] || '').trim()
}

function parseJwTxListCourses(html, term, { courseType = '' } = {}) {
  const normalized = stripJwHtmlWhitespace(html)
  const courseRegex = /<tr><!--<td><\/td>--><td>(.*?)<\/td><td>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td(?:align="center")?>(?:&nbsp;|.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(.*?)<\/td><td(?:align="center")?>(?:&nbsp;|.*?)<\/td><td(?:align="center")?>(?:.*?)<\/td><\/tr>/g
  const matches = Array.from(normalized.matchAll(courseRegex))
  const courses = []
  const courseTypeFilter = String(courseType || '').trim()

  matches.forEach((match) => {
    const courseCode = String(match[1] || '').trim()
    const courseName = String(match[2] || '').trim()
    const credit = String(match[3] || '').trim()
    const courseType = String(match[4] || '').trim()
    const teacherName = String(match[5] || '').trim()
    const courseCategory = String(match[6] || '').replace(/&nbsp;/g, '').trim()
    const status = String(match[7] || '').trim()
    const txTime = String(match[8] || '').trim()
    const txOperator = String(match[9] || '').trim()
    if ((courseTypeFilter && courseType !== courseTypeFilter) || status !== '选课' || !courseName || !teacherName) {
      return
    }
    const courseId = md5Hex(courseName + teacherName)
    courses.push({
      term,
      courseCode,
      courseId,
      courseName,
      teacherName,
      courseType,
      credit,
      courseCategory,
      status,
      txTime,
      txOperator
    })
  })

  return courses
}

function createEmptyJwMyCoursesPayload(message = '暂未从教务系统识别到可查询学期，课程总览暂时为空。') {
  return {
    status: 'ready',
    message,
    termList: [],
    scoreTermList: [],
    currentTerm: '',
    courses: [],
    scored: [],
    unscored: [],
    studying: [],
    totalCount: 0,
    scoredCount: 0,
    unscoredCount: 0,
    studyingCount: 0,
    userBound: false,
    updatedAt: new Date().toISOString()
  }
}

function createEmptyJwEvaluationCoursesPayload(message = '暂未识别到已出成绩课程，评价工作台暂时为空。') {
  return {
    status: 'ready',
    message,
    termList: [],
    courses: [],
    pending: [],
    evaluated: [],
    totalCount: 0,
    pendingCount: 0,
    evaluatedCount: 0,
    evaluationStatusKnown: true,
    userBound: false,
    updatedAt: new Date().toISOString()
  }
}

async function ensureDesktopUserRegistered(cookieHeader) {
  const credentials = readCredentials()
  const userId = String(credentials.account || '').trim()
  const userPassword = String(credentials.password || '')
  if (!userId || !userPassword) {
    return { userId: '', userKey: '', registered: false }
  }

  const userKey = md5Hex(userId + userPassword)
  try {
    const result = await requestAppApiForm('App.User.RegisterWithCookie', {
      userId,
      userPassword,
      userCookie: cookieHeader,
      userName: userId
    })
    return {
      userId,
      userKey: result?.userKey || userKey,
      registered: !!result?.userKey
    }
  } catch {
    return { userId, userKey, registered: false }
  }
}

async function fetchEvaluatedCourseIdsForDesktop(userKey, userId) {
  if (!userKey) return { ids: [], known: false }
  try {
    const result = await requestAppApiForm('App.UserCourse.GetCourseByUserId', { userKey, userId })
    return {
      ids: Array.isArray(result?.evaluated) ? result.evaluated.map((id) => String(id || '').trim().toLowerCase()).filter(Boolean) : [],
      known: true
    }
  } catch {
    return { ids: [], known: false }
  }
}

async function syncDesktopUserCourseIds(userKey, userId, courses) {
  if (!userKey || !Array.isArray(courses) || courses.length === 0) {
    return false
  }
  const courseIds = Array.from(new Set(
    courses.map((course) => String(course.courseId || '').trim().toLowerCase()).filter(Boolean)
  ))
  if (courseIds.length === 0) {
    return false
  }
  const courseRows = courses.map((course) => {
    const courseId = normalizeCourseId(course?.courseId || course?.md5Hash)
    const lessonName = String(course?.lessonName || course?.courseName || '').trim()
    const teacherName = String(course?.teacherName || '').trim()
    const courseTerm = String(course?.courseTerm || course?.term || '').trim()
    return {
      courseId,
      md5Hash: courseId,
      courseTerm,
      term: courseTerm,
      courseCode: String(course?.courseCode || course?.lessonId || '').trim(),
      lessonId: String(course?.lessonId || course?.courseCode || '').trim(),
      lessonName,
      courseName: lessonName,
      teacherName,
      lessonCredit: String(course?.lessonCredit || course?.credit || '').trim(),
      credit: String(course?.credit || course?.lessonCredit || '').trim(),
      courseType: String(course?.courseType || '').trim()
    }
  }).filter((course) => course.courseId && course.courseTerm && course.lessonName && course.teacherName)
  try {
    await requestAppApiForm('App.UserCourse.SetUserCourseFromClient', {
      userKey,
      userId,
      courseIds: courseIds.join(';'),
      courses: JSON.stringify(courseRows)
    })
    return true
  } catch {
    return false
  }
}

function normalizeCourseId(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeDisplayCourseType(value) {
  const text = String(value || '').trim()
  return text && text !== '通选' ? text : ''
}

function normalizeCourseRows(result) {
  if (Array.isArray(result)) return result
  if (result && Array.isArray(result.list)) return result.list
  if (result && Array.isArray(result.data)) return result.data
  if (result && typeof result === 'object') {
    const values = Object.values(result)
    if (values.length > 0 && values.every((item) => item && typeof item === 'object')) {
      return values
    }
  }
  return []
}

function normalizeLinkeCollectionMatchPart(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，、；;]/g, ',')
    .trim()
}

function buildLinkeCollectionMatchKey(courseName, teacherName) {
  const course = normalizeLinkeCollectionMatchPart(courseName)
  const teacher = normalizeLinkeCollectionMatchPart(teacherName)
  return course && teacher ? `${course}|${teacher}` : ''
}

function normalizeLinkeCollectionHighlightItem(course = {}) {
  const courseId = normalizeCourseId(course?.courseId || course?.md5Hash)
  const courseName = String(course?.courseName || course?.lessonName || course?._lessonName || '').trim()
  const teacherName = String(course?.teacherName || course?._teacherName || '').trim()
  const matchKey = buildLinkeCollectionMatchKey(courseName, teacherName)
  if (!courseId && !matchKey) return null
  return {
    courseId,
    courseName,
    lessonName: courseName,
    teacherName,
    matchKey
  }
}

function updateLinkeCollectionHighlightPayload(courses = []) {
  const items = []
  const matchKeys = new Set()
  const courseIds = new Set()
  for (const course of Array.isArray(courses) ? courses : []) {
    const item = normalizeLinkeCollectionHighlightItem(course)
    if (!item) continue
    if (item.courseId) courseIds.add(item.courseId)
    if (item.matchKey) matchKeys.add(item.matchKey)
    items.push(item)
  }
  linkeCollectionHighlightPayload = {
    items,
    matchKeys: Array.from(matchKeys),
    courseIds: Array.from(courseIds),
    count: items.length,
    updatedAt: Date.now()
  }
  sendLinkeCollectionHighlightsToView()
  return linkeCollectionHighlightPayload
}

async function loadLinkeCollectionCourses(user) {
  const rows = normalizeCollectionRows(await requestAppApiForm('App.UserCollection.GetCollection', {
    userKey: user.userKey,
    userId: user.userId
  }))
  const courseIds = Array.from(new Set(rows.map((row) => normalizeCourseId(row?.courseId)).filter(Boolean)))
  let courses = []
  if (courseIds.length > 0) {
    try {
      const detailRows = await requestAppApiForm('App.Course.GetCourseByIds', {
        userKey: user.userKey,
        userId: user.userId,
        courseIds: JSON.stringify(courseIds)
      })
      const detailMap = buildCourseDetailMap(detailRows)
      courses = courseIds.map((courseId) => {
        const detail = detailMap.get(courseId) || {}
        const row = rows.find((item) => normalizeCourseId(item?.courseId) === courseId) || {}
        return {
          ...detail,
          courseId,
          md5Hash: courseId,
          lessonName: detail.lessonName || detail.courseName || row.lessonName || row.courseName || '',
          courseName: detail.courseName || detail.lessonName || row.courseName || row.lessonName || '',
          teacherName: detail.teacherName || row.teacherName || ''
        }
      })
    } catch {
      courses = rows.map((row) => ({
        ...row,
        courseId: normalizeCourseId(row?.courseId),
        lessonName: row?.lessonName || row?.courseName || '',
        courseName: row?.courseName || row?.lessonName || '',
        teacherName: row?.teacherName || ''
      }))
    }
  }
  return { rows, courseIds, courses }
}

async function refreshLinkeCollectionHighlights({ force = false } = {}) {
  const now = Date.now()
  if (
    !force &&
    linkeCollectionHighlightPayload.updatedAt &&
    now - Number(linkeCollectionHighlightPayload.updatedAt || 0) < LINKE_COLLECTION_HIGHLIGHT_TTL
  ) {
    return linkeCollectionHighlightPayload
  }
  if (linkeCollectionHighlightRefreshPromise) {
    return linkeCollectionHighlightRefreshPromise
  }

  linkeCollectionHighlightRefreshPromise = (async () => {
    const user = await getDesktopUserContext()
    if (!user.userKey) {
      return updateLinkeCollectionHighlightPayload([])
    }
    const { courses } = await loadLinkeCollectionCourses(user)
    return updateLinkeCollectionHighlightPayload(courses)
  })()

  try {
    return await linkeCollectionHighlightRefreshPromise
  } finally {
    linkeCollectionHighlightRefreshPromise = null
  }
}

function normalizeCommentRows(result) {
  if (Array.isArray(result)) return result
  if (result && Array.isArray(result.list)) return result.list
  if (result && Array.isArray(result.data)) return result.data
  if (result && typeof result === 'object') {
    const values = Object.values(result)
    if (values.length > 0 && values.every((item) => item && typeof item === 'object')) {
      return values
    }
  }
  return []
}

function normalizeLinkeComment(comment) {
  if (!comment || typeof comment !== 'object') return null
  let likeCount = comment.likeCount != null
    ? Number(comment.likeCount)
    : (comment.commentLikeCount != null ? Number(comment.commentLikeCount) : 0)
  if (comment.hasLiked && likeCount < 1) likeCount = 1
  return {
    ...comment,
    likeCount: Number.isNaN(likeCount) ? 0 : likeCount
  }
}

function normalizeCollectionRows(result) {
  if (Array.isArray(result)) return result
  if (result && Array.isArray(result.list)) return result.list
  if (result && Array.isArray(result.data)) return result.data
  if (result && typeof result === 'object') {
    const values = Object.values(result)
    if (values.length > 0 && values.every((item) => item && typeof item === 'object')) {
      return values
    }
  }
  return []
}

function normalizeScoreStatsMap(result) {
  return result && typeof result === 'object' && !Array.isArray(result) ? result : {}
}

async function getDesktopUserContext({ allowCookieRegistration = true } = {}) {
  const credentials = readCredentials()
  const userId = String(credentials.account || '').trim()
  const userPassword = String(credentials.password || '')
  if (!userId || !userPassword) {
    return { userId: '', userKey: '', registered: false }
  }

  if (allowCookieRegistration) {
    try {
      const { header } = await getJwCookieHeader()
      if (header) {
        const registered = await ensureDesktopUserRegistered(header)
        if (registered.userKey) {
          return registered
        }
      }
    } catch {}
  }

  return {
    userId,
    userKey: md5Hex(userId + userPassword),
    registered: false
  }
}

function buildCourseDetailMap(rows) {
  const map = new Map()
  for (const row of normalizeCourseRows(rows)) {
    const id = normalizeCourseId(row?.courseId)
    if (id && !map.has(id)) {
      map.set(id, row)
    }
  }
  return map
}

async function enrichDesktopCourses(courses, user) {
  const seenCourseIds = new Set()
  const baseCourses = Array.isArray(courses)
    ? courses.map((course) => {
        const id = normalizeCourseId(course?.courseId || course?.md5Hash)
        return {
          ...course,
          courseId: id,
          md5Hash: id,
          lessonName: course?.lessonName || course?.courseName || '',
          courseName: course?.courseName || course?.lessonName || '',
          teacherName: course?.teacherName || ''
        }
      }).filter((course) => {
        if (!course.courseId || seenCourseIds.has(course.courseId)) return false
        seenCourseIds.add(course.courseId)
        return true
      })
    : []

  if (!user?.userKey || baseCourses.length === 0) {
    return baseCourses
  }

  const courseIds = Array.from(new Set(baseCourses.map((course) => course.courseId)))
  let detailMap = new Map()
  let scoreStatsMap = {}

  try {
    const detailRows = await requestAppApiForm('App.Course.GetCourseByIds', {
      userKey: user.userKey,
      userId: user.userId,
      courseIds: JSON.stringify(courseIds)
    })
    detailMap = buildCourseDetailMap(detailRows)
  } catch {}

  try {
    scoreStatsMap = normalizeScoreStatsMap(await requestAppApiForm('App.UserScore.GetBatchCourseScoreStats', {
      userKey: user.userKey,
      userId: user.userId,
      courseIds: JSON.stringify(courseIds)
    }))
  } catch {}

  return baseCourses.map((course) => {
    const detail = detailMap.get(course.courseId) || {}
    const scoreStats = scoreStatsMap[course.courseId] || scoreStatsMap[course.md5Hash] || course.scoreStats || null
    return {
      ...detail,
      ...course,
      courseId: course.courseId,
      md5Hash: course.courseId,
      lessonName: course.lessonName || course.courseName || detail.lessonName || detail.courseName || '',
      courseName: course.courseName || course.lessonName || detail.lessonName || detail.courseName || '',
      teacherName: course.teacherName || detail.teacherName || '',
      courseType: normalizeDisplayCourseType(detail.courseType || course.courseType),
      starAvgTotal: detail.starAvgTotal ?? course.starAvgTotal ?? null,
      courseComment: detail.courseComment ?? course.courseComment ?? null,
      scoreStats
    }
  })
}

async function enrichDesktopCourseInstances(courses, user) {
  const baseCourses = Array.isArray(courses)
    ? courses.map((course) => {
        const id = normalizeCourseId(course?.courseId || course?.md5Hash)
        return {
          ...course,
          courseId: id,
          md5Hash: id,
          lessonName: course?.lessonName || course?.courseName || '',
          courseName: course?.courseName || course?.lessonName || '',
          teacherName: course?.teacherName || ''
        }
      }).filter((course) => course.courseId)
    : []

  if (!user?.userKey || baseCourses.length === 0) {
    return baseCourses
  }

  const courseIds = Array.from(new Set(baseCourses.map((course) => course.courseId)))
  let detailMap = new Map()
  let scoreStatsMap = {}

  try {
    const detailRows = await requestAppApiForm('App.Course.GetCourseByIds', {
      userKey: user.userKey,
      userId: user.userId,
      courseIds: JSON.stringify(courseIds)
    })
    detailMap = buildCourseDetailMap(detailRows)
  } catch {}

  try {
    scoreStatsMap = normalizeScoreStatsMap(await requestAppApiForm('App.UserScore.GetBatchCourseScoreStats', {
      userKey: user.userKey,
      userId: user.userId,
      courseIds: JSON.stringify(courseIds)
    }))
  } catch {}

  return baseCourses.map((course) => {
    const detail = detailMap.get(course.courseId) || {}
    const scoreStats = scoreStatsMap[course.courseId] || scoreStatsMap[course.md5Hash] || course.scoreStats || null
    return {
      ...detail,
      ...course,
      courseId: course.courseId,
      md5Hash: course.courseId,
      lessonName: course.lessonName || course.courseName || detail.lessonName || detail.courseName || '',
      courseName: course.courseName || course.lessonName || detail.lessonName || detail.courseName || '',
      teacherName: course.teacherName || detail.teacherName || '',
      courseType: normalizeDisplayCourseType(detail.courseType || course.courseType),
      starAvgTotal: detail.starAvgTotal ?? course.starAvgTotal ?? null,
      courseComment: detail.courseComment ?? course.courseComment ?? null,
      scoreStats
    }
  })
}

async function searchLinkeCourses(payload = {}) {
  const keyword = String(payload.keyword || '').trim()
  if (!keyword) {
    throw new Error('请输入课程名称或教师姓名')
  }

  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const result = await requestAppApiForm('App.Course.GetCourseByNameLike', {
    userKey: user.userKey,
    userId: user.userId,
    nameLike: keyword
  })
  const rows = Array.isArray(result?.list)
    ? result.list
    : normalizeCourseRows(result?.LessonName || result?.TeacherName ? {
        ...result,
        list: []
      } : result)
  const fallbackRows = rows.length > 0
    ? rows
    : normalizeCourseRows([...(result?.LessonName || []), ...(result?.TeacherName || [])])
  const courses = await enrichDesktopCourses(fallbackRows, user)
  return {
    status: 'ready',
    keyword,
    courses,
    count: courses.length,
    userBound: !!user.userKey
  }
}

async function getLinkeCollections() {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const { rows, courseIds, courses: baseCourses } = await loadLinkeCollectionCourses(user)
  const courses = await enrichDesktopCourses(baseCourses, user)
  const highlightPayload = updateLinkeCollectionHighlightPayload(courses)
  return {
    status: 'ready',
    rows,
    courseIds,
    courses,
    highlightItems: highlightPayload.items,
    count: courseIds.length
  }
}

async function setLinkeCourseCollection(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  if (!courseId) {
    throw new Error('课程信息异常')
  }

  const collected = payload.collected === true
  await requestAppApiForm(collected ? 'App.UserCollection.PostCollection' : 'App.UserCollection.DeleteCollection', {
    userKey: user.userKey,
    userId: user.userId,
    courseId
  })

  if (collected) {
    let course = {
      courseId,
      md5Hash: courseId,
      courseName: String(payload.courseName || payload.lessonName || '').trim(),
      lessonName: String(payload.lessonName || payload.courseName || '').trim(),
      teacherName: String(payload.teacherName || '').trim()
    }
    try {
      const detailMap = buildCourseDetailMap(await requestAppApiForm('App.Course.GetCourseByIds', {
        userKey: user.userKey,
        userId: user.userId,
        courseIds: JSON.stringify([courseId])
      }))
      const detail = detailMap.get(courseId) || {}
      course = {
        ...course,
        ...detail,
        courseName: detail.courseName || detail.lessonName || course.courseName || course.lessonName || '',
        lessonName: detail.lessonName || detail.courseName || course.lessonName || course.courseName || '',
        teacherName: detail.teacherName || course.teacherName || ''
      }
    } catch {}
    updateLinkeCollectionHighlightPayload([
      ...linkeCollectionHighlightPayload.items.filter((item) => normalizeCourseId(item.courseId) !== courseId),
      course
    ])
  } else {
    updateLinkeCollectionHighlightPayload(
      linkeCollectionHighlightPayload.items.filter((item) => normalizeCourseId(item.courseId) !== courseId)
    )
  }

  return {
    status: 'ready',
    courseId,
    collected
  }
}

async function getLinkeCourseComments(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  if (!courseId) {
    throw new Error('课程信息异常')
  }

  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(payload.pageSize, 10) || LINKE_COMMENT_PAGE_SIZE))
  const result = await requestAppApiForm('App.CourseComment.GetComment', {
    userKey: user.userKey,
    userId: user.userId,
    courseId,
    commentType: 'all',
    page,
    pageSize
  })
  const comments = normalizeCommentRows(result).map(normalizeLinkeComment).filter(Boolean)
  return {
    status: 'ready',
    courseId,
    page,
    pageSize,
    comments,
    hasMore: comments.length >= pageSize
  }
}

function normalizeCommentPayload(payload = {}) {
  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  const commentStar1 = Number.parseInt(payload.commentStar1, 10)
  const commentStar2 = Number.parseInt(payload.commentStar2, 10)
  const commentStar3 = Number.parseInt(payload.commentStar3, 10)
  const commentMessage = String(payload.commentMessage || '').trim()
  if (!courseId) throw new Error('课程信息异常')
  if ([commentStar1, commentStar2, commentStar3].some((value) => value < 1 || value > 5 || Number.isNaN(value))) {
    throw new Error('请完成三个维度的评分')
  }
  if (!commentMessage) {
    throw new Error('请填写文字评价')
  }
  return {
    courseId,
    commentStar1,
    commentStar2,
    commentStar3,
    commentMessage
  }
}

async function getMyLinkeCourseComment(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  if (!courseId) {
    throw new Error('课程信息异常')
  }

  const result = await requestAppApiForm('App.CourseComment.GetMyComment', {
    userKey: user.userKey,
    userId: user.userId,
    courseId
  })
  return {
    status: 'ready',
    courseId,
    comment: result && typeof result === 'object' ? result : null
  }
}

async function getLinkeCourseDetail(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  if (!courseId) {
    throw new Error('课程信息异常')
  }

  const fallbackCourse = {
    courseId,
    md5Hash: courseId,
    lessonName: String(payload.lessonName || payload.courseName || '').trim(),
    courseName: String(payload.courseName || payload.lessonName || '').trim(),
    teacherName: String(payload.teacherName || '').trim(),
    courseType: normalizeDisplayCourseType(payload.courseType),
    starAvgTotal: payload.starAvgTotal ?? null,
    courseComment: payload.courseComment ?? null,
    scoreStats: payload.scoreStats || null,
    hasScore: payload.hasScore === true,
    gradeState: String(payload.gradeState || '').trim(),
    gradeStatusText: String(payload.gradeStatusText || '').trim()
  }
  const requestedTerm = String(payload.courseTerm || '').trim()

  let detailRows = []
  let detailError = ''
  try {
    detailRows = normalizeCourseRows(await requestAppApiForm('App.Course.GetCourseByCourseId', {
      userKey: user.userKey,
      userId: user.userId,
      courseId,
      courseTerm: requestedTerm,
      lessonName: fallbackCourse.lessonName || fallbackCourse.courseName,
      teacherName: fallbackCourse.teacherName
    }))
  } catch (error) {
    detailError = error?.message || '课程详情读取失败'
  }

  const detail = detailRows[0] || {}
  const [ratingResult, scoreResult, countResult, commentResult, courseStateResult, collectionResult, termsResult] = await Promise.allSettled([
    requestAppApiForm('App.CourseComment.GetCourseRating', { courseId }),
    requestAppApiForm('App.UserScore.GetCourseScoreStats', {
      userKey: user.userKey,
      userId: user.userId,
      courseId
    }),
    requestAppApiForm('App.CourseComment.GetCommentCount', {
      userKey: user.userKey,
      userId: user.userId,
      courseId
    }),
    requestAppApiForm('App.CourseComment.GetComment', {
      userKey: user.userKey,
      userId: user.userId,
      courseId,
      commentType: 'all',
      page: 1,
      pageSize: LINKE_COMMENT_PAGE_SIZE
    }),
    requestAppApiForm('App.UserCourse.GetCourseByUserId', {
      userKey: user.userKey,
      userId: user.userId
    }),
    requestAppApiForm('App.UserCollection.GetCollection', {
      userKey: user.userKey,
      userId: user.userId
    }),
    requestAppApiForm('App.Course.GetCourseTermsByCourseId', {
      userKey: user.userKey,
      userId: user.userId,
      courseId
    })
  ])

  const rating = ratingResult.status === 'fulfilled' ? ratingResult.value : null
  const scoreStats = scoreResult.status === 'fulfilled' ? scoreResult.value : fallbackCourse.scoreStats
  const commentCount = countResult.status === 'fulfilled'
    ? Number(countResult.value?.commentCount ?? countResult.value ?? 0) || 0
    : 0
  const comments = commentResult.status === 'fulfilled'
    ? normalizeCommentRows(commentResult.value).map(normalizeLinkeComment).filter(Boolean)
    : []
  const userCourses = courseStateResult.status === 'fulfilled' && courseStateResult.value ? courseStateResult.value : {}
  const mineSet = new Set((Array.isArray(userCourses.mine) ? userCourses.mine : []).map(normalizeCourseId).filter(Boolean))
  const evaluatedSet = new Set((Array.isArray(userCourses.evaluated) ? userCourses.evaluated : []).map(normalizeCourseId).filter(Boolean))
  const forceReadOnly = payload.forceReadOnly === true
  const hasEvaluationPermission = forceReadOnly ? false : (mineSet.has(courseId) || payload.hasEvaluationPermission === true)
  const isEvaluated = evaluatedSet.has(courseId) || payload.isEvaluated === true
  const collectionRows = collectionResult.status === 'fulfilled' ? normalizeCollectionRows(collectionResult.value) : []
  const isCollected = collectionRows.some((row) => normalizeCourseId(row?.courseId) === courseId)
  const availableTerms = termsResult.status === 'fulfilled'
    ? Array.from(new Set(normalizeCourseRows(termsResult.value)
        .map((row) => String(typeof row === 'string' ? row : (row?.courseTerm || '')).trim())
        .filter(Boolean))).sort().reverse()
    : []
  const selectedTerm = requestedTerm || detail.courseTerm || availableTerms[0] || ''
  if (selectedTerm && !availableTerms.includes(selectedTerm)) {
    availableTerms.unshift(selectedTerm)
  }

  const course = {
    ...detail,
    ...fallbackCourse,
    courseId,
    md5Hash: courseId,
    lessonName: detail.lessonName || fallbackCourse.lessonName || fallbackCourse.courseName || '',
    courseName: fallbackCourse.courseName || detail.lessonName || detail.courseName || fallbackCourse.lessonName || '',
    teacherName: detail.teacherName || fallbackCourse.teacherName || '',
    courseType: normalizeDisplayCourseType(detail.courseType || fallbackCourse.courseType),
    starAvgTotal: rating?.starAvgTotal ?? detail.starAvgTotal ?? fallbackCourse.starAvgTotal,
    courseComment: commentCount || detail.courseComment || fallbackCourse.courseComment || 0,
    scoreStats,
    hasEvaluationPermission,
    isEvaluated,
    isCollected,
    courseTerm: selectedTerm || detail.courseTerm || '',
    hasScore: fallbackCourse.hasScore,
    gradeState: fallbackCourse.gradeState,
    gradeStatusText: fallbackCourse.gradeStatusText
  }

  return {
    status: 'ready',
    course,
    comments,
    commentCount: commentCount || comments.length,
    rating,
    scoreStats,
    hasEvaluationPermission,
    isEvaluated,
    availableTerms,
    selectedTerm,
    commentPage: 1,
    commentPageSize: LINKE_COMMENT_PAGE_SIZE,
    commentHasMore: comments.length >= LINKE_COMMENT_PAGE_SIZE,
    detailError
  }
}

async function submitLinkeCourseComment(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const { courseId, commentStar1, commentStar2, commentStar3, commentMessage } = normalizeCommentPayload(payload)

  const cachedCourses = jwEvaluationCoursesCache?.payload?.courses || []
  await syncDesktopUserCourseIds(user.userKey, user.userId, [
    payload,
    ...cachedCourses
  ])
  const result = await requestAppApiForm('App.CourseComment.PostComment', {
    userKey: user.userKey,
    userId: user.userId,
    courseId,
    commentStar1,
    commentStar2,
    commentStar3,
    commentMessage
  })
  jwEvaluationCoursesCache = null
  jwMyCoursesCache = null
  return { ok: true, result }
}

async function updateLinkeCourseComment(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const { courseId, commentStar1, commentStar2, commentStar3, commentMessage } = normalizeCommentPayload(payload)
  const result = await requestAppApiForm('App.CourseComment.UpdateComment', {
    userKey: user.userKey,
    userId: user.userId,
    courseId,
    commentStar1,
    commentStar2,
    commentStar3,
    commentMessage
  })
  jwEvaluationCoursesCache = null
  jwMyCoursesCache = null
  return { ok: true, result }
}

async function deleteLinkeCourseComment(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const courseId = normalizeCourseId(payload.courseId || payload.md5Hash)
  if (!courseId) {
    throw new Error('课程信息异常')
  }

  const result = await requestAppApiForm('App.CourseComment.DeleteComment', {
    userKey: user.userKey,
    userId: user.userId,
    courseId
  })
  jwEvaluationCoursesCache = null
  jwMyCoursesCache = null
  return { ok: true, courseId, result }
}

async function likeLinkeCourseComment(payload = {}) {
  const user = await getDesktopUserContext()
  if (!user.userKey) {
    throw new Error('请先登录教务系统并保存账号')
  }

  const commentId = String(payload.commentId || '').trim()
  if (!commentId) {
    throw new Error('评论信息异常')
  }

  const result = await requestAppApiForm('App.CourseComment.LikeComment', {
    userKey: user.userKey,
    userId: user.userId,
    commentId
  })

  return {
    status: 'ready',
    liked: result?.liked === true,
    likeCount: Number(result?.likeCount || 0)
  }
}

async function loadJwMyCourses({ force = false, requestId = '', onProgress = null } = {}) {
  const publishProgress = (payload = {}) => {
    if (typeof onProgress !== 'function') return
    onProgress({
      requestId,
      updatedAt: new Date().toISOString(),
      ...payload
    })
  }
  const now = Date.now()
  if (
    !force &&
    jwMyCoursesCache &&
    now - Number(jwMyCoursesCache.cachedAt || 0) < JW_EVALUATION_CACHE_TTL
  ) {
    publishProgress({
      stage: 'cache',
      message: '使用最近同步结果',
      current: 1,
      total: 1,
      percent: 100
    })
    return jwMyCoursesCache.payload
  }

  const { header: cookieHeader } = await getJwCookieHeader()
  if (!cookieHeader) {
    throw new Error('请先登录教务系统')
  }

  let scoreData = { termList: [], scoreKeys: new Set() }
  try {
    publishProgress({
      stage: 'score',
      message: '读取成绩页，识别已出成绩课程',
      current: 0,
      total: 0,
      percent: 8
    })
    const scoreHtml = await requestJwHtml('/jsxsd/kscj/cjcx_list', 'xsfs=all')
    scoreData = parseJwScoreData(scoreHtml, { courseType: '' })
  } catch {}

  let currentTerm = ''
  try {
    publishProgress({
      stage: 'currentTerm',
      message: '读取当前学期编号',
      current: 0,
      total: 0,
      percent: 16
    })
    const scheduleHtml = await requestJwHtml('/jsxsd/xskb/xskb_list.do')
    currentTerm = parseJwScheduleSelectedTerm(scheduleHtml)
  } catch {}

  const termList = Array.from(new Set([
    ...scoreData.termList,
    currentTerm
  ].filter(Boolean))).sort().reverse()

  if (termList.length === 0) {
    const payload = createEmptyJwMyCoursesPayload()
    publishProgress({
      stage: 'complete',
      message: payload.message,
      current: 1,
      total: 1,
      percent: 100
    })
    return payload
  }

  publishProgress({
    stage: 'terms',
    message: `准备同步 ${termList.length} 个学期的选课日志`,
    current: 0,
    total: termList.length,
    percent: 22
  })

  const termResults = []
  for (let index = 0; index < termList.length; index += 1) {
    const term = termList[index]
    publishProgress({
      stage: 'term',
      message: `正在同步 ${term}`,
      term,
      current: index,
      total: termList.length,
      percent: 22 + Math.round((index / termList.length) * 56)
    })
    const html = await requestJwHtml('/jsxsd/xsxk/xs_txlist', `xnxqh=${encodeURIComponent(term)}`)
    const courses = parseJwTxListCourses(html, term, { courseType: '' })
    termResults.push(courses)
    publishProgress({
      stage: 'term',
      message: `已同步 ${term}`,
      term,
      current: index + 1,
      total: termList.length,
      percent: 22 + Math.round(((index + 1) / termList.length) * 56),
      courseCount: courses.length
    })
  }
  const rawCourses = termResults.flat()

  const seenInstanceKeys = new Set()
  const classified = rawCourses
    .map((course) => {
      const hasScore = scoreData.scoreKeys.has(`${course.term}\u0000${course.courseCode}`)
      const isCurrentTerm = !!currentTerm && course.term === currentTerm
      const gradeState = hasScore ? 'scored' : (isCurrentTerm ? 'studying' : 'unscored')
      const gradeStatusText = hasScore ? '已出成绩' : (isCurrentTerm ? '修读中' : '未出成绩')
      return {
        ...course,
        md5Hash: course.courseId,
        hasScore,
        gradeState,
        gradeStatusText,
        hasEvaluationPermission: hasScore,
        isEvaluated: false
      }
    })
    .filter((course) => {
      const key = `${course.term}\u0000${course.courseId}`
      if (!course.courseId || seenInstanceKeys.has(key)) return false
      seenInstanceKeys.add(key)
      return true
    })
    .sort((a, b) => {
      const termCompare = String(b.term || '').localeCompare(String(a.term || ''))
      if (termCompare !== 0) return termCompare
      if (a.gradeState !== b.gradeState) {
        const order = { studying: 0, unscored: 1, scored: 2 }
        return (order[a.gradeState] ?? 9) - (order[b.gradeState] ?? 9)
      }
      return String(a.courseName || '').localeCompare(String(b.courseName || ''), 'zh-Hans-CN')
    })

  const user = await ensureDesktopUserRegistered(cookieHeader)
  publishProgress({
    stage: 'enrich',
    message: '补全林课评分与成绩分布',
    current: termList.length,
    total: termList.length,
    percent: 84
  })
  let courses = await enrichDesktopCourseInstances(classified, user)
  courses = courses.map((course) => ({
    ...course,
    hasEvaluationPermission: course.hasEvaluationPermission === true
  }))

  const scored = courses.filter((course) => course.hasScore === true)
  const unscored = courses.filter((course) => course.hasScore !== true)
  const studying = courses.filter((course) => course.gradeState === 'studying')
  const payload = {
    status: 'ready',
    termList,
    scoreTermList: scoreData.termList,
    currentTerm,
    courses,
    scored,
    unscored,
    studying,
    totalCount: courses.length,
    scoredCount: scored.length,
    unscoredCount: unscored.length,
    studyingCount: studying.length,
    userBound: !!user.userKey,
    updatedAt: new Date().toISOString()
  }
  jwMyCoursesCache = {
    cachedAt: now,
    payload
  }
  publishProgress({
    stage: 'complete',
    message: '同步完成',
    current: termList.length,
    total: termList.length,
    percent: 100
  })
  return payload
}

async function loadJwEvaluationCourses({ force = false } = {}) {
  if (!force) {
    const cached = getCachedJwEvaluationPayload()
    if (cached) {
      return cached
    }
  }

  if (jwEvaluationCoursesLoadPromise) {
    return jwEvaluationCoursesLoadPromise
  }

  jwEvaluationCoursesLoadPromise = doLoadJwEvaluationCourses()
  try {
    return await jwEvaluationCoursesLoadPromise
  } finally {
    jwEvaluationCoursesLoadPromise = null
  }
}

async function doLoadJwEvaluationCourses() {
  const { header: cookieHeader } = await getJwCookieHeader()
  if (!cookieHeader) {
    throw new Error('请先登录教务系统')
  }

  const scoreHtml = await requestJwHtml('/jsxsd/kscj/cjcx_list', 'xsfs=all')
  const scoreData = parseJwScoreData(scoreHtml, { courseType: '' })
  const termList = scoreData.termList
  if (termList.length === 0 || scoreData.scoreKeys.size === 0) {
    return cacheJwEvaluationPayload(createEmptyJwEvaluationCoursesPayload(), { persist: true })
  }

  const termResults = await mapWithConcurrency(termList, 3, async (term) => {
    const html = await requestJwHtml('/jsxsd/xsxk/xs_txlist', `xnxqh=${encodeURIComponent(term)}`)
    return parseJwTxListCourses(html, term, { courseType: '' })
  })
  const allCourses = termResults.flat()
    .map((course) => ({
      ...course,
      hasScore: scoreData.scoreKeys.has(`${course.term}\u0000${course.courseCode}`),
      gradeState: scoreData.scoreKeys.has(`${course.term}\u0000${course.courseCode}`) ? 'scored' : 'unscored',
      gradeStatusText: scoreData.scoreKeys.has(`${course.term}\u0000${course.courseCode}`) ? '已出成绩' : '未出成绩',
      hasEvaluationPermission: scoreData.scoreKeys.has(`${course.term}\u0000${course.courseCode}`)
    }))
    .filter((course) => course.hasScore === true)
  const user = await ensureDesktopUserRegistered(cookieHeader)
  await syncDesktopUserCourseIds(user.userKey, user.userId, allCourses)
  const evaluatedResult = await fetchEvaluatedCourseIdsForDesktop(user.userKey, user.userId)
  const evaluatedSet = new Set(evaluatedResult.ids)
  let courses = allCourses.map((course) => ({
    ...course,
    md5Hash: course.courseId,
    isEvaluated: evaluatedSet.has(String(course.courseId || '').toLowerCase())
  }))
  courses = await enrichDesktopCourses(courses, user)
  courses = courses.map((course) => ({
    ...course,
    isEvaluated: evaluatedSet.has(String(course.courseId || course.md5Hash || '').toLowerCase())
  }))
  const payload = buildJwEvaluationPayload({
    termList,
    courses,
    evaluationStatusKnown: evaluatedResult.known,
    userBound: !!user.userKey,
    updatedAt: new Date().toISOString()
  })
  return cacheJwEvaluationPayload(payload, { persist: true })
}

async function refreshJwEvaluationStatus() {
  const current = getCachedJwEvaluationPayload()
  if (!current) {
    return loadJwEvaluationCourses({ force: true })
  }

  const user = await getDesktopUserContext({ allowCookieRegistration: false })
  await syncDesktopUserCourseIds(user.userKey, user.userId, current.courses)
  const evaluatedResult = await fetchEvaluatedCourseIdsForDesktop(user.userKey, user.userId)
  const evaluatedSet = new Set(evaluatedResult.ids)
  const courses = current.courses.map((course) => ({
    ...course,
    isEvaluated: evaluatedSet.has(String(course.courseId || course.md5Hash || '').toLowerCase())
  }))
  const payload = buildJwEvaluationPayload({
    message: current.message,
    termList: current.termList,
    courses,
    evaluationStatusKnown: evaluatedResult.known,
    userBound: !!user.userKey,
    updatedAt: new Date().toISOString()
  })
  return cacheJwEvaluationPayload(payload, { persist: true })
}

async function recognizeCaptchaImage(imageBase64) {
  const pureBase64 = String(imageBase64 || '').includes(',')
    ? String(imageBase64).split(',').pop()
    : String(imageBase64 || '')

  if (!pureBase64 || pureBase64.length < 100) {
    throw new Error('Captcha image is empty.')
  }

  const result = await requestAppApiJson('App.Captcha.Recognize', {
    image_base64: pureBase64
  })
  const text = String(result?.result || '').trim()
  if (!text) {
    throw new Error(result?.error || 'Captcha recognition returned empty text.')
  }
  return text
}

function getJwState() {
  const activeTab = getActiveBrowserTab()
  const activeView = isBlankBrowserTab(activeTab) ? null : jwView
  const pendingForActiveTab = pendingWebNavigation?.tabId === activeTab?.id
  if (!activeView || activeView.webContents.isDestroyed()) {
    return {
      url: pendingForActiveTab ? pendingWebNavigation.url : (activeTab?.url || ''),
      title: activeTab?.title || '',
      canGoBack: false,
      canGoForward: false,
      loading: !!pendingForActiveTab,
      loadError: activeTab?.loadError || null,
      tabs: serializeBrowserTabs(),
      activeTabId: activeTab?.id || activeBrowserTabId,
      activeFeature: activeWorkspaceFeature,
      jwOriginalMode,
      jwPageTitle: '',
      jwPageGroupTitle: '',
      jwPageParentTitle: '',
      jwPageBreadcrumb: []
    }
  }

  return {
    url: pendingForActiveTab ? pendingWebNavigation.url : (activeTab.url || activeView.webContents.getURL()),
    title: activeTab.title || activeView.webContents.getTitle(),
    canGoBack: pendingForActiveTab ? false : activeView.webContents.navigationHistory.canGoBack(),
    canGoForward: pendingForActiveTab ? false : activeView.webContents.navigationHistory.canGoForward(),
    loading: pendingForActiveTab || activeView.webContents.isLoading(),
    loadError: activeTab.loadError || null,
    tabs: serializeBrowserTabs(),
    activeTabId: activeTab.id,
    activeFeature: activeWorkspaceFeature,
    jwOriginalMode,
    jwPageTitle: activeJwPageContext.title,
    jwPageGroupTitle: activeJwPageContext.groupTitle,
    jwPageParentTitle: activeJwPageContext.parentTitle,
    jwPageBreadcrumb: activeJwPageContext.breadcrumbTitles
  }
}

function isJwLoginOrEntryPage(state = getJwState()) {
  const title = String(state.title || '')
  if (/登录|用户登录|统一身份认证/.test(title)) {
    return true
  }

  try {
    const url = new URL(String(state.url || ''))
    const pathname = url.pathname.replace(/\/+$/, '')
    if (!pathname) {
      return true
    }
    return /login|slogin|cas/i.test(pathname)
  } catch {
    return true
  }
}

function sendToApp(channel, payload) {
  if (appView && !appView.webContents.isDestroyed()) {
    appView.webContents.send(channel, payload)
  }
}

function normalizeJwCourseSearchKeyword(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^课程(名称|名)?\s*[:：]\s*/, '')
    .replace(/[;；，,。]+$/g, '')
    .trim()
    .slice(0, 60)
}

function isValidJwCourseSearchKeyword(value) {
  const keyword = normalizeJwCourseSearchKeyword(value)
  if (keyword.length < 2) return false
  if (/^\d+$/.test(keyword)) return false
  if (/^\d{4}-\d{4}-\d$/.test(keyword)) return false
  if (/^https?:\/\//i.test(keyword)) return false
  return true
}

function getJwNavigationPanelWidth() {
  return shouldShowJwPageShell() && !jwNavigationPanelCollapsed
    ? APP_JW_NAVIGATION_WIDTH
    : 0
}

function getJwAgentPanelWidth() {
  return shouldShowJwPageShell() && jwAgentPanelOpen
    ? APP_JW_AGENT_PANEL_WIDTH
    : 0
}

function applyJwShellLayout(payload = {}) {
  jwNavigationPanelCollapsed = !!payload.navigationCollapsed
  jwAgentPanelOpen = !!payload.agentPanelOpen
  layoutViews()
  return {
    navigationCollapsed: jwNavigationPanelCollapsed,
    agentPanelOpen: jwAgentPanelOpen,
    navigationWidth: getJwNavigationPanelWidth(),
    agentPanelWidth: getJwAgentPanelWidth()
  }
}

function shouldShowJwPageShell() {
  return activeWorkspaceFeature === 'browser' &&
    !jwOriginalMode &&
    isTrustedJwNavigation(jwView?.webContents.getURL()) &&
    hasTrustedJwNavigationCatalog(readJwNavigationCache()) &&
    !isJwLoginOrEntryPage()
}

function getActiveWebContentTop() {
  return shouldShowJwPageShell() ? APP_JW_PAGE_HEADER_HEIGHT : 0
}

function setActiveJwPageContext(payload = {}) {
  if (!payload || Object.keys(payload).length <= 0) {
    activeJwPageContext = {
      ...DEFAULT_JW_PAGE_CONTEXT,
      breadcrumbTitles: [...DEFAULT_JW_PAGE_CONTEXT.breadcrumbTitles]
    }
    return
  }

  const rawBreadcrumb = Array.isArray(payload.breadcrumbTitles)
    ? payload.breadcrumbTitles
    : [payload.groupTitle, payload.parentTitle, payload.title]
  const breadcrumbTitles = []
  for (const value of rawBreadcrumb) {
    const title = normalizeJwHomeContextTitle(value).slice(0, 64)
    if (title && breadcrumbTitles[breadcrumbTitles.length - 1] !== title) {
      breadcrumbTitles.push(title)
    }
  }

  activeJwPageContext = {
    title: normalizeJwHomeContextTitle(payload.title || breadcrumbTitles[breadcrumbTitles.length - 1] || '').slice(0, 64),
    groupTitle: normalizeJwHomeContextTitle(payload.groupTitle || breadcrumbTitles[0] || '').slice(0, 64),
    parentTitle: normalizeJwHomeContextTitle(payload.parentTitle || (breadcrumbTitles.length > 2 ? breadcrumbTitles[breadcrumbTitles.length - 2] : '')).slice(0, 64),
    breadcrumbTitles: breadcrumbTitles.slice(0, 5)
  }
}

function normalizeJwHomeContextTitle(value) {
  const title = String(value || '').trim()
  return title === LEGACY_PERSONAL_CENTER_TITLE ? JW_HOME_TITLE : title
}

function publishJwNavigationCatalog() {
  sendToApp('jw:navigation-catalog', readTrustedJwNavigationCache())
}

function publishJwState() {
  updateActiveBrowserTabFromWebContents()
  sendToApp('browser:state', getJwState())
}

function publishJwStateAndLayout(view = jwView) {
  updateBrowserTabFromWebContents(view)
  layoutViews()
  sendToApp('browser:state', getJwState())
}

function applySidebarCollapsed(collapsed) {
  appSidebarWidth = collapsed ? APP_SIDEBAR_COLLAPSED_WIDTH : APP_SIDEBAR_EXPANDED_WIDTH
  layoutViews()
  publishJwState()
  return {
    collapsed: !!collapsed,
    width: appSidebarWidth
  }
}

function openDevTools(target) {
  const view = target === 'jw' ? jwView : appView
  if (view && !view.webContents.isDestroyed()) {
    view.webContents.openDevTools({ mode: 'detach' })
  }
}

function installAppMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: '关于林课桌面端' },
            { type: 'separator' },
            { role: 'quit', label: '退出' }
          ]
        }]
      : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '开发',
      submenu: [
        {
          label: '打开林课界面 DevTools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => openDevTools('app')
        },
        {
          label: '打开教务网页 DevTools',
          accelerator: 'CmdOrCtrl+Alt+J',
          click: () => openDevTools('jw')
        },
        { type: 'separator' },
        {
          label: '重载林课界面',
          accelerator: 'CmdOrCtrl+R',
          click: () => appView?.webContents.reload()
        },
        {
          label: '重载教务网页',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => jwView?.webContents.reload()
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function layoutViews() {
  if (!mainWindow || !appView) {
    return
  }

  const bounds = mainWindow.getContentBounds()
  appView.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height
  })
  const hiddenBounds = getHiddenWebViewBounds(bounds)

  for (const [tabId, view] of webViewByTabId.entries()) {
    if (!view || view.webContents.isDestroyed()) {
      webViewByTabId.delete(tabId)
      continue
    }

    if (view !== jwView) {
      view.setBounds(hiddenBounds)
      view.setVisible(false)
    }
  }

  if (!jwView || jwView.webContents.isDestroyed()) {
    return
  }

  if (!WEB_WORKSPACE_FEATURES.has(activeWorkspaceFeature)) {
    jwView.setBounds(hiddenBounds)
    jwView.setVisible(false)
    return
  }

  if (shouldHideWebViewForPendingNavigation()) {
    jwView.setBounds(hiddenBounds)
    jwView.setVisible(false)
    return
  }

  if (shouldHideWebViewForLoadError()) {
    jwView.setBounds(hiddenBounds)
    jwView.setVisible(false)
    return
  }

  const jwNavigationWidth = getJwNavigationPanelWidth()
  const jwAgentPanelWidth = getJwAgentPanelWidth()
  const webContentTop = getActiveWebContentTop()
  jwView.setVisible(true)
  jwView.setBounds({
    x: appSidebarWidth + jwNavigationWidth,
    y: APP_TITLEBAR_HEIGHT + webContentTop,
    width: Math.max(0, bounds.width - appSidebarWidth - jwNavigationWidth - jwAgentPanelWidth),
    height: Math.max(0, bounds.height - APP_TITLEBAR_HEIGHT - webContentTop)
  })
}

function isAllowedNavigation(url) {
  return isTrustedJwNavigation(url)
}

function isTrustedJwNavigation(url) {
  try {
    normalizeJwUrl(url)
    return true
  } catch {
    return false
  }
}

function getFeatureDefaultUrl() {
  return DEFAULT_JW_URL
}

function getFeatureDefaultTitle() {
  return '教务系统'
}

function getFeatureForUrl(url) {
  try {
    const parsed = new URL(String(url || ''))
    if (ALLOWED_JW_HOSTS.has(parsed.hostname)) {
      return 'browser'
    }
  } catch {
    // fall through to the current workspace feature
  }
  return 'browser'
}

function isBlankBrowserTab(tab) {
  return !!tab && (tab.isBlank === true || !tab.url)
}

function createBrowserTab(rawUrl, options = {}) {
  const feature = normalizeWorkspaceFeature(options.feature || getFeatureForUrl(rawUrl))
  const safeFeature = WEB_WORKSPACE_FEATURES.has(feature) ? feature : 'browser'
  const url = normalizeJwUrl(rawUrl || getFeatureDefaultUrl(safeFeature))
  const actualFeature = getFeatureForUrl(url)
  const tab = {
    id: `tab-${++browserTabSequence}`,
    feature: actualFeature,
    title: options.title || getStableTabTitleForUrl(url, actualFeature),
    url,
    loading: false,
    isBlank: false,
    loadError: null
  }
  browserTabs.push(tab)
  return tab
}

function initializeBrowserTabs() {
  if (browserTabs.length > 0) {
    return
  }
  const tab = createBrowserTab(DEFAULT_JW_URL, {
    feature: 'browser'
  })
  activeBrowserTabId = tab.id
  activeWorkspaceFeature = tab.feature
  lastActiveBrowserTabByFeature.set(tab.feature, tab.id)
}

function getActiveBrowserTab() {
  initializeBrowserTabs()
  let tab = browserTabs.find((item) => item.id === activeBrowserTabId)
  if (!tab) {
    tab = browserTabs[0]
    activeBrowserTabId = tab.id
  }
  return tab
}

function serializeBrowserTabs() {
  const activeFeature = WEB_WORKSPACE_FEATURES.has(activeWorkspaceFeature)
    ? activeWorkspaceFeature
    : 'browser'
  return browserTabs.filter((tab) => tab.feature === activeFeature).map((tab) => ({
    id: tab.id,
    feature: tab.feature,
    title: tab.title,
    url: tab.url,
    loading: !!tab.loading,
    isBlank: isBlankBrowserTab(tab),
    loadError: tab.loadError || null
  }))
}

function updateBrowserTabFromWebContents(view) {
  if (!view || view.webContents.isDestroyed()) {
    return
  }
  const tab = getBrowserTabForWebView(view)
  if (!tab) {
    return
  }

  const isActiveTab = tab.id === activeBrowserTabId
  const currentUrl = view.webContents.getURL()
  if (
    tab.loadError &&
    (
      currentUrl === 'chrome-error://chromewebdata/' ||
      areSameWebUrl(currentUrl, tab.loadError.url)
    )
  ) {
    tab.loading = view.webContents.isLoading()
    return
  }

  if (currentUrl && currentUrl !== 'about:blank') {
    const currentFeature = getFeatureForUrl(currentUrl)
    const wasPendingNavigation = pendingWebNavigation?.tabId === tab.id
    if (
      wasPendingNavigation &&
      view.webContents.isLoading() &&
      !areSameWebUrl(currentUrl, pendingWebNavigation.url)
    ) {
      tab.loading = view.webContents.isLoading()
      return
    }

    const previousFeature = tab.feature
    clearPendingWebNavigation(tab.id)
    tab.url = currentUrl
    tab.feature = currentFeature
    tab.isBlank = false
    tab.loadError = null
    if (isActiveTab) {
      activeWorkspaceFeature = tab.feature
      lastActiveBrowserTabByFeature.set(tab.feature, tab.id)
      if (previousFeature && previousFeature !== tab.feature) {
        clearWebNavigationHistory(view)
      }
    }
    tab.loading = view.webContents.isLoading()
    if (wasPendingNavigation) {
      return
    }
  }
  const title = view.webContents.getTitle()
  if (title && !tab.loadError) {
    tab.title = title
  }
  tab.loading = view.webContents.isLoading()
}

function updateActiveBrowserTabFromWebContents() {
  updateBrowserTabFromWebContents(jwView)
}

async function activateBrowserTab(tabId) {
  initializeBrowserTabs()
  const tab = browserTabs.find((item) => item.id === tabId) || browserTabs[0]
  activeBrowserTabId = tab.id
  activeWorkspaceFeature = tab.feature
  lastActiveBrowserTabByFeature.set(tab.feature, tab.id)
  if (isBlankBrowserTab(tab)) {
    jwView = null
    clearPendingWebNavigation(tab.id)
    layoutViews()
    publishJwState()
    return getJwState()
  }

  const view = ensureWebViewForTab(tab)
  if (!view) {
    return getJwState()
  }
  jwView = view
  mainWindow?.contentView.addChildView(view)
  sendJwOriginalModeToView(view)
  layoutViews()

  const currentUrl = view.webContents.getURL()
  if ((!currentUrl || currentUrl === 'about:blank' || !areSameWebUrl(currentUrl, tab.url)) && !view.webContents.isLoading()) {
    markPendingWebNavigation(tab)
    layoutViews()
    try {
      await view.webContents.loadURL(tab.url)
      clearWebNavigationHistory(view)
    } catch (error) {
      clearPendingWebNavigation(tab.id)
      throw error
    }
  }
  updateBrowserTabFromWebContents(view)
  layoutViews()
  publishJwState()
  return getJwState()
}

async function openBrowserTab(rawUrl, options = {}) {
  const tab = createBrowserTab(rawUrl, options)
  return activateBrowserTab(tab.id)
}

async function activateFeatureTab(feature) {
  const safeFeature = normalizeWorkspaceFeature(feature)
  if (!WEB_WORKSPACE_FEATURES.has(safeFeature)) {
    activeWorkspaceFeature = safeFeature
    layoutViews()
    publishJwState()
    return getJwState()
  }

  initializeBrowserTabs()
  const rememberedTabId = lastActiveBrowserTabByFeature.get(safeFeature)
  const rememberedTab = browserTabs.find((tab) => tab.id === rememberedTabId && tab.feature === safeFeature)
  if (rememberedTab) {
    return activateBrowserTab(rememberedTab.id)
  }

  const existingTab = browserTabs.find((tab) => tab.feature === safeFeature)
  if (existingTab) {
    return activateBrowserTab(existingTab.id)
  }
  return openBrowserTab(getFeatureDefaultUrl(safeFeature), {
    feature: safeFeature
  })
}

async function logoutJwSession() {
  clearJwEvaluationSnapshot()
  jwMyCoursesCache = null
  if (!jwView || jwView.webContents.isDestroyed()) {
    return getJwState()
  }

  const tab = getActiveBrowserTab()
  const view = ensureWebViewForTab(tab)
  jwOriginalMode = false
  sendJwOriginalModeToView(view)
  setActiveJwPageContext()
  tab.feature = 'browser'
  tab.url = DEFAULT_JW_URL
  tab.title = '登录'
  tab.loading = true
  activeWorkspaceFeature = 'browser'
  lastActiveBrowserTabByFeature.set('browser', tab.id)
  markPendingWebNavigation(tab)
  layoutViews()

  try {
    await view.webContents.session.clearStorageData()
    await view.webContents.session.clearCache()
  } catch {
    // Loading the login entry below is still a safe fallback if local storage cleanup fails.
  }

  try {
    await view.webContents.loadURL(DEFAULT_JW_URL)
    clearWebNavigationHistory(view)
  } finally {
    clearPendingWebNavigation(tab.id)
  }

  updateBrowserTabFromWebContents(view)
  layoutViews()
  publishJwState()
  return getJwState()
}

function createWindow() {
  const jwSession = session.fromPartition('persist:linke-jw')
  jwSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  const initialWindowBounds = getInitialWindowBounds()
  mainWindow = new BaseWindow({
    ...initialWindowBounds,
    minWidth: 1120,
    minHeight: 680,
    title: '林课桌面端',
    icon: appIconPath,
    backgroundColor: '#f3f6fb',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 }
  })

  appView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'app-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  mainWindow.contentView.addChildView(appView)
  initializeBrowserTabs()
  const activeTab = getActiveBrowserTab()
  jwView = ensureWebViewForTab(activeTab)
  layoutViews()

  mainWindow.on('resize', layoutViews)
  mainWindow.on('resize', scheduleWindowStateSave)
  mainWindow.on('move', scheduleWindowStateSave)
  mainWindow.on('close', saveWindowState)
  mainWindow.on('closed', () => {
    clearTimeout(windowStateSaveTimer)
    mainWindow = undefined
    appView = undefined
    jwView = undefined
    webViewByTabId = new Map()
  })

  appView.webContents.loadURL(getAppUrl())
  activateBrowserTab(activeTab.id).catch(() => {})

  appView.webContents.once('did-finish-load', () => {
    publishJwNavigationCatalog()
    if (isDebugEnabled()) {
      openDevTools('app')
    }
  })

}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath)
  }

  installAppMenu()
  createWindow()

  app.on('activate', () => {
    if (!mainWindow) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', saveWindowState)

ipcMain.handle('browser:get-state', () => getJwState())

ipcMain.handle('jw:original-mode:set', (event, payload = {}) => {
  assertAppOrManagedWebViewSender(event)
  return applyJwOriginalMode(!!payload.enabled)
})

ipcMain.handle('jw:navigation:get', (event) => {
  assertAppSender(event)
  return readTrustedJwNavigationCache()
})

ipcMain.handle('jw:navigation-favorites:get', (event) => {
  assertAppSender(event)
  return readJwNavigationFavorites()
})

ipcMain.handle('jw:navigation-favorites:toggle', (event, payload = {}) => {
  assertAppSender(event)
  return toggleJwNavigationFavorite(payload)
})

ipcMain.handle('jw:navigation:open', (event, payload = {}) => {
  assertAppSender(event)
  setActiveJwPageContext(payload)
  sendToJw('jw:navigation:open', {
    id: String(payload.id || ''),
    title: String(payload.title || ''),
    groupTitle: String(payload.groupTitle || ''),
    parentTitle: String(payload.parentTitle || '')
  })
  publishJwState()
  return { ok: true }
})

ipcMain.handle('jw:logout', async (event) => {
  assertAppSender(event)
  return logoutJwSession()
})

ipcMain.handle('jw:evaluation-courses:get', async (event, payload = {}) => {
  assertAppSender(event)
  return loadJwEvaluationCourses({ force: payload.force === true })
})

ipcMain.handle('jw:evaluation-snapshot:get', (event) => {
  assertAppSender(event)
  return getCachedJwEvaluationPayload()
})

ipcMain.handle('jw:evaluation-status:refresh', async (event) => {
  assertAppSender(event)
  return refreshJwEvaluationStatus()
})

ipcMain.handle('jw:evaluation-courses:sync', async (event) => {
  assertAppSender(event)
  return loadJwEvaluationCourses({ force: true })
})

ipcMain.handle('jw:my-courses:get', async (event, payload = {}) => {
  assertAppSender(event)
  return loadJwMyCourses({
    force: payload.force === true,
    requestId: String(payload.requestId || ''),
    onProgress: (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('jw:my-courses-progress', progress)
      }
    }
  })
})

ipcMain.handle('linke:courses:search', async (event, payload = {}) => {
  assertAppSender(event)
  return searchLinkeCourses(payload)
})

ipcMain.handle('linke:course-detail:get', async (event, payload = {}) => {
  assertAppSender(event)
  return getLinkeCourseDetail(payload)
})

ipcMain.handle('linke:course-comments:get', async (event, payload = {}) => {
  assertAppSender(event)
  return getLinkeCourseComments(payload)
})

ipcMain.handle('linke:course-comment:mine', async (event, payload = {}) => {
  assertAppSender(event)
  return getMyLinkeCourseComment(payload)
})

ipcMain.handle('linke:course-comment:post', async (event, payload = {}) => {
  assertAppSender(event)
  return submitLinkeCourseComment(payload)
})

ipcMain.handle('linke:course-comment:update', async (event, payload = {}) => {
  assertAppSender(event)
  return updateLinkeCourseComment(payload)
})

ipcMain.handle('linke:course-comment:delete', async (event, payload = {}) => {
  assertAppSender(event)
  return deleteLinkeCourseComment(payload)
})

ipcMain.handle('linke:course-comment:like', async (event, payload = {}) => {
  assertAppSender(event)
  return likeLinkeCourseComment(payload)
})

ipcMain.handle('linke:collections:get', async (event) => {
  assertAppSender(event)
  return getLinkeCollections()
})

ipcMain.handle('linke:course-collection:set', async (event, payload = {}) => {
  assertAppSender(event)
  return setLinkeCourseCollection(payload)
})

ipcMain.handle('layout:set-sidebar-collapsed', (event, payload = {}) => {
  assertAppSender(event)
  return applySidebarCollapsed(!!payload.collapsed)
})

ipcMain.on('layout:set-sidebar-collapsed-sync', (event, payload = {}) => {
  try {
    assertAppSender(event)
    event.returnValue = applySidebarCollapsed(!!payload.collapsed)
  } catch (error) {
    event.returnValue = {
      collapsed: !!payload.collapsed,
      width: appSidebarWidth,
      error: error.message || 'Failed to update sidebar layout.'
    }
  }
})

ipcMain.handle('layout:set-jw-shell', (event, payload = {}) => {
  assertAppSender(event)
  return applyJwShellLayout(payload)
})

ipcMain.handle('layout:set-active-feature', async (event, payload = {}) => {
  assertAppSender(event)
  activeWorkspaceFeature = normalizeWorkspaceFeature(payload.feature)
  return activateFeatureTab(activeWorkspaceFeature)
})

ipcMain.handle('credentials:get', (event) => {
  assertAppSender(event)
  return readCredentials()
})

ipcMain.handle('credentials:save', (event, payload = {}) => {
  assertAppSender(event)
  const previousAccount = readCredentials().account
  jwMyCoursesCache = null
  updateLinkeCollectionHighlightPayload([])
  const credentials = saveCredentials(payload)
  if (previousAccount && previousAccount !== credentials.account) {
    clearJwEvaluationSnapshot()
  } else {
    jwEvaluationCoursesCache = null
  }
  sendToJw('credentials:changed', { at: Date.now(), force: true })
  scheduleLinkeCollectionHighlightRefresh({ force: true })
  return credentials
})

ipcMain.handle('credentials:clear', (event) => {
  assertAppSender(event)
  clearJwEvaluationSnapshot()
  jwMyCoursesCache = null
  updateLinkeCollectionHighlightPayload([])
  const credentials = clearCredentials()
  sendToJw('credentials:changed', { at: Date.now() })
  return credentials
})

ipcMain.handle('credentials:remember-from-jw', (event, payload = {}) => {
  const view = assertJwSender(event)
  if (!isTrustedJwNavigation(view.webContents.getURL())) {
    throw new Error('Credentials can only be remembered from trusted JW pages.')
  }
  const account = String(payload.account || '').trim()
  const password = String(payload.password || '')
  if (!account || !password) {
    throw new Error('Account and password are required.')
  }
  const previousAccount = readCredentials().account
  jwMyCoursesCache = null
  updateLinkeCollectionHighlightPayload([])
  const credentials = saveCredentials({ account, password })
  if (previousAccount && previousAccount !== credentials.account) {
    clearJwEvaluationSnapshot()
  } else {
    jwEvaluationCoursesCache = null
  }
  scheduleLinkeCollectionHighlightRefresh({ force: true })
  sendToApp('jw:credential-status', {
    status: 'saved',
    message: '账号密码已在登录成功后自动保存',
    at: Date.now()
  })
  return credentials
})

ipcMain.handle('credentials:get-for-jw', (event, payload = {}) => {
  const view = assertJwSender(event)
  if (!isTrustedJwNavigation(view.webContents.getURL())) {
    throw new Error('Credentials are only available on trusted JW pages.')
  }
  return readCredentials()
})

ipcMain.handle('jw:navigation-cache:get', (event) => {
  const view = assertJwSender(event)
  if (!isTrustedJwNavigation(view.webContents.getURL())) {
    throw new Error('Navigation cache is only available on trusted JW pages.')
  }
  return readJwNavigationCache()
})

ipcMain.handle('jw:navigation-cache:save', (event, payload = {}) => {
  const view = assertJwSender(event)
  if (!isTrustedJwNavigation(view.webContents.getURL())) {
    throw new Error('Navigation cache can only be saved from trusted JW pages.')
  }
  const cache = saveJwNavigationCache(payload)
  layoutViews()
  publishJwNavigationCatalog()
  return cache
})

ipcMain.handle('captcha:recognize', async (event, payload = {}) => {
  const view = assertJwSender(event)
  if (!isTrustedJwNavigation(view.webContents.getURL())) {
    throw new Error('Captcha recognition is only allowed on trusted JW pages.')
  }
  const result = await recognizeCaptchaImage(payload.imageBase64)
  sendToApp('jw:captcha-status', {
    status: 'filled',
    message: '验证码已自动识别',
    at: Date.now()
  })
  return { result }
})

ipcMain.on('jw:captcha-status', (event, payload) => {
  try {
    assertJwSender(event)
  } catch {
    return
  }
  sendToApp('jw:captcha-status', payload)
})

ipcMain.on('jw:credential-status', (event, payload) => {
  try {
    assertJwSender(event)
  } catch {
    return
  }
  sendToApp('jw:credential-status', payload)
})

ipcMain.on('jw:course-search-request', (event, payload = {}) => {
  try {
    assertJwSender(event)
  } catch {
    return
  }
  const keyword = normalizeJwCourseSearchKeyword(payload.keyword)
  if (!isValidJwCourseSearchKeyword(keyword)) {
    return
  }
  sendToApp('linke:database-search-request', {
    keyword,
    source: String(payload.source || 'jw-course-name'),
    url: String(payload.url || ''),
    title: String(payload.title || ''),
    at: Date.now()
  })
})

ipcMain.on('jw:navigation-debug', (event, payload) => {
  try {
    assertJwSender(event)
  } catch {
    return
  }
  saveJwNavigationDebug(payload)
})

ipcMain.on('jw:personal-notice-opening', (event, payload = {}) => {
  try {
    assertJwSender(event)
  } catch {
    return
  }
  rememberJwPersonalNoticeWindowIntent(payload)
})

ipcMain.on('jw:personal-notice-opening-sync', (event, payload = {}) => {
  try {
    assertJwSender(event)
    rememberJwPersonalNoticeWindowIntent(payload)
    event.returnValue = { ok: true }
  } catch (error) {
    event.returnValue = { ok: false, error: error.message || 'Invalid sender.' }
  }
})
