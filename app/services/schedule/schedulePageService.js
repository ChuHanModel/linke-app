import {
  applyParsedSchedule,
  getCookieHeaderFromGlobal,
  loadScheduleCacheFromStorage,
  parseScheduleEndWeek,
  parseScheduleHtmlToGrid,
  parseScheduleStartWeek,
  requestScheduleWeek,
  restoreScheduleStateFromGlobal,
  updateGlobalScheduleState
} from '@/services/schedule/scheduleService.js'

export function syncScheduleFromGlobal(vm) {
  restoreScheduleStateFromGlobal(vm)
  if (vm.scheduleGrid.length === 0 && vm.term) {
    loadScheduleCacheFromStorage(vm)
  }
}

export function getScheduleCookie() {
  return getCookieHeaderFromGlobal()
}

export function getScheduleMinWeek(schedule) {
  return parseScheduleStartWeek(schedule)
}

export function getScheduleMaxWeek(schedule) {
  return parseScheduleEndWeek(schedule)
}

export async function applyCurrentWeekGrid(vm) {
  const weekKey = String(vm.currentWeek)
  if (vm.scheduleCache[vm.term] && vm.scheduleCache[vm.term][weekKey]) {
    vm.scheduleGrid = vm.scheduleCache[vm.term][weekKey]
  } else {
    await loadScheduleForWeek(vm, vm.currentWeek)
  }
  updateGlobalScheduleState(vm)
}

export function goPrevWeek(vm) {
  if (vm.scheduleStartWeek === null) {
    if (vm.currentWeek <= 1) return
  } else if (vm.currentWeek <= vm.scheduleStartWeek) {
    return
  }
  vm.currentWeek--
  return applyCurrentWeekGrid(vm)
}

export function goNextWeek(vm) {
  if (vm.scheduleEndWeek === null) {
    if (vm.currentWeek >= vm.totalWeeks) return
  } else if (vm.currentWeek >= vm.scheduleEndWeek) {
    return
  }
  vm.currentWeek++
  return applyCurrentWeekGrid(vm)
}

export function changeScheduleWeekByPicker(vm, event) {
  if (!event || !event.detail) return
  const raw = event.detail.value
  const index = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
  if (isNaN(index) || index < 0 || index >= vm.weekOptions.length) return
  const minWeek = vm.scheduleStartWeek !== null ? vm.scheduleStartWeek : 1
  const newWeek = minWeek + index
  if (newWeek === vm.currentWeek) return
  vm.currentWeek = newWeek
  return applyCurrentWeekGrid(vm)
}

export async function loadScheduleForWeek(vm, week) {
  const targetWeek = week || vm.currentWeek
  const weekKey = String(targetWeek)
  if (vm.scheduleCache[vm.term] && vm.scheduleCache[vm.term][weekKey]) {
    vm.scheduleGrid = vm.scheduleCache[vm.term][weekKey]
    return
  }

  const cookie = getScheduleCookie()
  if (!cookie) {
    vm.scheduleLoadStatus = '请先完成教务登录'
    return
  }

  try {
    vm.scheduleLoadingWeek = targetWeek
    const parsed = await requestScheduleWeek({
      cookie,
      term: vm.term,
      week: targetWeek,
      onProgress: (msg) => { vm.scheduleLoadStatus = msg }
    })
    applyScheduleHtmlResult(vm, parsed, targetWeek)
  } catch (error) {
    if (error && error.isPasswordError) {
      vm.scheduleLoadStatus = '密码已更改，请重新登录'
      vm.handlePasswordError()
      return
    }
    console.error('[form] loadScheduleForWeek error:', error)
    vm.scheduleLoadStatus = `加载第${targetWeek}周失败：${error.message || '未知错误'}`
  } finally {
    vm.scheduleLoadingWeek = null
  }
}

export function applyScheduleHtmlResult(vm, parsed, week) {
  let normalized = parsed
  if (typeof normalized === 'string') {
    normalized = parseScheduleHtmlToGrid(normalized)
  }
  if (!normalized || !Array.isArray(normalized.grid) || normalized.grid.length === 0) {
    if (!vm.scheduleCache[vm.term]) vm.scheduleCache[vm.term] = {}
    vm.scheduleCache[vm.term][String(week)] = []
    vm.scheduleGrid = []
    return
  }
  applyParsedSchedule(vm, vm.term, week, normalized)
}
