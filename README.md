# POLREGIO Live Onboard Screen

Static GitHub Pages-compatible PWA for a realistic SBB-style POLREGIO inside-train display.

## GitHub Pages Setup

1. Keep all files in the repository root.
2. Put your GTFS feed at `gtfs.zip`, in the same folder as `index.html`.
3. Enable GitHub Pages for the branch/folder that contains `index.html`.
4. Open the GitHub Pages URL. The app automatically loads `gtfs.zip`.

Optional local check:

```bash
node dev-server.mjs
```

Then open `http://127.0.0.1:5500`.

## Features

- Automatic `gtfs.zip` loading from the same folder as `index.html`.
- GitHub Pages/HTTPS/localhost compatible static PWA.
- Selectable Driving Now list showing every train; trips before departure wait until first departure.
- Destination search that filters the train list and selects the first matching train.
- Live onboard screen driven by GTFS stop times.
- Welcome, arriving, and arrived announcements inspired by train announcement patterns.
- Door-open station announcements with destination, next-station, and terminus wording.
- Automatic door-open announcements at intermediate stops as soon as the train enters the station dwell.
- Departure welcome announcement using the GTFS agency/operator name when available.
- Announcement voice modes for English, Polish, Polish + English, English + Polish, and every bundled language.
- Local gong asset plus synthesized fallback chime.
- PWA manifest and service worker for install/offline caching.

## Root Files

- `index.html`: app shell.
- `app.js`: GTFS parsing, live train logic, announcements, and search.
- `styles.css`: train-screen styling and animations.
- `gtfs.zip`: automatic GTFS feed loaded by the app.
- `jszip.min.js`: JSZip 3.10.1 for browser-side GTFS zip parsing.
- `pkp-intercity-gong.ogg`: CC0 short gong/bell audio from Wikimedia Commons.
- `manifest.webmanifest`, `service-worker.js`, `icon.svg`: PWA files.
