# 验收

- [ ] A1 学一个新词后（调试面板快进 6h），今日卡出现该词复习；快进 3 天不练，词条带"待复习"提示但状态不掉级
- [ ] A2 升级前已存在的词（无 planVersion）复习节奏与升级前一致（1/3/7/14 天）
- [ ] A3 英语专区首屏见"今天练这个"卡，点击直接进练习不经过菜单；完成后卡片变"已完成 + 连续天数"
- [ ] A4 在 blocklegend 答对一词，回工作台词条 events 里有 `source: 'blocklegend'` 的记录（DevTools 查 localStorage）
- [ ] A5 旧快照导入（升级前导出的 JSON）读取正常，无控制台报错
- [ ] A6 无新 localStorage key（DevTools 对比 key 列表）
