# 测试计划

## 定向单测（tests/pvz-learning-loop.test.mjs，regex 合同式）

- S1：zombie rail 签名含 session；击退派生自 marks；scene-clear awardSunlight(5)
- S2：renderPreschoolTodaySunGoal 存在；todayLiteracyKnownCount 遍历 mastery.dates
- S3：syncPreschoolMistakeInvasion 存在；激活/解除幂等键与 awardSunlight(10)
- S4：preschoolSceneSound.pea/hit/sun 存在；no-motion 早退

## 浏览器走查（800×360 sim-android）

- S1：识字场次造复习卡（还不会→会了），看击退与 +5
- S2：首页三态截图（0/部分/达标）
- S3：改错本造 3 题 → 首页入侵 → 清零解除
- S4：会了听声；切 no-motion 验证静音

## 回归

- node --test tests/preschool-literacy-*.test.mjs（四套件）
- 全量 npm test（并行工作树既有 43 失败不计）
