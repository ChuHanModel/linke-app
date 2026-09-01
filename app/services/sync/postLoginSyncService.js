import { APP_SERVICES } from '@/constants/services.js'
import { post, postJson } from '@/repositories/appApi.js'
import { loadScheduleAfterLogin } from '@/utils/scheduleLoader.js'
import { loadEvaluationData } from '@/utils/evaluationLoader.js'
import { loadCreditAfterLogin } from '@/utils/creditLoader.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'
import { setAppGlobal } from '@/utils/appGlobalStorage.js'

let activePostLoginSyncPromise = null

function readPostLoginSyncState() {
  try {
    const app = getApp()
    const state = app && app.globalData ? app.globalData.postLoginSyncState : null
    if (state && typeof state === 'object') return state
  } catch (e) {}
  return {
    status: 'idle',
    startedAt: 0,
    finishedAt: 0,
    taskResults: [],
    taskProgress: {}
  }
}

function writePostLoginSyncState(patch = {}) {
  try {
    const app = getApp()
    if (!app || !app.globalData) return
    app.globalData.postLoginSyncState = {
      ...readPostLoginSyncState(),
      ...patch
    }
  } catch (e) {}
}

export function getPostLoginSyncState() {
  return readPostLoginSyncState()
}

export function waitForPostLoginSync(timeoutMs = 15000) {
  if (!activePostLoginSyncPromise) return Promise.resolve()
  return Promise.race([
    activePostLoginSyncPromise.then(() => {}).catch(() => {}),
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ])
}

export async function registerUserWithCookie({ userId, userPassword, userCookie, userInfo }) {
  if (!userId || !userPassword || !userCookie) return false
  const userName = userInfo?.user?.name || userId
  let registerRes = null
  try {
    registerRes = await post(APP_SERVICES.userRegisterWithCookie, {
      userId,
      userPassword,
      userCookie,
      userName,
      userUnit: userInfo?.user?.unit || '',
      userDiscipline: userInfo?.user?.discipline || '',
      userClass: userInfo?.user?.class || ''
    }, {
      dedupeKey: `user_register:${String(userId).trim()}`
    })
  } catch (error) {
    console.warn('registerUserWithCookie: 完整资料注册失败，尝试最小参数重试', error && (error.message || error))
    registerRes = await post(APP_SERVICES.userRegisterWithCookie, {
      userId,
      userPassword,
      userCookie,
      userName
    }, {
      dedupeKey: `user_register:${String(userId).trim()}:fallback`
    })
  }
  if (registerRes && registerRes.userKey) {
    uni.setStorageSync('userKey', registerRes.userKey)
    setAppGlobal('userData', {
      ...(getApp()?.globalData?.userData || {}),
      userId,
      userPassword,
      userKey: registerRes.userKey,
      userInfo: userInfo || ''
    })
    return registerRes.userKey
  }
  return ''
}

function buildInitialTaskProgress(tasks) {
  const progress = {}
  for (const task of tasks) {
    progress[task.key] = { status: 'pending', message: '', startedAt: 0, finishedAt: 0 }
  }
  return progress
}

function patchTaskProgress(key, patch) {
  const current = readPostLoginSyncState()
  const tp = { ...(current.taskProgress || {}) }
  tp[key] = { ...(tp[key] || { status: 'pending', message: '', startedAt: 0, finishedAt: 0 }), ...patch }
  writePostLoginSyncState({ taskProgress: tp })
}

function appendTaskResult(result) {
  const current = readPostLoginSyncState()
  const list = Array.isArray(current.taskResults) ? current.taskResults.slice() : []
  list.push(result)
  writePostLoginSyncState({ taskResults: list })
}

async function runPostLoginSync({ cookieHeader, onProgress = () => {} }) {
  onProgress('正在同步课表、评价、学分...')
  const tasks = [
    {
      key: 'schedule',
      label: '课表同步',
      run: (handler) => loadScheduleAfterLogin(cookieHeader, handler)
    },
    {
      key: 'evaluation',
      label: '评价同步',
      run: (handler) => loadEvaluationData(cookieHeader, handler)
    },
    {
      key: 'credit',
      label: '学分同步',
      run: (handler) => loadCreditAfterLogin(cookieHeader, handler)
    }
  ]

  // 初始化每个任务的进度槽位，便于 UI 立即展示
  writePostLoginSyncState({ taskProgress: buildInitialTaskProgress(tasks), taskResults: [] })

  const results = await Promise.all(tasks.map(async (task) => {
    patchTaskProgress(task.key, { status: 'running', message: '准备中...', startedAt: Date.now() })
    const handler = (msg) => {
      const safeMsg = typeof msg === 'string' ? msg : ''
      patchTaskProgress(task.key, { status: 'running', message: safeMsg })
      if (safeMsg) onProgress(safeMsg)
    }
    try {
      await task.run(handler)
      patchTaskProgress(task.key, { status: 'fulfilled', message: '已完成', finishedAt: Date.now() })
      const result = { key: task.key, status: 'fulfilled' }
      appendTaskResult(result)
      return result
    } catch (error) {
      const message = error && error.message ? error.message : String(error || '')
      console.warn(`登录后同步 ${task.key} 失败:`, error)
      patchTaskProgress(task.key, { status: 'rejected', message: message || '加载失败', finishedAt: Date.now() })
      const result = { key: task.key, status: 'rejected', message }
      appendTaskResult(result)
      return result
    }
  }))

  return results
}

export function startPostLoginSync({ cookieHeader, onProgress = () => {} }) {
  if (!cookieHeader) return Promise.resolve([])
  if (activePostLoginSyncPromise) return activePostLoginSyncPromise

  const startedAt = Date.now()
  writePostLoginSyncState({
    status: 'running',
    startedAt,
    finishedAt: 0,
    taskResults: [],
    taskProgress: {}
  })

  activePostLoginSyncPromise = runPostLoginSync({ cookieHeader, onProgress })
    .then((taskResults) => {
      writePostLoginSyncState({
        status: taskResults.every(item => item.status === 'fulfilled') ? 'success' : 'partial',
        finishedAt: Date.now(),
        taskResults
      })
      return taskResults
    })
    .catch((error) => {
      writePostLoginSyncState({
        status: 'error',
        finishedAt: Date.now(),
        taskResults: [{
          key: 'post-login-sync',
          status: 'rejected',
          message: error && error.message ? error.message : String(error || '')
        }]
      })
      throw error
    })
    .finally(() => {
      activePostLoginSyncPromise = null
    })

  return activePostLoginSyncPromise
}

export function syncAfterLogin({ cookieHeader, onProgress = () => {} }) {
  return startPostLoginSync({ cookieHeader, onProgress })
}

export async function syncScoresInBackground(userKey) {
  if (!userKey) return
  post(APP_SERVICES.userReloadScore, { userKey }).catch(err => console.warn('同步成绩失败:', err))
  const creditData = getApp()?.globalData?.globalCreditParsed || {}
  if (creditData && typeof creditData === 'object' && Object.keys(creditData).length > 0) {
    postJson(APP_SERVICES.userImportScoresFromCredit, { userKey, creditData })
      .catch(err => console.warn('从学分类别成绩导入成绩失败:', err))
  }
}

export async function ensureRegisteredSession() {
  return ensureUserRegistered()
}
