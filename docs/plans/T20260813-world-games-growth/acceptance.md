# Acceptance — T20260813

## 子任务索引

| 子任务 | 需求点 | 最小验收标准 | 主要证据 |
|---|---|---|---|
| S1 | R1–R6 R9 | 独立页自动塔防可玩，测试绿 | test-report 阶段 2–4、npm test |
| S2 | R7 | 延期 | 不适用 |
| S3 | R8 | 延期 | 不适用 |

## 功能验收（S1）

- [ ] 点草坪可种，同路可并排（不太近）
  - 验证：`node --test tests/preschool-garden.test.mjs`
- [ ] 来一波后植物自动打、僵尸左移
  - 验证：world-games 含 tickDefense；浏览器清单
- [ ] 不再靠「使用技能」过关
  - 验证：测试 `doesNotMatch` function useSkill；页面无该主按钮
- [ ] 僵尸破线 lost，重开不扣学习阳光
  - 验证：preschool-defense-game lost 用例
- [ ] 通关 awardSunlight 去重 eventKey
  - 验证：game.js 仍调用 bridge.awardSunlight

## 质量验收

- [ ] 无新 localStorage key
- [ ] 无第三方游戏 submodule / iframe
- [ ] 无 Phaser/Vite 新依赖

## 测试验收

- [ ] 新增 lost 测试
- [ ] `npm test` 退出码 0
- [ ] 任意种植旧测试未回退

## 文档验收

- [ ] 本包 `test-report.md` 有阶段结论（允许推进 / 否）
- [ ] `docs/00-总控/当前状态.md` 等 S1 过后再同步（不要提前写完成）
- [ ] `spec-update.md` 本轮不生成；无新规范则 not_needed

## 需求分解对照

- [ ] R7/R8 延期不是遗忘
- [ ] 清单 must 项 R1–R6 R9 均有验证动作
