# Keeper

Keeper is a tiny cross-platform desktop pet built with Electron. It starts as a
transparent, always-on-top pixel pet window that can be dragged around the
desktop and hidden from the tray.

## Requirements

- Node.js 20 or newer
- npm

## Development

```sh
npm install
npm start
```

## Packaging

```sh
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Electron can target macOS, Windows, and Linux, but release builds should be
verified on each operating system. Some installer formats are best produced on
their target platform.

## Current Features

- Frameless transparent pet window
- Always-on-top behavior
- Drag the pet anywhere on the desktop
- Tray menu for show, hide, reset, click-through, and quit
- Pixel pet rendering with a fixed 128x128 character canvas
- Idle and walking frame animations

## Pet Assets

Keeper ships with one built-in desktop pet: `火史莱姆` (`fire-slime`).
Its frames are in `src/renderer/assets/pets/fire-slime/`, grouped by action:

- `idle/idle.apng`
- `walk-left/walk-left.apng`
- `walk-right/walk-right.apng`

Each action folder also contains a `frames/` directory with the source PNG
frames for that animation. The built-in pet metadata is stored in
`src/renderer/assets/pets/fire-slime/pet.json`.

Custom pet assets should use a 128x128 canvas with a transparent background.
PNG, WebP, and SVG are good formats. The renderer plays image frames from named
animation sets, so each behavior can provide its own sequence, such as idle,
feed, play, sleep, and hungry.
