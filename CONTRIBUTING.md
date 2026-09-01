# 贡献指南

感谢你对林课（Linke）感兴趣！

## 参与方式

- **Bug 反馈 / 功能建议**：提 Issue，写清复现步骤（App 版本、系统、学号可脱敏）。
- **代码贡献**：Fork → 分支开发 → PR。PR 请保持单一主题（一个 PR 一件事）。

## 开发环境

- **移动端（`app/`）**：uni-app 工程，使用 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 打开运行/打包；依赖见 `app/package.json`。
- **桌面端（`desktop/`）**：Electron + Vue3 + Vite，`npm install && npm run dev` 启动，`npm run build` 构建。

提交 PR 前请自查：

1. 改动不引入任何硬编码密钥、密码、令牌（API 地址除外，见 README 的后端边界说明）。
2. 移动端改动在 HBuilderX 编译通过；桌面端改动 `npm run build` 通过。
3. 不绕过、削弱客户端与后端之间的鉴权与校验逻辑（包括热更新完整性校验）。

## 不接受的内容

- 爬虫滥用、批量请求、绕过学校教务系统风控的改动。
- 涉及真实学生个人信息（学号、姓名、成绩）的测试数据或日志。
- 与本项目无关的推广内容。

## 行为准则

保持友善与尊重，聚焦技术与产品本身。
