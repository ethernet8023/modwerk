/* Original RIFF phrase generator; no firmware, DSP or MIDI dependencies. */
#ifndef RIFF_ENGINE_H
#define RIFF_ENGINE_H
#include <stdint.h>
#include <stddef.h>
#define RIFF_STEPS 64u
#define RIFF_TRACK_BYTES 0x91au
#define RIFF_LOCKS 0x59u
#define RIFF_NO_LOCK 255u

typedef struct {
    uint8_t type, density, root, scale, gate, accent;
    uint8_t span, offset, rotation, repeat, direction;
} RiffParams;
typedef struct {
    uint8_t active, pitch, hold, volume;
} RiffStep;
typedef struct {
    RiffStep steps[RIFF_STEPS];
    uint8_t length;
} RiffPhrase;
/* SRC A-F and secondary SRC SETUP controls. Seed is a separate argument.
 * Offset is stored as 0..24, displayed as -12..+12 semitones. */
extern const RiffParams riff_defaults;
extern const char *const riff_control_names[12];
extern const uint8_t riff_control_max[12];
extern const char *const riff_scale_names[5];
/* Nine bytes in the unused PICKUP slots; never spill into another track. */
void riff_pack(uint8_t out[9], const RiffParams *params, uint32_t seed);
void riff_unpack(RiffParams *params, uint32_t *seed, const uint8_t in[9]);
uint32_t riff_next_seed(uint32_t seed);
int riff_generate(RiffPhrase *out, const RiffParams *params,
                   unsigned length, unsigned base_volume, uint32_t seed);
/* Read/write a SINGLE native RAM TRAC record. No addressing of other tracks.
 * The caller must hold the editor's write boundary and mirror/publish it.
 * Slots 0/PTCH, 13/HOLD and 15/VOL are the only locks owned by generation.
 * Other locks and recorder/swing masks are preserved. */
int riff_track_empty(const uint8_t *record, size_t size);
int riff_write_phrase(uint8_t *record, size_t size,
                       const RiffPhrase *phrase, int replace);
#endif
