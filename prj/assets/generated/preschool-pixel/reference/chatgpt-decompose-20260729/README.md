# ChatGPT reference decomposition run

Source reference: `C:/Users/No'mi'l/AppData/Local/Temp/codex-clipboard-778e11b8-8764-4fb8-9f37-4aa48095e077.png`

This run sends the supplied full workbench screenshot to a logged-in ChatGPT image page and asks for three smaller, crop-friendly explosion sheets:

- `01-hud-and-navigation.md`: HUD and side navigation pieces.
- `02-garden-and-characters.md`: garden map pieces and characters.
- `03-collection-and-rewards.md`: collection shelf and reward pieces.

Raw page screenshots and downloaded images belong in `screenshots/` and `downloads/raw/`. Only selected sheets go in `downloads/selected/`. Cropped semantic PNGs belong in `split/` before they are published to the shared `published/` asset folder.

The reference image is used for visual language, palette, proportions, and material cues. The generated sheets must not contain the full webpage, readable text, or branding.

## Browser status

The `chrome-direct` ChatGPT branch was attempted with the existing local Chrome account, but Chrome did not grant CDP access within the retry window. The imported Chrome branch reached a Cloudflare verification page and did not reach the ChatGPT composer. No reference image was uploaded and no GPT image output was downloaded in this run.

browser-act ChatGPT branch incomplete: browser opened but session was not retained for state/eval/download.
