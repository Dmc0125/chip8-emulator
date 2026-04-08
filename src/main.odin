package main

import "base:runtime"
import "core:fmt"
import "core:log"
import "core:math"
import "core:mem"
import "core:os"
import "core:time"

import SDL "vendor:sdl2"

draw_pixel :: proc(renderer: ^SDL.Renderer, x, y: u8) {
	SDL.SetRenderDrawColor(renderer, 0, 0, 0, 255)
	SDL.RenderFillRectF(renderer, &SDL.FRect{x = f32(x) * 10, y = f32(y) * 10, w = 10, h = 10})
}

SCREEN_COLUMNS :: 64
SCREEN_ROWS :: 32

INSTRUCTIONS_PER_FRAME :: 700
MEM_START :: 0x200

STACK_DEPTH :: 12
REGISTERS_COUNT :: 16

Emulator :: struct {
	pc:               u16,
	stack_idx:        int,
	stack:            [STACK_DEPTH]u16,
	memory:           [4 * mem.Kilobyte]byte,
	registers:        [REGISTERS_COUNT]byte,
	address_register: u16,
	display:          [SCREEN_COLUMNS * SCREEN_ROWS]byte,
	keys:             [16]bool,
}

emulator_init :: proc(emulator: ^Emulator, program_data: []byte) {
	emulator.pc = MEM_START
	copy(emulator.memory[MEM_START:], program_data)
}

emulator_process_instructions :: proc(emulator: ^Emulator) -> (blocked: bool) {
	reg_and_immediate :: proc(ix: u16) -> (reg, imm: u8) {
		reg = u8((ix >> 8) & 0x0F)
		imm = u8(ix & 0xFF)
		return
	}

	regs :: proc(ix: u16) -> (reg1, reg2: u8) {
		reg1 = u8((ix >> 8) & 0x0F)
		reg2 = u8(ix) >> 4
		return
	}

	instructions: for _ in 0 ..< INSTRUCTIONS_PER_FRAME {
		assert(emulator.pc < len(emulator.memory))

		ix := (u16(emulator.memory[emulator.pc]) << 8) | u16(emulator.memory[emulator.pc + 1])
		opcode := ix >> 12

		switch opcode {
		case 0x0:
			switch ix {
			case 0x00E0:
				// clear	
				for _, i in emulator.display {
					emulator.display[i] = 0
				}
			case 0x00EE:
				// return
				assert(emulator.stack_idx > 0)

				emulator.stack_idx -= 1
				emulator.pc = emulator.stack[emulator.stack_idx]
			}
		case 0x1:
			emulator.pc = ix & 0x0FFF
			continue instructions
		case 0x2:
			assert(emulator.stack_idx < STACK_DEPTH + 1)

			emulator.stack[emulator.stack_idx] = emulator.pc
			emulator.stack_idx += 1

			emulator.pc = ix & 0x0FFF
			continue
		case 0x3:
			reg, imm := reg_and_immediate(ix)
			if emulator.registers[reg] == imm {
				emulator.pc += 2
			}
		case 0x4:
			reg, imm := reg_and_immediate(ix)
			if emulator.registers[reg] != imm {
				emulator.pc += 2
			}
		case 0x5:
			if reg1, reg2 := regs(ix); emulator.registers[reg1] == emulator.registers[reg2] {
				emulator.pc += 2
			}
		case 0x6:
			reg := u8((ix >> 8) & 0x0F)
			imm := u8(ix & 0xFF)

			emulator.registers[reg] = imm
		case 0x7:
			reg := u8((ix >> 8) & 0x0F)
			imm := u8(ix & 0xFF)

			emulator.registers[reg] += imm
		case 0x8:
			reg1, reg2 := regs(ix)
			flag := ix & 0x000F

			registers := &emulator.registers

			switch flag {
			case 0:
				registers[reg1] = registers[reg2]
			case 1:
				registers[reg1] |= registers[reg2]
			case 2:
				registers[reg1] &= registers[reg2]
			case 3:
				registers[reg1] ~= registers[reg2]
			case 4:
				vf: u8 = 0
				if registers[reg2] > 0xFF - registers[reg1] {
					vf = 1
				}
				registers[reg1] += registers[reg2]
				registers[0xF] = vf
			case 5:
				vf: u8 = 0
				if registers[reg2] <= registers[reg1] {
					vf = 1
				}
				registers[reg1] -= registers[reg2]
				registers[0xF] = vf
			case 6:
				vf := registers[reg1] & 0x01
				registers[reg1] >>= 1
				registers[0xF] = vf
			case 7:
				vf: u8 = 0
				if registers[reg1] <= registers[reg2] {
					vf = 1
				}
				registers[reg1] = registers[reg2] - registers[reg1]
				registers[0xF] = vf
			case 0xE:
				vf := (registers[reg1] & 0x80) >> 7
				registers[reg1] <<= 1
				registers[0xF] = vf
			}
		case 0x9:
			if reg1, reg2 := regs(ix); emulator.registers[reg1] != emulator.registers[reg2] {
				emulator.pc += 2
			}
		case 0xA:
			emulator.address_register = ix & 0x0FFF
		case 0xD:
			x_reg := u8((ix & 0x0F00) >> 8)
			y_reg := u8((ix >> 4) & 0x0F)
			height := u8(ix) & 0x0F

			x, y := emulator.registers[x_reg], emulator.registers[y_reg]

			emulator.registers[0xF] = 0

			for y_offset in 0 ..< u8(height) {
				mem_idx := emulator.address_register + u16(y_offset)
				sprite := emulator.memory[mem_idx]

				py := y + y_offset

				for x_offset in 0 ..< u8(8) {
					sprite_bit := sprite & (0x80 >> x_offset)

					if sprite_bit != 0 {
						px := x + x_offset
						display_idx := int(py) * SCREEN_COLUMNS + int(px)

						if emulator.display[display_idx] == 1 {
							emulator.registers[0xF] = 1
						}
						emulator.display[display_idx] ~= 1
					}
				}
			}
		case 0xE:
			reg, _ := regs(ix)
			flag := ix & 0xFF

			switch flag {
			case 0x9E:
				for key, i in emulator.keys do if key {
					if u8(i) == emulator.registers[reg] {
						emulator.pc += 2
						break
					}
				}
			case 0xA1:
				pressed := false
				for key, i in emulator.keys do if key {
					if u8(i) == emulator.registers[reg] {
						pressed = true
						break
					}
				}
				if !pressed {
					emulator.pc += 2
				}
			}
		case 0xF:
			reg, _ := regs(ix)
			flag := ix & 0xFF

			registers := &emulator.registers

			switch flag {
			case 0x0A:
				any_pressed := false
				key_code: u8
				for key, i in emulator.keys do if key {
					any_pressed = true
					key_code = u8(i)
					break
				}
				if !any_pressed {
					blocked = true
					return
				} else {
					registers[reg] = key_code
				}
			case 0x1E:
				emulator.address_register += u16(registers[reg])
			case 0x33:
				hundreds := registers[reg] / 100
				tens := (registers[reg] / 10) % 10
				ones := registers[reg] % 10

				address_reg := emulator.address_register
				emulator.memory[address_reg] = hundreds
				emulator.memory[address_reg + 1] = tens
				emulator.memory[address_reg + 2] = ones
			case 0x55:
				// dump
				mem_start := emulator.address_register
				for r in 0 ..= reg {
					emulator.memory[mem_start + u16(r)] = registers[r]
				}
			case 0x65:
				// load
				mem_start := emulator.address_register
				for r in 0 ..= reg {
					registers[r] = emulator.memory[mem_start + u16(r)]
				}
			}
		case:
			log.errorf("instruction unimplemented: ", ix)
			assert(false)
		}

		emulator.pc += 2
	}

	return
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
		SCREEN_COLUMNS * 10,
		SCREEN_ROWS * 10,
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

	// interpret

	TARGET_FPS: f64 : 60
	TARGET_FRAME_TIME: f64 : 1 / TARGET_FPS

	emulator: Emulator
	emulator_init(&emulator, program_data)

	for {
		frame_start := time.tick_now()

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
						emulator.keys[key] = true
					}
				case .KEYUP:
					if key := get_key(event.key.keysym.scancode); key != 0xFF {
						emulator.keys[key] = false
					}
				}
			}
		}

		drawing_blocked := emulator_process_instructions(&emulator)

		// draw

		if !drawing_blocked {
			SDL.SetRenderDrawColor(renderer, 255, 255, 255, 255)
			SDL.RenderClear(renderer)

			for pixel, pixel_idx in emulator.display do if pixel == 1 {
				px := u8(pixel_idx % 64)
				py := u8(pixel_idx / 64)
				draw_pixel(renderer, px, py)
			}

			SDL.RenderPresent(renderer)
		}

		frame_duration := time.tick_since(frame_start)
		remaining := TARGET_FRAME_TIME - time.duration_seconds(frame_duration)
		if remaining > 0 {
			time.sleep(time.Duration(remaining * f64(time.Second)))
		}
	}
}
