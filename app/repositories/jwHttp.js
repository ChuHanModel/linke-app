import { request, ensureSuccessResponse } from '@/repositories/httpClient.js'

export const JW_BASE_URL = 'http://jw.sdufe.edu.cn'

export function getHeaderCaseInsensitive(header, key) {
  if (!header) return ''
  if (header[key]) return header[key]
  const target = String(key).toLowerCase()
  const keys = Object.keys(header)
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i]).toLowerCase() === target) return header[keys[i]]
  }
  return ''
}

export function extractCookie(header) {
  const setCookie = getHeaderCaseInsensitive(header, 'set-cookie')
  if (!setCookie) return ''
  const list = Array.isArray(setCookie) ? setCookie : [setCookie]
  const cookies = []
  for (let i = 0; i < list.length; i++) {
    const pair = String(list[i]).split(';')[0]
    if (pair) cookies.push(pair.trim())
  }
  return cookies.join('; ')
}

export function toFormDataCustom(pairs) {
  return pairs
    .map(([key, value, encode]) => {
      const finalValue = value == null ? '' : String(value)
      return `${encodeURIComponent(key)}=${encode ? encodeURIComponent(finalValue) : finalValue}`
    })
    .join('&')
}

export function requestJwHttp(url, method, data, header, responseType, options = {}) {
  return request({
    url,
    method,
    data,
    header: header || {},
    responseType: responseType || 'text',
    dataType: 'text',
    withCredentials: false,
    timeout: options.timeout || 15000,
    errorMessage: options.errorMessage || '教务请求失败'
  }).then(res => ensureSuccessResponse(res, { errorMessage: options.errorMessage || '教务响应异常' }))
}
