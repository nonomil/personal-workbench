# 范围、隔离与回退合同

## 1. 开关合同

开关是 URL 查询参数，不保存到任何本地数据：

```text
learning-scene=episode-v1
```

只有以下组合启用皮肤：

```text
theme=garden-defense
#courses?course=preschool-literacy
```

没有 `tab` 或 `tab=today` 都属于 today；`menu`、`media`、`archive` 等其他路线不启用。条件不满足时，`renderPreschoolLiteracyCardWall()` 返回的根节点不带 `learning-scene-v1`。

## 2. 代码边界

本次只允许以下 4 个文件进入实现 diff：

- 新增 `prj/css/preschool/51-learning-scene-v1.css`；
- 新增 `tests/preschool-learning-scene-v1.test.mjs`；
- `prj/app.js` 两处窄改：开关判断、根 class；
- `prj/preschool-workbench/index.html` 两处窄改：51 CSS 引用、app.js cache query。

app.js 的现有业务函数不重构；index 中已有 app.js 查询串的 `learning-companion=writing-v1` 必须保留。不得新增 controller、mount、storage、事件监听、素材加载器或新的 `script`。

## 3. CSS 隔离合同

- 每条 51 层规则都必须在 `.learning-scene-v1` 后代边界内；
- 视觉增强规则必须位于 `html:not(.is-android-app)` 且 `@media (min-width: 1024px)`；
- 不覆盖 `50-learning-companion-writing.css` 的动画和 reduced-motion 规则，只允许调整根节点/现有面板的桌面外观；
- Android 和窄屏继续使用 43–50 层现有布局，不能用角色放大撑破 `44px/52px` 行。

## 4. 稳定回退

首选回退：去掉 `learning-scene=episode-v1`，重新加载同一地址。应满足：

- 没有 `.learning-scene-v1`；
- 现有识字字卡墙、Canvas、按钮和学习伙伴仍存在；
- 没有新增 localStorage key；
- 无新增外部网络请求。

代码层回退只针对本次已确认的补丁做定向修改。当前工作树有其他用户改动，禁止 `git reset --hard`、`git clean -fd`、`git checkout --`、`git stash` 和整文件覆盖。

## 5. 交付前边界检查

交付前必须单独查看：

```text
git diff -- prj/app.js prj/preschool-workbench/index.html prj/css/preschool/51-learning-scene-v1.css tests/preschool-learning-scene-v1.test.mjs
```

不得把 43–50 CSS、TTS 音频、APK、截图或其他既有文件混入本次提交/交付说明。

