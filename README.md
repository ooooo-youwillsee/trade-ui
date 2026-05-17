# 合约网格交易前端

Vue3 + Vite + Vant 实现的移动端 WebApp，计算逻辑参考 `trade-server/internal/strategy/contract_grid_strategy.go`。

## 功能

- 合约网格策略列表、详情、编辑、新增、复制、删除
- 新增策略默认是未保存草稿，保存后才写入本地列表
- 删除策略和放弃未保存草稿前会弹出确认框
- 列表展示预估强平价、单格收益、当前价收益
- 策略数据使用浏览器 `localStorage` 本地存储
- “我的”页面支持导出 JSON 和导入 JSON
- 底部菜单包含：合约网格、股票网格、我的
- 使用 `vue-router` 管理页面路由，使用 hash 路由适配 GitHub Pages

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
