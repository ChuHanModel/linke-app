import { post } from '@/repositories/appApi.js'

const PAGE_SIZE = 50

function toCommentList(res) {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    if (Array.isArray(res.data)) return res.data
    if (Array.isArray(res.list)) return res.list
    const values = Object.values(res)
    if (values.length > 0 && values[0] && typeof values[0] === 'object' && 'commentId' in values[0]) {
      return values
    }
  }
  return []
}

function normalizeComment(comment) {
  if (!comment || typeof comment !== 'object') return null
  let likeCount = comment.likeCount != null ? Number(comment.likeCount) : (comment.commentLikeCount != null ? Number(comment.commentLikeCount) : 0)
  // 兜底：如果用户已点赞但 likeCount 为 0，至少显示 1
  if (comment.hasLiked && likeCount < 1) likeCount = 1
  return {
    ...comment,
    likeCount
  }
}

export async function fetchCourseComments({ userKey, courseId, page = 1, pageSize = PAGE_SIZE }) {
  const res = await post('App.CourseComment.GetComment', {
    userKey,
    courseId,
    commentType: 'all',
    page,
    pageSize
  })
  const list = toCommentList(res).map(normalizeComment).filter(Boolean)
  return {
    list,
    page,
    pageSize,
    hasMore: list.length >= pageSize
  }
}

export async function fetchCourseCommentCount({ userKey, courseId }) {
  try {
    const res = await post('App.CourseComment.GetCommentCount', { userKey, courseId })
    if (!res) return null
    if (typeof res.commentCount === 'number') return res.commentCount
    if (typeof res.commentCount !== 'undefined') return Number(res.commentCount) || 0
    return null
  } catch (error) {
    return null
  }
}

export async function likeCourseComment({ userKey, commentId }) {
  return post('App.CourseComment.LikeComment', { userKey, commentId })
}

export async function fetchCourseRating({ courseId }) {
  const res = await post('App.CourseComment.GetCourseRating', { courseId })
  if (res && (res.starAvgTotal != null || res.scoreAvg != null)) return res
  return null
}

export { PAGE_SIZE as COURSE_COMMENT_PAGE_SIZE }
