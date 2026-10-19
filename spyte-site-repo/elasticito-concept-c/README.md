# Elasticito — Vendor Monitoring, Concept C (deck style)

85.5s, 1080×1080, 60fps motion piece built from the Concept C storyboard and timed to the
same VO + music track as Concepts A and B.

## Files
- `index.html` — the whole animation. Every frame is a pure function of time, so it is both
  the live preview (open it, press Play — plays with the soundtrack) and the render source.
  Add `?t=47` to the URL to jump to a moment.
- `render.mjs` — renders the page frame by frame with headless Chromium and muxes the audio.
- `assets/` — Elasticito logo (cut from the A/B end card), dark-on-light variants, soundtrack.
- `fonts/` — Montserrat, Source Sans 3, IBM Plex Mono (local copies for deterministic renders).
- `out/Elasticito_Vendor_Monitoring_ConceptC_1080x1080.mp4` — the rendered deliverable.

## Scenes and VO beats
| Time | Scene |
|---|---|
| 0.0–14.9 | Cover: 20 vendor domains, "Every vendor, treated the same." → one questionnaire / one review a year → "Not every vendor carries the same risk." (firewall vs payroll) |
| 14.0–15.0 | The navy page collapses into the "Vendor" pill |
| 15.0–44.0 | "Four groups. One model." Product 19.4 · SaaS 25.9 · Service 31.5 · Other 36.4, then tags |
| 44.0–54.4 | "The group decides which questions matter." data 46.8 · production 48.4 · down 50.4 |
| 54.4–70.9 | "The tag sets the cadence." snapshot 57.0 · continuous 59.0 · score drop 62.7 · RSI over 0.5 66.7 · ticket 68.4 |
| 70.8–79.3 | "Proportionate by design." DORA, NIS2, UK GDPR, FCA & PRA |
| 78.9–85.5 | End card: "Classify first, then assess." |

To retime a beat, change the start time passed to that scene's `p(t, …)` / `GROUPS[].at` /
`QS[].at` in `index.html` and re-render.

## Render
```
node render.mjs stills 12.5 47 69.5   # spot-check frames -> out/still-*.png
node render.mjs video 60 4            # fps, parallel workers -> out/*.mp4 (~5–10 min)
```
Needs Node, Playwright (Chromium) and ffmpeg.
