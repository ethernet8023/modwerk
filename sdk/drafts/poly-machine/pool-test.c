/* SPDX-License-Identifier: MIT */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#define POLY_POOL_HOST_TEST
#include "pool.c"
volatile uint8_t test_primary[8][168],poly_extra_voices[31][168];
volatile uint8_t poly_extra_track[31],poly_primary_note[8],poly_extra_note[31];
volatile uint8_t poly_held[8][64],poly_chord_count[8],poly_armed_key[8],poly_pending_key[8],poly_released[8];
volatile uint8_t poly_env_stage[39];
static unsigned enabled[8]={1,1,1,1,1,1,1,1};
unsigned pm_is_poly_track(unsigned t){return enabled[t];}
static unsigned active(void){unsigned n=0;for(unsigned i=0;i<8;i++)n+=!!test_primary[i][0];for(unsigned i=0;i<31;i++)n+=!!poly_extra_voices[i][0];return n;}
static void trigger(unsigned t,unsigned key){int s=pm_reserve(t);if(s>=0){memcpy((void*)poly_extra_voices[s],(void*)test_primary[t],168);poly_extra_note[s]=poly_primary_note[t];poly_env_stage[s+8]=poly_env_stage[t];}test_primary[t][0]=1;poly_primary_note[t]=key;poly_env_stage[t]=1;}
static void clear(void){for(unsigned t=0;t<8;t++){pm_clear_extensions(t);test_primary[t][0]=0;}memset((void*)poly_held,255,sizeof(poly_held));}
int main(void){
 clear();for(unsigned i=0;i<32;i++){trigger(0,i);assert(active()==i+1);}assert(test_primary[0][0]);for(unsigned i=0;i<31;i++)assert(poly_extra_track[i]==0);
 trigger(1,64);assert(active()==32);assert(test_primary[1][0]);assert(poly_extra_note[0]==255); // oldest moved head
 for(unsigned i=0;i<10000;i++){trigger((i*7)%8,i%127);assert(active()==32);}
 clear();for(unsigned t=0;t<8;t++)trigger(t,t);for(unsigned i=0;i<24;i++)trigger(1,32+i);assert(active()==32);trigger(2,90);assert(active()==32);assert(!test_primary[0][0]); // oldest primary stolen
 clear();poly_held[0][0]=72;trigger(0,72);poly_held[0][1]=84;trigger(0,84);assert(active()==2);
 pm_release_head(0,84);assert(active()==2);assert(poly_env_stage[0]==3);assert(poly_env_stage[8]==1);
 pm_release_head(0,72);assert(active()==2);assert(poly_env_stage[8]==3);
 clear();trigger(0,10);trigger(0,11);enabled[0]=0;trigger(1,12);assert(!poly_extra_voices[0][0]);enabled[0]=1;clear();assert(active()==0);
 puts("PASS: 32 on one track; cross-track allocation; 10,000 steals; oldest primary; independent release; machine cleanup");
}
