module.exports = {
  appId: 'cn.linke.desktop',
  productName: '林课桌面端',
  electronVersion: '39.8.10',
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'public/**/*',
    'package.json'
  ],
  asar: true,
  mac: {
    target: ['dir'],
    icon: 'build/app-icon.icns',
    category: 'public.app-category.education',
    identity: null
  },
  win: {
    target: ['dir'],
    icon: 'public/app-icon.png'
  }
}
