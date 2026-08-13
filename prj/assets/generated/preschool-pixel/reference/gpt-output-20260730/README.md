# GPT decomposition output

Source files supplied by the user:

- `../../../../GPT生图/01-1.png`: 1536x1024 full workbench reference.
- `../../../../GPT生图/01-2.png`: 1348x1167 labeled multi-element decomposition sheet.

Processing:

1. `clean/01-2_clean.png`: checkerboard background removed with edge-connected removal.
2. `crop-config.json`: deterministic semantic crop boxes for 47 regions.
3. `crops/semantic/`: 47 RGBA semantic crops with 10px transparent safety padding.
4. `curated-input/`: usable crops plus stable aliases used by the preschool app.
5. `published-gpt-v2/`: 46 PNG/WebP outputs published and checked with zero outer-edge alpha.

Rejected from the transparent app pack:

- `collection-*`: the source image embeds the brown shelf as opaque pixels around each item.
- GPT `treasure-chest.png`: the source image embeds a textured green panel background; the app uses the existing verified transparent chest as a fallback.

The preschool app maps its 12 existing semantic names to `published-gpt-v2/` so the generated UI can be reverted by changing one asset-base constant in `app.js`.
