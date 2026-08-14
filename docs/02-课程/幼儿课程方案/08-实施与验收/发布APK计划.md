# 发布 APK 计划

1. 推送 `main` 触发 `.github/workflows/android-apk.yml`。
2. 等待 Actions 完成，下载 Debug APK 到 `tmp/`，不把 APK 提交 Git。
3. 在 MuMu 中安装；验证启动器选择、幼儿首页、课程活动、花园战场、奖励和离线启动。
4. 检查应用进程和最近日志，没有 `FATAL EXCEPTION`；卸载测试包时只操作明确的应用包名。
5. Pages 与 APK 使用同一份 `prepare-mobile.mjs` 允许清单，不能维护第二套页面代码。
