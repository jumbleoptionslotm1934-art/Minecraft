# Minecraft-Style Voxel Sandbox

An original voxel sandbox game inspired by the core systems of Minecraft.

## Current scope

### Implemented
Phase 1 core and a substantial Phase 2 world-generation layer are now implemented in the browser prototype:
- deterministic seeded chunks
- first-person movement and collision
- block placement/destruction
- hotbar/inventory UI foundation
- persistent player position and modified blocks
- biome classification
- varied terrain heights
- caves
- ore generation
- trees, cactus and flowers
- sea-level water generation
- chunk streaming and exposed-face meshing
- item registry and stack-based inventory
- persistent hotbar/inventory state
- resource drops from mined blocks
- tool tiers and durability
- progressive hold-to-mine interaction
- recipe-driven crafting
- crafting UI
- starter survival inventory
- health and hunger systems
- food consumption and regeneration
- starvation and drowning damage
- accumulated fall damage
- day/night lighting cycle
- dynamic weather state with rain conditions
- persistent survival state
- passive animals and hostile creatures
- distance-based mob spawning
- basic mob wandering and hostile pursuit AI
- mob health and melee attacks
- sword-based combat and tool durability
- mob drops and collection

This repository starts with an incremental architecture:

- First-person voxel camera
- Procedural chunked terrain
- Block registry and data-driven block properties
- Block placement and destruction
- Hotbar/inventory foundation
- Original generated-style placeholder assets
- Deterministic world seeds
- Modular systems intended for survival, mobs, crafting, fluids, lighting, structures, saving and more

## Original-content requirement
This project must use independently created code and assets. Do not copy Minecraft proprietary source code, textures, sounds, fonts, models, or extracted assets.

## Development
Implement the project incrementally. After each phase, run tests, diagnose failures, preserve working functionality, and continue from the existing implementation.

The detailed functional specification is maintained in `docs/SPEC.md`.

## Inspiration / reference reading
- https://www.minecraft.net/en-us/article/what-minecraft
- https://en.wikipedia.org/wiki/Minecraft
- https://minecraft.fandom.com/wiki/Minecraft_Wiki
