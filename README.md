# First Up

A playful, mobile-first utility for choosing the first player at an in-person board game. Everyone holds one finger on one screen; First Up locks the group and eliminates players until one remains.

## Run locally

Requires Node.js 18+ for tests and the static build.

```bash
npm test
npm run build
npm run preview
```

Open `http://localhost:4173`. For quick development without a build, use any static file server from the project root.

## How to play

1. Tap **Start the round**.
2. Every player presses and holds one finger in the play area.
3. With two or more fingers held still briefly, their places lock automatically.
4. First Up visibly eliminates one player per round until the remaining player goes first.

Lifted or cancelled touches are removed safely before locking, so the app never chooses from fewer than two players. On desktop, use **Add demo player** (or press <kbd>A</kbd>) to simulate a group; <kbd>Esc</kbd> clears the gathering state.

The app is plain HTML, CSS, and browser JavaScript: no backend and no runtime dependencies. Relative asset paths keep it compatible with GitHub Pages at `/first-player-picker/`.

## Deployment

The GitHub Actions workflow tests, builds, and deploys `dist/` to GitHub Pages whenever `main` receives a push. Enable **GitHub Actions** as the Pages source in the repository’s Pages settings once.
