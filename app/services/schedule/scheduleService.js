import { getAppGlobal, setAppGlobal } from '@/utils/appGlobalStorage.js'
import { post } from '@/repositories/appApi.js'
import { requestJw } from '@/utils/jwRequest.js'

export const BASE_URL = 'http://jw.sdufe.edu.cn'
export const SECTION_LABELS = ['1-2节', '3-4节', '5-6节', '7-8节', '9-10节', '11-12节']

export function defaultTerm() {
  try {
    return getAppGlobal('globalScheduleTerm') || uni.getStorageSync('currentTerm') || ''
  } catch (error) {
    return ''
  }
}

export function getSectionStart(sectionLabels, rowIndex) {
  const label = sectionLabels && sectionLabels[rowIndex]
  if (!label) return ''
  return String(label).split('-')[0]
}

export function getSectionEnd(sectionLabels, rowIndex) {
  const label = sectionLabels && sectionLabels[rowIndex]
  if (!label) return ''
  const parts = String(label).split('-')
  return parts[1] || ''
}

export function calculateCurrentWeek(startDate) {
  if (!startDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

export function getTodayDayIndex() {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

export function getCookieHeaderFromGlobal() {
  const app = getApp()
  return (app && app.globalData && app.globalData.globalCookie) || uni.getStorageSync('loginCookie') || ''
}

function extractWeekNumbers(text) {
  if (!text) return []
  const result = []
  const normalized = String(text).replace(/，/g, ',')
  const rangeRegex = /(\d+)\s*-\s*(\d+)/g
  let rangeMatch
  while ((rangeMatch = rangeRegex.exec(normalized)) !== null) {
    const start = Number(rangeMatch[1])
    const end = Number(rangeMatch[2])
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      result.push(start, end)
    }
  }
  const singleRegex = /(^|[^\d])(\d{1,2})(?=[周,\s]|$)/g
  let singleMatch
  while ((singleMatch = singleRegex.exec(normalized)) !== null) {
    const week = Number(singleMatch[2])
    if (!Number.isNaN(week)) result.push(week)
  }
  return result
}

export function parseScheduleStartWeek(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null
  const weeks = schedule.flatMap(item => extractWeekNumbers(item && item.time))
  if (weeks.length === 0) return null
  return Math.min(...weeks)
}

export function parseScheduleEndWeek(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null
  const weeks = schedule.flatMap(item => extractWeekNumbers(item && item.time))
  if (weeks.length === 0) return null
  return Math.max(...weeks)
}

export function updateGlobalScheduleState(vm) {
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.globalScheduleTerm = vm.term
    app.globalData.globalScheduleGrid = vm.scheduleGrid
    app.globalData.globalScheduleCurrentWeek = vm.currentWeek
    app.globalData.globalScheduleStartWeek = vm.scheduleStartWeek
    app.globalData.globalScheduleEndWeek = vm.scheduleEndWeek
  }
  setAppGlobal('globalScheduleTerm', vm.term)
  setAppGlobal('globalScheduleGrid', vm.scheduleGrid)
  setAppGlobal('globalScheduleCurrentWeek', vm.currentWeek)
  setAppGlobal('globalScheduleStartWeek', vm.scheduleStartWeek)
  setAppGlobal('globalScheduleEndWeek', vm.scheduleEndWeek)
  if (vm.termStartDate) setAppGlobal('globalTermStartDate', vm.termStartDate)
  if (vm.termEndDate) setAppGlobal('globalTermEndDate', vm.termEndDate)
}

export function updateGlobalScheduleWithDates(vm, currentWeek, isHoliday, startDate = null, endDate = null, term = null) {
  vm.currentWeek = currentWeek
  vm.isHoliday = isHoliday
  if (startDate) vm.termStartDate = startDate
  if (endDate) vm.termEndDate = endDate
  if (term) vm.term = term

  const app = getApp()
  if (app && app.globalData) {
    app.globalData.globalTermStartDate = vm.termStartDate
    app.globalData.globalTermEndDate = vm.termEndDate
    app.globalData.globalScheduleIsHoliday = vm.isHoliday
  }
  setAppGlobal('globalTermStartDate', vm.termStartDate)
  setAppGlobal('globalTermEndDate', vm.termEndDate)
  setAppGlobal('globalScheduleIsHoliday', vm.isHoliday)
  updateGlobalScheduleState(vm)
}

export function restoreScheduleStateFromGlobal(vm) {
  // 优先从 globalData（运行时内存）读取
  let term = getAppGlobal('globalScheduleTerm')
  let grid = getAppGlobal('globalScheduleGrid')
  let currentWeek = getAppGlobal('globalScheduleCurrentWeek')
  let startWeek = getAppGlobal('globalScheduleStartWeek')
  let endWeek = getAppGlobal('globalScheduleEndWeek')
  let startDate = getAppGlobal('globalTermStartDate')
  let endDate = getAppGlobal('globalTermEndDate')
  let isHoliday = getAppGlobal('globalScheduleIsHoliday')

  // 冷启动时 globalData 为空，getAppGlobal 会自动降级从 localStorage 读取
  // 但需要确保 term 先被还原，后续 loadScheduleCacheFromStorage 才能从缓存加载课表格子
  if (!term) {
    // getAppGlobal 内部已处理 localStorage 降级（带 app_global_ 前缀）
    // 这里不需要额外操作，因为 getAppGlobal 在 globalData 为空时就会读 localStorage
    // 问题在于冷启动时 getApp().globalData 存在但键值为空
    // 所以需要先调用 restoreToGlobalData 恢复，这里直接用存储前缀读
    try {
      const prefix = 'app_global_'
      term = uni.getStorageSync(prefix + 'globalScheduleTerm') || ''
      currentWeek = uni.getStorageSync(prefix + 'globalScheduleCurrentWeek') || null
      startWeek = uni.getStorageSync(prefix + 'globalScheduleStartWeek')
      endWeek = uni.getStorageSync(prefix + 'globalScheduleEndWeek')
      startDate = uni.getStorageSync(prefix + 'globalTermStartDate') || ''
      endDate = uni.getStorageSync(prefix + 'globalTermEndDate') || ''
    } catch (e) {}
  }

  if (term) vm.term = term
  if (Array.isArray(grid)) vm.scheduleGrid = grid
  if (currentWeek) vm.currentWeek = currentWeek
  if (startWeek != null) vm.scheduleStartWeek = startWeek
  if (endWeek != null) vm.scheduleEndWeek = endWeek
  if (startDate) vm.termStartDate = startDate
  if (endDate) vm.termEndDate = endDate
  if (typeof isHoliday === 'boolean') vm.isHoliday = isHoliday
}

export function loadScheduleCacheFromStorage(vm) {
  if (!vm.term) return
  try {
    const cached = uni.getStorageSync(`schedule_${vm.term}`)
    if (!cached || typeof cached !== 'object') return
    if (!vm.scheduleCache[vm.term]) vm.scheduleCache[vm.term] = {}
    vm.scheduleCache[vm.term] = cached
    const currentWeekKey = String(vm.currentWeek)
    if (cached[currentWeekKey]) {
      vm.scheduleGrid = cached[currentWeekKey]
    } else if (cached['1']) {
      vm.scheduleGrid = cached['1']
    }
  } catch (error) {
    console.warn('[form] restore schedule cache error:', error)
  }
}

export function parseScheduleHtmlToGrid(html) {
  const courseMatches = html.matchAll(/kbcontent"\s?>(.*?)<\/div>/g)
  const courses = Array.from(courseMatches).map(m => m[1])
  if (courses.length < 35) return { grid: [], schedules: [] }

  const schedule = courses.map(courseHtml => {
    if (courseHtml === '&nbsp;') return { course: '', teacher: '', time: '', location: '' }
    const courseMatch = courseHtml.match(/(.*?)<font title='老师'>/)
    const teacherMatch = courseHtml.match(/<font title='老师'>(.*?)<\/font>/)
    const timeMatch = courseHtml.match(/<font title='周次.*?'>(.*?)<\/font>/)
    const locationMatch = courseHtml.match(/<font title='教室'>(.*?)<\/font>/)
    return {
      course: courseMatch ? courseMatch[1] : '',
      teacher: teacherMatch ? teacherMatch[1] : '',
      time: timeMatch ? timeMatch[1] : '',
      location: locationMatch ? locationMatch[1] : ''
    }
  })

  const remarkMatches = html.matchAll(/<\/th>.?<td.?colspan="7".?align="left">(.*?)<\/td>/g)
  const remarks = Array.from(remarkMatches).map(m => m[1])
  if (remarks.length > 0) schedule.push({ remark: remarks })

  const grid = []
  for (let index = 0; index < schedule.length; index += 7) {
    const row = schedule.slice(index, index + 7)
    if (row.length === 7 && !row.some(cell => cell && cell.remark)) grid.push(row)
  }
  return { grid, schedules: schedule }
}

export function applyParsedSchedule(vm, term, week, parsed) {
  if (!vm.scheduleCache[term]) vm.scheduleCache[term] = {}
  vm.scheduleCache[term][String(week)] = parsed.grid
  if (vm.currentWeek === week) vm.scheduleGrid = parsed.grid

  const allSchedules = []
  Object.keys(vm.scheduleCache[term]).forEach(cacheWeek => {
    const weekData = vm.scheduleCache[term][cacheWeek]
    if (!Array.isArray(weekData)) return
    weekData.forEach(row => {
      if (!Array.isArray(row)) return
      row.forEach(cell => {
        if (cell && cell.time) allSchedules.push(cell)
      })
    })
  })

  if (allSchedules.length > 0) {
    const startWeek = parseScheduleStartWeek(allSchedules)
    const endWeek = parseScheduleEndWeek(allSchedules)
    if (startWeek !== null) vm.scheduleStartWeek = startWeek
    if (endWeek !== null) vm.scheduleEndWeek = endWeek
  }

  try {
    uni.setStorage({ key: `schedule_${term}`, data: vm.scheduleCache[term] })
  } catch (error) {
    console.warn('[form] save schedule cache error:', error)
  }
}

export async function requestScheduleWeek({ cookie, term, week, onProgress }) {
  const res = await requestJw(
    cookie,
    BASE_URL + '/jsxsd/xskb/xskb_list.do',
    'POST',
    `xnxq01id=${encodeURIComponent(term)}&zc=${encodeURIComponent(String(week))}`,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    undefined,
    onProgress
  )
  const html = typeof res.data === 'string' ? res.data : ''
  return parseScheduleHtmlToGrid(html)
}

export async function queryLatestTermDates(cookie) {
  return post('App.TermStartDate.QueryTermStartDate', { cookie })
}

export async function checkTermDateAndCalculateWeek(vm) {
  try {
    const now = Date.now()
    if (now - vm.lastDateCheckTime < vm.dateCheckDebounceTime) {
      console.log('[form] 日期检查防抖，跳过本次检查')
      return
    }
    vm.lastDateCheckTime = now

    const startDate = vm.termStartDate || getAppGlobal('globalTermStartDate')
    const endDate = vm.termEndDate || getAppGlobal('globalTermEndDate')
    if (!startDate) {
      console.log('[form] 没有学期日期信息，跳过日期检查')
      return
    }

    const todayStr = new Date().toISOString().split('T')[0]
    if (todayStr < startDate) {
      updateGlobalScheduleWithDates(vm, vm.currentWeek, true)
      console.log('[form] 当前日期在开学日期之前，标记为假期中')
      return
    }

    if (endDate && todayStr >= startDate && todayStr <= endDate) {
      const calculatedWeek = calculateCurrentWeek(startDate)
      updateGlobalScheduleWithDates(vm, calculatedWeek, false)
      await vm.applyWeekGrid()
      console.log('[form] 当前日期在学期内，第', calculatedWeek, '周')
      return
    }

    if (endDate && todayStr > endDate) {
      console.log('[form] 当前日期已晚于结束日期，获取最新学期信息')
      try {
        const cookie = vm.getCookieHeader()
        if (!cookie) {
          console.warn('[form] 无法获取Cookie，跳过学期更新')
          return
        }

        const termDates = await queryLatestTermDates(cookie)
        if (termDates && Array.isArray(termDates.list) && termDates.list.length > 0 && Array.isArray(termDates.termSelectList) && termDates.termSelectList.length > 0) {
          const sortedTerms = [...termDates.termSelectList].sort((a, b) => b.value.localeCompare(a.value))
          const latestTerm = sortedTerms[0] && sortedTerms[0].value
          if (latestTerm) {
            const latestTermInfo = termDates.list.find(item => item.term === latestTerm)
            if (latestTermInfo) {
              const newStartDate = latestTermInfo.startDate
              const newEndDate = latestTermInfo.endDate
              vm.termStartDate = newStartDate
              vm.termEndDate = newEndDate
              if (latestTerm !== vm.term) {
                vm.term = latestTerm
                await vm.doTermChange(latestTerm)
              }
              updateGlobalScheduleWithDates(vm, vm.currentWeek, true, newStartDate, newEndDate, latestTerm)
              console.log('[form] 已更新到最新学期:', latestTerm, '开学日期:', newStartDate)
            }
          }
        }
      } catch (error) {
        console.warn('[form] 获取最新学期信息失败:', error)
        updateGlobalScheduleWithDates(vm, vm.currentWeek, true)
        uni.showToast({
          title: '获取最新学期信息失败',
          icon: 'none',
          duration: 2000
        })
      }
      return
    }

    if (!endDate && todayStr >= startDate) {
      const calculatedWeek = calculateCurrentWeek(startDate)
      updateGlobalScheduleWithDates(vm, calculatedWeek, false)
      await vm.applyWeekGrid()
      console.log('[form] 当前日期在学期内（无结束日期），第', calculatedWeek, '周')
    }
  } catch (error) {
    console.warn('[form] checkTermDateAndCalculateWeek error:', error)
  }
}

export async function checkAutoSwitchWeek(vm) {
  try {
    const startDate = vm.termStartDate || getAppGlobal('globalTermStartDate')
    if (!startDate) {
      const now = new Date()
      if (now.getDay() !== 1) return
      const todayStr = now.toDateString()
      const lastCheckStr = uni.getStorageSync('form_lastWeekSwitchCheck')
      if (lastCheckStr === todayStr) return
      const maxWeek = vm.scheduleEndWeek !== null ? vm.scheduleEndWeek : vm.totalWeeks
      if (vm.currentWeek >= maxWeek) return
      vm.currentWeek++
      await vm.applyWeekGrid()
      uni.setStorageSync('form_lastWeekSwitchCheck', todayStr)
      return
    }

    const calculatedWeek = calculateCurrentWeek(startDate)
    if (calculatedWeek !== vm.currentWeek) {
      const minWeek = vm.scheduleStartWeek !== null ? vm.scheduleStartWeek : 1
      const maxWeek = vm.scheduleEndWeek !== null ? vm.scheduleEndWeek : vm.totalWeeks
      if (calculatedWeek >= minWeek && calculatedWeek <= maxWeek) {
        vm.currentWeek = calculatedWeek
        await vm.applyWeekGrid()
        console.log('[form] 自动切换到第', calculatedWeek, '周')
      }
    }
  } catch (error) {
    console.warn('[form] checkAutoSwitchWeek error:', error)
  }
}
