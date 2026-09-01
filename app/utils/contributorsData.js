/**
 * 开发贡献者数据
 * 每位贡献者包含基本信息、贡献内容和社交链接
 */
export const CONTRIBUTORS = [
  {
    id: 'zhangsan',
    name: '张三',
    role: '前端开发',
    avatar: '',
    contributions: [
      '首页与课程列表 UI 开发',
      '深色模式适配',
      '课程评价系统前端实现'
    ],
    bio: '热爱前端开发，专注于移动端用户体验。',
    links: [
      { type: 'github', label: 'GitHub', url: 'https://github.com/zhangsan' },
      { type: 'email', label: '邮箱', url: 'mailto:zhangsan@example.com' }
    ]
  },
  {
    id: 'lisi',
    name: '李四',
    role: '后端开发',
    avatar: '',
    contributions: [
      'API 接口设计与开发',
      '数据库架构设计',
      '定时任务与数据同步'
    ],
    bio: '后端工程师，关注系统性能与数据安全。',
    links: [
      { type: 'github', label: 'GitHub', url: 'https://github.com/lisi' }
    ]
  },
  {
    id: 'wangwu',
    name: '王五',
    role: 'UI 设计',
    avatar: '',
    contributions: [
      '应用整体视觉设计',
      '图标与插画绘制'
    ],
    bio: '设计师，追求简洁与美感的平衡。',
    links: [
      { type: 'email', label: '邮箱', url: 'mailto:wangwu@example.com' }
    ]
  }
]

export function getContributorById(id) {
  return CONTRIBUTORS.find(c => c.id === id) || null
}
