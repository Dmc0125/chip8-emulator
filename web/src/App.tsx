import { useEffect, useRef, useState, type ChangeEvent } from "react"

type IconPros = {
    name: string
    className: string
}

function Icon(props: IconPros) {
    return (
        <svg className={props.className}>
            <use xlinkHref={"/icons.svg#" + props.name}></use>
        </svg>
    )
}

type KeypadProps = {
    keydown: (key: number) => void
    keyup: (key: number) => void
}

function Keypad({ keyup, keydown }: KeypadProps) {
    const keyRows = [["1", "2", "3", "C"], ["4", "5", "6", "D"], ["7", "8", "9", "E"], ["A", "0", "B", "F"]]

    function keyHex(key: string): number {
        switch (key) {
            case "1":
                return 0x1
            case "2":
                return 0x2
            case "3":
                return 0x3
            case "C":
                return 0xC
            case "4":
                return 0x4
            case "5":
                return 0x5
            case "6":
                return 0x6
            case "D":
                return 0xD
            case "7":
                return 0x7
            case "8":
                return 0x8
            case "9":
                return 0x9
            case "E":
                return 0xE
            case "A":
                return 0xA
            case "0":
                return 0x0
            case "B":
                return 0xB
            case "F":
                return 0xF
        }
        return 0xFF
    }

    return (
        <div className="w-full p-4 border border-slate-800 rounded flex flex-col text-slate-400 gap-4">
            {
                keyRows.map((row, i) => {
                    return (
                        <div key={i} className="grid grid-cols-[repeat(4,1fr)] gap-6">
                            {
                                row.map((key) => {
                                    return (
                                        <div
                                            key={key}
                                            onMouseDown={() => keydown(keyHex(key))}
                                            onMouseUp={() => keyup(keyHex(key))}
                                            className="w-full aspect-square border border-slate-800 rounded bg-slate-700 flex items-center justify-center text-xl cursor-pointer"
                                        >
                                            {key}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    )
                })
            }
        </div>
    )
}

type Rom = {
    id: number
    name: string
    data: number[]
}

type RomsListProps = {
    roms: Rom[]
    selectedId: number | null
    select: (id: number) => void
}

function RomsList({ roms, selectedId, select }: RomsListProps) {
    if (roms.length == 0) {
        return <p className="text-slate-300 text-sm">No ROMs loaded</p>
    }

    return (
        <ul className="w-full flex flex-col gap-2">
            {roms.map(function(rom) {
                return (
                    <li
                        key={rom.id}
                        className={
                            (selectedId == rom.id ? "border-green-600" : "border-slate-800 hover:border-green-600") +
                            " w-full bg-slate-800 border rounded cursor-pointer"
                        }
                    >
                        <button
                            className="w-full h-10 pl-4 text-sm text-slate-400 text-left"
                            onClick={() => select(rom.id)}
                        >
                            {rom.name}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

type WasmExports = {
    init: () => number
    alloc_u8_slice: (len: number) => number
    emulator_init: (emulator_ptr: number) => void
    emulator_load_program: (emulator_ptr: number, program_data_ptr: number, program_data_len: number) => void
    emulator_frame_start: (emulator_ptr: number) => void
    emulator_record_key_down: (emulator_ptr: number, key: number) => void
    emulator_record_key_up: (emulator_ptr: number, key: number) => void
    emulator_process_instructions: (emulator_ptr: number) => number
    emulator_play_sound: (emulator_ptr: number) => boolean
    memory: any
}

type EmulatorContext = {
    exports: WasmExports
    memoryBuffer: ArrayBuffer
    emulatorPtr: number
    displayBuffer: Uint8Array
    audioContext: AudioContext
}

const SCREEN_COLUMNS = 64
const SCREEN_ROWS = 32
const DISPLAY_BUFFER_LEN = SCREEN_ROWS * SCREEN_COLUMNS

function App() {
    const canvasElement = useRef<HTMLCanvasElement>(null as any as HTMLCanvasElement)

    useEffect(() => {
        function handler() {
            const r = canvasElement.current.getBoundingClientRect()
            canvasElement.current.width = r.width
            canvasElement.current.height = r.height
        }
        window.addEventListener("resize", handler)
        return () => {
            window.removeEventListener("resize", handler)
        }
    }, [])

    const [wasmLoaded, setWasmLoaded] = useState(false)
    const emulatorContext = useRef<EmulatorContext>({} as EmulatorContext)

    useEffect(() => {
        let cancelled = false;

        (async function() {
            const emulatorWasmBytes = await (await fetch("/emulator.wasm")).bytes()
            let memoryBuffer: ArrayBuffer

            const td = new TextDecoder()

            const wasm = await WebAssembly.instantiate(emulatorWasmBytes, {
                odin_env: {
                    write(fd: number, ptr: number, len: number) {
                        if (len == 0) {
                            return
                        }
                        const data = new Uint8Array(memoryBuffer, ptr, len)
                        let str: string = ""
                        let print: ((...data: any[]) => void) | null = null
                        if (fd == 1) {
                            print = console.log
                            str = td.decode(data)
                        } else if (fd == 2) {
                            print = console.error
                            str = td.decode(data)
                        }

                        if (print && str != "" && str.trim() != "") {
                            print(str)
                        }
                    }
                }
            })

            const exports = wasm.instance.exports as WasmExports
            memoryBuffer = (exports.memory as any).buffer as ArrayBuffer

            if (!cancelled) {
                emulatorContext.current.exports = exports
                emulatorContext.current.memoryBuffer = memoryBuffer

                const initResultPtr = exports.init()
                const initResult = new Uint32Array(memoryBuffer, initResultPtr, 2)

                emulatorContext.current.emulatorPtr = initResult[0]
                const displayBufferPtr = initResult[1]
                emulatorContext.current.displayBuffer = new Uint8Array(memoryBuffer, displayBufferPtr, DISPLAY_BUFFER_LEN)

                emulatorContext.current.audioContext = new AudioContext({ sampleRate: 44100 })

                setWasmLoaded(true)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    type KeypadEvent = {
        type: "down" | "up"
        key: number
    }
    const keys = useRef<KeypadEvent[]>([])

    useEffect(() => {
        function getKey(code: string): number {
            switch (code.toLowerCase()) {
                case "digit1":
                    return 0x01
                case "digit2":
                    return 0x02
                case "digit3":
                    return 0x03
                case "digit4":
                    return 0x0C
                case "keyq":
                    return 0x04
                case "keyw":
                    return 0x05
                case "keye":
                    return 0x06
                case "keyr":
                    return 0x0D
                case "keya":
                    return 0x07
                case "keys":
                    return 0x08
                case "keyd":
                    return 0x09
                case "keyf":
                    return 0x0E
                case "keyz":
                    return 0x0A
                case "keyx":
                    return 0x00
                case "keyc":
                    return 0x0B
                case "keyv":
                    return 0x0F
            }

            return 0xFF
        }

        function handleKeyDown(e: KeyboardEvent) {
            const key = getKey(e.code)
            if (key != 0xFF) {
                keys.current.push({
                    type: "down",
                    key,
                })
            }
        }
        function handleKeyUp(e: KeyboardEvent) {
            const key = getKey(e.code)
            if (key != 0xFF) {
                keys.current.push({
                    type: "up",
                    key,
                })
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyDown)
        }
    }, [])


    type EmulatorState = "playing" | "paused" | "ready"

    const [emulatorState, setEmulatorState] = useState<EmulatorState>("ready")

    function playButtonText(state: EmulatorState): string {
        switch (state) {
            case "ready":
                return "Play"
            case "playing":
                return "Pause"
            case "paused":
                return "Resume"
        }
    }

    function playBeep() {
        const audioContext = emulatorContext.current.audioContext
        const oscillator = audioContext.createOscillator()
        oscillator.frequency.value = 880
        oscillator.type = "sine"
        oscillator.connect(audioContext.destination)
        oscillator.start()
        return oscillator
    }

    type StepContext = {
        oscillator: OscillatorNode | null,
        rafId: number | null,
        timeoutId: number | null
    }
    const stepContext = useRef<StepContext>({ oscillator: null, rafId: null, timeoutId: null })

    function step(currentTimestamp: number, prevTimestamp: number) {
        const dt = currentTimestamp - prevTimestamp

        const canvasCtx = canvasElement.current.getContext("2d")
        if (!canvasCtx) {
            throw Error("unable to get canvas ctx")
        }

        const emCtx = emulatorContext.current
        const exports = emCtx.exports

        // frame_start
        exports.emulator_frame_start(emCtx.emulatorPtr)

        // keyboard
        while (keys.current.length > 0) {
            const e = keys.current.shift()!
            if (e.type === "down") {
                exports.emulator_record_key_down(emCtx.emulatorPtr, e.key)
            } else if (e.type === "up") {
                exports.emulator_record_key_up(emCtx.emulatorPtr, e.key)
            }
        }

        // ixs
        const err = exports.emulator_process_instructions(emCtx.emulatorPtr)
        if (err != 0) {
            throw Error(`process instructions error: ${err}`)
        }

        // audio
        const playSound = exports.emulator_play_sound(emCtx.emulatorPtr)
        if (playSound && !stepContext.current.oscillator) {
            stepContext.current.oscillator = playBeep()
        } else if (!playSound && stepContext.current.oscillator) {
            stepContext.current.oscillator.stop()
            stepContext.current.oscillator = null
        }

        // draw
        const canvasWidth = canvasElement.current.width
        const canvasHeight = canvasElement.current.height

        const pixelWidth = canvasWidth / SCREEN_COLUMNS
        const pixelHeight = canvasHeight / SCREEN_ROWS

        canvasCtx.fillStyle = "rgb(255 255 255)"
        canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight)

        canvasCtx.fillStyle = "rgb(0 0 0)"
        for (let i = 0; i < emCtx.displayBuffer.length; i += 1) {
            const b = emCtx.displayBuffer[i]
            if (b === 1) {
                const x = i % SCREEN_COLUMNS
                const y = Math.floor(i / SCREEN_COLUMNS)

                canvasCtx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight)
            }
        }

        // sleep
        function schedule() {
            stepContext.current.rafId = requestAnimationFrame(function(n) {
                step(n, currentTimestamp)
            })
        }

        const TARGET_FRAMETIME = 1000 / 60
        const remaining = TARGET_FRAMETIME - dt
        if (remaining > 0) {
            stepContext.current.timeoutId = setTimeout(schedule, remaining)
        } else {
            schedule()
        }
    }

    const [roms, setRoms] = useState<Rom[]>([])
    const [romSelected, setRomSelected] = useState<number | null>(null)

    function handlePlayButtonClick() {
        if (emulatorState === "ready") {
            // start 
            if (romSelected != null && roms.length > romSelected) {
                stepContext.current.rafId = requestAnimationFrame(function(timestamp) {
                    step(timestamp, 0)
                })
                setEmulatorState("playing")
            }
        } else if (emulatorState === "playing") {
            // pause
            if (stepContext.current.rafId != null) {
                cancelAnimationFrame(stepContext.current.rafId)
            }
            if (stepContext.current.timeoutId != null) {
                clearTimeout(stepContext.current.timeoutId)
            }

            setEmulatorState("paused")
        } else {
            // unpause
            stepContext.current.rafId = requestAnimationFrame(function(timestamp) {
                step(timestamp, 0)
            })
            setEmulatorState("playing")
        }
    }

    function handleSelectRom(romId: number) {
        if (romSelected === romId) {
            return
        }

        let selectedRom: Rom | null = null
        for (let i = 0; i < roms.length; i += 1) {
            const rom = roms[i]
            if (rom.id === romId) {
                selectedRom = rom
            }
        }

        if (selectedRom === null) {
            throw Error("missing ROM with id: " + romId)
        }

        const exports = emulatorContext.current.exports
        const romLength = selectedRom.data.length
        const slicePtr = exports.alloc_u8_slice(romLength)
        const sliceBuffer = new Uint8Array(emulatorContext.current.memoryBuffer, slicePtr, romLength)
        sliceBuffer.set(selectedRom.data)

        exports.emulator_load_program(
            emulatorContext.current.emulatorPtr,
            slicePtr,
            romLength,
        )

        setRomSelected(romId)
    }

    function lsGetRoms(): Rom[] {
        const lsRoms = localStorage.getItem("roms")
        if (lsRoms == null) {
            return []
        } else {
            let savedRoms: null | Rom[] = null
            try {
                savedRoms = JSON.parse(lsRoms)
            } catch { }
            if (!Array.isArray(savedRoms)) {
                return []
            } else {
                return savedRoms
            }
        }
    }

    useEffect(() => {
        const savedRoms = lsGetRoms()
        setRoms(savedRoms)
    }, [])

    async function handleUploadRom(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) {
            return
        }

        const fileData = await file.bytes()
        const fileByteLen = fileData.length
        if (fileByteLen > 4096) {
            throw Error("File too big")
        }

        const rom: Rom = {
            id: roms.length,
            name: file.name,
            data: [...fileData],
        }

        setRoms([...roms, rom])

        const savedRoms = lsGetRoms()
        savedRoms.push(rom)
        localStorage.setItem("roms", JSON.stringify(savedRoms))
    }


    return (
        <>
            <section className="w-full min-h-[100vh] pb-8 flex flex-col">
                <header className="w-full h-16 border-b border-slate-800 flex items-center justify-center gap-4">
                    <Icon name="chip" className="size-8 text-green-600"></Icon>
                    <h1 className="text-xl font-medium text-slate-300">CHIP-8 emulator</h1>
                </header>

                <div className="w-full px-4 mt-10">
                    <div className="w-full p-4 border border-slate-800 rounded">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-medium">Display</p>
                            {
                                romSelected != null && roms.length > romSelected
                                    ? <p className="text-slate-200 text-sm">{roms[romSelected].name}</p>
                                    : <></>
                            }
                        </div>
                        <canvas ref={canvasElement} className="w-full mt-2 aspect-[2/1] bg-slate-700" />
                    </div>
                </div>

                <div className="w-full mt-4 px-4 grid grid-cols-[repeat(2,1fr)] gap-4 ">
                    <div className="w-full relative grid group">
                        <input
                            type="file"
                            accept=".rom,.ch8"
                            className="absolute opacity-0 inset-0 cursor-pointer"
                            onChange={handleUploadRom}
                            disabled={!wasmLoaded}
                        />
                        <div
                            className={
                                (wasmLoaded ? "border-slate-800 group-hover:border-green-600" : "border-slate-900") +
                                " w-full h-full border border-dashed rounded flex items-center justify-center transition-all pointer-events-none"
                            }
                        >
                            <p className="text-slate-200 text-sm">Upload ROM</p>
                        </div>
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <button
                            className={
                                (romSelected != null ? "bg-green-600 text-slate-800 cursor-pointer" : "bg-slate-800 text-slate-200") +
                                " w-full h-10 rounded"
                            }
                            disabled={romSelected == null}
                            type="button"
                            onClick={handlePlayButtonClick}
                        >{playButtonText(emulatorState)}</button>
                    </div>
                </div>

                <div className="w-full px-4 mt-4">
                    <Keypad
                        keydown={(key) => keys.current.push({ key, type: "down" })}
                        keyup={(key) => keys.current.push({ key, type: "up" })}
                    />
                </div>

                <div className="w-full mt-4 px-4 rounded flex flex-col gap-2">
                    <p className="text-slate-400 text-sm font-medium">Loaded ROMs</p>
                    <RomsList roms={roms} selectedId={romSelected} select={handleSelectRom} />
                </div>
            </section>
        </>
    )
}

export default App
