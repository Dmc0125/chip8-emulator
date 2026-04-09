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

type WasmExports = {
    init: () => number
    alloc_u8_slice: (len: number) => number
    emulator_init: (emulator_ptr: number, program_data_ptr: number, program_data_len: number) => void
    emulator_frame_start: (emulator_ptr: number) => void
    emulator_record_key_down: (emulator_ptr: number, key: number) => void
    emulator_record_key_up: (emulator_ptr: number, key: number) => void
    emulator_process_instructions: (emulator_ptr: number) => number
    memory: any
}

const SCREEN_COLUMNS = 64
const SCREEN_ROWS = 32
const DISPLAY_BUFFER_LEN = SCREEN_ROWS * SCREEN_COLUMNS

function App() {
    const [wasmLoaded, setWasmLoaded] = useState(false)
    const wasmExports = useRef<WasmExports>({} as WasmExports)
    const wasmMemoryBuffer = useRef<ArrayBuffer>(new ArrayBuffer())
    const emulatorPtr = useRef(0)
    const displayBuffer = useRef(new Uint8Array())
    const canvasElement = useRef<HTMLCanvasElement>(null as any as HTMLCanvasElement)

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
                wasmExports.current = exports
                wasmMemoryBuffer.current = memoryBuffer

                const initResultPtr = exports.init()
                const initResult = new Uint32Array(memoryBuffer, initResultPtr, 2)

                emulatorPtr.current = initResult[0]
                const displayBufferPtr = initResult[1]
                displayBuffer.current = new Uint8Array(memoryBuffer, displayBufferPtr, DISPLAY_BUFFER_LEN)

                setWasmLoaded(true)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    const [romLoaded, setRomLoaded] = useState(false)

    async function handleRomFile(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) {
            return
        }

        const fileData = await file.bytes()
        const fileByteLen = fileData.length
        if (fileByteLen > 4096) {
            throw Error("File too big")
        }

        const exports = wasmExports.current
        const slicePtr = exports.alloc_u8_slice(fileByteLen)
        const programDataSlice = new Uint8Array(wasmMemoryBuffer.current, slicePtr, fileByteLen)
        programDataSlice.set(fileData)

        exports.emulator_init(emulatorPtr.current, slicePtr, fileByteLen)
        setRomLoaded(true)
    }

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

    const [playing, setPlaying] = useState(false)

    function handlePlay() {
        if (playing) {
            return
        }
        setPlaying(true)

        const canvasCtx = canvasElement.current.getContext("2d")
        const TARGET_FRAMETIME = 1000 / 60
        const exports = wasmExports.current

        function step(currentTimestamp: number, prevTimestamp: number) {
            const dt = currentTimestamp - prevTimestamp
            if (!canvasCtx) {
                throw Error("unable to get canvas ctx")
            }

            // frame_start
            exports.emulator_frame_start(emulatorPtr.current)

            const err = exports.emulator_process_instructions(emulatorPtr.current)
            if (err != 0) {
                throw Error(`process instructions error: ${err}`)
            }

            // audio
           

            // draw
            const canvasWidth = canvasElement.current.width
            const canvasHeight = canvasElement.current.height

            const pixelWidth = canvasWidth / SCREEN_COLUMNS
            const pixelHeight = canvasHeight / SCREEN_ROWS

            canvasCtx.fillStyle = "rgb(255 255 255)"
            canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight)

            canvasCtx.fillStyle = "rgb(0 0 0)"
            for (let i = 0; i < displayBuffer.current.length; i += 1) {
                const b = displayBuffer.current[i]
                if (b === 1) {
                    const x = i % SCREEN_COLUMNS
                    const y = Math.floor(i / SCREEN_COLUMNS)

                    canvasCtx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight)
                }
            }

            // sleep
            const remaining = TARGET_FRAMETIME - dt
            if (remaining > 0) {
                setTimeout(() => {
                    requestAnimationFrame(function(n) {
                        step(n, currentTimestamp)
                    })
                }, remaining)
            } else {
                requestAnimationFrame(function(n) {
                    step(n, currentTimestamp)
                })
            }
        }

        requestAnimationFrame(function(timestamp) {
            step(timestamp, 0)
        })
    }

    return (
        <>
            <section className="w-full min-h-[100vh] flex flex-col">
                <header className="w-full h-16 border-b border-slate-800 flex items-center justify-center gap-4">
                    <Icon name="chip" className="size-8 text-green-600"></Icon>
                    <h1 className="text-xl font-medium text-slate-300">CHIP-8 emulator</h1>
                </header>

                <div className="w-full px-4 mt-10">
                    <div className="w-full p-4 border border-slate-800 rounded">
                        <p className="text-slate-400 text-sm font-medium">Display</p>
                        <canvas ref={canvasElement} className="w-full mt-2 aspect-[2/1] bg-slate-700" />
                    </div>
                </div>

                <div className="w-full mt-4 px-4 grid grid-cols-[repeat(2,1fr)] gap-4 ">
                    <div className="w-full relative grid cursor-pointer">
                        <input
                            type="file"
                            accept=".rom,.ch8"
                            className="absolute opacity-0 inset-0"
                            onChange={handleRomFile}
                            disabled={!wasmLoaded}
                        />
                        <div
                            className={
                                (wasmLoaded ? "border-slate-800" : "border-slate-900") +
                                " w-full h-full border border-dashed rounded flex items-center justify-center"
                            }
                        >
                            <p className="text-slate-200 text-sm">Load ROM</p>
                        </div>
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <button
                            className={
                                (romLoaded ? "bg-green-600 text-slate-800 cursor-pointer" : "bg-slate-800 text-slate-200") +
                                " w-full h-10 rounded"
                            }
                            disabled={!romLoaded}
                            type="button"
                            onClick={handlePlay}
                        >Play</button>
                    </div>
                </div>
            </section>
        </>
    )
}

export default App
