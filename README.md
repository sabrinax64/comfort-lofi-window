# Comfort Tab

A fake bedroom window in the browser — your photo outside the glass, rain on the pane, a day/night cycle that darkens the view at night, lofi music, and optional rain hiss.

Project path: `~/CodingProjects/comfort-tab`

## Assets

| File | Purpose |
|------|---------|
| `assets/window-scene.png` | View through the window |
| `assets/lofimusic.mp3` | Looped lofi when Lofi is on |

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

- **Mood** — warm tint on the photo, nudges rain level; **Dreamy night** jumps outside time to **10:00 pm**; **Bright morning** jumps to **10:00 am**
- **Rain** — droplets on the glass (visual only; use Rain sound for hiss)
- **Lofi volume** + **Lofi on/off** — loop `lofimusic.mp3` at the chosen level
- **Rain sound on/off** — rain hiss (level follows the rain slider when on)
- **Outside time** — clock tied to the 120s day/night cycle (keeps advancing after a mood snap)

## Customize the look

**Room & UI** — edit `:root` colors and fonts in `styles.css` (`--wall`, `--frame`, `--accent`, etc.).

**Window frame** — `.window-unit`, `.frame`, `.mullion`, `.sill` in `styles.css`; hide sill props with `display: none`.

**Outside photo** — replace `assets/window-scene.png`.

**Night darkness** — `NIGHT_OVERLAY_MAX` and `SCENE_BRIGHTNESS_MIN` at the top of `app.js`.

**Day length** — `CYCLE_SECONDS` in `app.js` (default 120).

**Starting time** — `cycleT` at the bottom of `app.js` (0 = midnight, 0.5 = noon).

**Mood warmth** — `MOODS` in `app.js` (`filterWarmth`, `rainBias`).

**Rain & glass** — `drawRain()`, wet threshold in `onRainChange()`, `.glass-shine` / `.condensation` in CSS.

**Audio** — swap `assets/lofimusic.mp3`; `LOFI_GAIN_MAX` and rain level in `ComfortAudio`.

Leave the tab open. Breathe.
