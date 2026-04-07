package main

import "base:runtime"
import "core:fmt"
import "core:log"
import "core:math"
import "core:mem"
import "core:os"
import "core:time"

import SDL "vendor:sdl2"

SCREEN_COLUMNS :: 64
SCREEN_ROWS :: 32

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

	INSTRUCTIONS_PER_FRAME :: 100
	MEM_START :: 0x200

	STACK_DEPTH :: 12
	REGISTERS_COUNT :: 16

	pc: u16 = MEM_START
	stack_idx := 0
	stack: [STACK_DEPTH]u16

	memory: [4 * mem.Kilobyte]byte
	copy(memory[MEM_START:], program_data)

	registers: [REGISTERS_COUNT]byte
	address_register: u16

	display: [SCREEN_ROWS * SCREEN_COLUMNS]byte

	for {
		{
			event: SDL.Event
			for SDL.PollEvent(&event) {
				#partial switch event.type {
				case .QUIT:
					return
				}
			}
		}

		reg_and_immediate :: proc(ix: u16) -> (reg, imm: u8) {
			reg = u8((ix >> 8) & 0x0F)
			imm = u8(ix & 0xFF)
			return
		}

		regs :: proc(ix: u16) -> (reg1, reg2: u8) {
			reg1 = u8((ix >> 8) & 0x0F)
			reg2 = u8((ix >> 4) & 0x0F)
			return
		}

		instructions: for _ in 0 ..< INSTRUCTIONS_PER_FRAME {
			assert(pc < len(memory))

			ix := (u16(memory[pc]) << 8) | u16(memory[pc + 1])
			opcode := ix >> 12

			switch opcode {
			case 0x0:
				switch ix {
				case 0x00E0:
					// clear	
					for _, i in display {
						display[i] = 0
					}
				case 0x00EE:
					// return
					assert(stack_idx > 0)

					stack_idx -= 1
					pc = stack[stack_idx]
				}
			case 0x1:
				pc = ix & 0x0FFF
				continue instructions
			case 0x2:
				assert(stack_idx < STACK_DEPTH + 1)

				stack[stack_idx] = pc
				stack_idx += 1

				pc = ix & 0x0FFF
				continue
			case 0x3:
				reg, imm := reg_and_immediate(ix)
				if registers[reg] == imm {
					pc += 2
				}
			case 0x4:
				reg, imm := reg_and_immediate(ix)
				if registers[reg] != imm {
					pc += 2
				}
			case 0x5:
				if reg1, reg2 := regs(ix); registers[reg1] == registers[reg2] {
					pc += 2
				}
			case 0x6:
				reg := u8((ix >> 8) & 0x0F)
				imm := u8(ix & 0xFF)

				registers[reg] = imm
			case 0x7:
				reg := u8((ix >> 8) & 0x0F)
				imm := u8(ix & 0xFF)

				registers[reg] += imm
			case 0x8:
				reg1, reg2 := regs(ix)
				flag := ix & 0x000F

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
				if reg1, reg2 := regs(ix); registers[reg1] != registers[reg2] {
					pc += 2
				}
			case 0xA:
				address_register = ix & 0x0FFF
			case 0xD:
				x_reg := u8((ix & 0x0F00) >> 8)
				y_reg := u8((ix >> 4) & 0x0F)
				height := u8(ix) & 0x0F

				x, y := registers[x_reg], registers[y_reg]

				registers[0xF] = 0

				for y_offset in 0 ..< u8(height) {
					mem_idx := address_register + u16(y_offset)
					sprite := memory[mem_idx]

					py := y + y_offset

					for x_offset in 0 ..< u8(8) {
						sprite_bit := sprite & (0x80 >> x_offset)

						if sprite_bit != 0 {
							px := x + x_offset
							display_idx := int(py) * SCREEN_COLUMNS + int(px)

							if display[display_idx] == 1 {
								registers[0xF] = 1
							}
							display[display_idx] ~= 1
						}
					}
				}
			case 0xF:
				reg, _ := regs(ix)
				flag := ix & 0xFF

				switch flag {
				case 0x1E:
					address_register += u16(registers[reg])
				case 0x33:
					hundreds := registers[reg] / 100
					tens := (registers[reg] / 10) % 10
					ones := registers[reg] % 10

					memory[address_register] = hundreds
					memory[address_register + 1] = tens
					memory[address_register + 2] = ones
				case 0x55:
					// dump
					mem_start := address_register
					for r in 0 ..= reg {
						memory[mem_start + u16(r)] = registers[r]
					}
				case 0x65:
					// load
					mem_start := address_register
					for r in 0 ..= reg {
						registers[r] = memory[mem_start + u16(r)]
					}
				}

			}

			pc += 2
		}

		// draw

		SDL.SetRenderDrawColor(renderer, 255, 255, 255, 255)
		SDL.RenderClear(renderer)

		for pixel, pixel_idx in display do if pixel == 1 {
			px := u8(pixel_idx % 64)
			py := u8(pixel_idx / 64)
			draw_pixel(renderer, px, py)
		}

		SDL.RenderPresent(renderer)
	}
}
