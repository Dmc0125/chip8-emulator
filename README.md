# chip8-emulator

A CHIP-8 emulator with:
- a native desktop runner built in Odin + SDL2
- a web frontend built with React/TypeScript that runs the Odin emulator via WebAssembly

## About

This project implements a CHIP-8 emulator core in Odin and exposes it in two ways:

1. **Native desktop app** using SDL2 for windowing, input, rendering, and audio
2. **Web app** using React and a WebAssembly build of the emulator

It solves the usual split between emulator logic and platform UI by keeping the emulator itself in a shared Odin module, then wiring it to SDL on desktop and to browser APIs on the web.

## Features

- CHIP-8 emulator core in Odin
- 64×32 display buffer
- 16-key input handling
- Delay and sound timers
- Simple tone generation for sound
- Native SDL2 runner that loads a ROM from disk
- WebAssembly build for browser use
- React web UI with:
  - built-in sample ROMs
  - ROM upload support (`.rom`, `.ch8`)
  - on-screen keypad
  - keyboard input
  - play / pause / resume controls
  - sound toggle
  - ROM persistence in `localStorage`

## Tech Stack

### Emulator
- **Odin**
- **SDL2** (native build)

### Web
- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **WebAssembly**

## Getting Started

## Prerequisites

### For the native app
- [Odin](https://odin-lang.org/)
- SDL2 available to the Odin build environment

### For the web app
- Node.js
- npm
- Odin (to build the WebAssembly module)

## Installation

Clone the repository, then choose either the native or web workflow.

## Running the native app

Build and run the Odin SDL version, passing a ROM path as the first argument.

Example:

```bash
odin run ./emulator/src -- path/to/rom.ch8
```

If no ROM path is provided, the app prints:

```text
missing source path
```

### Native key mapping

The desktop runner maps the keyboard like this:

```text
1 2 3 4      -> 1 2 3 C
Q W E R      -> 4 5 6 D
A S D F      -> 7 8 9 E
Z X C V      -> A 0 B F
```

## Running the web app

### 1) Build the WebAssembly emulator

From the repo root:

```bash
./build_wasm.sh
```

This outputs:

```text
web/public/emulator.wasm
```

### 2) Install web dependencies

```bash
cd web
npm install
```

### 3) Start the dev server

```bash
npm run dev
```

### Other web commands

```bash
npm run build
npm run preview
npm run lint
```

## Environment Variables

No environment variables or `.env` files are defined in the provided source.

## Usage

## Web app

The web UI provides:
- a display canvas
- a ROM list
- ROM upload
- a keypad
- sound on/off
- play/pause/resume

### Built-in ROMs

The app includes these ROMs by default:
- Br8kout
- Tank!
- Spockpaperscissors

### Uploading ROMs

Use the **Upload ROM** control to load `.rom` or `.ch8` files. Uploaded ROMs are saved to `localStorage` and shown in the ROM list on future visits.

### Web keyboard mapping

The browser keyboard mapping matches the native app:

```text
1 2 3 4      -> 1 2 3 C
Q W E R      -> 4 5 6 D
A S D F      -> 7 8 9 E
Z X C V      -> A 0 B F
```

## Project Structure

```text
.
├── build_wasm.sh          # Builds the Odin emulator to web/public/emulator.wasm
├── emulator/
│   └── src/
│       ├── emulator/
│       │   └── emulator.odin   # Shared CHIP-8 emulator core
│       ├── main_sdl.odin       # Native SDL2 runner
│       └── main_wasm.odin      # WASM entry points/exports
├── web/
│   ├── public/
│   │   ├── emulator.wasm       # Generated WASM artifact
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── App.tsx             # Main web UI and WASM integration
│   │   ├── main.tsx            # React entry point
│   │   └── index.css           # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig*.json
└── LICENSE
```

## Emulator Notes

From the source:
- program memory starts at `0x200`
- display resolution is `64x32`
- the emulator processes `10` instructions per frame
- stack depth is `12`
- memory size is `4 KB`

## License

MIT (`LICENSE`)
