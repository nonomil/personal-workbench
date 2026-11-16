# 执行步骤（每步先红测试再实现）

## S1 僵尸=复习进度

1. [x] 红测试：`renderPreschoolSceneZombieRail` 读取 session 复习卡数；
   会了复习卡时调用击退；全退调用 `awardSunlight('scene-clear:…', 5)`
2. [x] `renderPreschoolSceneZombieRail(course)` → `(course, session)`：
   review 总数 = `session.items.filter(item.review).length`（无则 3 只装饰），
   已退数 = 其中 `marks[key]==='known'` 数；前 reviewCount 只按序加 `is-defeated`
3. [x] mark 分支：markItem.review && known → 击退动画（复用 is-hit + is-defeated 类）；
   全退且 reviewCount>0 → awardSunlight scene-clear +5 + toast
4. [x] CSS：is-defeated 倒地淡出（56 文件）
5. [x] 绿 + 缓存戳 + 浏览器走查（造 2 张复习卡：先点还不会再会了）

## S2 今日阳光目标横幅

6. [x] 红测试：存在 `renderPreschoolTodaySunGoal` 且从 literacy mastery 派生今日 known 数
7. [x] app.js：`todayLiteracyKnownCount()` 遍历 `courseProgress.literacy.mastery`，
   `dates` 含 storage.localDate() 且 state∈{ready,maintenance} 计数（cap 6）
8. [x] 首页 hero 下渲染横幅：进度点 6 格 + 文案三态（0 张/进行中/达标 CTA 去战斗）
9. [x] 绿 + 缓存戳 + 走查（翻 1 张卡横幅 +1）

## S3 错题入侵

10. [x] 红测试：due≥3 时 commit 激活 `garden.invader`；due=0 解除并 +10
11. [x] app.js 渲染前钩子 `syncPreschoolMistakeInvasion()`：
    due = buildMistakeReviewQueue(state.mistakes, today).length；
    激活幂等键 `mistake-invasion:date`、解除键 `mistake-clear:date`
12. [x] 首页 home-top 加入侵警示行（僵尸图 + due 数 + 去改错本按钮）
13. [x] 绿 + 缓存戳 + 走查（改错本造 3 题 → 首页入侵者出现 → 清零解除）

## S4 音效

14. [x] 红测试：`preschoolSceneSound` 存在 pea/hit/sun 三个方法且 no-motion 早退
15. [x] WebAudio 合成器（惰性 AudioContext，音量 0.12~0.15，方波/锯齿/正弦）
16. [x] 挂接：fire → pea；击退 → hit；+3 到账 → sun
17. [x] 绿 + 走查（会了有声，preschool-no-motion 下无声）

## 收口

18. [x] 缓存戳统一 bump；`npm run android:prepare`；test-report 记录

## S5 拼音四声条（用户"继续"追加，DS 第三轮切片）

19. [x] 红测试 `tests/pinyin-tones.test.mjs`：pinyinToneForms 标调规则 / toneRows 上卡 /
    例字索引（识字字库派生）/ pinyin-speak-tone 处理器
20. [x] 实现：pinyinToneForms + pinyinToneCharIndex + 卡内四声条 +
    pinyin-speak-tone（例字 hanzi 音频优先，缺失回退音节 TTS）
21. [x] 绿（4/4）+ 回归 18/18 + 缓存戳 pinyin-tones=v1 + dist
22. [x] 走查：b 卡四声条 bā(八) bá(拔) bǎ(把) bà(爸·当前高亮)

## S6 拼读转盘（2026-08-29 已落地）

23. [x] 红测试 `tests/pinyin-wheel.test.mjs`：合法音节表（403，含 nv/lv/ju，排除 be/jv）/
    音节拼合器 / 韵母 chips 上卡 / 转盘切换处理器
24. [x] 实现：`PINYIN_LEGAL_SYLLABLES`（blocklegend pinyin-db legal-bases 移植）+
    `pinyinSyllableFor`（v 系双拼写尝试）+ `pinyinLegalFinals` + 声母卡转盘 chips
    （本卡重置 + 全部合法韵母，ü 显示）；切换后四声条/跟我拼/例字全部跟随新音节，
    并自动播报一遍拼读
25. [x] 修复：拼音函数块误插 `buildPreschoolCourseCardItems` 函数内（跨函数引用
    ReferenceError 整页白屏）→ 提升到闭包顶层；映射补 `initial` 透传
26. [x] 绿（转盘 4/4 + 全线 26/26）+ 缓存戳 `pinyin-wheel=v2` + dist + 走查
    （b+u → bū bú bǔ bù·补/不，跟我拼 波|乌）

## S7 多主题敌人（2026-08-29 已落地）

27. [x] 红测试 `tests/pinyin-theme-enemies.test.mjs`：三主题敌人映射 / voxel 素材指向
    roster 正视图 / rail 不再 garden-only / is-obstacle 标记 / CSS 扩展 voxel + 障碍静止
28. [x] 实现：`PRESCHOOL_SCENE_ENEMIES` 映射（garden=僵尸三只；voxel=苦力怕/骷髅/蜘蛛，
    直连 blocklegend-roster four-view/front.png；platform=砖块/水管/问号方块 is-obstacle）+
    `preschoolSceneEnemyArt`（直连 png 走 img，主题资产键走 preschoolAsset）
29. [x] CSS：三列战场作用域扩到 voxel-adventure；障碍模式换悬浮 bob（不蹒跚），
    is-defeated 复用倒地淡出；no-motion 全静止
30. [x] 验证：voxel 敌人 3/3 加载（creeper/skeleton/spider front.png）；platform
    is-obstacle + 砖块/水管/问号 3/3 加载；全套 30/30 绿；戳 `scene-enemies=v1`；dist 重建

## S8 知识门：主战斗内嵌字卡（2026-08-29 已落地）

31. [x] 红测试 `tests/garden-quiz-gate.test.mjs`：加载 learning-defense 数据/状态机 /
    placeAt 走门 + doPlace 承载种植 / 卡片路径重写 / 每关首棵 / 答错不拦截 / 关卡重置 / 弹层样式
32. [x] 实现：garden-defense 挂 `learning-defense/data/cards.js` + `core/learning-gate.js`；
    `maybeQuizThenPlace` 每关首棵弹字卡（图配字 3 选 1，图片路径重写到 learning-defense
    资产目录，speech 自动朗读题面）；答对即种，答错高亮正确答案 850ms 后仍种下
    （幼儿无惩罚）；答题结果走 `bridge.recordLearningOutcome` 回流错题本
33. [x] 走查：进关 1 点草坪 → 弹"山"是哪一张图（山/河/花 3 图加载）→ 点对 →
    弹层关、植物入土（defense.plants=1）；第二次种植不再弹（首棵门）
34. [x] 过程验证了学习→游戏权闭环：play pass 耗尽时正确弹休息层"去做任务再来守"
35. [x] 缓存戳 `quiz-gate=v1`（cards/gate/game.js 三处）；dist 重建（learning-defense
    数据在 KEEP 清单内随包）；测试 6/6 + 相关回归 14/14
