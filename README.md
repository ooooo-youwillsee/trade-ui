# 合约网格交易前端

Vue3 + Vite + Vant 实现的移动端 PWA WebApp，计算逻辑参考 `trade-server/internal/strategy/contract_grid_strategy.go`。

## 功能

- 合约网格策略列表、详情、编辑、新增、复制、删除
- 新增策略默认是未保存草稿，保存后才写入本地列表
- 删除策略和放弃未保存草稿前会弹出确认框
- 列表展示预估强平价、单格收益、当前价收益
- 策略数据使用浏览器 `localStorage` 本地存储
- “我的”页面支持导出 JSON 和导入 JSON
- 底部菜单包含：合约网格、股票网格、我的
- 支持白色主题和暗黑主题，默认使用白色主题
- 使用 Vant 移动端组件重构表单、列表、导航、弹窗、上传等交互
- 支持 PWA 安装，包含应用图标和离线资源缓存
- 全局样式按交易类 App 调整，列表支持独立滚动，收益数字使用涨跌色和等宽数字展示
- 使用 `vue-router` 管理页面路由，使用 hash 路由适配 GitHub Pages

## 技术栈

- Vue3
- Vite
- Vant
- Vue Router
- vite-plugin-pwa

## 路由

- `#/contract` 合约网格列表
- `#/contract/new` 新增合约网格策略
- `#/contract/:id` 策略详情
- `#/contract/:id/edit` 策略编辑
- `#/stock` 股票网格
- `#/mine` 我的

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

推送到 `main` 后，GitHub Actions 会构建 `dist` 并部署到 GitHub Pages。
