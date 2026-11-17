# Bayesian Oil Inc.

A tiny pixel-art oil tycoon game that teaches **Bayesian optimisation**.

The investors are furious, and you have 12 drilling permits and money for a single rig. You start by drilling evenly spaced wells. Then Prof. Bayes bursts in yelling *"STOP DRILLING RANDOMLY!"* and teaches you about Gaussian Processes, priors and acquisition functions on a blueprint. After that you head back out with an acquisition-function radar to find the richest spot. At the end, the real oil field is revealed.

No dependencies and no build step: just static HTML, CSS and ES modules (well under 200 KB).

## Run locally

```sh
python3 -m http.server 8000     # or: npm start
# open http://localhost:8000
```

ES modules need to be served over HTTP. Opening `index.html` directly as a `file://` URL won't work.

## Deploy

Upload the folder to any static host:

- **GitHub Pages**: push the repo, then go to *Settings → Pages* and deploy from the branch root.
- **Netlify / Cloudflare Pages**: drag and drop the folder, or connect the repo with no build command and `/` as the publish directory.

## Controls

| Action | Keys | Touch |
| --- | --- | --- |
| Walk | ← → / A D | ◀ ▶ |
| Drill / confirm / advance | Space, Enter, E | A |
| Menu / call Professor / back | B, Esc, X | B |
| Mute | M | ♫ button |

Menus also work with the mouse.

## How the maths works

- **Oil field** (`src/bo/field.js`): one main reservoir and 2–3 smaller decoys, each a Gaussian bump, on top of a gentle background. Every seed is checked so the global maximum is unique and inside the strip. Each measurement adds a little noise (σ = 20 bbl/d).
- **Gaussian Process** (`src/bo/gp.js`): RBF kernel, constant mean (the average of the data), and Cholesky solves. The log marginal likelihood drives the "data support" bars shown when choosing a prior.
- **Acquisition** (`src/bo/acquisition.js`): Expected Improvement, Probability of Improvement, and UCB with κ = 1/2/3. Two deliberately bad options are included for teaching: greedy mean and pure uncertainty.
- **Results**: your rig's true yield as a percentage of the global maximum, compared with the average of 400 simulated random-drilling runs on the same field.

## Project layout

```
src/bo/       maths: RNG, oil field, GP, acquisition functions
src/engine/   bitmap font, input, WebAudio blips
src/art/      palette, pixel sprites, drawing helpers, desert scenery
src/ui/       dialog box, menus, blueprint charts
src/game/     game loop state, play state, all story text (dialogue.js)
src/scenes/   title, backstory, field, lab, reveal
tests/        node --test unit tests for the maths
```

To tweak the story or explanations, edit `src/game/dialogue.js`. Text wrapped in `*asterisks*` is highlighted.

## Tests

```sh
npm test    # node --test, no dependencies
```
