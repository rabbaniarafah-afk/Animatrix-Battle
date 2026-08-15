# ANIMATRIX BATTLE

**Fight. Animate. Dominate.**

A browser-based 2D stickman fighting game built with HTML5, Phaser 3, and Node.js + Socket.IO.

---

## ▶️ Run it

No `npm install` needed — Phaser, Socket.IO's client bundle, and the server's Socket.IO package are all bundled in already.

```bash
npm start
# or: node server/server.js
```

Then open **http://localhost:3000** in Chrome, Edge, Firefox, or Safari.

Flow: **Main Menu → Character Select → Arena Select → VS intro → 3, 2, 1, FIGHT! → Combat → K.O. → Rematch / Main Menu**

---

## 🎮 Game modes

| Mode | What happens |
|---|---|
| **Quick Battle / Training** | You vs. an AI opponent (a different one of your 5 fighters) |
| **Local Battle** | Two players, one keyboard — separate control schemes below |
| **Online Battle** | Create a room (get a 4-digit code) or join one with a friend's code, then fight over the network |

### Controls — Player 1 / solo keyboard

| Action | Keys |
|---|---|
| Move | `A` / `D` or `←` / `→` |
| Jump | `W` or `↑` |
| Crouch | `S` or `↓` |
| Run | Hold `SHIFT` while moving |
| Block | Hold `B` |
| Dash | `SPACE` |
| Light Punch (Air Attack if airborne) | `J` |
| Heavy Punch | `K` |
| Kick | `L` |
| Dash Attack | `U` |
| **Special** (needs a full energy bar) | `I` |
| Back to menu | `ESC` |

### Controls — Player 2 (Local Battle only, same keyboard)

| Action | Keys |
|---|---|
| Move / Jump / Crouch | `←` `→` `↑` `↓` |
| Run | `/` |
| Block | `'` |
| Dash | `.` |
| Light Punch / Heavy Punch / Kick | `1` / `2` / `3` |
| Dash Attack | `4` |
| Special | `0` |

---

## ⚔️ Combat

- **Attacks**: light punch, heavy punch, kick, air attack, dash attack, and a big telegraphed **special** that costs a full energy bar
- **Energy** builds as you land and take hits; a full bar glows gold and unlocks the special
- **Combos**: landing another hit while your opponent is still reeling builds a combo counter ("3 HIT COMBO" popup); attacks can also be canceled into the next one late in their recovery, so strings actually chain
- **Blocking** cuts damage to ~12% and prevents knockback/hit-stun, but breaks any combo you were building
- Hitboxes/hurtboxes, knockback, hit-stun, and K.O. all work the same way in every mode (vs. AI, local, or online)

---

## 🏟️ Arenas

Three original, procedurally-drawn stages — pick one on the Arena Select screen before each match:

- **Neon Rooftop** — city skyline, rain-slick concrete
- **Sunset Docks** — warm light, cranes, shimmering water
- **Underground Dojo** — torchlight, stone pillars, dust motes

---

## 🌐 Online Battle — how it actually works

- The **room creator is the host**; their browser runs the real match simulation (physics + combat) for both fighters and broadcasts state ~20 times/second.
- The **joiner is the guest**; their browser sends its own input to the host and renders whatever state last arrived.
- The server (`server/rooms/roomManager.js`) only relays messages between the two — it doesn't simulate the fight itself. This keeps it simple, but it also means it's not tamper-proof the way a fully server-authoritative game would be; that's a reasonable trade-off for a couple of friends playing casually, not for a competitive/public matchmaking service.
- Both browsers need to reach the same server URL. For two people on the same computer or same network, `http://<your-computer's-LAN-IP>:3000` works. For two people on different networks, you'd need to host the server somewhere both can reach (or use a tunnel like ngrok).
- If the socket.io npm package is ever missing (e.g., you deleted `node_modules`), the server still runs fine for every other mode — only Online Battle becomes unavailable, and the server console tells you so.

---

## 🧍 Your characters

Five fighters, sourced from your uploaded artwork:

| Fighter | File | Color |
|---|---|---|
| Yellow | `assets/characters/yellow.png` | `#FBE64D` |
| Powerful Barbarian | `assets/characters/barbarian.png` | `#55B8F6` |
| Shadowlord | `assets/characters/shadowlord.png` | `#911DF5` |
| Gothliotic | `assets/characters/gothliotic.png` | `#D5ECFB` |
| Gosths | `assets/characters/gosths.png` | `#000000` |

Each was a single static pose, so instead of pasting a frozen image on screen, every fighter is drawn as a true jointed skeleton (`StickmanRig.js`) — head, torso, two arms (shoulder+elbow), two legs (hip+knee) — in your character's exact color, with the **actual head artwork** you drew (not a generic circle) mapped onto the rig. `PoseLibrary.js` defines keyframe poses for every state (idle, walk, run, jump, attacks, blocks, hit reactions, defeat, special), and `AnimationController.js` blends between them every frame with proper anticipation → strike → recovery timing.

The original uploaded artwork is still used for the Character Select thumbnails.

### Swapping in your own art later

Everything is config-driven from **`client/src/characters/CharacterConfig.js`**:

1. Drop a new transparent PNG into `client/assets/characters/` (plus a cropped head-only version if you want a custom head).
2. Add an entry with an `id`, `texture`/`headTexture` keys, `path`s, `color`, and `scale`.
3. It appears automatically in Character Select — no other code changes needed.

### Adding another arena

Copy `client/src/arenas/Arena1.js`, change the palette/silhouette drawing, give it a unique `id`, and add it to `client/src/arenas/ArenaRegistry.js`. It shows up in Arena Select automatically.

---

## 📁 Structure

```
animatrix-battle/
├── client/
│   ├── index.html, style.css
│   ├── vendor/                     Phaser + Socket.IO client, vendored locally
│   ├── assets/
│   │   ├── characters/             Your fighters + cropped head art
│   │   └── branding/logo.svg       Game logo / favicon
│   ├── src/
│   │   ├── main.js                 Phaser game bootstrap
│   │   ├── scenes/                 Boot, Menu, CharacterSelect, ArenaSelect, Arena, Online
│   │   ├── characters/
│   │   │   ├── CharacterConfig.js    Roster registry
│   │   │   ├── StickFighter.js       Physics + full combat/energy/combo state machine
│   │   │   ├── StickmanRig.js        Skeleton drawing
│   │   │   ├── PoseLibrary.js        Every keyframe pose
│   │   │   ├── AnimationController.js Sequences poses frame-by-frame
│   │   │   └── AIController.js       Opponent decision-making
│   │   ├── combat/                 Attack configs, hitboxes/hurtboxes, resolution, fx
│   │   ├── arenas/                 3 stages + registry
│   │   ├── ui/                     MatchHUD (health/energy bars, intro, K.O. screen)
│   │   ├── audio/                  Synthesized SFX (Web Audio API, no files needed)
│   │   └── networking/             NetworkClient (Socket.IO wrapper)
│
├── server/
│   ├── server.js                   Static file server + Socket.IO (graceful fallback)
│   └── rooms/roomManager.js        Room codes, pairing, message relay
│
└── package.json
```

---

## 🗺️ What's left

- Round system (best-of-3, match timer) — currently single K.O. per match
- More characters/abilities
- Deeper particle polish, background music
- Smoother online interpolation (currently ~20Hz snapshot sync, functional but not silky on a slow connection)
