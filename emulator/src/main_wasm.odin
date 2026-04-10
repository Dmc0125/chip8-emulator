#+build wasm32
package main

import "core:fmt"
import "core:mem"

import em "./emulator"

emulator: em.Emulator

slice_allocator_data: [4 * mem.Kilobyte]byte
slice_allocator_arena: mem.Arena

Init_Result :: struct {
	emulator_ptr:       rawptr, // u32
	display_buffer_ptr: rawptr, // u32
}

@(export)
init :: proc() -> Init_Result {
	mem.arena_init(&slice_allocator_arena, slice_allocator_data[:])
	em.init(&emulator)

	return Init_Result {
		emulator_ptr = &emulator,
		display_buffer_ptr = raw_data(emulator.display[:]),
	}
}

@(export)
alloc_u8_slice :: proc(len: u16) -> rawptr {
	allocator := mem.arena_allocator(&slice_allocator_arena)
	free_all(allocator)
	s := make([]u8, len = len, allocator = allocator)
	return raw_data(s)
}

@(export)
emulator_load_program :: proc(
	emulator: ^em.Emulator,
	program_data_ptr: [^]u8,
	program_data_len: int,
) {
	program_data := program_data_ptr[:program_data_len]
	em.load_program(emulator, program_data)
}

@(export)
emulator_play_sound :: proc(emulator: ^em.Emulator) -> bool {
	return emulator.sound_timer > 0
}
