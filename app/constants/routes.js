export const ROUTES = {
  login: '/pages/login/login',
  index: '/pages/index/index',
  form: '/pages/form/form',
  me: '/pages/me/me'
}

export function getDefaultTabRoute(tab) {
  return tab === 'form' ? ROUTES.form : ROUTES.index
}
