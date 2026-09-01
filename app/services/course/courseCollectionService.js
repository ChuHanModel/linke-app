import { post, invalidateRequestCache } from '@/repositories/appApi.js'
import { ensureUserRegistered } from '@/utils/ensureUserRegistered.js'

const COLLECTION_CACHE_TTL = 60 * 1000

export function getCollectionListCacheKey(userKey) {
  return `user_collection_list:${String(userKey || '').trim().toLowerCase()}`
}

export function normalizeCollectionRows(res) {
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.list)) return res.list
  if (res && typeof res === 'object') return Object.values(res)
  return []
}

export async function fetchCollectionList({ userKey, forceRefresh = false }) {
  const cacheKey = getCollectionListCacheKey(userKey)
  if (forceRefresh) invalidateRequestCache(cacheKey)
  const requestOptions = {
    cacheKey,
    cacheTTL: COLLECTION_CACHE_TTL,
    dedupeKey: cacheKey,
    timeout: 30000,
    retryCount: 1,
    retryDelay: 600,
    staleCacheOnError: true
  }

  try {
    console.log('[collection] 请求收藏列表, userKey:', userKey ? userKey.substring(0, 8) + '...' : '(空)')
    const res = await post('App.UserCollection.GetCollection', { userKey }, requestOptions)
    console.log('[collection] 收藏列表返回:', Array.isArray(res) ? `${res.length}条` : typeof res)
    return normalizeCollectionRows(res)
  } catch (error) {
    console.error('[collection] 收藏列表请求失败:', error?.message, '| code:', error?.code)
    const message = String(error && (error.message || error) ? (error.message || error) : '')
    if (/用户密钥错误|UserKey\s*Error/i.test(message)) {
      const registered = await ensureUserRegistered({ force: true })
      if (registered) {
        invalidateRequestCache(cacheKey)
        const res = await post('App.UserCollection.GetCollection', { userKey }, requestOptions)
        return normalizeCollectionRows(res)
      }
    }
    throw error
  }
}

export function consumeCollectionListDirtyFlag() {
  try {
    const app = getApp()
    const dirty = !!(app && app.globalData && (app.globalData.collectionListDirty || app.globalData.ifChangeLikeState))
    if (dirty && app && app.globalData) {
      app.globalData.collectionListDirty = false
      app.globalData.ifChangeLikeState = false
    }
    return dirty
  } catch (e) {
    return false
  }
}

function markCollectionDirty() {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.homeAboutMeDirty = true
      app.globalData.collectionListDirty = true
      app.globalData.ifChangeLikeState = true
    }
  } catch (e) {}
}

export async function fetchCollectionStatus({ userKey, courseId }) {
  const rows = await fetchCollectionList({ userKey })
  const idLower = String(courseId || '').trim().toLowerCase()
  return rows.some(row => String(row.courseId || '').trim().toLowerCase() === idLower)
}

export async function createCourseCollection({ userKey, courseId }) {
  const result = await post('App.UserCollection.PostCollection', { userKey, courseId })
  invalidateRequestCache(getCollectionListCacheKey(userKey))
  markCollectionDirty()
  return result
}

export async function removeCourseCollection({ userKey, courseId }) {
  const result = await post('App.UserCollection.DeleteCollection', { userKey, courseId })
  invalidateRequestCache(getCollectionListCacheKey(userKey))
  markCollectionDirty()
  return result
}
