import { useEffect, useRef, useState, type ChangeEvent } from "react"

const DEFAULT_ROMS: Rom[] = [
    {
        // https://johnearnest.github.io/chip8Archive/play.html?p=br8kout
        id: -1,
        name: "Br8kout",
        data: [18, 159, 252, 252, 128, 162, 2, 221, 193, 0, 238, 162, 4, 219, 161, 0, 238, 162, 3, 96, 2, 97, 5, 135, 0, 134, 16, 214, 113, 113, 8, 111, 56, 143, 23, 79, 0, 18, 23, 112, 2, 111, 16, 143, 7, 79, 0, 18, 21, 0, 238, 34, 5, 125, 4, 34, 5, 0, 238, 34, 5, 125, 252, 34, 5, 0, 238, 128, 128, 64, 1, 104, 255, 64, 255, 104, 1, 90, 192, 34, 83, 0, 238, 128, 176, 112, 251, 97, 248, 128, 18, 112, 5, 162, 3, 208, 161, 0, 238, 34, 11, 139, 148, 138, 132, 34, 11, 75, 0, 105, 1, 75, 63, 105, 255, 74, 0, 104, 1, 74, 31, 104, 255, 79, 1, 34, 67, 74, 31, 34, 133, 0, 238, 0, 224, 107, 30, 106, 20, 34, 5, 34, 11, 34, 17, 0, 238, 254, 7, 62, 0, 18, 147, 110, 4, 254, 21, 0, 238, 109, 30, 108, 30, 107, 64, 106, 29, 201, 1, 73, 0, 105, 255, 104, 255, 34, 5, 34, 11, 34, 17, 96, 7, 224, 161, 34, 59, 96, 9, 224, 161, 34, 51, 34, 99, 34, 147, 18, 181]
        ,
    },
    {
        // https://johnearnest.github.io/chip8Archive/play.html?p=tank
        id: -2,
        name: "Tank!",
        data: [19, 1, 128, 160, 64, 1, 26, 36, 126, 129, 126, 128, 88, 36, 126, 129, 126, 0, 0, 40, 92, 58, 20, 0, 0, 130, 85, 10, 20, 40, 80, 170, 65, 130, 85, 34, 72, 18, 68, 170, 65, 0, 48, 92, 63, 15, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 192, 247, 126, 31, 19, 16, 8, 23, 96, 128, 48, 96, 31, 7, 5, 4, 251, 4, 146, 194, 130, 5, 250, 2, 1, 0, 0, 0, 130, 130, 2, 4, 228, 24, 4, 2, 2, 228, 28, 2, 249, 2, 28, 63, 72, 133, 250, 138, 69, 117, 68, 58, 35, 29, 17, 14, 200, 40, 255, 0, 252, 2, 250, 1, 1, 129, 128, 0, 0, 168, 192, 1, 30, 191, 68, 136, 250, 136, 68, 118, 69, 250, 34, 61, 17, 14, 7, 1, 128, 112, 78, 37, 37, 34, 64, 162, 21, 149, 18, 47, 240, 0, 128, 96, 16, 8, 200, 56, 20, 12, 164, 84, 88, 240, 0, 0, 252, 252, 48, 48, 48, 48, 48, 48, 48, 120, 72, 236, 204, 132, 204, 204, 236, 252, 220, 204, 204, 216, 240, 224, 224, 240, 216, 216, 192, 192, 192, 192, 0, 192, 192, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 29, 0, 45, 40, 56, 29, 0, 135, 40, 1, 0, 0, 0, 0, 18, 36, 54, 72, 89, 106, 123, 138, 153, 168, 181, 193, 205, 215, 225, 233, 240, 246, 250, 253, 255, 255, 37, 21, 0, 224, 37, 149, 204, 8, 124, 252, 124, 8, 130, 192, 130, 68, 129, 32, 131, 96, 98, 0, 109, 0, 67, 0, 19, 53, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 19, 51, 96, 180, 130, 5, 19, 37, 19, 25, 110, 90, 142, 37, 79, 1, 19, 65, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 80, 130, 4, 141, 244, 115, 255, 67, 0, 19, 91, 19, 79, 96, 29, 128, 85, 141, 4, 128, 192, 129, 208, 162, 220, 241, 85, 124, 252, 125, 2, 136, 192, 136, 68, 105, 0, 162, 2, 129, 128, 131, 96, 98, 0, 103, 0, 67, 0, 19, 153, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 19, 151, 96, 180, 130, 5, 19, 137, 19, 125, 110, 90, 142, 37, 79, 1, 19, 165, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 80, 130, 4, 135, 244, 115, 255, 67, 0, 19, 191, 19, 179, 96, 32, 128, 85, 135, 4, 129, 192, 129, 148, 142, 208, 142, 117, 63, 1, 19, 217, 162, 2, 209, 113, 119, 1, 19, 201, 120, 1, 121, 1, 110, 8, 142, 151, 63, 1, 19, 117, 125, 251, 162, 5, 220, 214, 204, 8, 124, 252, 124, 55, 130, 192, 130, 68, 129, 32, 131, 96, 98, 0, 109, 0, 67, 0, 20, 25, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 20, 23, 96, 180, 130, 5, 20, 9, 19, 253, 110, 90, 142, 37, 79, 1, 20, 37, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 80, 130, 4, 141, 244, 115, 255, 67, 0, 20, 63, 20, 51, 96, 29, 128, 85, 141, 4, 128, 192, 129, 208, 162, 225, 241, 85, 124, 252, 125, 2, 136, 192, 136, 68, 105, 0, 162, 2, 129, 128, 131, 96, 98, 0, 103, 0, 67, 0, 20, 125, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 20, 123, 96, 180, 130, 5, 20, 109, 20, 97, 110, 90, 142, 37, 79, 1, 20, 137, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 80, 130, 4, 135, 244, 115, 255, 67, 0, 20, 163, 20, 151, 96, 32, 128, 85, 135, 4, 129, 192, 129, 148, 142, 208, 142, 117, 63, 1, 20, 189, 162, 2, 209, 113, 119, 1, 20, 173, 120, 1, 121, 1, 110, 8, 142, 151, 63, 1, 20, 89, 125, 251, 162, 11, 220, 214, 192, 1, 162, 230, 240, 85, 38, 175, 40, 51, 38, 29, 96, 100, 240, 21, 240, 7, 48, 0, 20, 223, 52, 3, 20, 245, 162, 230, 240, 101, 112, 1, 162, 230, 240, 85, 20, 213, 52, 2, 21, 5, 162, 222, 240, 101, 112, 1, 162, 222, 240, 85, 21, 15, 162, 227, 240, 101, 112, 1, 162, 227, 240, 85, 38, 81, 19, 3, 0, 238, 108, 25, 109, 1, 101, 15, 162, 41, 96, 4, 220, 223, 124, 8, 245, 30, 112, 255, 48, 0, 21, 31, 108, 25, 109, 16, 96, 5, 220, 223, 124, 8, 245, 30, 112, 255, 48, 0, 21, 49, 96, 30, 240, 21, 240, 7, 48, 0, 21, 65, 108, 1, 109, 4, 101, 7, 162, 176, 96, 2, 220, 215, 124, 7, 245, 30, 112, 255, 48, 0, 21, 81, 108, 5, 109, 13, 96, 50, 240, 21, 240, 7, 48, 0, 21, 101, 96, 2, 220, 215, 124, 8, 245, 30, 112, 255, 48, 0, 21, 109, 96, 50, 240, 21, 240, 7, 48, 0, 21, 125, 96, 10, 240, 24, 220, 215, 96, 200, 240, 21, 240, 7, 48, 0, 21, 141, 0, 238, 108, 0, 196, 180, 197, 10, 117, 6, 198, 4, 118, 1, 136, 192, 136, 68, 129, 128, 131, 96, 98, 0, 109, 0, 67, 0, 21, 201, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 21, 199, 96, 180, 130, 5, 21, 185, 21, 173, 110, 90, 142, 37, 79, 1, 21, 213, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 80, 130, 4, 141, 244, 115, 255, 67, 0, 21, 239, 21, 227, 96, 32, 128, 85, 141, 4, 162, 2, 220, 209, 125, 1, 110, 32, 142, 215, 79, 1, 22, 5, 21, 247, 124, 1, 110, 64, 142, 199, 79, 1, 22, 17, 21, 161, 162, 231, 128, 64, 129, 96, 130, 80, 242, 85, 0, 238, 162, 17, 124, 252, 125, 251, 220, 216, 96, 5, 240, 21, 240, 7, 48, 0, 22, 41, 52, 3, 22, 57, 162, 17, 220, 216, 22, 79, 96, 10, 240, 24, 162, 25, 220, 216, 96, 5, 240, 21, 240, 7, 48, 0, 22, 69, 162, 33, 220, 216, 0, 238, 0, 224, 108, 12, 109, 6, 162, 222, 240, 101, 131, 0, 162, 217, 243, 51, 162, 217, 242, 101, 240, 41, 220, 213, 124, 5, 241, 41, 220, 213, 124, 5, 242, 41, 220, 213, 124, 16, 162, 227, 240, 101, 131, 0, 162, 217, 243, 51, 162, 217, 242, 101, 240, 41, 220, 213, 124, 5, 241, 41, 220, 213, 124, 5, 242, 41, 220, 213, 108, 14, 109, 18, 162, 5, 220, 214, 108, 41, 162, 11, 220, 214, 96, 200, 240, 21, 240, 7, 48, 0, 22, 167, 0, 238, 97, 1, 128, 18, 162, 220, 64, 0, 162, 225, 244, 101, 135, 48, 134, 64, 162, 3, 112, 255, 113, 248, 208, 18, 39, 159, 96, 5, 224, 161, 118, 1, 96, 8, 224, 161, 118, 255, 96, 7, 224, 161, 119, 1, 96, 9, 224, 161, 119, 255, 71, 181, 103, 0, 71, 255, 103, 180, 70, 101, 102, 1, 70, 0, 102, 100, 96, 14, 224, 161, 23, 5, 240, 7, 48, 0, 22, 247, 39, 207, 96, 3, 240, 21, 22, 201, 39, 159, 162, 230, 240, 101, 97, 1, 128, 18, 138, 0, 162, 220, 64, 0, 162, 225, 96, 3, 240, 30, 128, 112, 129, 96, 241, 85, 104, 0, 105, 0, 110, 90, 142, 117, 79, 1, 23, 53, 96, 180, 135, 7, 97, 1, 23, 55, 97, 0, 128, 118, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 96, 130, 4, 137, 244, 115, 255, 67, 0, 23, 81, 23, 69, 128, 118, 128, 6, 162, 234, 98, 22, 130, 5, 242, 30, 240, 101, 98, 0, 131, 96, 130, 4, 136, 244, 115, 255, 67, 0, 23, 111, 23, 99, 49, 1, 23, 121, 128, 128, 104, 0, 136, 5, 58, 1, 23, 133, 162, 220, 100, 4, 101, 252, 23, 139, 162, 225, 100, 251, 101, 252, 241, 101, 140, 0, 141, 16, 140, 68, 141, 84, 162, 3, 112, 255, 113, 248, 208, 18, 0, 238, 108, 15, 109, 1, 162, 214, 242, 101, 240, 41, 220, 213, 124, 5, 241, 41, 220, 213, 124, 5, 242, 41, 220, 213, 124, 10, 162, 211, 242, 101, 240, 41, 220, 213, 124, 5, 241, 41, 220, 213, 124, 5, 242, 41, 220, 213, 0, 238, 108, 15, 109, 1, 162, 214, 242, 101, 131, 0, 132, 16, 133, 32, 162, 214, 247, 51, 162, 214, 242, 101, 243, 41, 220, 213, 240, 41, 220, 213, 124, 5, 244, 41, 220, 213, 241, 41, 220, 213, 124, 5, 245, 41, 220, 213, 242, 41, 220, 213, 124, 10, 162, 211, 242, 101, 131, 0, 132, 16, 133, 32, 162, 211, 246, 51, 162, 211, 242, 101, 243, 41, 220, 213, 240, 41, 220, 213, 124, 5, 244, 41, 220, 213, 241, 41, 220, 213, 124, 5, 245, 41, 220, 213, 242, 41, 220, 213, 0, 238, 102, 0, 103, 0, 107, 0, 101, 0, 128, 142, 79, 0, 24, 83, 97, 255, 128, 19, 134, 5, 63, 0, 24, 81, 96, 1, 140, 5, 101, 1, 24, 93, 134, 4, 63, 1, 24, 93, 124, 1, 101, 1, 128, 158, 79, 0, 24, 117, 97, 255, 128, 19, 135, 5, 63, 0, 24, 115, 96, 255, 141, 5, 101, 1, 24, 127, 135, 4, 63, 1, 24, 127, 125, 255, 101, 1, 76, 255, 108, 63, 76, 64, 108, 0, 110, 32, 142, 215, 79, 1, 101, 0, 110, 7, 142, 215, 79, 1, 24, 183, 110, 14, 142, 199, 63, 1, 24, 183, 110, 50, 142, 199, 79, 1, 24, 183, 110, 33, 142, 197, 63, 1, 101, 0, 110, 30, 142, 199, 63, 1, 101, 0, 111, 0, 69, 0, 24, 193, 162, 2, 220, 209, 40, 221, 52, 0, 24, 219, 96, 128, 139, 4, 63, 0, 121, 255, 240, 7, 48, 0, 24, 207, 96, 1, 240, 21, 24, 57, 0, 238, 128, 240, 100, 3, 77, 31, 0, 238, 48, 0, 24, 237, 100, 0, 0, 238, 162, 220, 241, 101, 128, 197, 63, 0, 25, 1, 98, 3, 128, 36, 63, 0, 100, 1, 25, 9, 110, 3, 142, 5, 79, 1, 100, 1, 52, 1, 25, 37, 129, 213, 63, 0, 25, 29, 98, 2, 129, 36, 63, 0, 0, 238, 25, 37, 110, 2, 142, 21, 79, 1, 0, 238, 162, 225, 241, 101, 128, 197, 63, 0, 25, 57, 98, 3, 128, 36, 63, 0, 100, 2, 25, 65, 110, 3, 142, 5, 79, 1, 100, 2, 52, 2, 25, 93, 129, 213, 63, 0, 25, 85, 98, 2, 129, 36, 63, 0, 0, 238, 25, 93, 110, 2, 142, 21, 79, 1, 0, 238, 162, 231, 242, 101, 132, 32, 142, 16, 131, 192, 131, 4, 129, 48, 131, 224, 98, 0, 106, 0, 67, 0, 25, 141, 130, 20, 79, 1, 114, 76, 115, 255, 110, 180, 142, 39, 63, 1, 25, 139, 96, 180, 130, 5, 25, 125, 25, 113, 110, 90, 142, 37, 79, 1, 25, 153, 96, 180, 130, 7, 128, 38, 128, 6, 162, 234, 240, 30, 240, 101, 98, 0, 131, 64, 130, 4, 138, 244, 115, 255, 67, 0, 25, 179, 25, 167, 96, 32, 128, 69, 138, 4, 142, 208, 142, 167, 79, 1, 25, 197, 100, 3, 0, 238, 100, 0, 0, 238],
    },
    {
        id: -3,
        name: "Spockpaperscissors",
        data: [20, 110, 56, 124, 222, 190, 190, 76, 56, 126, 70, 124, 68, 124, 204, 252, 130, 68, 40, 16, 108, 170, 198, 56, 238, 170, 238, 84, 130, 254, 126, 126, 219, 126, 114, 126, 60, 0, 0, 0, 64, 224, 64, 224, 0, 224, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 28, 16, 28, 4, 4, 28, 0, 0, 231, 165, 229, 133, 133, 135, 0, 0, 57, 33, 33, 33, 33, 57, 0, 0, 64, 64, 128, 64, 64, 64, 0, 0, 14, 15, 15, 14, 8, 8, 0, 0, 51, 123, 123, 123, 122, 74, 0, 0, 158, 220, 222, 158, 28, 30, 0, 0, 224, 240, 240, 224, 176, 176, 0, 0, 28, 34, 64, 56, 4, 72, 48, 0, 28, 34, 64, 64, 64, 68, 56, 0, 24, 36, 8, 8, 16, 32, 32, 0, 28, 34, 64, 56, 4, 72, 48, 0, 28, 34, 64, 56, 4, 72, 48, 0, 12, 18, 34, 36, 68, 72, 48, 0, 12, 18, 18, 62, 40, 68, 66, 0, 28, 34, 64, 56, 4, 72, 48, 0, 0, 20, 14, 95, 31, 46, 72, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 254, 254, 0, 0, 0, 0, 240, 120, 254, 254, 120, 240, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 238, 170, 236, 138, 0, 0, 0, 0, 238, 200, 134, 238, 0, 0, 0, 0, 225, 129, 97, 225, 0, 0, 0, 0, 221, 85, 213, 84, 0, 0, 0, 0, 66, 67, 195, 130, 0, 0, 0, 0, 186, 50, 35, 185, 0, 0, 0, 0, 128, 128, 128, 0, 0, 0, 0, 0, 9, 9, 15, 1, 15, 0, 0, 0, 60, 36, 36, 36, 60, 0, 0, 0, 144, 144, 144, 144, 240, 0, 0, 0, 18, 18, 18, 10, 6, 0, 0, 0, 120, 64, 120, 8, 120, 0, 0, 0, 15, 8, 8, 8, 15, 0, 0, 0, 60, 36, 60, 32, 32, 0, 0, 0, 144, 144, 144, 144, 240, 100, 0, 101, 0, 36, 176, 36, 234, 106, 9, 107, 9, 162, 37, 244, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 106, 41, 107, 9, 162, 37, 244, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 37, 112, 20, 170, 0, 238, 162, 46, 106, 0, 107, 0, 109, 8, 218, 184, 122, 8, 253, 30, 74, 64, 123, 8, 74, 64, 106, 0, 59, 32, 20, 184, 163, 46, 106, 0, 107, 0, 109, 8, 218, 184, 122, 8, 253, 30, 74, 64, 123, 8, 74, 64, 106, 0, 59, 32, 20, 210, 243, 10, 0, 224, 0, 238, 162, 46, 106, 0, 107, 0, 109, 8, 218, 184, 122, 8, 253, 30, 74, 32, 123, 8, 74, 32, 106, 0, 59, 32, 20, 242, 164, 46, 106, 0, 107, 8, 109, 8, 218, 184, 122, 8, 253, 30, 74, 32, 123, 8, 74, 32, 106, 0, 59, 16, 21, 12, 164, 78, 106, 32, 107, 8, 109, 8, 218, 184, 122, 8, 253, 30, 74, 64, 123, 8, 74, 64, 106, 32, 59, 16, 21, 38, 243, 10, 164, 46, 106, 0, 107, 8, 109, 8, 218, 184, 122, 8, 253, 30, 74, 32, 123, 8, 74, 32, 106, 0, 59, 16, 21, 66, 164, 78, 106, 32, 107, 8, 109, 8, 218, 184, 122, 8, 253, 30, 74, 64, 123, 8, 74, 64, 106, 32, 59, 16, 21, 92, 0, 238, 37, 124, 37, 154, 37, 198, 37, 246, 37, 198, 0, 238, 102, 0, 243, 10, 67, 7, 102, 1, 67, 8, 102, 2, 67, 9, 102, 3, 67, 10, 102, 4, 67, 0, 102, 5, 70, 0, 21, 124, 0, 238, 206, 255, 111, 0, 143, 231, 63, 0, 103, 1, 111, 50, 143, 231, 63, 0, 103, 2, 111, 101, 143, 231, 63, 0, 103, 3, 111, 152, 143, 231, 63, 0, 103, 4, 111, 203, 143, 231, 63, 0, 103, 5, 0, 238, 107, 18, 106, 13, 70, 1, 39, 36, 70, 2, 39, 42, 70, 3, 39, 48, 70, 4, 39, 54, 70, 5, 39, 60, 106, 45, 71, 1, 39, 36, 71, 2, 39, 42, 71, 3, 39, 48, 71, 4, 39, 54, 71, 5, 39, 60, 0, 238, 150, 112, 22, 96, 54, 1, 22, 14, 71, 2, 22, 206, 71, 3, 22, 132, 71, 4, 22, 132, 71, 5, 22, 206, 54, 2, 22, 34, 71, 1, 22, 132, 71, 3, 22, 206, 71, 4, 22, 206, 71, 5, 22, 132, 54, 3, 22, 54, 71, 1, 22, 206, 71, 2, 22, 132, 71, 4, 22, 132, 71, 5, 22, 206, 54, 4, 22, 74, 71, 1, 22, 206, 71, 2, 22, 132, 71, 3, 22, 206, 71, 5, 22, 132, 54, 5, 22, 94, 71, 1, 22, 132, 71, 2, 22, 206, 71, 3, 22, 132, 71, 4, 22, 206, 0, 238, 106, 15, 107, 3, 162, 43, 218, 179, 106, 47, 107, 3, 162, 43, 218, 179, 39, 24, 106, 15, 107, 3, 162, 43, 218, 179, 106, 47, 107, 3, 162, 43, 218, 179, 0, 238, 106, 15, 107, 3, 162, 40, 218, 179, 106, 9, 107, 9, 162, 37, 244, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 116, 1, 106, 9, 107, 9, 162, 37, 244, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 39, 24, 106, 15, 107, 3, 162, 40, 218, 179, 0, 238, 106, 47, 107, 3, 162, 40, 218, 179, 106, 41, 107, 9, 162, 37, 245, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 117, 1, 106, 41, 107, 9, 162, 37, 245, 51, 242, 101, 240, 41, 218, 181, 122, 5, 241, 41, 218, 181, 122, 5, 242, 41, 218, 181, 39, 24, 106, 47, 107, 3, 162, 40, 218, 179, 0, 238, 108, 70, 252, 21, 252, 7, 60, 0, 23, 28, 0, 238, 162, 2, 218, 183, 0, 238, 162, 9, 218, 183, 0, 238, 162, 16, 218, 183, 0, 238, 162, 23, 218, 183, 0, 238, 162, 30, 122, 255, 218, 183, 0, 238],
    },
]

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
    clicked: number[]
    keydown: (key: number) => void
    keyup: (key: number) => void
}

function Keypad({ keyup, keydown, clicked }: KeypadProps) {
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
        <div className="w-full mt-2 p-4 border border-slate-800 rounded flex flex-col items-center text-slate-400 gap-2">
            {
                keyRows.map((row, i) => {
                    return (
                        <div key={i} className="w-fit flex gap-2">
                            {
                                row.map((key) => {
                                    const hex = keyHex(key)
                                    return (
                                        <button
                                            key={key}
                                            onMouseDown={() => keydown(hex)}
                                            onMouseUp={() => keyup(hex)}
                                            className={
                                                (clicked.includes(hex) ? "bg-slate-800" : "bg-slate-700") +
                                                " w-10 aspect-square border border-slate-800 rounded flex items-center justify-center text-xl cursor-pointer"
                                            }
                                        >
                                            {key}
                                        </button>
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
                    },
                    rand_bytes(ptr: number, len: number) {
                        const slice = new Uint8Array(memoryBuffer, ptr, len)
                        crypto.getRandomValues(slice)
                    },
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
    const [keysClicked, setKeysClicked] = useState<number[]>([])

    function addKeyClicked(key: number) {
        setKeysClicked((prev) => {
            if (!prev.includes(key)) {
                return [...prev, key]
            }
            return prev
        })
    }

    function removeKeyClicked(key: number) {
        setKeysClicked((prev) => {
            const n: number[] = []
            for (const k of prev) {
                if (k !== key) {
                    n.push(k)
                }
            }
            return n
        })
    }

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
                addKeyClicked(key)
            }
        }
        function handleKeyUp(e: KeyboardEvent) {
            const key = getKey(e.code)
            if (key != 0xFF) {
                keys.current.push({
                    type: "up",
                    key,
                })
                removeKeyClicked(key)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyUp)
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
        soundOn: boolean
    }
    const stepContext = useRef<StepContext>({ oscillator: null, rafId: null, timeoutId: null, soundOn: true })

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
            if (stepContext.current.soundOn) {
                stepContext.current.oscillator = playBeep()
            }
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

    const [roms, setRoms] = useState<Rom[]>(DEFAULT_ROMS)
    const [romSelected, setRomSelected] = useState<number | null>(null)

    function getRom(roms: Rom[], key: number): Rom | null {
        for (const r of roms) {
            if (r.id === key) {
                return r
            }
        }
        return null
    }

    function stopEmulatorLoop() {
        if (stepContext.current.rafId != null) {
            cancelAnimationFrame(stepContext.current.rafId)
        }
        if (stepContext.current.timeoutId != null) {
            clearTimeout(stepContext.current.timeoutId)
        }
    }

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
            stopEmulatorLoop()
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

        if (emulatorState === "playing") {
            stopEmulatorLoop()
        }
        setEmulatorState("ready")

        let selectedRom = getRom(roms, romId)
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
        setRoms([...roms, ...savedRoms])
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

    function emulatorStateIndicatorClassName(state: EmulatorState): string {
        if (state === "ready") {
            return "bg-red-700/50"
        } else if (state === "playing") {
            return "bg-green-700/50"
        } else {
            return "bg-yellow-700/50"
        }
    }

    const [soundOn, setSoundOn] = useState(true)

    return (
        <>
            <section className="w-full max-w-[400px] mx-auto min-h-[100vh] pb-8 flex flex-col">
                <header className="w-full h-16 border-b border-slate-800 flex items-center justify-center gap-4">
                    <Icon name="chip" className="size-8 text-green-600"></Icon>
                    <h1 className="text-xl font-medium text-slate-300">CHIP-8 emulator</h1>
                </header>

                <div className="w-full px-4 mt-10">
                    <div className="w-full p-4 border border-slate-800 rounded">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-medium">Display</p>
                            {
                                romSelected != null
                                    ? (
                                        <div className="flex gap-2 items-center">
                                            <div className={
                                                emulatorStateIndicatorClassName(emulatorState) +
                                                " size-3 rounded-full bg-opa"
                                            }>
                                            </div>
                                            <p className="text-slate-200 text-sm">{getRom(roms, romSelected)!.name}</p>
                                        </div>
                                    )
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
                            onClick={() => {
                                setSoundOn(!soundOn)
                                stepContext.current.soundOn = !stepContext.current.soundOn
                            }}
                            className="w-full h-10 border border-slate-800 rounded text-slate-200 flex gap-2 items-center justify-center cursor-pointer"
                        >
                            <Icon name="speaker-wave" className="size-4" />
                            Sound {soundOn ? "on" : "off"}
                        </button>
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
                    <p className="text-slate-400 text-sm font-medium">Keypad</p>
                    <Keypad
                        clicked={keysClicked}
                        keydown={(key) => {
                            addKeyClicked(key)
                            keys.current.push({ key, type: "down" })
                        }}
                        keyup={(key) => {
                            removeKeyClicked(key)
                            keys.current.push({ key, type: "up" })
                        }}
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
