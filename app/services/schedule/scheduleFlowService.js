import { autoLoginJw } from '@/utils/jwAutoLogin.js'
import {
  applyParsedSchedule,
  parseScheduleEndWeek,
  parseScheduleStartWeek,
  requestScheduleWeek,
  updateGlobalScheduleState
} from '@/services/schedule/scheduleService.js'

function getErrorMessage(error, fallback = '未知错误') {
  return error && error.message ? error.message : fallback
}

function isPasswordError(error) {
  return !!(error && (error.isPasswordError || (error.message && error.message.indexOf('密码错误') !== -1)))
}

export async function ensureScheduleCookie(vm, providedCookie = null, loadingText = '正在自动重新登录...') {
  let cookie = providedCookie || vm.getCookieHeader()
  if (cookie) return cookie
  vm.scheduleLoadStatus = loadingText
  return autoLoginJw({
    onProgress: msg => {
      vm.scheduleLoadStatus = msg
    }
  })
}

export async function loadScheduleBatch(vm, targetTerm, providedCookie = null) {
  if (vm.loadScheduleBatchController) {
    vm.loadScheduleBatchController.cancelled = true
  }
  const controller = { cancelled: false }
  vm.loadScheduleBatchController = controller

  let cookie = providedCookie || vm.getCookieHeader()
  if (!cookie) throw new Error('请先完成教务登录')
  const term = targetTerm || vm.term
  if (!vm.scheduleCache[term]) vm.scheduleCache[term] = {}
  const allSchedules = []
  const maxWeeks = 30
  const REQUEST_TIMEOUT = 15000

  for (let week = 1; week <= maxWeeks; week++) {
    if (controller.cancelled) throw new Error('请求已取消')
    cookie = vm.getCookieHeader()
    if (!cookie) throw new Error('请先完成教务登录')
    vm.scheduleLoadingWeek = week
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`请求超时（${REQUEST_TIMEOUT}ms）`)), REQUEST_TIMEOUT)
      })
      const requestPromise = requestScheduleWeek({
        cookie,
        term,
        week,
        onProgress: (msg) => { vm.scheduleLoadStatus = msg }
      })
      const res = await Promise.race([requestPromise, timeoutPromise]).catch((raceErr) => {
        if (raceErr && raceErr.message && raceErr.message.includes('超时')) return null
        throw raceErr
      })
      if (!res) continue
      if (!res.grid.length) continue
      applyParsedSchedule(vm, term, week, res)
      allSchedules.push(...res.schedules)
      if (week < maxWeeks) await new Promise(r => setTimeout(r, 100))
    } catch (error) {
      if (controller.cancelled) throw new Error('请求已取消')
      if (isPasswordError(error)) {
        vm.scheduleLoadStatus = '密码已更改，请重新登录'
        vm.handlePasswordError()
        throw new Error('密码已更改，请重新登录')
      }
      if (error && error.message && error.message.includes('超时')) continue
      vm.scheduleLoadStatus = getErrorMessage(error, '加载失败')
      console.warn('[form] loadScheduleBatch week failed:', week, error)
    }
  }

  if (controller.cancelled) throw new Error('请求已取消')

  vm.scheduleLoadingWeek = null
  const startWeek = parseScheduleStartWeek(allSchedules)
  const endWeek = parseScheduleEndWeek(allSchedules)
  vm.scheduleStartWeek = startWeek
  vm.scheduleEndWeek = endWeek
  if (startWeek !== null && vm.scheduleCache[term][String(startWeek)]) {
    vm.currentWeek = startWeek
    vm.scheduleGrid = vm.scheduleCache[term][String(startWeek)]
  } else if (vm.scheduleCache[term]['1']) {
    vm.scheduleGrid = vm.scheduleCache[term]['1']
  }
  try {
    uni.setStorage({ key: `schedule_${term}`, data: vm.scheduleCache[term] })
  } catch (e) {}
}

export async function changeScheduleTerm(vm, newTerm) {
  vm.term = newTerm
  vm.scheduleGrid = []
  vm.scheduleLoadStatus = '正在加载...'
  vm.scheduleStartWeek = null
  vm.scheduleEndWeek = null
  vm.scheduleLoadingWeek = null
  const cacheKey = `schedule_${newTerm}`
  try {
    try {
      const cached = uni.getStorageSync(cacheKey)
      if (cached && typeof cached === 'object') {
        if (!vm.scheduleCache[newTerm]) vm.scheduleCache[newTerm] = {}
        vm.scheduleCache[newTerm] = cached
        if (cached['1']) vm.scheduleGrid = cached['1']
        const allSchedules = []
        Object.keys(cached).forEach(week => {
          if (!Array.isArray(cached[week])) return
          cached[week].forEach(row => {
            if (!Array.isArray(row)) return
            row.forEach(cell => {
              if (cell && cell.time) allSchedules.push(cell)
            })
          })
        })
        if (allSchedules.length > 0) {
          vm.scheduleStartWeek = parseScheduleStartWeek(allSchedules)
          vm.scheduleEndWeek = parseScheduleEndWeek(allSchedules)
          if (vm.scheduleStartWeek !== null && cached[String(vm.scheduleStartWeek)]) {
            vm.currentWeek = vm.scheduleStartWeek
            vm.scheduleGrid = cached[String(vm.scheduleStartWeek)]
          }
        }
        vm.scheduleLoadStatus = '切换成功（使用缓存）'
        updateGlobalScheduleState(vm)
        return
      }
    } catch (e) {
      console.warn('[form] term change cache read error', e)
    }
    const cookie = await ensureScheduleCookie(vm, null, '正在自动重新登录...')
    vm.scheduleLoadStatus = '登录成功，正在加载课表...'
    await loadScheduleBatch(vm, newTerm, cookie)
    vm.scheduleLoadStatus = '切换成功'
    updateGlobalScheduleState(vm)
  } catch (error) {
    if (isPasswordError(error)) {
      vm.scheduleLoadStatus = '密码已更改，请重新登录'
      vm.handlePasswordError()
      return
    }
    vm.scheduleLoadStatus = `切换失败：${getErrorMessage(error)}`
  } finally {
    vm.scheduleLoadingWeek = null
  }
}

export async function refreshSchedule(vm) {
  if (vm.isRefreshing) return
  if (!vm.term) {
    uni.showToast({ title: '请先选择学期', icon: 'none' })
    return
  }

  try {
    const cookie = await ensureScheduleCookie(vm, null, '正在自动重新登录...')
    vm.scheduleLoadStatus = vm.getCookieHeader() ? '正在刷新课表...' : '登录成功，正在刷新课表...'
    await doRefreshSchedule(vm, cookie)
  } catch (error) {
    if (isPasswordError(error)) {
      vm.scheduleLoadStatus = '密码已更改，请重新登录'
      vm.handlePasswordError()
      return
    }
    vm.scheduleLoadStatus = `刷新失败：${getErrorMessage(error, '自动登录失败，请手动登录')}`
    uni.showToast({ title: '刷新失败', icon: 'none' })
  }
}

export async function doRefreshSchedule(vm, cookie) {
  vm.isRefreshing = true
  vm.scheduleLoadStatus = '正在刷新课表...'
  const backupCache = vm.scheduleCache[vm.term] ? JSON.parse(JSON.stringify(vm.scheduleCache[vm.term])) : null
  const backupGrid = JSON.parse(JSON.stringify(vm.scheduleGrid))
  const backupStartWeek = vm.scheduleStartWeek
  const backupEndWeek = vm.scheduleEndWeek
  const backupCurrentWeek = vm.currentWeek
  vm.scheduleGrid = []
  vm.scheduleStartWeek = null
  vm.scheduleEndWeek = null
  vm.scheduleLoadingWeek = null

  try {
    if (vm.scheduleCache[vm.term]) vm.scheduleCache[vm.term] = {}
    try { uni.removeStorageSync(`schedule_${vm.term}`) } catch (e) {}
    await loadScheduleBatch(vm, vm.term, cookie)
    vm.scheduleLoadStatus = '刷新成功'
    updateGlobalScheduleState(vm)
    uni.showToast({ title: '刷新成功', icon: 'success', duration: 1500 })
  } catch (error) {
    console.error('[form] refreshSchedule error:', error)
    if (isPasswordError(error)) {
      vm.scheduleLoadStatus = '密码已更改，请重新登录'
      vm.handlePasswordError()
      return
    }
    if (backupCache) vm.scheduleCache[vm.term] = backupCache
    vm.scheduleGrid = backupGrid
    vm.scheduleStartWeek = backupStartWeek
    vm.scheduleEndWeek = backupEndWeek
    vm.currentWeek = backupCurrentWeek
    try {
      if (backupCache) uni.setStorageSync(`schedule_${vm.term}`, backupCache)
    } catch (e) {}
    updateGlobalScheduleState(vm)
    vm.scheduleLoadStatus = `刷新失败：${getErrorMessage(error)}`
    uni.showToast({ title: '刷新失败，已恢复原数据', icon: 'none', duration: 2000 })
  } finally {
    vm.isRefreshing = false
    vm.scheduleLoadingWeek = null
  }
}
