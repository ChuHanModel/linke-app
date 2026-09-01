const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('linkeDesktop', {
  getBrowserState: () => ipcRenderer.invoke('browser:get-state'),
  getJwNavigation: () => ipcRenderer.invoke('jw:navigation:get'),
  openJwNavigationItem: (item) => ipcRenderer.invoke('jw:navigation:open', item),
  getJwNavigationFavorites: () => ipcRenderer.invoke('jw:navigation-favorites:get'),
  toggleJwNavigationFavorite: (item) => ipcRenderer.invoke('jw:navigation-favorites:toggle', item),
  setSidebarCollapsed: (collapsed) => ipcRenderer.invoke('layout:set-sidebar-collapsed', { collapsed }),
  setSidebarCollapsedSync: (collapsed) => ipcRenderer.sendSync('layout:set-sidebar-collapsed-sync', { collapsed }),
  setJwShellLayout: (layout) => ipcRenderer.invoke('layout:set-jw-shell', layout),
  setActiveFeature: (feature) => ipcRenderer.invoke('layout:set-active-feature', { feature }),
  getCredentials: () => ipcRenderer.invoke('credentials:get'),
  saveCredentials: (credentials) => ipcRenderer.invoke('credentials:save', credentials),
  clearCredentials: () => ipcRenderer.invoke('credentials:clear'),
  logoutJw: () => ipcRenderer.invoke('jw:logout'),
  setJwOriginalMode: (enabled) => ipcRenderer.invoke('jw:original-mode:set', { enabled: !!enabled }),
  getJwEvaluationCourses: (options) => ipcRenderer.invoke('jw:evaluation-courses:get', options || {}),
  getJwEvaluationSnapshot: () => ipcRenderer.invoke('jw:evaluation-snapshot:get'),
  refreshJwEvaluationStatus: () => ipcRenderer.invoke('jw:evaluation-status:refresh'),
  syncJwEvaluationCourses: () => ipcRenderer.invoke('jw:evaluation-courses:sync'),
  getJwMyCourses: (options) => ipcRenderer.invoke('jw:my-courses:get', options || {}),
  searchLinkeCourses: (payload) => ipcRenderer.invoke('linke:courses:search', payload || {}),
  getLinkeCourseDetail: (payload) => ipcRenderer.invoke('linke:course-detail:get', payload || {}),
  getLinkeCourseComments: (payload) => ipcRenderer.invoke('linke:course-comments:get', payload || {}),
  getMyLinkeCourseComment: (payload) => ipcRenderer.invoke('linke:course-comment:mine', payload || {}),
  submitLinkeCourseComment: (payload) => ipcRenderer.invoke('linke:course-comment:post', payload || {}),
  updateLinkeCourseComment: (payload) => ipcRenderer.invoke('linke:course-comment:update', payload || {}),
  deleteLinkeCourseComment: (payload) => ipcRenderer.invoke('linke:course-comment:delete', payload || {}),
  getLinkeCollections: (payload) => ipcRenderer.invoke('linke:collections:get', payload || {}),
  setLinkeCourseCollection: (payload) => ipcRenderer.invoke('linke:course-collection:set', payload || {}),
  likeLinkeCourseComment: (payload) => ipcRenderer.invoke('linke:course-comment:like', payload || {}),
  onBrowserState: (callback) => subscribe('browser:state', callback),
  onJwNavigation: (callback) => subscribe('jw:navigation-catalog', callback),
  onJwCaptchaStatus: (callback) => subscribe('jw:captcha-status', callback),
  onJwCredentialStatus: (callback) => subscribe('jw:credential-status', callback),
  onJwMyCoursesProgress: (callback) => subscribe('jw:my-courses-progress', callback),
  onLinkeDatabaseSearchRequest: (callback) => subscribe('linke:database-search-request', callback)
})
