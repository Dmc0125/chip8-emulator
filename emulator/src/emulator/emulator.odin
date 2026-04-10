#+feature using-stmt
package emulator

import "core:fmt"
import "core:math"
import "core:math/rand"
import "core:mem"

SAMPLE_RATE :: 44100 // hz
TONE_HZ :: 880
AMPLITUDE :: 6000

SCREEN_COLUMNS :: 64
SCREEN_ROWS :: 32

INSTRUCTIONS_PER_FRAME :: 50
PROGRAM_MEM_START :: 0x200

STACK_DEPTH :: 12
REGISTERS_COUNT :: 16

Error :: enum {
	None,
	Program_Data_Overflow,
	PC_Overflow,
	PC_Underflow,
	Stack_Overflow,
	Stack_Underflow,
	Unknown_Instruction,
}

Emulator :: struct {
	pc:                  u16,
	stack_idx:           u8,
	stack:               [STACK_DEPTH]u16,
	memory:              [4 * mem.Kilobyte]byte,
	registers:           [REGISTERS_COUNT]byte,
	address_register:    u16,
	display:             [SCREEN_COLUMNS * SCREEN_ROWS]byte,
	keys:                [16]bool,
	waiting_for_release: bool,
	last_key_pressed:    u8,
	delay_timer:         u8,
	sound_timer:         u8,
}

init :: proc(emulator: ^Emulator) {
	font := [?][]byte {
		[]byte{0xF0, 0x90, 0x90, 0x90, 0xF0}, // 0
		[]byte{0x20, 0x60, 0x20, 0x20, 0x70}, // 1
		[]byte{0xF0, 0x10, 0xF0, 0x80, 0xF0}, // 2
		[]byte{0xF0, 0x10, 0xF0, 0x10, 0xF0}, // 3
		[]byte{0x90, 0x90, 0xF0, 0x10, 0x10}, // 4
		[]byte{0xF0, 0x80, 0xF0, 0x10, 0xF0}, // 5
		[]byte{0xF0, 0x80, 0xF0, 0x90, 0xF0}, // 6
		[]byte{0xF0, 0x10, 0x20, 0x40, 0x40}, // 7
		[]byte{0xF0, 0x90, 0xF0, 0x90, 0xF0}, // 8
		[]byte{0xF0, 0x90, 0xF0, 0x10, 0xF0}, // 9
		[]byte{0xF0, 0x90, 0xF0, 0x90, 0x90}, // A
		[]byte{0xE0, 0x90, 0xE0, 0x90, 0xE0}, // B
		[]byte{0xF0, 0x80, 0x80, 0x80, 0xF0}, // C
		[]byte{0xE0, 0x90, 0x90, 0x90, 0xE0}, // D
		[]byte{0xF0, 0x80, 0xF0, 0x80, 0xF0}, // E
		[]byte{0xF0, 0x80, 0xF0, 0x80, 0x80}, // F
	}
	for c, i in font {
		start := i * 5
		copy(emulator.memory[start:start + 5], c)
	}
}

load_program :: proc(emulator: ^Emulator, program_data: []byte) -> Error {
	using emulator

	if len(program_data) > len(memory) - PROGRAM_MEM_START {
		return .Program_Data_Overflow
	}

	pc = PROGRAM_MEM_START
	stack_idx = 0
	address_register = 0

	copy(memory[PROGRAM_MEM_START:], program_data[:])

	for _, i in registers {
		registers[i] = 0
	}

	for _, i in display {
		display[i] = 0
	}

	waiting_for_release = false
	last_key_pressed = 0xFF
	for _, i in keys {
		keys[i] = false
	}

	delay_timer = 0
	sound_timer = 0

	return .None
}

@(export = ODIN_ARCH == .wasm32, link_prefix = "emulator_")
frame_start :: proc(emulator: ^Emulator) {
	emulator.last_key_pressed = 0xFF
	if emulator.sound_timer > 0 {
		emulator.sound_timer -= 1
	}
	if emulator.delay_timer > 0 {
		emulator.delay_timer -= 1
	}
}

@(export = ODIN_ARCH == .wasm32, link_prefix = "emulator_")
record_key_down :: proc(emulator: ^Emulator, key: u8) {
	emulator.keys[key] = true
	emulator.last_key_pressed = key
}

@(export = ODIN_ARCH == .wasm32, link_prefix = "emulator_")
record_key_up :: proc(emulator: ^Emulator, key: u8) {
	emulator.keys[key] = false
}

@(export = ODIN_ARCH == .wasm32, link_prefix = "emulator_")
process_instructions :: proc(emulator: ^Emulator) -> Error {
	reg_imm :: proc(ix: u16) -> (reg, imm: u8) {
		reg = u8((ix >> 8) & 0x0F)
		imm = u8(ix & 0xFF)
		return
	}

	reg_reg :: proc(ix: u16) -> (reg1, reg2: u8) {
		reg1 = u8((ix >> 8) & 0x0F)
		reg2 = u8(ix) >> 4
		return
	}

	instructions: for _ in 0 ..< INSTRUCTIONS_PER_FRAME {
		if emulator.pc >= len(emulator.memory) {
			return .PC_Overflow
		}
		if emulator.pc < PROGRAM_MEM_START {
			return .PC_Underflow
		}

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
				if emulator.stack_idx <= 0 {
					return .Stack_Underflow
				}

				emulator.stack_idx -= 1
				emulator.pc = emulator.stack[emulator.stack_idx]
			case:
				return .Unknown_Instruction
			}
		case 0x1:
			emulator.pc = ix & 0x0FFF
			continue instructions
		case 0x2:
			if emulator.stack_idx >= STACK_DEPTH {
				return .Stack_Overflow
			}

			emulator.stack[emulator.stack_idx] = emulator.pc
			emulator.stack_idx += 1

			emulator.pc = ix & 0x0FFF
			continue
		case 0x3:
			reg, imm := reg_imm(ix)
			if emulator.registers[reg] == imm {
				emulator.pc += 2
			}
		case 0x4:
			reg, imm := reg_imm(ix)
			if emulator.registers[reg] != imm {
				emulator.pc += 2
			}
		case 0x5:
			if reg1, reg2 := reg_reg(ix); emulator.registers[reg1] == emulator.registers[reg2] {
				emulator.pc += 2
			}
		case 0x6:
			reg, imm := reg_imm(ix)
			emulator.registers[reg] = imm
		case 0x7:
			reg, imm := reg_imm(ix)
			emulator.registers[reg] += imm
		case 0x8:
			reg1, reg2 := reg_reg(ix)
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
			case:
				return .Unknown_Instruction
			}
		case 0x9:
			if reg1, reg2 := reg_reg(ix); emulator.registers[reg1] != emulator.registers[reg2] {
				emulator.pc += 2
			}
		case 0xA:
			emulator.address_register = ix & 0x0FFF
		case 0xB:
			emulator.address_register = u16(emulator.registers[0]) + (ix & 0x0FFF)
		case 0xC:
			reg, imm := reg_imm(ix)
			r := u8(rand.uint_range(0, 0xFF))
			emulator.registers[reg] = r & imm
		case 0xD:
			x_reg, y_reg := reg_reg(ix)
			height := u8(ix) & 0x0F

			x, y := emulator.registers[x_reg] % 64, emulator.registers[y_reg] % 32

			emulator.registers[0xF] = 0

			rows: for y_offset in 0 ..< u8(height) {
				mem_idx := emulator.address_register + u16(y_offset)
				sprite := emulator.memory[mem_idx]

				py := y + y_offset

				for x_offset in 0 ..< u8(8) {
					sprite_bit := sprite & (0x80 >> x_offset)

					if sprite_bit != 0 {
						px := x + x_offset
						display_idx := int(py) * SCREEN_COLUMNS + int(px)

						if display_idx > SCREEN_COLUMNS * SCREEN_ROWS {
							break rows
						}

						if emulator.display[display_idx] == 1 {
							emulator.registers[0xF] = 1
						}
						emulator.display[display_idx] ~= 1
					}
				}
			}
		case 0xE:
			reg, flag := reg_imm(ix)

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
			case:
				return .Unknown_Instruction
			}
		case 0xF:
			reg, flag := reg_imm(ix)
			registers := &emulator.registers

			switch flag {
			case 0x07:
				registers[reg] = emulator.delay_timer
			case 0x0A:
				if emulator.waiting_for_release {
					key := registers[reg]
					if !emulator.keys[key] {
						emulator.waiting_for_release = false
					} else {
						return .None
					}
				} else {
					if emulator.last_key_pressed != 0xFF {
						registers[reg] = emulator.last_key_pressed
						emulator.waiting_for_release = true
					}
					return .None
				}
			case 0x15:
				emulator.delay_timer = registers[reg]
			case 0x18:
				emulator.sound_timer = registers[reg]
			case 0x1E:
				emulator.address_register += u16(registers[reg])
			case 0x29:
				char := registers[reg] & 0x0F
				emulator.address_register = u16(char * 5)
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
			case:
				return .Unknown_Instruction
			}
		case:
			return .Unknown_Instruction
		}

		emulator.pc += 2
	}

	return .None
}
