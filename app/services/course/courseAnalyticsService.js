import { post } from '@/repositories/appApi.js'

const EMPTY_SCORE_STATS = {
  count: 0,
  avgScore: 0,
  minScore: 0,
  maxScore: 0,
  medianScore: 0,
  stdDev: null,
  distribution: {
    '0-59': 0,
    '60-69': 0,
    '70-79': 0,
    '80-82': 0,
    '83-85': 0,
    '86-88': 0,
    '89-91': 0,
    '92-94': 0,
    '95-97': 0,
    '98-100': 0
  }
}

const ORDERED_RANGES = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']

export function buildEmptyScoreStats() {
  return JSON.parse(JSON.stringify(EMPTY_SCORE_STATS))
}

export async function fetchCourseScoreStats({ userKey, courseId }) {
  const courseIdNorm = String(courseId || '').trim().toLowerCase()
  const res = await post('App.UserScore.GetCourseScoreStats', {
    userKey: userKey || '',
    courseId: courseIdNorm
  })
  if (!res || (res.count === undefined && res.avgScore === undefined)) {
    return buildEmptyScoreStats()
  }

  const count = Number(res.count) || 0
  const avg = Number(res.avgScore)
  const dist = res.distribution
  const distSum = dist && typeof dist === 'object'
    ? Object.values(dist).reduce((sum, value) => sum + (Number(value) || 0), 0)
    : 0

  if (count > 0 && !Number.isNaN(avg) && (!dist || distSum === 0)) {
    const bounds = [0, 60, 70, 80, 83, 86, 89, 92, 95, 98, 101]
    const synthetic = buildEmptyScoreStats().distribution
    for (let index = 0; index < bounds.length - 1; index++) {
      if (avg >= bounds[index] && avg < bounds[index + 1]) {
        synthetic[ORDERED_RANGES[index]] = count
        break
      }
    }
    if (avg >= 98) synthetic['98-100'] = count
    res.distribution = synthetic
    return res
  }

  if (dist && distSum > 0) {
    const normalized = {}
    ORDERED_RANGES.forEach((key) => {
      normalized[key] = Number(dist[key]) || Number(dist[key.replace(/-/g, '_')]) || 0
    })
    res.distribution = normalized
    return res
  }

  return res
}
