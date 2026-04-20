# Quattro vs Unity — Should We Build a 3D Rhythm Game Here?

> **TL;DR:** Quattro is an excellent fit for Roland's product ecosystem and 2D/UI-driven music apps. It is the wrong tool for a production 3D rhythm game. Unity is the right call — but the path from this prototype to Unity is shorter than it looks, and this prototype was still valuable.

---

## 1. What Is Quattro, Actually?

Quattro is a **Roland-internal cross-platform framework** that wraps a WebView (WKWebView on iOS, WebView2 on Windows, etc.) and exposes native hardware APIs to a React/TypeScript app via a JS bridge.

```
┌──────────────────────────────────────┐
│  React + Vite + TypeScript (Web)     │
│  PixiJS / MUI / your code            │
├──────────────────────────────────────┤
│  $native bridge (prompt / postMessage│
│  or chrome.webview on Windows)       │
├──────────────────────────────────────┤
│  Native layer (C/ObjC/Swift/Java)    │
│  MIDI · BLE · Audio I/O · FS · Seq  │
├──────────────────────────────────────┤
│  iOS · Android · Windows · macOS     │
└──────────────────────────────────────┘
```

It was built for **Roland's apps** (synth editors, MIDI tools, patch librarians) — not for games. That context matters for every decision below.

---

## 2. The Question of Adding New Libraries

> *"If Roland created this framework, should we even install new libs?"*

**Short answer: yes, cautiously — but you're already doing it.**

The framework is just a React app. `package.json` controls dependencies, and `npm install` works normally. The codebase already has non-Roland libraries: PixiJS, MUI, i18next, Redux Toolkit, `@tonejs/midi`. So adding libs is fine in principle.

**The real constraint is the build target, not Roland's "blessing":**

| Concern | Reality |
|---|---|
| JS libs that use `fetch` / WebSocket | Work in dev (browser); may break on native (Quattro intercepts some APIs) |
| Libs that need `Node.js` APIs | Won't work; Vite polyfills only what's declared in `vite.config.ts` |
| Libs that use SharedArrayBuffer / WASM threads | Blocked by missing `COOP/COEP` headers in a file:// WebView |
| Libs that write to disk | Must go through `Quattro.fs`, not Node `fs` |
| 3D engines (Three.js, Babylon.js) | WebGL works — but see section 4 |
| Heavy npm packages (tone.js, FMOD.js) | Bundle size inflates; native WebView has limited memory headroom on iPad |

**Rule of thumb:** If the lib only touches the DOM / Canvas / WebAudio / WebGL, it will work. If it assumes a browser server environment or native Node, it won't.

---

## 3. What Quattro Is Good At

| Capability | Quality |
|---|---|
| MIDI I/O (hardware + BLE) | ★★★★★ — first-class native, low-latency |
| BLE device management | ★★★★☆ |
| File I/O (read/write assets, documents) | ★★★☆☆ — works, but 512KB limit per read, hex-encoded |
| Cross-platform (iOS/Android/Win/Mac) | ★★★★☆ — same codebase, platform-aware paths |
| 2D UI-driven music apps | ★★★★★ — this is the intended use case |
| React ecosystem (state, routing, i18n) | ★★★★★ |
| Rapid prototyping | ★★★★★ |

---

## 4. The 3D Rhythm Game Problem

### 4.1 Graphics

Quattro has **no 3D layer**. The current implementation uses PixiJS (2D WebGL). If you want a 3D drum highway (à la Rock Band, Guitar Hero), you need Three.js or Babylon.js on top of a raw WebGL canvas inside the WebView.

**Can it work?** Technically yes. **Should you?** Read on.

### 4.2 The Latency Stack — The Core Problem

A rhythm game is a latency-measurement machine. Every millisecond of non-determinism is a bug. Here's the full stack in Quattro vs Unity:

```
QUATTRO STACK
──────────────────────────────────────────────
Physical pad hit
  ↓
USB/BLE MIDI hardware (~1ms)
  ↓
Native MIDI layer (ObjC/Swift) (~1-2ms)
  ↓
JS bridge (prompt / postMessage) ← VARIABLE: 2–30ms
  ↓
JS event loop (RAF/microtask) ← VARIABLE: 0–16ms
  ↓
Game hit detection (your code)
  ↓
Audio output (WebAudio ctx.currentTime) ← output latency not compensated visually
  ↓
Display (RAF-driven, not vsync-locked on all WebViews) ← VARIABLE: 0–16ms

Total variable jitter: ~5–60ms uncompensated

UNITY STACK
──────────────────────────────────────────────
Physical pad hit
  ↓
USB/BLE MIDI hardware (~1ms)
  ↓
Native C# MIDI callback (~0.1ms, same thread)
  ↓
Update() / FixedUpdate() (deterministic tick) ← DETERMINISTIC: 0–1ms
  ↓
Audio (FMOD / Unity Audio) ← outputLatency exposed + compensated
  ↓
Display (vsync-locked render loop) ← DETERMINISTIC: 0–16ms at 60fps

Total variable jitter: ~1–5ms
```

**The JS bridge is the killer.** `prompt()` / `postMessage` crossing the native boundary is asynchronous and shares the main thread. Under load (Pixi rendering + JS scoring + React re-renders), MIDI events can be delayed 10–30ms in ways you cannot predict or compensate. That's the difference between "feels tight" and "feels broken".

### 4.3 Audio Sync

WebAudio `AudioContext.currentTime` is sample-accurate for the **clock** — that part is fine. The problem is:

- `outputLatency` is available but ignored for visual note positioning (notes are rendered at `currentTime`, but audio arrives at `currentTime + outputLatency`). On iOS WebViews, `outputLatency` can be 80–120ms.
- RAF jitter means the visual position of a note when it crosses the hit line is ±8ms off from where the math says it should be.
- Both problems compound: a note that "looks" on the line may be up to ~130ms off from when the user hears the beat.

In Unity + FMOD, output latency is a configurable, exposed constant. You shift the visual note positions by exactly that amount. No guessing.

### 4.4 The 512KB File Read Limit

`Quattro.fs.readData()` is capped at **512KB per call**. A compressed OGG for a 2:39 song is typically 3–8MB. You'd need to:
- Implement chunked reads and reassemble in JS before `decodeAudioData()`
- Or use `Quattro.seq` (the built-in sequencer) which has its own format constraints

This is a real engineering cost. Unity: `AudioClip.LoadAudioData()`, done.

### 4.5 Memory Pressure

iPad has 4–6GB RAM, but the WebView process is sandboxed and typically gets ~500MB before the OS kills it. A 3D scene with:
- Three.js scene graph + renderer
- Decoded audio buffer (uncompressed PCM for a 2:39 song ≈ ~28MB stereo at 44.1kHz)
- PixiJS or Three.js textures for note objects
- React + Redux state

...can push past the limit, especially when combined with the Roland app's existing footprint. Unity manages a native process with direct memory control.

### 4.6 Shader / Visual Effects

Rock Band / Guitar Hero visual identity comes from post-processing (bloom on notes, motion blur, specular drum surfaces). In Quattro/WebGL:
- PixiJS has `pixi-filters` (bloom etc.) — 2D only
- Three.js post-processing works in WebGL but is not vsync-locked, so visual consistency suffers
- Custom GLSL shaders work but there's no tooling (no Unity ShaderGraph equivalent)

---

## 5. Specific Problems You Would Hit

### Already hit in this prototype:
| Problem | Root Cause | Mitigation Cost |
|---|---|---|
| `fetch()` blocked on iOS native | WebView sandboxing | Moderate — `Quattro.fs` wrapper needed everywhere |
| Binary data returned as hex | Bridge limitation | Low — one `hexToArrayBuffer()` utility |
| `AudioContext` autoplay policy | iOS browser policy | Low — first gesture workaround |
| `inset` prop TS error on MUI | Version compat | Low — use `sx={{}}` |
| Calibration measures wrong lag | Architecture (audio vs visual domain) | High — required full redesign of calibration |

### Would hit next:
| Problem | Severity | Notes |
|---|---|---|
| MIDI bridge jitter under load | **Critical** | 10–30ms jitter, uncompensatable |
| Song files > 512KB | **High** | Need chunked reads or different API |
| 3D scene memory pressure | **High** | WebView sandboxed memory limit |
| No vsync-locked render loop | **High** | RAF is not guaranteed 60fps on all WebViews |
| No shader tooling | Medium | Manual GLSL, no visual editor |
| WebView OGG decode varies by platform | Medium | Not all WebViews support OGG; MP3 safer |
| No 3D asset pipeline | Medium | No FBX/glTF build step in Vite without custom plugins |
| Quattro.seq vs WebAudio conflict | Medium | Two separate clocks, need careful sync |
| iOS 14 WebGL limitations | Low-Medium | Some WebGL extensions unavailable pre-iOS 15 |
| Bundle size explosion | Low | Three.js alone is ~600KB gzipped |

---

## 6. Unity Advantages for This Specific Game

| Requirement | Unity Solution |
|---|---|
| 3D drum highway | Native renderer, Shader Graph, Timeline |
| MIDI input | `UnityMidiPlugin`, `RtMidi` binding, or Roland's own C# MIDI lib |
| Sample-accurate audio clock | FMOD (built-in), `DSP time` API |
| vsync-locked game loop | `Update()` runs on the render thread, frame-perfect |
| Output latency compensation | `AudioSettings.dspTime` + `AudioConfiguration.dspBufferSize` |
| Cross-platform (iOS/Android) | First-class targets, same C# codebase |
| Asset pipeline | Built-in: FBX, glTF, OGG, WAV, MP3, shader compilation |
| Bloom / post-processing | Universal Render Pipeline (URP) built-in |
| Note chart parsing | Pure C# — no WASM, no hex conversion, no bridge |
| Memory management | Direct native allocations, addressables for streaming |

---

## 7. What This Prototype Was Worth

Even if you move to Unity, this prototype delivered real value:

1. **MIDI mapping is validated.** The `drumPadMap.ts` `MIDI_TO_LANE` mapping came from actual Roland pad data and is now confirmed correct for the target hardware.
2. **Scoring windows are calibrated.** `±25ms/±50ms/±75ms` for Perfect/Good/OK are reasonable starting points — export these constants to Unity.
3. **The visual calibration approach works.** The Guitar Hero-style visual calibration (measure delta in game time domain, not audio playback domain) is the correct architecture. Port this to Unity exactly.
4. **The chart parser is validated.** Both `parseTonejs` and `parseRaw` produce the same output — you know the MIDI file format is correct and the note positions are accurate.
5. **UI/UX patterns are proven.** Score HUD, judgement feedback text, phase flow (idle → playing → result) — these are portable concepts.

---

## 8. Recommendation

```
DO NOT build the production rhythm game in Quattro.
BUILD it in Unity.
```

**The decision tree:**

```
Is this a Roland app that needs MIDI device management, BLE, 
patch editing, or tight hardware integration?
    YES → Quattro is ideal
    NO  ↓

Does it need frame-perfect timing + 3D + audio sync?
    YES → Unity
    NO  → Quattro is acceptable for 2D prototyping
```

**Migration path:**
1. Export `MIDI_TO_LANE` map → C# Dictionary
2. Export scoring window constants → C# constants
3. Port the visual calibration algorithm → C# MonoBehaviour
4. Use `Midi.Load(notes.mid)` in Unity (via DryWetMidi or MidiPlayerToolkit)
5. Use FMOD for `song.ogg` — sample-accurate clock with `FMOD_DSP_TIME`
6. Keep the React/Quattro wrapper for **MIDI device setup** UI only (this is where Quattro shines — let Unity handle gameplay, Quattro handle the settings/pairing screens if needed)

---

## 9. If You Must Stay in Quattro

If there's a business constraint to staying in the framework:

- **Drop 3D entirely.** Stay 2D (PixiJS). GH-style 2D highway is still engaging.
- **Accept the latency floor.** Widen judgement windows to ±40ms/±80ms/±120ms.
- **Use `Quattro.seq` for the metronome clock only**, WebAudio for song playback, and sync them at start. This avoids the hex-decode bottleneck for the timing-critical beat clock.
- **Test on the actual target hardware.** iPad bridge latency varies significantly by model (Air vs Pro vs mini). Measure with a hardware oscilloscope or a MIDI loopback test, not by feel.
- **Do not add Three.js.** The memory + rendering overhead in a WebView on iPad is too risky for production.
