# Comfort Tab

A fake bedroom window in the browser — your photo outside the glass, rain on the pane, a day/night cycle that darkens the view at night, and lofi music with optional rain hiss.

Project path: `~/CodingProjects/comfort-tab`

## Assets

| File | Purpose |
|------|---------|
| `assets/window-scene.png` | View through the window |
| `assets/lofimusic.mp3` | Looped ambience when sound is on |

## Open it

```bash
cd ~/CodingProjects/comfort-tab && open index.html
```

Or serve locally (recommended for audio):

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- **Mood** — warm tint on the photo and nudges default rain level
- **Rain** — droplets on the glass and rain hiss (mixed with music when sound is on)
- **Outside time** — decorative clock tied to the 120s day/night cycle
- **Sound** — click once to play `lofimusic.mp3` (browser autoplay policy)

## Customize the look

**Room & UI** — edit `:root` colors and fonts in `styles.css` (`--wall`, `--frame`, `--accent`, etc.).

**Window frame** — `.window-unit`, `.frame`, `.mullion`, `.sill` in `styles.css`; hide sill props with `display: none`.

**Outside photo** — replace `assets/window-scene.png`.

**Night darkness** — `NIGHT_OVERLAY_MAX` and `SCENE_BRIGHTNESS_MIN` at the top of `app.js`.

**Day length** — `CYCLE_SECONDS` in `app.js` (default 120).

**Starting time** — `cycleT` at the bottom of `app.js` (0 = midnight, 0.5 = noon).

**Mood warmth** — `MOODS` in `app.js` (`filterWarmth`, `rainBias`).

**Rain & glass** — `drawRain()`, wet threshold in `onRainChange()`, `.glass-shine` / `.condensation` in CSS.

**Audio** — swap `assets/lofimusic.mp3`; rain hiss level in `ComfortAudio.setRain()`.

Leave the tab open. Breathe.
