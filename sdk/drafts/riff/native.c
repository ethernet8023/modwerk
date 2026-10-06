/* RIFF native editor adapter for locally verified Octatrack OS 1.40C.
 * The sample engine, SRC/AMP/FX values and sequencer remain stock.
 * ABI references: octabam PARAM_PAGES, PANEL, MAINMENU; octalab TRIGS.
 * UI layer/window idioms follow Sam Banks' MIT octabam editor tooling.
 * Pending native/hardware qualification: see TESTING.md. */
#include "engine.h"
#define U8(a) (*(volatile uint8_t *)(uintptr_t)(a))
#define U32(a) (*(volatile uint32_t *)(uintptr_t)(a))
#define BANK_PTR 0x46c82456u
#define PART_IDX 0x100b14cfu
#define TRACK_IDX 0x100b14ccu
#define PATTERN_IDX 0x100b14d0u
#define PART_OFF 0x8ed80u
#define PART_STRIDE 0x18b2u
#define PATTERN_STRIDE 0x8ed8u
#define SRAM_PART 0x100a4eceu
#define SRAM_PATTERNS 0x1001614eu
#define TRANSPORT 0x800065b8u
#define KEY_CACHE 0x46c7d8deu
#define LAYERS 0x460d165cu
#define PAGE_KIND 0x46c7d8d8u
#define SCREEN_DIRTY 0x46c7c72cu
#define SIGNATURE 0x3cu
#define SETTINGS2 0x1ecu
extern uint32_t st_layer[], st_edit_layer[];
extern void st_stock_pool_open(void);
static uint32_t active = 0, shown_bank = 0, shown_part = 0, shown_track = 0;
static uint32_t edit_view = 0, layer_gen = 0;
static uint32_t saved[2][3] = {{0}};
static uint32_t last_transport = 0;
static uint32_t mine = 0;
static uint8_t staging[RIFF_TRACK_BYTES] = {0};
static RiffPhrase phrase = {{{0}}, 0};
/* This is a private descriptor for the native SRC drawer only. Playback,
 * validators, lock editing and the global kind table continue to use stock. */
static uint8_t src_page[0x192] = {0};
static uint32_t src_page_ready = 0;
unsigned st_selected(void);
static unsigned generator_view(void) {
    return st_selected() && !edit_view && U8(PAGE_KIND)==0 &&
           !U32(0x460d173au) && !U32(0x460d1694u);
}
static void redraw(void) {
    ((void (*)(int))0x4004d948u)(-1);
    U32(SCREEN_DIRTY)=1;
}
static void notice(const char *message) {
    ((void (*)(const char *,unsigned))0x4005a2b8u)(message,32);
}
static unsigned key_held(unsigned key) { return (U8(0x46100b18u + (key >> 3)) >> (key & 7u)) & 1u; }
static int valid_bank(void) { uint32_t b=U32(BANK_PTR); return b>=0x40000000u && b<0x47f00000u; }
static volatile uint8_t *current_part(void) {
    return (volatile uint8_t *)(uintptr_t)(U32(BANK_PTR)+PART_OFF+(U8(PART_IDX)&3u)*PART_STRIDE);
}
static int signed_track(const volatile uint8_t *p, unsigned t) {
    if(t>=8 || p[0x22u+t]>1) return 0;
    const volatile uint8_t *s=p+SIGNATURE+30u*t;
    return s[0]=='S' && s[1]=='2' && (s[2]==1 || s[2]==2);
}
unsigned st_selected(void) {
    return valid_bank() && !U8(0x80000015u) && signed_track(current_part(),U8(TRACK_IDX));
}
static unsigned any_riff(void) {
    if(!valid_bank()) return 0;
    for(unsigned t=0;t<8;++t) if(signed_track(current_part(),t)) return 1;
    return 0;
}
unsigned st_type(unsigned type, const volatile uint8_t *ptr) {
    if(!valid_bank()) return type;
    volatile uint8_t *p=current_part();
    uintptr_t t=(uintptr_t)ptr-(uintptr_t)(p+0x22);
    return t<8 && type<2 && signed_track(p,(unsigned)t) ? 5 : type;
}
static void dirty_part(unsigned part) {
    U8(U32(BANK_PTR)+0x95048u)|=(uint8_t)(1u<<part);
    U8(0x100b145eu)|=(uint8_t)(1u<<part);
    U32(U32(BANK_PTR)+0x9b332u)=1; U32(0x100f8598u)=1;
    ((void (*)(void))0x40027e00u)();
}
static RiffParams settings(unsigned t);
static uint32_t get_seed(unsigned t);
static void save_settings(unsigned t,const RiffParams *p,uint32_t seed);
/* Only the unused PICKUP slots hold Riff settings. Stock Flex/Static
 * playback values and the chosen sample stay intact, including in EDIT. */
unsigned st_assign(volatile uint8_t *part, unsigned t, unsigned enabled) {
    if(!valid_bank() || t>=8) return 1;
    uint32_t offset=(uint32_t)(uintptr_t)part-U32(BANK_PTR)-PART_OFF;
    if(offset%PART_STRIDE || offset/PART_STRIDE>=4) return 1;
    volatile uint8_t *mirror=(volatile uint8_t *)(uintptr_t)(SRAM_PART+offset);
    unsigned pool=part[0x22u+t]<2 ? part[0x22u+t] : 1;
    unsigned sig=SIGNATURE+30u*t, setup=SETTINGS2+30u*t;
    if(enabled && !signed_track(part,t)) {
        uint8_t packed[9]; riff_pack(packed,&riff_defaults,t+1);
        part[sig]='S'; part[sig+1]='2'; part[sig+2]=2;
        for(unsigned k=0;k<9;++k) part[k<3?sig+3+k:setup+k-3]=packed[k];
    } else if(!enabled && signed_track(part,t)) {
        part[sig]=part[sig+1]=part[sig+2]=0;
    }
    for(unsigned k=0;k<6;++k) { mirror[sig+k]=part[sig+k]; mirror[setup+k]=part[setup+k]; }
    return pool;
}
static RiffParams settings(unsigned t) {
    const volatile uint8_t *p=current_part(); RiffParams result=riff_defaults;
    if(p[SIGNATURE+30u*t+2]==1) {
        uint8_t *bytes=(uint8_t *)&result;
        for(unsigned k=0;k<6;++k) bytes[k]=p[(k<3?SIGNATURE+3+k:SETTINGS2+k-3)+30u*t];
    } else {
        uint8_t packed[9]; uint32_t seed;
        for(unsigned k=0;k<9;++k) packed[k]=p[(k<3?SIGNATURE+3+k:SETTINGS2+k-3)+30u*t];
        riff_unpack(&result,&seed,packed);
    }
    return result;
}
static uint32_t get_seed(unsigned t) {
    return current_part()[SETTINGS2+30u*t+5]&127u;
}
static void store_setting(unsigned t, unsigned offset, uint8_t value) {
    unsigned at=offset+30u*t, part=U8(PART_IDX)&3u;
    current_part()[at]=value; U8(SRAM_PART+part*PART_STRIDE+at)=value;
}
static void save_settings(unsigned t,const RiffParams *p,uint32_t seed) {
    uint8_t packed[9]; riff_pack(packed,p,seed);
    for(unsigned k=0;k<9;++k)
        store_setting(t,k<3?SIGNATURE+3+k:SETTINGS2+k-3,packed[k]);
    store_setting(t,SIGNATURE+2,2);
}
/* Generate on the UI task and publish through stock's live track-update
 * routine, as its native trig editor does. Never generate in the audio ISR. */
static int generate_track(unsigned t, int replace, int fresh) {
    if(!valid_bank() || !signed_track(current_part(),t)) return 0;
    unsigned p=U8(PATTERN_IDX);
    if(p>=16) return 0;
    uint32_t bank=U32(BANK_PTR), part=U8(PART_IDX), off=p*PATTERN_STRIDE+t*RIFF_TRACK_BYTES;
    volatile uint8_t *src=(volatile uint8_t *)(uintptr_t)(bank+off);
    for(unsigned k=0;k<RIFF_TRACK_BYTES;++k) staging[k]=src[k];
    if(!replace && !riff_track_empty(staging,sizeof staging)) return 0;
    const volatile uint8_t *pat=(const volatile uint8_t *)(uintptr_t)(bank+p*PATTERN_STRIDE);
    unsigned length=pat[0x8e55u] ? staging[0x50u] : pat[0x8e53u];
    if(!length || length>64) return 0;
    RiffParams params=settings(t);
    uint32_t seed=get_seed(t); if(fresh) seed=riff_next_seed(seed);
    unsigned volume=current_part()[0x123u+24u*t];
    if(volume>127 || !riff_generate(&phrase,&params,length,volume,seed) ||
       !riff_write_phrase(staging,sizeof staging,&phrase,replace)) return 0;
    /* The generated phrase always belongs to this captured bank/Part/pattern. */
    if(bank!=U32(BANK_PTR) || p!=U8(PATTERN_IDX) || part!=U8(PART_IDX)) return 0;
    volatile uint8_t *mirror=(volatile uint8_t *)(uintptr_t)(SRAM_PATTERNS+off);
    for(unsigned k=0;k<RIFF_TRACK_BYTES;++k)
        if(src[k]!=staging[k]) { src[k]=staging[k]; mirror[k]=staging[k]; }
    save_settings(t,&params,seed); dirty_part(part&3u);
    /* Stock lock-index rebuilding and track publication. ABI still requires
     * native qualification; never promote a screenshot to behavioral proof. */
    ((void (*)(void))0x400339d8u)();
    ((void (*)(unsigned))0x4009da20u)(t);
    U32(SCREEN_DIRTY)=1;
    return 1;
}
static void put32(uint8_t *p,uint32_t value) {
    p[0]=(uint8_t)(value>>24); p[1]=(uint8_t)(value>>16);
    p[2]=(uint8_t)(value>>8); p[3]=(uint8_t)value;
}
static void label(uint8_t *out,const char *text) {
    unsigned i=0; for(;i<5 && text[i];++i) out[i]=(uint8_t)text[i];
    for(;i<6;++i) out[i]=0;
}
static void format_control(char *out,unsigned control) {
    static const char *const roots[]={"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};
    RiffParams p=settings(U8(TRACK_IDX));
    unsigned value=control==6?get_seed(U8(TRACK_IDX)):((const uint8_t *)&p)[control<6?control:control-1];
    if(control==2 || control==3) {
        const char *name=control==2?roots[value%12]:riff_scale_names[value%5];
        unsigned i=0; do { out[i]=name[i]; } while(name[i++]);
    } else if(control==11 || (control==10 && !value)) {
        const char *name=control==11?(value?"REV":"FWD"):"OFF";
        unsigned i=0; do { out[i]=name[i]; } while(name[i++]);
    } else {
        unsigned i=0;
        if(control==8) {
            int signed_value=(int)value-12;
            if(signed_value<0) { out[i++]='-'; value=(unsigned)-signed_value; }
            else value=(unsigned)signed_value;
        }
        if(value>=100) out[i++]=(char)('0'+value/100);
        if(value>=10) out[i++]=(char)('0'+value/10%10);
        out[i++]=(char)('0'+value%10); out[i]=0;
    }
}
#define FORMATTER(n) static void format_##n(char *out,int value) { (void)value; format_control(out,n); }
FORMATTER(0) FORMATTER(1) FORMATTER(2) FORMATTER(3) FORMATTER(4) FORMATTER(5)
FORMATTER(6) FORMATTER(7) FORMATTER(8) FORMATTER(9) FORMATTER(10) FORMATTER(11)
/* Use Elektron's dial and value-field renderer in each native SRC cell.
 * The generator's integer ranges determine the dial angle; its formatter
 * prints the actual parameter value. No window or full-screen overlay. */
static void draw_generator_widget(int x,int y,unsigned slot,unsigned control,int value,unsigned flags,
                             void (*format)(char *,int),uint32_t canvas) {
    (void)value;
    if(control>=12) return;
    RiffParams p=settings(U8(TRACK_IDX));
    unsigned raw=control==6?get_seed(U8(TRACK_IDX)):((const uint8_t *)&p)[control<6?control:control-1];
    unsigned max=riff_control_max[control];
    if(raw>max) raw=max;
    ((void (*)(int,int,unsigned,int,unsigned,void (*)(char *,int),uint32_t))0x400479b4u)
        (x,y,slot,(int)(raw*127u/max),flags&~1u,format,canvas);
}
static void generator_widget(int x,int y,unsigned slot,int value,unsigned flags,
                             void (*format)(char *,int),uint32_t canvas) {
    draw_generator_widget(x,y,slot,slot,value,flags,format,canvas);
}
static void secondary_widget(int x,int y,unsigned slot,int value,unsigned flags,
                             void (*format)(char *,int),uint32_t canvas) {
    draw_generator_widget(x,y,slot,slot+6,value,flags,format,canvas);
}
/* Called only by the native main-page drawer, never by the sample renderer
 * or generic parameter resolver. Holding a trig/scene uses the normal source
 * controls immediately, so PTCH and its generated locks remain editable. */
static uint32_t generator_page(uint32_t stock) {
    if(!src_page_ready) {
        static void (*const formats[12])(char *,int)={format_0,format_1,format_2,format_3,format_4,format_5,format_6,format_7,format_8,format_9,format_10,format_11};
        const volatile uint8_t *source=(const volatile uint8_t *)(uintptr_t)stock;
        for(unsigned i=0;i<sizeof src_page;++i) src_page[i]=source[i];
        for(unsigned i=0;i<12;++i) {
            label(src_page+0x16+6*i,riff_control_names[i]);
            put32(src_page+0xca+4*i,(uint32_t)(uintptr_t)formats[i]);
            put32(src_page+0xfa+4*i,(uint32_t)(uintptr_t)(i<6?generator_widget:secondary_widget));
        }
        /* Active, always visible values for both native SRC pages. */
        put32(src_page+0x18a,0x00005555u);
        put32(src_page+0x18e,0x55555555u);
        src_page_ready=1;
    }
    return (uint32_t)(uintptr_t)src_page;
}
uint32_t st_draw_page(void) {
    uint32_t stock=((uint32_t (*)(void))0x40031f28u)();
    return generator_view()?generator_page(stock):stock;
}
uint32_t st_setup_page(uint32_t stock) {
    return st_selected() && !edit_view && U32(0x460d5c30u)==5?generator_page(stock):stock;
}
static void change_control(unsigned control,int delta) {
    unsigned t=U8(TRACK_IDX); RiffParams p=settings(t), before=p;
    uint32_t seed=get_seed(t), old_seed=seed;
    uint8_t *parameter=(uint8_t *)&p+(control<6?control:control-1);
    unsigned previous=control==6?seed:*parameter;
    int value=(int)previous+delta;
    if(value<0) value=0;
    if(value>riff_control_max[control]) value=riff_control_max[control];
    if((unsigned)value==previous) return;
    if(control==6) seed=(uint32_t)value; else *parameter=(uint8_t)value;
    save_settings(t,&p,seed);
    if(!generate_track(t,1,0)) save_settings(t,&before,old_seed);
    redraw();
}
void st_knob(unsigned index,int delta) {
    if(index>=6 || !generator_view() || st_layer[0]) return;
    change_control(index,delta);
}
unsigned st_setup_knob(unsigned index,int delta) {
    if(index>=6 || !st_selected() || edit_view) return 0;
    change_control(index+6,delta);
    return 1;
}
static void forward(unsigned which,unsigned code,unsigned edge) {
    uint32_t h=saved[which][edge==1?0:edge==0?1:2];
    if(h && h!=0xffffffffu) ((void (*)(unsigned,unsigned))h)(code,edge);
}
void st_key(unsigned code,unsigned edge) {
    unsigned which=code==0x31 ? 0 : 1, mask=1u<<which;
    if(edge!=1 && (mine&mask)) { if(!edge) mine&=~mask; return; }
    if(edge==1 && st_selected() && !key_held(0x2d)) {
        if(code==0x3e && U8(PAGE_KIND)==0) {
            mine|=mask; edit_view=!edit_view; redraw(); return;
        }
        if(code==0x31 && generator_view()) {
            mine|=mask;
            notice(generate_track(U8(TRACK_IDX),1,1) ? "RIFF GENERATED" : "NO CHANGE");
            redraw(); return;
        }
    }
    forward(which,code,edge);
}
void st_ui_tick(void) {
    /* PLAY stays entirely in the native input layer. Observe its completed
     * transport transition here, then fill only empty RIFF lanes. Forwarding
     * PLAY through our key layer can change native start-key ownership. */
    uint32_t transport=U32(TRANSPORT);
    if(transport==1 && last_transport!=1 && any_riff())
        for(unsigned t=0;t<8;++t) (void)generate_track(t,0,0);
    last_transport=transport;
    /* Row five aliases the current backing pool for native SRC SETUP. */
    if(valid_bank()) {
        for(unsigned t=0;t<8;++t) if(signed_track(current_part(),t) && current_part()[SIGNATURE+30u*t+2]==1) {
            RiffParams p=settings(t); save_settings(t,&p,get_seed(t)); dirty_part(U8(PART_IDX)&3u);
        }
        unsigned t=U8(TRACK_IDX), pool=t<8?current_part()[0x22+t]:1;
        U32(0x400d5f4cu)=pool==0?0x400d301cu:0x400d31aeu;
    }
    unsigned want=any_riff();
    uint32_t bank=U32(BANK_PTR), part=U8(PART_IDX), track=U8(TRACK_IDX);
    unsigned changed=bank!=shown_bank || part!=shown_part || track!=shown_track;
    uint32_t *layer=layer_gen?st_layer:st_edit_layer;
    if(active && (!want || layer[0] || changed || layer_gen!=generator_view())) {
        if(mine) return; /* A release always reaches the handler that took its press. */
        ((void (*)(uint32_t *))0x4003146cu)(layer); active=0;
    }
    if(changed) edit_view=0;
    shown_bank=bank; shown_part=part; shown_track=track;
    if(!active) {
        volatile uint32_t *base=(volatile uint32_t *)(uintptr_t)U32(LAYERS);
        if(!want || !base || base[0]) return;
        static const unsigned keys[]={0x31,0x3e};
        for(unsigned k=0;k<2;++k) for(unsigned e=0;e<3;++e) {
            uint32_t handler=U32(KEY_CACHE+24*keys[k]+4*e);
            /* Held native keys can retain the previous layer's callback.
             * Keep the real stock delegate instead of saving ourselves. */
            if(handler!=(uint32_t)(uintptr_t)st_key) saved[k][e]=handler;
        }
        layer_gen=generator_view();
        layer=layer_gen?st_layer:st_edit_layer; layer[0]=0;
        ((void (*)(uint32_t *))0x40031494u)(layer); active=1;
        redraw();
    }
}
