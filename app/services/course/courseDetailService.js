import md5 from '@/utils/md5.js'
import { JW_LOGIN_PAGE } from '@/utils/jwLoginPath.js'
import { post } from '@/repositories/appApi.js'

export function resolveCourseDetailUserKey() {
  const app = getApp()
  let userKey = ''
  try { userKey = uni.getStorageSync('userKey') || '' } catch (e) {}
  if (!userKey && app && app.globalData && app.globalData.userData && app.globalData.userData.userKey) {
    userKey = app.globalData.userData.userKey
  }
  if (!userKey) {
    const userId = uni.getStorageSync('userId')
    const userPassword = uni.getStorageSync('userPassword')
    if (userId && userPassword) userKey = md5.hexMD5(userId + userPassword)
  }
  return userKey || null
}

export function buildInitialCourseDetailState(options = {}) {
  const paramCourseId = options.courseId || options.id || ''
  if (!paramCourseId) {
    return { valid: false, courseId: '', lessonName: '', teacherName: '', preloadCourseData: null }
  }
  const lessonName = options.lessonName ? decodeURIComponent(options.lessonName) : ''
  const teacherName = options.teacherName ? decodeURIComponent(options.teacherName) : ''
  const app = getApp()
  const preload = (app && app.globalData && app.globalData.courseDetailPreload && app.globalData.courseDetailPreload[paramCourseId]) || null
  return {
    valid: true,
    courseId: paramCourseId,
    lessonName,
    teacherName,
    preloadCourseData: preload
  }
}

export function applyInitialCourseDetailState(vm, initialState) {
  vm.courseId = initialState.courseId
  vm.lessonName = initialState.lessonName
  vm.teacherName = initialState.teacherName
  vm.courseData = {
    lessonName: vm.lessonName || '—',
    teacherName: vm.teacherName || '—',
    courseId: vm.courseId
  }
  const app = getApp()
  const idLower = String(vm.courseId || '').trim().toLowerCase()
  let evaluatedInfo = null
  if (app && app.globalData && app.globalData.evaluatedCourseMap) {
    evaluatedInfo = app.globalData.evaluatedCourseMap[vm.courseId] || app.globalData.evaluatedCourseMap[idLower]
  }
  if (!evaluatedInfo && app && app.globalData && app.globalData.evaluatedCourses) {
    const course = app.globalData.evaluatedCourses.find(c => String(c.md5Hash || '').toLowerCase() === idLower)
    if (course) {
      evaluatedInfo = {
        courseName: course.courseName || '',
        teacherName: course.teacherName || '',
        isEvaluated: course.isEvaluated || false
      }
    }
  }
  if (evaluatedInfo) {
    vm.courseData.hasEvaluationPermission = true
    vm.courseData.isEvaluated = evaluatedInfo.isEvaluated || false
    if (evaluatedInfo.courseName) vm.courseData.courseName = evaluatedInfo.courseName
  }
  const preload = initialState.preloadCourseData
  if (preload && typeof preload === 'object') {
    const keys = ['lessonCredit', 'lessonNumber', 'lessonCampus', 'lessonCollege', 'lessonWeek', 'lessonTime', 'lessonLocation', 'courseTerm']
    keys.forEach(k => { if (preload[k] != null && preload[k] !== '') vm.courseData[k] = preload[k] })
    if (preload.courseTerm) {
      vm.availableTerms = [preload.courseTerm]
      vm.selectedTermIndex = 0
      vm.currentSelectedTerm = preload.courseTerm
      vm.courseDataByTerm[preload.courseTerm] = { ...preload }
    }
    // 不在 preload 阶段设 detailLoaded，始终保留骨架屏等待详情 API 返回完整数据
    vm.hasPreloadInfo = true
    delete app.globalData.courseDetailPreload[vm.courseId]
  }
}

export function redirectToCourseDetailLogin() {
  uni.reLaunch({ url: `${JW_LOGIN_PAGE}?from=courseDetail` })
}

export function resolveEvaluatedCourseInfo(courseId) {
  const app = getApp()
  const idLower = String(courseId || '').trim().toLowerCase()
  let evaluatedInfo = null
  if (app && app.globalData && app.globalData.evaluatedCourseMap) {
    evaluatedInfo = app.globalData.evaluatedCourseMap[courseId] || app.globalData.evaluatedCourseMap[idLower]
  }
  if (!evaluatedInfo && app && app.globalData && app.globalData.evaluatedCourses) {
    const course = app.globalData.evaluatedCourses.find(c => String(c.md5Hash || '').toLowerCase() === idLower)
    if (course) {
      evaluatedInfo = {
        courseName: course.courseName || '',
        teacherName: course.teacherName || '',
        isEvaluated: course.isEvaluated || false
      }
    }
  }
  return evaluatedInfo
}

export function toCourseStateText(courseState) {
  if (courseState === undefined || courseState === null || courseState === '') return '—'
  const stateMap = {
    '1': '需等选课结束后确定',
    '2': '开设中',
    '3': '已停开'
  }
  return stateMap[String(courseState)] || '—'
}

export function buildCourseDetailViewModel(courseDetail, currentCourseData, evaluatedInfo) {
  return {
    ...courseDetail,
    courseStateText: toCourseStateText(courseDetail && courseDetail.courseState),
    hasEvaluationPermission: !!evaluatedInfo || !!(currentCourseData && currentCourseData.hasEvaluationPermission),
    isEvaluated: evaluatedInfo ? !!evaluatedInfo.isEvaluated : !!(currentCourseData && currentCourseData.isEvaluated),
    courseName: evaluatedInfo
      ? (evaluatedInfo.courseName || (courseDetail && courseDetail.lessonName) || '')
      : ((currentCourseData && currentCourseData.courseName) || (courseDetail && courseDetail.lessonName) || '')
  }
}

export async function fetchCourseTermsByCourseId({ userKey, courseId, fallbackCourseTerm }) {
  try {
    const termsRes = await post('App.Course.GetCourseTermsByCourseId', { userKey, courseId })
    if (termsRes && Array.isArray(termsRes) && termsRes.length > 0) {
      return [...new Set(termsRes.map(item => item.courseTerm || '').filter(Boolean))].sort().reverse()
    }
  } catch (error) {
    console.warn('获取课程学期列表失败:', error)
  }
  return fallbackCourseTerm ? [fallbackCourseTerm] : []
}

export async function fetchCourseDetailByTerm({ userKey, courseId, courseTerm }) {
  const res = await post('App.Course.GetCourseByCourseId', {
    userKey,
    courseId,
    courseTerm
  })
  return Array.isArray(res) && res.length > 0 ? res[0] : null
}
