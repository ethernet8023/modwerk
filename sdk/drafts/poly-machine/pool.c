/* SPDX-License-Identifier: MIT
 * Fixed storage; only playback heads are allocated, never AMP or FX chains.
 * Eight stock primary records are entry bridges. Up to 31 extension records
 * allow one track to use the entire 32-active-head budget. */
#include <stdint.h>
#define POOL_CAPACITY 32u
#define EXTRA_CAPACITY 31u
#define RECORD_SIZE 168u
#ifndef POLY_POOL_HOST_TEST
#define PRIMARY ((volatile uint8_t (*)[RECORD_SIZE])(uintptr_t)0x800049d8u)
#else
extern volatile uint8_t test_primary[8][RECORD_SIZE];
#define PRIMARY test_primary
#endif
extern volatile uint8_t poly_extra_voices[EXTRA_CAPACITY][RECORD_SIZE];
extern volatile uint8_t poly_extra_track[EXTRA_CAPACITY];
extern volatile uint8_t poly_primary_note[8], poly_extra_note[EXTRA_CAPACITY];
extern volatile uint8_t poly_held[8][64], poly_chord_count[8];
extern volatile uint8_t poly_armed_key[8], poly_pending_key[8];
extern volatile uint8_t poly_released[8], poly_env_stage[39];
extern unsigned pm_is_poly_track(unsigned track);
static uint32_t primary_age[8]={0}, extra_age[EXTRA_CAPACITY]={0}, serial=0;
static uint8_t dirty[8]={0};
volatile uint32_t poly_extra_mask[8]={0};

void pm_clear_extensions(unsigned track) {
    if(track>=8 || !dirty[track]) return;
    for(unsigned i=0;i<EXTRA_CAPACITY;++i) if(poly_extra_track[i]==track) {
        poly_extra_voices[i][0]=0; poly_extra_track[i]=255; poly_extra_note[i]=255;
    }
    poly_extra_mask[track]=0;
    poly_primary_note[track]=255;
    for(unsigned i=0;i<64;++i) poly_held[track][i]=255;
    poly_chord_count[track]=0;
    poly_armed_key[track]=poly_pending_key[track]=255;
    poly_released[track]=0;
    dirty[track]=0;
}

/* Called by the common trigger with audio interrupts already masked.
 * Return an extension for the old primary, or -1 if it need not survive.
 * Oldest active head is stolen at capacity, including primary heads. */
int pm_reserve(unsigned track) {
    if(track>=8) return -1;
    uint32_t now=++serial, oldest_distance=0;
    unsigned count=0, oldest=0;
    for(unsigned t=0;t<8;++t) if(PRIMARY[t][0] && pm_is_poly_track(t)) {
        uint32_t distance=now-primary_age[t];
        if(!count || distance>oldest_distance) { oldest=t; oldest_distance=distance; }
        ++count;
    }
    for(unsigned i=0;i<EXTRA_CAPACITY;++i) if(poly_extra_voices[i][0]) {
        if(poly_extra_track[i]>=8 || !pm_is_poly_track(poly_extra_track[i])) {
            if(poly_extra_track[i]<8) poly_extra_mask[poly_extra_track[i]]&=~(1u<<(i+1));
            poly_extra_voices[i][0]=0; continue;
        }
        uint32_t distance=now-extra_age[i];
        if(!count || distance>oldest_distance) { oldest=i+8; oldest_distance=distance; }
        ++count;
    }
    if(count>=POOL_CAPACITY) {
        if(oldest<8) { PRIMARY[oldest][0]=0; poly_primary_note[oldest]=255; }
        else { unsigned i=oldest-8; poly_extra_mask[poly_extra_track[i]]&=~(1u<<(i+1)); poly_extra_voices[i][0]=0; poly_extra_note[i]=255; }
    }
    int slot=-1;
    if(PRIMARY[track][0]) for(unsigned i=0;i<EXTRA_CAPACITY;++i)
        if(!poly_extra_voices[i][0]) {
            slot=(int)i;
            if(poly_extra_track[i]<8) poly_extra_mask[poly_extra_track[i]]&=~(1u<<(i+1));
            poly_extra_track[i]=(uint8_t)track; poly_extra_mask[track]|=1u<<(i+1);
            extra_age[i]=primary_age[track]; break;
        }
    primary_age[track]=now; dirty[track]=1;
    return slot;
}

/* Each owner releases only its preallocated envelope. The audio loop returns
 * that head to the shared pool when the release becomes inaudible. */
void pm_release_head(unsigned track,unsigned key) {
    if(track>=8) return;
    if(poly_primary_note[track]==key) {
        poly_primary_note[track]=255;
        if(poly_env_stage[track]) poly_env_stage[track]=3;
    }
    for(unsigned i=0;i<EXTRA_CAPACITY;++i)
        if(poly_extra_track[i]==track && poly_extra_note[i]==key) {
            poly_extra_note[i]=255;
            if(poly_env_stage[i+8]) poly_env_stage[i+8]=3;
        }
}
