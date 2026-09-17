# Rock3D GitHub Pages portfolio v1

This directory is a deployable, self-contained portfolio page assembled from existing display-only Rock3D assets. It does not run or modify the research pipeline.

## Page roles

- **CAL_061 — main video showcase.** The completed supporting-case video is the page's first and most prominent media asset. It demonstrates continuous verified surface gain from complementary views and includes the existing 2D→3D bridge.
- **CAL_069 — pipeline explanation.** The page uses the target overlay as the primary method visual and the sequential verified NEW figure as a smaller supporting detail. The final-union and OBB candidates were intentionally omitted because they look like dense internal QA plots at webpage scale.
- **CAL_064 — static measurement supplement.** The 1920×1080 measurement showcase is included because the rock, OBB, E1/E2/E3 values, and boundary language remain readable in the responsive page layout. No CAL_064 video is used.

## Files

- `index.html` — semantic three-section portfolio page.
- `styles.css` — responsive styling; no external web dependencies.
- `assets/videos/CAL_061_showcase_display_only_v1.mp4` — main showcase video.
- `assets/images/CAL_061_video_poster.png` — video poster frame.
- `assets/images/CAL_069_target_overlay.png` — primary 2D target correspondence visual.
- `assets/images/CAL_069_verified_gain.png` — supporting multi-view gain figure.
- `assets/images/CAL_064_measurement_showcase.png` — static measurement example.
- `qa_report.json` — resource, decode, structure, and source-copy integrity checks.

## Scientific boundary

This is a portfolio presentation. It does not change MS-06, the verified multi-view backbone, any mesh, triangle IDs, annotations, OBB values, or research conclusions. The page uses concise boundary text: verified visible-surface union is not complete-rock ground truth, and RAW_UNCORRECTED E1/E2/E3 are sorted OBB extents rather than field A/B/C.

## Local preview

Serve this directory with any static HTTP server. For example:

```bash
python -m http.server 8000 --directory output/portfolio_demo/github_pages_v1
```

Then open `http://127.0.0.1:8000/`.

## Human visual QA

Inspect desktop and mobile widths. Confirm that CAL_061 remains the dominant first-screen result, the CAL_069 overlay explains target correspondence immediately, the verified-gain detail is legible when opened, and the CAL_064 measurement card does not crop the rock or make the OBB/values unreadable.
