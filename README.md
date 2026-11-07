# 🐹 Squeek Warriors: Hamster Kingdom (吞食天地 HD2D)

> A retro HD2D retro turn-based tactical RPG dynamically powered by the live **Squeekchain** PoW hashrate, real-time wheel RPM, and block rounds.

---

## 🎮 How this project uses Squeekchain (生态集成机制)

This project strictly integrates official **Squeekchain** real-time APIs to drive game mechanics:

1. **Live Wheel RPM Damage Multiplier (`/v1/status`)**:
   - The game continuously reads Squeektoshi's real-time wheel speed (`rpmMilli / 1000`).
   - When Squeektoshi runs, party members gain a dynamic **Attack & Critical Buff** scaled by his actual RPM speed.
2. **Squeektoshi Core State Synchronization (`RUNNING` vs `SLEEPING`)**:
   - **`RUNNING`**: Triggers **Hamster Frenzy Mode** — full party ATK +20%~50% and 2.5x critical rate.
   - **`SLEEPING` / Stale**: Triggers **Defensive Night Mode** — party defense increases to endure tough boss rounds.
3. **Round Settlement & PoW Rewards (`/v1/economy/state`)**:
   - Game battles settle against current chain round progression, awarding players simulated $SQK PoW credits and Genesis Aura upon clearing key battles (such as the Battle of Bowang Slope).
4. **Interactive Genesis HUD Overlay**:
   - Built-in real-time telemetry HUD displaying Squeektoshi's live status, observed work units (WU), current round number, and network connectivity.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Visuals**: Canvas 2D HD2D Light Shafts, Fog, Depth Blur, Particle Systems
- **Styling**: Tailwind CSS + Radix UI + Custom Retro Dark Matrix Palette
- **Data Feeds**: Squeekchain Core REST APIs (`api.squeekchain.com`)

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📜 Squeekchain Genesis Verification

- **Repository**: Public Open-Source GitHub Repository
- **Verification Tag**: Included in `index.html`
- **Verification Config**: `squeekchain.json` at root

squeekchain-project: a661bb2d-0d46-482c-abba-b63fb4e183c7
squeekchain-verify: a295f58001f36b08381d9c27ec28fe0fa8d830c17da50466
