# First Up

A playful, mobile-first utility for choosing the first player at an in-person board game. Everyone holds one finger on one screen; First Up locks the group, waits for every finger to lift, then reveals one winner together.

## Run locally

Requires Node.js 18+ for tests and the static build.

```bash
npm test
npm run build
npm run preview
```

Open `http://localhost:4173`. For quick development without a build, use any static file server from the project root.

## How to play

1. Open the page; the touch arena is ready immediately.
2. Every player presses and holds one finger on the screen.
3. With two or more fingers held still briefly, their places lock automatically.
4. Everyone lifts their finger. The locked circles stay in place until every original finger is up.
5. All circles pulse together, then the losing circles leave at once and the winner is revealed.

Lifted or cancelled touches are removed safely before locking, so the app never chooses from fewer than two players. After locking, an up/cancel/lost-capture event counts as a lift; losing focus releases outstanding physical pointers safely too. The full round needs a touchscreen or another device that can provide two concurrent pointers; a regular desktop mouse can still exercise the one-pointer gathering state. The result remains on screen until the page is refreshed.

The app is plain HTML, CSS, and browser JavaScript: no backend and no runtime dependencies. Relative asset paths keep it compatible with GitHub Pages at `/first-player-picker/`.

## Deployment

The GitHub Actions workflow tests, builds, and deploys `dist/` to GitHub Pages whenever `main` receives a push. Enable **GitHub Actions** as the Pages source in the repository’s Pages settings once.
