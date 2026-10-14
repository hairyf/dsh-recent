# dsh-recent

在 DeepSeek Harness 工作区会话列表下方增加 **Recent** 分组，映射最近活动的会话，不移动或复制会话数据。

## 行为

- 使用官方会话目录的 `updatedAt` 降序展示最近 10 个主会话；相同时间按会话 ID 排序。不是「最近点击」历史，也不另外记录时间。
- 排除空白、已归档、子会话及不属于 Host 目录的保留引用。删除、归档和标题变化随官方状态更新。
- 点击通过官方 `uiWorkspace.openSession` 打开同一会话；选中状态与原生侧边栏一致，打开全局面板时取消会话选中高亮。
- Recent 与原生会话项双向联动 hover、键盘焦点及选中高亮，使用会话 ID 而非标题匹配。原组折叠时不会自动展开；该会话项重新挂载后自动同步。
- 可折叠分组，提供加载、空列表及打开失败提示。复用官方状态圆点、图标、相对时间计算和 `--dsw-*` 主题变量；行高、字体、间距及 hover 背景对齐原生侧边栏。

## 兼容边界

针对模板所用的 DSH SDK `0.2.1-alpha.1` 实现。官方没有「工作区列表尾部」Slot，也不导出完整侧边栏行组件，因此：

1. 在官方 `shell.overlay` Slot 中订阅会话、工作区、运行状态和面板状态。
2. 根据官方 workspace locale 的会话列表名称，寻找 `role="tree"` / `aria-label` 锚点，将 Recent portal 放在列表之后。搜索结果与收起侧边栏时不显示 Recent；找不到锚点时不修改页面。
3. 通过官方 `sidebar.workspaces.session.row.action` Slot 获得原生项的会话 ID，仅在其 `role="treeitem"` 上附加可清理的插件属性。

不依赖 CSS module 哈希、不改原生 ARIA、不开额外会话引用、无 Host 路由或自定义持久化。上游语义 DOM 或 Slot 变更时需要重新验证；提供尾部 Slot 后应替换 DOM 锚点。禁用/卸载会清理 portal、样式、观察器和行监听。

## 构建与使用

构建与测试使用 Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`（满足 DOM 测试依赖要求）、项目声明的 pnpm `11.15.1`：

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm pack
```

构建生成 Host ESM 和 DSH 客户端模块加载器使用的 classic bundle；客户端产物不是独立浏览器应用，也不能作为普通 ESM 导入。

将生成的本地包交给所用 DSH 版本支持的插件安装流程，并启用包中的 `cordis.patch.yml`（插件名和 ID 均为 `dsh-recent`）。本仓库不提供另一个安装器，也不假设不同 DSH 版本的安装命令一致。尚未发布 npm；不要把 `pnpm add dsh-recent` 当作已验证的安装方式。本次交付不会自动修改或安装到正在运行的 DSH。

## 开发验证

```bash
pnpm run lint --fix
pnpm run typecheck
pnpm run test -- --run
pnpm run build
git diff --check
```

测试覆盖最近活动排序/过滤/上限、原生选中投影、双向高亮与清理、语义 DOM 锚点重挂载、Recent 渲染/导航/错误/折叠，以及构建产物的 DSH 模块注册。组件测试使用隔离的官方 Hook 数据和 UI primitive mock，不代替实际 DSH 中的视觉及热加载验收。API 快照保留 stale-build guard，Host 与 Client 分别记录构建源。

## 来源与许可

基于 [dsh-tauri/starter-plugin](https://github.com/dsh-tauri/starter-plugin) 创建，模板来源提交 `0639209665efa85abd76c02b9565caaf46591809`。

[MIT](./LICENSE.md)，保留模板作者 dsh-tauri-desk 的版权声明。
