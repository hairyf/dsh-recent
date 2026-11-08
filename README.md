<div align="center"><a name="readme-top"></a>

# dsh-recent

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

在 DeepSeek Harness 工作区会话列表下方添加 **Recent** 分组，快速打开最近活动的会话。
</div>

## 📦 安装

需要官方 DSH **`0.2.2-rc.1`** 或更高版本，不支持旧版本。

- 尚未发布到 npm，上方包信息徽章在发布前可能没有数据。
- 从源码构建本地插件包后安装：

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm pack
```

```sh
dsh plugin --profile web add ./dsh-recent-0.0.0.tgz
```

- 在 **设置 → 插件** 中启用，插件名与 ID 均为 `dsh-recent`（见 `cordis.patch.yml`）。
- 构建使用 Node.js `^24.15.0 || >=26.0.0` 与 pnpm `11.15.1`。

## ✨ 特性

- 🕒 **最近会话**：按官方 `updatedAt` 降序展示最多 10 个主会话，排除空白、归档与子会话。
- 🔗 **原生联动**：与侧边栏双向同步悬停、键盘焦点与选中高亮，使用会话 ID 而非标题匹配。
- 🧭 **官方导航**：点击走官方 `uiWorkspace.openSession`，打开全局面板时取消高亮。
- 🪶 **零冗余数据**：只映射官方会话目录，不复制、不移动会话，也不另存访问历史。
- 🎨 **跟随主题**：复用官方状态圆点、图标、相对时间与 `--dsw-*` 变量，行高与间距对齐原生列表。
- 🧹 **完整清理**：支持折叠、加载与空列表提示；禁用插件时移除样式、portal、观察器与行监听。

## 🛠️ 开发

```sh
pnpm run lint --fix
pnpm run typecheck
pnpm run test -- --run
pnpm run build
```

端到端测试沿用 [starter-plugin](https://github.com/dsh-tauri/starter-plugin) 的 Vitest Browser + Playwright 模式：固定官方 DSH `0.2.2-rc.1`，打包安装插件，在临时 `DSH_HOME` 与随机端口启动实例，结束后清理。

```sh
pnpm exec playwright install chromium
pnpm run test:e2e
```

## 📜️ 许可证

[![License][license-src]][license-href]

基于 [dsh-tauri/starter-plugin](https://github.com/dsh-tauri/starter-plugin)（提交 `0639209665efa85abd76c02b9565caaf46591809`）创建，采用 [MIT](./LICENSE.md)，保留模板作者 dsh-tauri-desk 的版权声明。

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/dsh-recent?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/dsh-recent
[npm-downloads-src]: https://img.shields.io/npm/dm/dsh-recent?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/dsh-recent
[bundle-src]: https://img.shields.io/bundlephobia/minzip/dsh-recent?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=dsh-recent
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/dsh-recent
[license-src]: https://img.shields.io/github/license/hairyf/dsh-recent.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/hairyf/dsh-recent/blob/main/LICENSE.md
