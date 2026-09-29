# dsh-bafx

> 给 DeepSeek Harness 加上《蔚蓝档案》风格的鼠标点击特效与光标拖尾。
> Blue Archive style click effect and cursor trail for DeepSeek Harness.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Powered by ba-click-fx](https://img.shields.io/badge/powered%20by-ba--click--fx-4ca7ff)](https://github.com/CialloKing/ba-click-fx)

点击鼠标出现溶解圆环、中心光盘与碎片飞散；移动鼠标留下青蓝色光标拖尾。控制项集中在左侧边栏入口打开的**设置对话框**里，设置自动保存；特效库与全部依赖都随包分发，**零网络请求、零构建步骤**。

---

## 特性

- **竖排侧栏入口**：注册在 `sidebar.panellist`，与官方 Plugins 入口并列；展开态显示图标 + 文案，窄栏只显示图标。
- **弹窗式设置**：点击入口弹出居中对话框（遮罩 + 卡片），关闭即回到对话，**不会把工作区切走**。
- **十项实时设置**：启用开关、点击特效、拖尾、拖尾常显、点击大小、拖尾长度、缩放、不透明度、混合模式、主题色。
- **一键重置**：「重置为默认配置」恢复全部默认值并立即生效。
- **零构建**：上游 `ba-click-fx` 的 25 个 ES 模块以原始形态随包分发，由 Host 半区以原生 ESM 提供。
- **零运行时依赖**：不打包 React、不引入任何第三方运行时；React 由 DSH 客户端模块加载器提供。
- **Web 与桌面端同一套实现**：不依赖 `tapIndex`（桌面壳不会执行函数式 index 变换），两种形态行为一致。

## 与同类插件的区别

DSH 生态里已有其他点击特效插件（例如 [`dsh-ba-click-fx`](https://github.com/Azusa-299/ba-click-fx-dsh-plugin)、泛化的 [`clickvibe`](https://github.com/ai-daming/clickvibe)）。本插件的差异点：

| 维度 | dsh-bafx |
|---|---|
| 入口位置 | **左侧边栏竖排入口**（`sidebar.panellist`），与官方面板同款座位 |
| 设置界面 | **居中对话框 + 遮罩**，关闭即回对话，不占据工作区 |
| 独有控制项 | 点击大小（点击几何整体倍率）、拖尾长度（`trail.lifetimeMs`）、混合模式（screen / plus-lighter / scene）、**重置为默认配置** |
| 分发形态 | 源码级随包分发（25 个模块原样），Host 直接以 ESM 提供，仓库内无构建产物需要维护 |

## 环境要求

- DeepSeek Harness（Web profile 或桌面端 desktop profile）
- 仅使用 Node 内置模块（`node:fs` / `node:path` / `node:url`），`node >= 18`

## 安装

`dsh-bafx` 是一个 **bundle 插件**：包内 `cordis.patch.yml` 声明挂载行，`dsh.bundle.patch` 让插件管理命令自动把它加入 `dsh.profile.bundles`。

### 桌面端（desktop profile）

> 桌面端的 `desktop` 档案由客户端独占管理，**Node 版 `dsh` CLI 会拒绝**（`profile "desktop" is managed exclusively by the Electron application`）。请使用桌面端自带的 CLI：

```powershell
# 桌面端自带 CLI：<安装目录>\resources\runtime\cli\bin\dsh.cmd
& "<DeepSeek Harness 安装目录>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add dsh-bafx
```

### Web profile（Node 版）

```bash
dsh plugin --profile web add dsh-bafx
```

### 从源码 / 本地目录安装

```bash
git clone https://github.com/AzusaKe/dsh-bafx.git
dsh plugin --profile web add ./dsh-bafx          # 或 add link:<绝对路径>
```

### 安装后必须重启

客户端模块（`dsh.client`）的扫描、bundle 快照与 index 注入表都发生在**宿主启动时**，所以安装后需要重启 Harness（桌面端重启客户端）才会生效。

## 使用

1. 左侧边栏出现竖排入口 **✦ 点击特效**（位于官方 Plugins 入口之后）。
2. 点击后主区保持/回到对话，屏幕中央弹出设置对话框。
3. 调整任意控制项即时生效并写入 `localStorage`（键 `dsh-bafx-settings`）。
4. 关闭方式：右上角 **✕** / 点击遮罩 / **Esc** —— 关闭即回到对话。

| 控制项 | 范围 | 默认 |
|---|---|---|
| 启用特效 | 开 / 关 | 开 |
| 点击特效 | 开 / 关 | 开 |
| 拖尾 | 开 / 关 | 开 |
| 拖尾常显（无需按住） | 开 / 关 | 开 |
| 点击大小 | `0.50 – 2.00×` | `1.00×` |
| 拖尾长度 | `50 – 2000 ms` | `300 ms` |
| 缩放 | `0.50 – 2.00×` | `1.00×` |
| 不透明度 | `0.00 – 1.00` | `1.00` |
| 混合模式 | `screen` / `plus-lighter` / `scene` | `screen` |
| 主题色 | 取色器 | `#4ca7ff` |
| **重置为默认配置** | 按钮 | — |

> 混合模式说明：`screen`（默认）在明暗背景上都安全；`plus-lighter` 在暗色背景更亮；`scene` 是严格的场景加色语义。

## 工作原理

```
dsh-bafx（bundle 插件，cordis.patch.yml 挂载）
├─ lib/index.js      Host 半区：只做一件事——提供特效库源码
│     └─ 路由 /dsh-bafx/src/<name>.js  → ba-click-fx 的 25 个 ESM 模块（自包含副本）
└─ client/client.js  客户端模块（dsh.client, platform: web）
      ├─ import('/dsh-bafx/src/fx.js') → new BAClickFX(...) 全屏覆盖层
      │     （pointer-events:none，不影响页面交互）
      ├─ sidebar.panellist#bafx      竖排侧栏入口（侧栏自己渲染行与文字，本插件只提供 svg 图标）
      ├─ main#bafx                   选中后：渲染前打开对话框 + layout.selectPanel(null) 退回对话
      └─ shell.overlay#bafx-dialog   对话框本体（遮罩 + 居中卡片）
```

两个关键设计决定：

1. **为什么用客户端模块而不是注入脚本**：桌面壳（Electron）的 `index.html` 由安装包静态 dist 直出，`webServer.tapIndex()` 这类**函数变换永不执行**；客户端模块由 DSH 自身的 client-modules 机制装载，Web 与桌面行为一致。
2. **为什么是 `sidebar.panellist` 而不是 `sidebar.footer.action`**：后者是侧栏底部的**横向**操作条（与 Settings 并排），多个满宽入口会互相挤占；`sidebar.panellist` 才是**竖排**的全局面板导航。由于该插槽的语义是"选中即占主区"，选中后立即 `layout.selectPanel(null)` 把主区交还对话，只保留浮层对话框。

两级回退：无 `layout` 服务 → 控件以内联页面呈现；无 `shell.overlay` 座位 → 由 `main` 面板自己承载对话框。

## 项目结构

```
dsh-bafx/
├── package.json            # dsh.bundle.patch + dsh.client{platform:web} + exports["./client"]
├── cordis.patch.yml        # 挂载行
├── client/client.js        # 客户端模块：引擎 + 侧栏图标 + 浮层对话框
├── lib/
│   ├── index.js            # Host 半区：/dsh-bafx/src/*.js 路由
│   └── bafx-src/           # ba-click-fx v1.3.1 源模块副本（25 个文件，未修改）
├── test-host.mjs           # Host 半区离线测试（路由、白名单、无注入）
├── test-client.mjs         # 客户端模块离线测试（模块契约、插槽、对话框、重置、回退）
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── CHANGELOG.md
└── README.md
```

## 开发与测试

无需构建。测试是纯 Node 的离线结构测试，不需要浏览器：

```bash
npm test        # = node test-host.mjs && node test-client.mjs
```

`test-client.mjs` 会用一个最小 React / `window.__ModuleLoader__` 桩件装载 `client/client.js`，断言：模块契约、三个插槽注册、图标渲染、对话框与遮罩、重置按钮、关闭时调用 `selectPanel(null)`，以及 Layout 服务晚到时的回退路径。

## 兼容性

- 开发与验证环境：DSH Web profile 与桌面端 desktop profile（Electron）。
- 特效库自带多后端回退链：WebGL2 → Canvas 2D → 软件 Bloom → 原生辉光，GPU 受限环境仍可用。

## 许可证与致谢

本仓库代码以 **MIT** 许可发布，见 [`LICENSE`](./LICENSE)。

特效库来自 **[ba-click-fx](https://github.com/CialloKing/ba-click-fx)**（v1.3.1，MIT，© 2026 CialloKing），本仓库在 `lib/bafx-src/` 中**原样分发**其源码；上游的第三方归属链（[BASpark](https://github.com/DoomVoss/BASpark)、[BA-Spark-Cursor](https://github.com/VanillaNahida/BA-Spark-Cursor)，MIT，© 2026 Doom）按上游要求一并转引，完整文本见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 免责声明

本项目是非官方社区插件，与 NEXON Games、Yostar 及《蔚蓝档案》官方**无任何关联**，未获其授权或赞助。「蔚蓝档案 / Blue Archive」及其相关美术、商标归各自权利人所有。上游特效库是对游戏内 `FX_Touch` 的逐参数移植，MIT 许可仅覆盖**代码**；如权利人提出异议，本项目将立即调整或下架相关内容。
