# 需求清单

- [ ] R1 (P0/A) `BlockLegendShop` 暴露 4 件商品；金币不够买失败；买装备写入 `gear`；买药水不占槽
- [ ] R2 (P0/A) `statsOf(gear)` 给出 atk/def；接触伤害 `max(1, contact - def)`
- [ ] R3 (P0/B) F 打开的商店能看见商品、价格、Buy；买后金币减少、左上 ATK/DEF 变
- [ ] R4 (P0/B) 生命药水立刻加血，不超过 hpMax
- [ ] R5 (P0/A) `placeVoxel` 只能放 air 邻格，y>0，kind 为 dirt/cobble/oak-log 映射的方块；y=0 拒绝
- [ ] R6 (P0/B) 热键 5 为放置手；背包有对应掉落才能放，放一次扣 1
- [ ] R7 (P1/B) 帮助文案含 Shop / Place；无新 localStorage key
