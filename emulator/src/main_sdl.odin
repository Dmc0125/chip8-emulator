#+build !wasm32
package main

import "base:runtime"
import "core:fmt"
import "core:log"
import "core:math"
import "core:os"
import "core:time"

import SDL "vendor:sdl2"

import em "./emulator"

draw_pixel :: proc(renderer: ^SDL.Renderer, x, y: u8) {
	SDL.SetRenderDrawColor(renderer, 0, 0, 0, 255)
	SDL.RenderFillRectF(renderer, &SDL.FRect{x = f32(x) * 10, y = f32(y) * 10, w = 10, h = 10})
}

main :: proc() {
	context.logger = log.create_file_logger(
		os.stdout,
		opt = runtime.Logger_Options {
			.Terminal_Color,
			.Time,
			.Date,
			.Short_File_Path,
			.Level,
			.Procedure,
		},
	)

	// load program

	if len(os.args) == 1 {
		log.error("missing source path")
		return
	}
	program_data, err := os.read_entire_file_from_filename_or_err(
		os.args[1],
		allocator = context.allocator,
	)
	if err != nil {
		log.errorf("unable to read source file: %s", err)
		return
	}

	// init SDL

	if SDL.Init(SDL.INIT_EVERYTHING) < 0 {
		log.errorf("unable to init SDL: %s", SDL.GetErrorString())
		return
	}

	window := SDL.CreateWindow(
		"Chip-8",
		SDL.WINDOWPOS_UNDEFINED,
		SDL.WINDOWPOS_UNDEFINED,
		em.SCREEN_COLUMNS * 10,
		em.SCREEN_ROWS * 10,
		{.SHOWN},
	)
	if window == nil {
		log.errorf("unable to create widow: %s", SDL.GetErrorString())
		return
	}

	renderer := SDL.CreateRenderer(window, 0, {})
	if renderer == nil {
		log.errorf("unable to create renderer: %s", SDL.GetErrorString())
		return
	}

	SAMPLE_RATE :: 44100 // hz
	TONE_HZ :: 880
	AMPLITUDE :: 6000

	audio_device := SDL.OpenAudioDevice(
		nil,
		false,
		&SDL.AudioSpec{format = SDL.AUDIO_S16, freq = SAMPLE_RATE, channels = 1, samples = 512},
		nil,
		{},
	)
	if audio_device == 0 {
		log.errorf("unable to open audio device: %s", SDL.GetErrorString())
		return
	}
	SDL.PauseAudioDevice(audio_device, false)

	audio_update :: proc(device: SDL.AudioDeviceID, timer: u8, allocator: runtime.Allocator) {
		queued := SDL.GetQueuedAudioSize(device)

		if timer > 0 {
			// we want 2 frames worth of sound in queue
			// we are using AUDIO_S16 format so one sample is 2 bytes
			target_bytes := u32(SAMPLE_RATE / 30 * size_of(i16))
			if queued < target_bytes {
				samples_needed := (target_bytes - queued) / size_of(i16)
				buf := make([]i16, samples_needed, allocator = allocator)
				@(static) phase: f64

				for _, i in buf {
					buf[i] = i16(math.sin(phase * 2 * math.PI) * AMPLITUDE)
					phase += f64(TONE_HZ) / SAMPLE_RATE
					if phase > 1 {
						phase -= 1
					}
				}

				if SDL.QueueAudio(device, raw_data(buf), samples_needed * size_of(i16)) != 0 {
					log.errorf("unable to queue audio: %s", SDL.GetErrorString())
					assert(false)
				}
			}
		} else {
			if queued > 0 {
				SDL.ClearQueuedAudio(device)
			}
		}
	}

	// interpret

	TARGET_FPS: f64 : 60
	TARGET_FRAME_TIME: f64 : 1 / TARGET_FPS

	emulator: em.Emulator
	em.init(&emulator, context.random_generator)
	em.load_program(&emulator, program_data)
    fmt.println(program_data)

	for {
		frame_start := time.tick_now()
		free_all(context.temp_allocator)

		em.frame_start(&emulator)

		{
			get_key :: proc(scancode: SDL.Scancode) -> (key: u8) {
				key = 0xFF
				#partial switch scancode {
				case .NUM1:
					key = 0x01
				case .NUM2:
					key = 0x02
				case .NUM3:
					key = 0x03
				case .NUM4:
					key = 0x0C
				case .Q:
					key = 0x04
				case .W:
					key = 0x05
				case .E:
					key = 0x06
				case .R:
					key = 0x0D
				case .A:
					key = 0x07
				case .S:
					key = 0x08
				case .D:
					key = 0x09
				case .F:
					key = 0x0E
				case .Z:
					key = 0x0A
				case .X:
					key = 0x00
				case .C:
					key = 0x0B
				case .V:
					key = 0x0F
				}
				return
			}

			event: SDL.Event
			for SDL.PollEvent(&event) {
				#partial switch event.type {
				case .QUIT:
					return
				case .KEYDOWN:
					if key := get_key(event.key.keysym.scancode); key != 0xFF {
						em.record_key_down(&emulator, key)
					}
				case .KEYUP:
					if key := get_key(event.key.keysym.scancode); key != 0xFF {
						em.record_key_up(&emulator, key)
					}
				}
			}
		}

		if err := em.process_instructions(&emulator); err != .None {
			log.errorf("Unable to process instruction: %s", err)
			fmt.println(emulator)
			return
		}

		// play audo

		audio_update(audio_device, emulator.sound_timer, context.temp_allocator)

		// draw

		SDL.SetRenderDrawColor(renderer, 255, 255, 255, 255)
		SDL.RenderClear(renderer)

		for pixel, pixel_idx in emulator.display do if pixel == 1 {
			px := u8(pixel_idx % 64)
			py := u8(pixel_idx / 64)
			draw_pixel(renderer, px, py)
		}

		SDL.RenderPresent(renderer)

		frame_duration := time.tick_since(frame_start)
		remaining := TARGET_FRAME_TIME - time.duration_seconds(frame_duration)
		if remaining > 0 {
			time.sleep(time.Duration(remaining * f64(time.Second)))
		}
	}
}
