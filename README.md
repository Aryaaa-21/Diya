<div align="center">

# 🪔 The Light Within
### *A Cinematic, GPU-Powered Digital Diwali Experience*

> *"तमसो मा ज्योतिर्गमय — From darkness, lead me unto light."*

An award-grade, interactive 3D web experience celebrating Diwali through generative light, sacred geometry, closed-form GPU particle physics, and procedural acoustics.

<br />

[![Live Demo](https://img.shields.io/badge/Demo-Experience%20Live-f5b942?style=for-the-badge&logo=vercel&logoColor=black)](https://github.com/Aryaaa-21/Diya)
[![GitHub Stars](https://img.shields.io/github/stars/Aryaaa-21/Diya?style=for-the-badge&color=d99a2b)](https://github.com/Aryaaa-21/Diya/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd76a?style=for-the-badge)](LICENSE)

<br />

[![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Procedural-ff8a1f?style=flat-square&logo=soundcharts&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![TypeScript](https://img.shields.io/badge/TypeScript-v7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## 📖 Table of Contents

- [✨ The Visual Journey](#-the-visual-journey)
- [🎮 Interactive Modes](#-interactive-modes)
- [⚡ Engineering & Technical Innovations](#-engineering--technical-innovations)
  - [1. Closed-Form GPU Particle Physics](#1-closed-form-gpu-particle-physics)
  - [2. Procedural Curl-Noise Flame Shader](#2-procedural-curl-noise-flame-shader)
  - [3. Zero-Dependency Web Audio Synthesizer](#3-zero-dependency-web-audio-synthesizer)
  - [4. Dual-Scale Spatial Dynamics](#4-dual-scale-spatial-dynamics)
  - [5. Adaptive Device Quality Tiering](#5-adaptive-device-quality-tiering)
- [🎨 Design System & Color Tokens](#-design-system--color-tokens)
- [📁 Project Architecture](#-project-architecture)
- [🧭 URL Parameters & Deep Linking](#-url-parameters--deep-linking)
- [🚀 Quick Start & Development](#-quick-start--development)
- [📜 Cultural Roots & Philosophy](#-cultural-roots--philosophy)
- [📄 License](#-license)

---

## ✨ The Visual Journey

*The Light Within* is designed not merely as a 3D demo, but as a meditative narrative progressing through physical and spiritual dimensions:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Primordial    │  ──►  │    Ignition     │  ──►  │   Illumination  │  ──►  │   Celebration   │
│    Darkness     │       │   & Flame Rise  │       │ & Rangoli Bloom │       │  & Ocean Skies  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **🌑 The Primordial Darkness (`Amavasya`):** The experience opens in utter atmospheric stillness—a midnight courtyard shrouded in soft shadows, with an unlit clay diya and floating golden dust motes awaiting the user's touch.
2. **🪔 The Spark of Ignition:** Touching the diya strikes a spark that cascades into an organic, living flame driven by real-time curl-noise turbulence, radiating an incandescent amber halo.
3. **🌸 The Courtyard Bloom:** As light expands across the hand-cut stone courtyard floor, an intricate golden and vermilion procedural Rangoli mandala emerges with progressive fractal reveals.
4. **✨ Constellation of Lamps:** Hundreds of floating clay lamps (*Deepavali*) populate the horizon with depth-of-field blur and volumetric mist, creating a luminous sea of light.
5. **🎆 The Celestial Celebration:** Dynamic pyrotechnic physics illuminate the night sky with seven unique aerial shell types and six authentic ground crackers, paired with procedural audio.

---

## 🎮 Interactive Modes

The application features dedicated interaction modes accessible from the intuitive top navigation bar:

| Mode | Key Features | User Interaction |
| :--- | :--- | :--- |
| **🔍 Explore** | Cinematic camera orbits, depth-of-field exploration, and camera hotspots. | Click-drag to orbit around the hero diya, scroll to zoom, inspect terracotta and brass textures. |
| **🪔 Illuminate** | Progressive light dome expansion, halo radius modulation, and courtyard illumination. | Tap to ignite or adjust flame intensity; trigger expanding light washes across the floor. |
| **🎆 Celebrate** | Real-time pyrotechnic physics simulator and choreographed grand fireworks finale. | Touch the courtyard to plant ground pieces (Anar, Chakri, Phuljhadi); touch the sky to launch aerial shells or start the full **Show**. |
| **💌 Blessings** | Dynamic calligraphy Diwali greeting card generator with shareable URL links. | Input recipient name, sender name, and custom blessing; generates animated stroke-by-stroke calligraphy cards. |

---

## ⚡ Engineering & Technical Innovations

### 1. Closed-Form GPU Particle Physics

Every particle in the fireworks engine belongs to a single pooled `THREE.Points` geometry and renders in **one draw call**. 

- **Zero CPU Ticking:** Instead of updating positions on the CPU every frame, every particle's entire trajectory is evaluated as a closed-form analytic function inside the vertex shader:
  $$\vec{p}(t) = \vec{p}_0 + \vec{v}_0 \cdot \Delta t + \frac{1}{2} \vec{g} \cdot (\Delta t)^2 - \vec{d}(\Delta t)$$
- **Instantaneous Allocation:** A continuous fountain (e.g. *Anar*) does not use a frame-by-frame emitter; it pre-allocates an array slice with staggered start times evaluated on GPU hardware.
- **Backward-Solved Ballistics:** Rockets calculate launch velocities backward from their intended apex coordinate so their break occurs precisely where scheduled on the audio clock.

### 2. Procedural Curl-Noise Flame Shader

The hero flame avoids static sprites or canned flipbook animations in favor of custom GLSL fragment and vertex shaders:
- **Simplex Curl Noise:** Generates organic, non-repeating turbulent eddy currents along the flame vector.
- **Fresnel Gradient Ramp:** Smooth transitions from incandescent white core (`#fff4b0`) through yellow (`#ffd45a`) and intense orange (`#ff8a1f`) to transparent smoky edges.
- **Perlin Micro-Flicker:** Dynamic mathematical flickering tied to subtle point-light radius fluctuations, simulating atmospheric draft.

### 3. Zero-Dependency Web Audio Synthesizer

**100% Procedural Audio — Zero Audio Files to Download:**
- **Atmospheric Tanpura Drone:** Polyphonic additive synthesis generating traditional Indian root and fifth harmonic intervals with slow phase modulation.
- **Flame Resonance:** Filtered pink noise buffer dynamically modulated by flame height and flicker frequency.
- **Pyrotechnic Sound Synthesis:** 
  - *Bursts & Bangs:* Dual exponentially decaying sub-bass oscillators paired with high-frequency noise transients.
  - *Whistles & Crackles:* Poisson-distributed stochastic grain synthesis producing realistic sparkle crackles.
  - *Microsecond Synchronization:* All sound events are scheduled directly onto the browser `AudioContext.currentTime` clock, perfectly synchronized with visual burst triggers.

### 4. Dual-Scale Spatial Dynamics

To faithfully render both macro courtyard fireworks and towering sky bursts simultaneously, spatial physics are bifurcated:
- **Courtyard Scale (Ground Pieces):** Built for 1–2 meter distances around a 10 cm clay diya using real metric gravity ($9.8\text{ m/s}^2$) and centimeter-scale sparks.
- **Atmospheric Scale (Sky Pieces):** Occurring 12–25 meters away, aerial bursts utilize stylised drag decay and gentle gravitational falloff to keep cascading golden willows within the cinematic viewport.

### 5. Adaptive Device Quality Tiering

The experience continuously monitors frame pacing and categorizes the client hardware:

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│     High Tier        │     Medium Tier      │       Low Tier       │
├──────────────────────┼──────────────────────┼──────────────────────┤
│ • 16,000 Particles   │ • 8,000 Particles    │ • 3,600 Particles    │
│ • Max DPR: 2.0       │ • Max DPR: 1.5       │ • Max DPR: 1.0       │
│ • Full Volumetric    │ • Optimized Shaders  │ • Simplified Fog     │
│ • 8 Audio Voices     │ • 6 Audio Voices     │ • 4 Audio Voices     │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 🎨 Design System & Color Tokens

Inspired by royal Indian palaces, burnished copper, terracotta clay, and incandescent oil flame:

| Token | Hex | Role |
| :--- | :--- | :--- |
| `--color-night` | `#050204` | Obsidian midnight background base |
| `--color-maroon-deep` | `#18060c` | Deep imperial courtyard shadow |
| `--color-gold` | `#d99a2b` | Traditional polished brass trim |
| `--color-gold-warm` | `#f5b942` | Radiant flame illumination aura |
| `--color-gold-bright` | `#ffd76a` | Incandescent spark highlight |
| `--color-flame-orange`| `#ff8a1f` | Vibrant inner flame mantle |
| `--color-ink` | `#fff4de` | Ivory calligraphy text color |

**Typography:**
- **Display:** *Cormorant Garamond* (classical, regal serif)
- **Calligraphy:** *Great Vibes* (fluid handwriting strokes)
- **Interface:** *Inter Variable* (clean, ultra-legible controls)
- **Monospace:** *IBM Plex Mono* (physics & telemetry data)

---

## 📁 Project Architecture

```
Diya/
├── index.html                   # HTML entry point with font preloads
├── package.json                 # Dependencies & project scripts
├── tsconfig.json                # Strict TypeScript configuration
├── vite.config.ts               # Vite configuration with Tailwind v4
├── vercel.json                  # Production routing & caching config
├── src/
│   ├── main.tsx                 # React DOM root mounting
│   ├── App.tsx                  # Experience coordinator & route handler
│   ├── animations/              # GSAP cinematic camera & sequence timelines
│   │   ├── camera.ts            # Viewport camera orbit transitions
│   │   ├── greeting.ts          # Calligraphy stroke animation timeline
│   │   ├── ignition.ts          # Spark-to-flame ignition choreography
│   │   ├── intro.ts             # Opening atmospheric fade-in
│   │   ├── reveal.ts            # Courtyard & rangoli reveal sequence
│   │   └── world.ts             # Ambient breathing and idle motion
│   ├── components/
│   │   ├── about/               # Cultural context modal
│   │   ├── audio/               # Web Audio synthesizer controls & toggle
│   │   ├── cursor/              # Custom golden sparkle cursor trail
│   │   ├── diya/                # 3D Diya mesh, materials & flame shaders
│   │   ├── experience/          # Narrative overlay & experience wrapper
│   │   ├── fallback/            # WebGL support detection fallback
│   │   ├── fireworks/           # 2D/3D interaction canvas overlay
│   │   ├── greeting/            # Dynamic handwriting blessing card generator
│   │   ├── loading/             # Vector brand mark & loading screen
│   │   ├── navigation/          # Mode selector, tabs & celebrate drawer
│   │   └── rangoli/             # Procedural floor mandala geometry
│   ├── fireworks/               # GPU physics engine & particle pools
│   │   ├── audio.ts             # Procedural explosion & crackle sound synthesis
│   │   ├── FireworkManager.ts   # Scene coordination, light sync & camera shake
│   │   ├── ground.ts            # Anar, chakri, and phuljhadi mechanics
│   │   ├── ParticleSystem.ts    # Pooled Points, GLSL shaders & ring allocator
│   │   ├── queue.ts             # Burst scheduling queue
│   │   ├── shells.ts            # 7 distinct burst pattern geometries
│   │   ├── show.ts              # Choreographed finale show timeline
│   │   ├── sky.ts               # Aerial shell & multi-shot cake logic
│   │   ├── stage.ts             # Touch coordinate raycasting & projection
│   │   └── types.ts             # Particle attributes & quality tier budgets
│   ├── hooks/                   # Custom React hooks (audio, idle, performance)
│   ├── scene/                   # Three.js Canvas, Lighting, Camera, Environment
│   ├── state/                   # Zustand central state store
│   ├── styles/                  # Tailwind CSS v4 & custom design tokens
│   └── utils/                   # Procedural textures, device tiers & flicker math
```

---

## 🧭 URL Parameters & Deep Linking

Share custom cards or launch automated presentations directly using query parameters:

| Parameter | Example | Description |
| :--- | :--- | :--- |
| `?demo` | `https://site.com/?demo` | Triggers automated cinematic playback through all narrative chapters without requiring user clicks. |
| `?to` | `?to=Arya` | Sets the recipient name for the customized blessing card. |
| `?from` | `?from=Diya+Team` | Sets the sender name on the blessing card. |
| `?msg` | `?msg=Happy+Diwali!` | Populates custom blessing text rendered in dynamic calligraphy. |

**Full Blessing Card Example:**
```
https://github.com/Aryaaa-21/Diya?to=Aarav&from=Priya&msg=May+your+year+be+filled+with+radiant+light+and+joy
```

---

## 🚀 Quick Start & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Aryaaa-21/Diya.git
cd Diya

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

Open your browser to `http://localhost:5173/` to view the application with Hot Module Replacement (HMR).

### Available Commands

```bash
# Start local development server
npm run dev

# Run TypeScript typecheck without emitting output
npm run typecheck

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📜 Cultural Roots & Philosophy

Diwali (*Deepavali*, from Sanskrit *dīpāvali*, meaning "row of lights") celebrates the triumph of light over darkness, knowledge over ignorance, and hope over despair. 

In traditional homes across India and the diaspora, a small clay lamp (*diya*) filled with mustard oil or ghee is lit at dusk on *Amavasya* (the darkest night of the lunar month). That single flame is passed along to light dozens more, which illuminate intricate floor patterns (*rangoli*) made of colored quartz and rice flour, eventually connecting entire communities into a radiant constellation.

*The Light Within* honors this tradition by replicating its core physical and contemplative essence through digital craftsmanship.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
<sub>Crafted with reverence, sacred geometry, and creative code. Happy Diwali! 🪔✨</sub>
</div>
