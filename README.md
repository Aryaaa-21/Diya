# The Light Within — A Digital Diwali Experience

> *"A single diya brings light into the darkness."*

An award-level, cinematic, interactive 3D web experience celebrating Diwali through light, sacred geometry, atmospheric particle systems, and generative celebrations.

[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-v19.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## ✨ Features & Visual Journey

- **🌑 The Primordial Darkness:** Begins in an atmospheric dark night with soft ambient particles and an unlit diya waiting to be ignited.
- **🪔 3D Hero Diya:** Terracotta clay texture, brass trim, and a procedural flame rendered with custom GLSL curl-noise turbulence, Fresnel glow, and organic flicker.
- **🌸 Procedural Rangoli:** Intricate golden and vermilion mandala patterns that emerge progressively as radiant light washes across the stone courtyard floor.
- **✨ Constellation of Diyas:** A vast ocean of hundreds of warm floating lamps illuminating the background with depth-of-field and atmospheric fog.
- **🎆 Interactive Night Sky:** Real-time physics-based firework particles launched on user clicks and taps, accompanied by smoke trails and cascading golden sparks. Seven selectable shell types — bloom, peony, willow, palm, ring, crackle and heart — each with its own burst geometry, drag, gravity and lifetime, or Mix to let every launch choose its own.
- **🪔 Celebrate Mode:** Six real firecrackers to light by hand — anar, rocket, chakri, phuljhadi, aerial shell and multi-shot cake. Touch the courtyard to set a ground piece down, touch the sky to send one up. Each follows the full physical beat (fuse, ignition, swell, climax, taper, embers, smoke), lights the courtyard with a shared dynamic light, and answers with a synthesised sound of its own. Includes a choreographed **Fireworks Show** that builds to a three-shell gold climax.
- **💌 Personalized Blessing Cards:** Create and share customized Diwali greeting cards rendered with dynamic handwriting calligraphy animations.
- **🎵 Zero-Dependency Audio Synthesizer:** Real-time procedural ambient soundscape powered by the Web Audio API (warm tanpura drones, night breeze, chime harmonics, and gentle flame crackle).
- **⚡ Adaptive Performance:** Real-time device quality tiering, dynamic resolution scaling (DPR), and reduced-motion accessibility support.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** React 19 + TypeScript
- **3D Graphics:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animation & Motion:** GSAP (GreenSock) for cinematic camera transitions
- **Styling:** Tailwind CSS v4 + Custom Design Tokens (Deep Maroon, Burnished Gold, Incandescent Amber)
- **Sound Design:** Web Audio API (procedural oscillators and noise buffers)
- **Build Tool:** Vite 8

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/Aryaaa-21/Diya.git
cd Diya

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Available Scripts

- `npm run dev` — Starts Vite dev server with hot module replacement.
- `npm run build` — Typechecks with TypeScript and compiles production bundle.
- `npm run preview` — Locally preview the production build.
- `npm run typecheck` — Runs `tsc --noEmit` to validate types.

---

## 🧭 URL Parameters

- `?demo` — Triggers automated cinematic playback through all narrative chapters.
- `?to=Recipient&from=Sender&msg=Custom+Message` — Pre-fills and renders a personalized Diwali greeting card.

---

## 🎆 How the fireworks work

Every firework in the scene is one pooled `Points` object and one draw call.
Nothing moves on the CPU: a particle's whole life is a closed-form function of
its origin, velocity, start time and lifetime, evaluated in the vertex shader.

That is what makes continuous pieces cheap. A fountain is not an emitter ticking
every frame — it is a slice of particles whose start times are staggered across
the next three seconds, written once at ignition and then free. A rocket is the
same trick: the climbing head, the trail dropped along its path, and all six
layers of the break are written in one pass, with the launch velocity solved
backwards from the break point so the head arrives exactly where the shell is
due to explode.

| Module | Responsibility |
| --- | --- |
| `fireworks/ParticleSystem.ts` | The pool, the GLSL, the ring allocator, draw-range bookkeeping |
| `fireworks/ground.ts` | Anar, chakri and phuljhadi, at courtyard scale and true gravity |
| `fireworks/sky.ts` | Rocket, shell and cake, built on one launch-and-break routine |
| `fireworks/shells.ts` | The seven aerial burst patterns |
| `fireworks/FireworkManager.ts` | Limits, the shared light, camera shake and gaze lift |
| `fireworks/audio.ts` | Synthesised bangs, hisses, whirrs and rumbles; voice limiting |
| `fireworks/show.ts` | The choreographed sequence |

Scale is deliberately split in two. The courtyard pieces burn a metre or two
from a diya that is five centimetres across, so they use centimetre sparks,
short lifetimes and real gravity. The aerial pieces happen ten to sixteen metres
out, so they use ten-centimetre sparks and a stylised, slow falloff — true
gravity would drop their sparks tens of metres, well below the frame. Spark size
is given in metres and projected properly, so both read correctly at once.

Sound is synthesised, not sampled: filtered noise and a couple of oscillators
per voice, scheduled ahead of time on the Web Audio clock. There is nothing to
license, nothing to download, and a cake's five bangs land exactly with its five
bursts without a single timer.

Budgets are per quality tier (`fireworks/types.ts`): 16000 / 8000 / 3600
particles, 8 / 6 / 4 simultaneous pieces, 8 / 6 / 4 concurrent sounds, with
trail and smoke layers dropped on the way down. The pool never grows — a piece
that doesn't fit recycles the oldest slots, so the newest firework always wins.

## 📜 License

MIT License. Designed and crafted with reverence for Diwali.

