#NO_APP
	.file	"vector.c"
	.text
	.align	2
	.type	signed_track, @function
signed_track:
	move.l %d2,-(%sp)
	move.l 12(%sp),%d0
	mov3q.l #7,%d1
	cmp.l %d0,%d1
	jcs .L4
	move.l 8(%sp),%a0
	mvz.b 34(%a0,%d0.l),%d1
	subq.l #1,%d1
	tst.l %d1
	jeq .L7
.L4:
	move.l (%sp)+,%d2
	clr.l %d0
	rts
.L7:
	mulu.w #30,%d0
	moveq #80,%d1
	lea 60(%a0,%d0.l),%a0
	mvz.b (%a0),%d0
	cmp.l %d0,%d1
	jne .L4
	mvz.b 1(%a0),%d0
	moveq #76,%d2
	cmp.l %d0,%d2
	jne .L4
	move.b 2(%a0),%d0
	mov3q.l #1,%d1
	move.l (%sp)+,%d2
	eor.l %d1,%d0
	tst.b %d0
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
	rts
	.size	signed_track, .-signed_track
	.align	2
	.globl	pm_selected
	.type	pm_selected, @function
pm_selected:
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	move.l %d2,-(%sp)
	cmp.l #133169151,%d0
	jhi .L11
	tst.b -2147483627.l
	jeq .L14
.L11:
	move.l (%sp)+,%d2
	clr.l %d0
	rts
.L14:
	move.b 269161676,%d1
	move.l 1187521622,%a0
	mov3q.l #3,%d2
	move.b 269161679,%d0
	add.l #585088,%a0
	mvz.b %d1,%d1
	and.l %d2,%d0
	move.l %d1,-(%sp)
	mvz.w #6322,%d1
	muls.l %d1,%d0
	pea (%a0,%d0.l)
	jsr signed_track
	addq.l #8,%sp
	move.l (%sp)+,%d2
	rts
	.size	pm_selected, .-pm_selected
	.align	2
	.type	pool_context, @function
pool_context:
	move.l pool_bank,%d0
	cmp.l 1187521622.l,%d0
	jeq .L21
.L17:
	clr.l %d0
	rts
.L21:
	move.b 269161679,%d0
	mov3q.l #3,%d1
	and.l %d1,%d0
	cmp.l pool_part.l,%d0
	jne .L17
	mvz.b 269161676,%d0
	cmp.l pool_track.l,%d0
	jne .L17
	jra pm_selected
	.size	pool_context, .-pool_context
	.align	2
	.globl	pm_type
	.type	pm_type, @function
pm_type:
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	move.l %d2,-(%sp)
	cmp.l #133169151,%d0
	jhi .L24
	move.l 1187521622,%d0
	mov3q.l #3,%d2
	move.b 269161679,%d1
	add.l #585088,%d0
	move.l 12(%sp),%a0
	lea (-34,%a0),%a0
	and.l %d2,%d1
	mvz.w #6322,%d2
	muls.l %d2,%d1
	mov3q.l #7,%d2
	add.l %d1,%d0
	move.l %a0,%d1
	sub.l %d0,%d1
	cmp.l %d1,%d2
	jcc .L31
.L24:
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
.L31:
	mov3q.l #1,%d2
	cmp.l 8(%sp),%d2
	jcs .L24
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr signed_track
	addq.l #8,%sp
	tst.l %d0
	jeq .L24
	mov3q.l #5,8(%sp)
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
	.size	pm_type, .-pm_type
	.align	2
	.globl	pm_chooser_type
	.type	pm_chooser_type, @function
pm_chooser_type:
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	tst.l pool_direct
	jeq .L36
	jsr pool_context
	tst.l %d0
	jne .L46
.L36:
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	cmp.l #133169151,%d0
	jhi .L39
	move.l 1187521622,%d1
	mov3q.l #3,%d3
	move.b 269161679,%d0
	add.l #585088,%d1
	move.w %d0,%a0
	move.l 16(%sp),%d0
	add.l #-34,%d0
	move.l %a0,%d2
	and.l %d3,%d2
	mvz.w #6322,%d3
	muls.l %d3,%d2
	add.l %d2,%d1
	sub.l %d1,%d0
	mov3q.l #7,%d2
	cmp.l %d0,%d2
	jcc .L47
.L39:
	move.l 12(%sp),%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L47:
	mov3q.l #1,%d3
	cmp.l 12(%sp),%d3
	jcs .L39
	move.l %d0,-(%sp)
	move.l %d1,-(%sp)
	jsr signed_track
	addq.l #8,%sp
	tst.l %d0
	jeq .L39
	move.l (%sp)+,%d2
	mov3q.l #5,%d0
	move.l (%sp)+,%d3
	rts
.L46:
	move.l 1187521622,%d0
	mov3q.l #3,%d2
	move.b 269161679,%d1
	mvz.w #6322,%d3
	move.l pool_track,%a0
	add.l #585088,%d0
	lea (34,%a0),%a0
	and.l %d2,%d1
	muls.l %d3,%d1
	add.l %d1,%d0
	add.l %a0,%d0
	cmp.l 16(%sp),%d0
	jne .L36
	move.l (%sp)+,%d2
	move.l pool_browse,%d0
	move.l (%sp)+,%d3
	rts
	.size	pm_chooser_type, .-pm_chooser_type
	.align	2
	.globl	pm_assign
	.type	pm_assign, @function
pm_assign:
	lea (-40,%sp),%sp
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	movem.l #1036,(%sp)
	cmp.l #133169151,%d0
	jhi .L49
	mov3q.l #7,%d0
	cmp.l 48(%sp),%d0
	jcs .L49
	move.l 1187521622,%d1
	move.l #-585088,%a1
	mvz.w #6322,%d2
	move.l 44(%sp),%a0
	sub.l %d1,%a0
	add.l %a0,%a1
	move.l %d1,32(%sp)
	move.l %a1,%d0
	remu.l %d2,%d1:%d0
	tst.l %d1
	jne .L49
	cmp.l #25287,%a1
	jhi .L49
	move.l 48(%sp),%d3
	moveq #30,%d0
	muls.l %d0,%d3
	move.l %d3,28(%sp)
	tst.l pool_direct
	jne .L66
.L50:
	tst.l 52(%sp)
	jeq .L67
	moveq #80,%d0
	add.l #268525902,%a0
	move.l 44(%sp),%a2
	move.l 28(%sp),%d2
	moveq #76,%d3
	move.b %d0,60(%a2,%d2.l)
	moveq #1,%d0
	move.b %d3,61(%a2,%d2.l)
	move.b %d0,62(%a2,%d2.l)
	move.l %d2,%d0
	add.l #478,%d0
	clr.b %d2
	move.b %d2,(%a0,%d0.l)
	move.b %d2,(%a2,%d0.l)
	move.l 28(%sp),%d0
	add.l #484,%d0
	move.b %d2,(%a0,%d0.l)
	move.b %d2,(%a2,%d0.l)
.L53:
	move.l 44(%sp),%a2
	move.l #268525902,%d3
	move.l 28(%sp),%d2
	sub.l 32(%sp),%d3
	lea 60(%a2,%d2.l),%a0
	move.l %d3,24(%sp)
.L55:
	move.l 24(%sp),%d0
	addq.l #1,%d1
	move.b (%a0)+,(%a0,%d0.l)
	mov3q.l #3,%d0
	cmp.l %d1,%d0
	jne .L55
	mov3q.l #1,%d1
	cmp.l 52(%sp),%d1
	jne .L49
	mvz.w #6322,%d2
	move.l %a1,%d0
	move.l #1187521622,%a0
	move.l 48(%sp),%a2
	move.l (%a0),pool_bank
	divu.l %d2,%d0
	move.l %a2,pool_track
	mov3q.l #1,pool_pending
	move.l %d0,pool_part
.L49:
	movem.l (%sp),#1036
	mov3q.l #1,%d0
	lea (40,%sp),%sp
	rts
.L66:
	move.l %d1,12(%sp)
	move.l %a0,20(%sp)
	move.l %a1,16(%sp)
	jsr pool_context
	move.l 12(%sp),%d1
	move.l 20(%sp),%a0
	move.l 16(%sp),%a1
	tst.l %d0
	jeq .L50
	move.l 1187521622,%d0
	add.l #585088,%d0
	move.b 269161679,%d2
	move.b %d2,%d3
	mov3q.l #3,%d2
	and.l %d2,%d3
	mvz.w #6322,%d2
	muls.l %d2,%d3
	add.l %d3,%d0
	cmp.l 44(%sp),%d0
	jne .L50
	move.l 48(%sp),%d3
	cmp.l pool_track.l,%d3
	jne .L50
	moveq #80,%d0
	move.l 44(%sp),%a2
	add.l #268525902,%a0
	move.l 28(%sp),%d2
	moveq #76,%d3
	mov3q.l #2,52(%sp)
	move.b %d0,60(%a2,%d2.l)
	moveq #1,%d0
	move.b %d3,61(%a2,%d2.l)
	move.b %d0,62(%a2,%d2.l)
	move.l %d2,%d0
	add.l #478,%d0
	clr.b %d2
	move.b %d2,(%a0,%d0.l)
	move.b %d2,(%a2,%d0.l)
	move.l 28(%sp),%d0
	add.l #484,%d0
	move.b %d2,(%a0,%d0.l)
	move.b %d2,(%a2,%d0.l)
	jra .L53
.L67:
	move.l 48(%sp),-(%sp)
	move.l 48(%sp),-(%sp)
	move.l %d1,20(%sp)
	move.l %a1,24(%sp)
	jsr signed_track
	addq.l #8,%sp
	move.l 12(%sp),%d1
	move.l 16(%sp),%a1
	tst.l %d0
	jeq .L53
	clr.b %d3
	move.l 44(%sp),%a0
	move.l 28(%sp),%a2
	move.l 28(%sp),%d2
	move.b %d3,62(%a0,%a2.l)
	move.b %d3,61(%a0,%a2.l)
	move.b %d3,60(%a0,%a2.l)
	move.l #268525902,%d3
	sub.l 32(%sp),%d3
	move.l 44(%sp),%a2
	move.l %d3,24(%sp)
	lea 60(%a2,%d2.l),%a0
	jra .L55
	.size	pm_assign, .-pm_assign
	.align	2
	.globl	pm_pool_choice_draw
	.type	pm_pool_choice_draw, @function
pm_pool_choice_draw:
	clr.l %d0
	rts
	.size	pm_pool_choice_draw, .-pm_pool_choice_draw
	.align	2
	.globl	pm_pool_choice_open
	.type	pm_pool_choice_open, @function
pm_pool_choice_open:
	subq.l #4,%sp
	move.l %a2,-(%sp)
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	move.l %d2,-(%sp)
	cmp.l #133169151,%d0
	jhi .L70
	tst.b -2147483627.l
	jeq .L77
.L70:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	addq.l #4,%sp
	rts
.L77:
	move.l #269161676,%a1
	mov3q.l #3,%d2
	move.b (%a1),%d1
	move.l 1187521622,%a0
	move.l #269161679,%a2
	move.b (%a2),%d0
	add.l #585088,%a0
	mvz.b %d1,%d1
	and.l %d2,%d0
	move.l %d1,-(%sp)
	mvz.w #6322,%d1
	muls.l %d1,%d0
	pea (%a0,%d0.l)
	move.l %a1,16(%sp)
	jsr signed_track
	addq.l #8,%sp
	move.l 8(%sp),%a1
	tst.l %d0
	jeq .L70
	tst.l 1175346736
	jne .L70
	tst.l 1175351520
	jne .L70
	move.l #1187521622,%a0
	mov3q.l #3,%d1
	move.l (%a0),pool_bank
	move.b (%a2),%d0
	and.l %d0,%d1
	move.l %d1,pool_part
	mvz.b (%a1),%d0
	clr.l pool_pending
	mov3q.l #1,pool_browse
	mov3q.l #1,pool_direct
	move.l %d0,pool_track
	jsr pm_stock_pool_open
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	addq.l #4,%sp
	move.l (%sp)+,%d2
	mov3q.l #1,1187497772
	move.l (%sp)+,%a2
	addq.l #4,%sp
	rts
	.size	pm_pool_choice_open, .-pm_pool_choice_open
	.align	2
	.globl	pm_pool_left
	.type	pm_pool_left, @function
pm_pool_left:
	move.l 4(%sp),%d0
	move.l 8(%sp),%d1
	tst.l 1175351520
	jeq .L78
	clr.l pool_direct
	move.l %d1,8(%sp)
	move.l %d0,4(%sp)
	jmp 1074235708
.L78:
	rts
	.size	pm_pool_left, .-pm_pool_left
	.align	2
	.globl	pm_pool_right
	.type	pm_pool_right, @function
pm_pool_right:
	subq.l #8,%sp
	move.l 12(%sp),%d1
	move.l 16(%sp),%a0
	tst.l 1175351520
	jeq .L83
	tst.l 1175352218
	jne .L83
	mov3q.l #5,%d0
	cmp.l 1175352206.l,%d0
	jeq .L92
.L83:
	move.l %a0,16(%sp)
	move.l %d1,12(%sp)
	addq.l #8,%sp
	jmp 1074237596
.L92:
	move.l %d1,4(%sp)
	move.l %a0,(%sp)
	jsr pm_selected
	move.l 4(%sp),%d1
	move.l (%sp),%a0
	tst.l %d0
	jeq .L83
	jsr 1074235876
	addq.l #8,%sp
	jra pm_pool_choice_open
	.size	pm_pool_right, .-pm_pool_right
	.align	2
	.globl	pm_ui_tick
	.type	pm_ui_tick, @function
pm_ui_tick:
	lea (-32,%sp),%sp
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	movem.l #7196,(%sp)
	cmp.l #133169151,%d0
	jhi .L93
	move.b 269161679,%d2
	move.l 1187521622,%a2
	mov3q.l #3,%d1
	move.b 269161679,%d0
	mvz.w #6322,%d4
	add.l #585088,%a2
	clr.l %d3
	and.l %d2,%d1
	mov3q.l #3,%d2
	and.l %d2,%d0
	move.l %d4,%d2
	move.l %d1,28(%sp)
	muls.l %d4,%d1
	muls.l %d0,%d2
	move.l %d1,%d0
	add.l #269111050,%d0
	add.l %d2,%a2
	sub.l %a2,%d1
	move.l %d1,%a0
	add.l #269110990,%a0
	move.l %a0,24(%sp)
	move.l %a2,%d2
	add.l #42,%d2
	lea (34,%a2),%a0
	lea (60,%a2),%a1
.L96:
	mvz.b (%a0),%d1
	subq.l #5,%d1
	tst.l %d1
	jeq .L116
	addq.l #1,%a0
	add.l #30,%d0
	lea (30,%a1),%a1
	cmp.l %a0,%d2
	jne .L96
.L119:
	tst.l %d3
	jne .L117
	tst.l pool_direct
	jeq .L98
.L122:
	tst.l 1175351520
	jne .L99
	clr.l pool_direct
.L98:
	tst.l pool_pending
	jne .L118
.L101:
	mvz.b 269161676,%d0
	mov3q.l #7,%d4
	cmp.l %d0,%d4
	jcs .L104
.L121:
	tst.b 34(%a2,%d0.l)
	jne .L104
	move.l #1074606108,%d0
	move.l %d0,1074618188
.L93:
	movem.l (%sp),#7196
	lea (32,%sp),%sp
	rts
.L116:
	move.l %d0,%a3
	move.l %a1,%a4
	move.b #80,(%a3)+
	move.b #80,(%a4)+
	moveq #1,%d1
	mov3q.l #1,%d3
	lea (30,%a1),%a1
	move.b #76,(%a3)
	move.b #76,(%a4)
	move.l %d0,%a3
	add.l #30,%d0
	move.l 24(%sp),%a4
	move.b %d1,2(%a3)
	move.b %d1,-28(%a1)
	move.b %d1,(%a4,%a0.l)
	clr.b %d1
	move.b #1,(%a0)
	addq.l #1,%a0
	move.b %d1,418(%a3)
	move.b %d1,388(%a1)
	move.b %d1,424(%a3)
	move.b %d1,394(%a1)
	cmp.l %a0,%d2
	jne .L96
	jra .L119
.L104:
	move.l #1074606510,%d0
	move.l %d0,1074618188
	jra .L93
.L118:
	jsr pool_context
	tst.l %d0
	jeq .L120
	tst.l 1175346736
	jne .L101
	tst.l 1175351520
	jne .L101
	jsr pm_pool_choice_open
	mvz.b 269161676,%d0
	mov3q.l #7,%d4
	cmp.l %d0,%d4
	jcs .L104
	jra .L121
.L117:
	move.l 28(%sp),%d2
	mov3q.l #1,%d0
	move.l 1187521622,%a0
	add.l #610376,%a0
	move.b (%a0),%d1
	lsl.l %d2,%d0
	or.l %d0,%d1
	move.b %d1,(%a0)
	move.b 269161566,%d1
	or.l %d1,%d0
	move.b %d0,269161566
	move.l 1187521622,%a0
	add.l #635698,%a0
	mov3q.l #1,(%a0)
	mov3q.l #1,269452696
	jsr 1073905152
	tst.l pool_direct
	jeq .L98
	jra .L122
.L120:
	clr.l pool_pending
	mvz.b 269161676,%d0
	mov3q.l #7,%d4
	cmp.l %d0,%d4
	jcs .L104
	jra .L121
.L99:
	jsr pool_context
	tst.l %d0
	jne .L98
	clr.l pool_direct
	jra .L98
	.size	pm_ui_tick, .-pm_ui_tick
	.align	2
	.globl	pm_is_poly_track
	.type	pm_is_poly_track, @function
pm_is_poly_track:
	mov3q.l #7,%d0
	cmp.l 4(%sp),%d0
	jcs .L126
	move.l 1187521622,%d0
	add.l #-1073741824,%d0
	cmp.l #133169151,%d0
	jls .L130
.L126:
	clr.l %d0
	rts
.L130:
	move.l 1187521622,%a0
	mov3q.l #3,%d1
	move.b 269161679,%d0
	move.l 4(%sp),-(%sp)
	add.l #585088,%a0
	and.l %d1,%d0
	mvz.w #6322,%d1
	muls.l %d1,%d0
	pea (%a0,%d0.l)
	jsr signed_track
	addq.l #8,%sp
	tst.l %d0
	jne .L127
	move.l 1187521622,%a0
	mov3q.l #3,%d1
	move.b 269161679,%d0
	move.l 4(%sp),%a1
	add.l #585088,%a0
	and.l %d1,%d0
	mvz.w #6322,%d1
	muls.l %d1,%d0
	mov3q.l #5,%d1
	add.l %d0,%a0
	move.b 34(%a1,%a0.l),%d0
	eor.l %d1,%d0
	tst.b %d0
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
	rts
.L127:
	mov3q.l #1,%d0
	rts
	.size	pm_is_poly_track, .-pm_is_poly_track
	.align	2
	.globl	pm_clear_extensions
	.type	pm_clear_extensions, @function
pm_clear_extensions:
	lea (-12,%sp),%sp
	mov3q.l #7,%d0
	movem.l #1036,(%sp)
	move.l 16(%sp),%d2
	cmp.l %d2,%d0
	jcs .L131
	lea dirty,%a0
	tst.b (%a0,%d2.l)
	jeq .L131
	clr.l %d0
	lea poly_extra_track,%a0
	lea poly_extra_voices,%a2
	lea poly_extra_note,%a1
.L134:
	mvz.b (%a0,%d0.l),%d1
	cmp.l %d1,%d2
	jeq .L140
	addq.l #1,%d0
	moveq #31,%d3
	cmp.l %d0,%d3
	jne .L134
.L141:
	st %d1
	move.l %d2,%d0
	sub.l %a0,%a0
	lsl.l #6,%d0
	lea poly_extra_mask,%a1
	clr.l (%a1,%d2.l*4)
	lea poly_primary_note,%a1
	move.b %d1,(%a1,%d2.l)
	move.l %d0,%a1
	add.l #poly_held,%a1
.L135:
	st %d3
	moveq #64,%d0
	move.b %d3,(%a1,%a0.l)
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L135
	clr.b %d1
	lea poly_chord_count,%a0
	move.b %d1,(%a0,%d2.l)
	lea poly_pending_key,%a0
	move.b %d3,(%a0,%d2.l)
	lea poly_armed_key,%a0
	move.b %d3,(%a0,%d2.l)
	lea poly_released,%a0
	move.b %d1,(%a0,%d2.l)
	lea dirty,%a0
	move.b %d1,(%a0,%d2.l)
.L131:
	movem.l (%sp),#1036
	lea (12,%sp),%sp
	rts
.L140:
	mvz.w #168,%d1
	clr.b %d3
	muls.l %d0,%d1
	move.b %d3,(%a2,%d1.l)
	st %d1
	moveq #31,%d3
	move.b %d1,(%a0,%d0.l)
	move.b %d1,(%a1,%d0.l)
	addq.l #1,%d0
	cmp.l %d0,%d3
	jne .L134
	jra .L141
	.size	pm_clear_extensions, .-pm_clear_extensions
	.align	2
	.globl	pm_reserve
	.type	pm_reserve, @function
pm_reserve:
	lea (-48,%sp),%sp
	mov3q.l #7,%d0
	movem.l #31996,(%sp)
	cmp.l 52(%sp),%d0
	jcs .L164
	move.l serial,%d1
	addq.l #1,%d1
	move.l %d1,44(%sp)
	move.l #-2147464744,%a2
	move.l %d1,serial
	clr.l %d2
	clr.l %d7
	clr.l %d4
	clr.l %d5
	lea pm_is_poly_track,%a3
.L148:
	tst.b (%a2)
	jne .L186
.L145:
	addq.l #1,%d2
	lea (168,%a2),%a2
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L148
.L189:
	clr.l %d2
	lea extra_age,%a2
	lea poly_extra_voices,%a5
	lea poly_extra_track,%a6
	lea poly_extra_mask,%a3
	lea pm_is_poly_track,%a4
.L156:
	mvz.w #168,%d0
	move.l %d2,%d3
	muls.l %d2,%d0
	addq.l #1,%d2
	tst.b (%a5,%d0.l)
	jeq .L153
	mvz.b (%a6,%d3.l),%d0
	mov3q.l #7,%d1
	cmp.l %d0,%d1
	jcs .L150
	mvz.b (%a6,%d3.l),%d0
	move.l %d0,-(%sp)
	jsr (%a4)
	addq.l #4,%sp
	tst.l %d0
	jeq .L150
	move.l 44(%sp),%d0
	sub.l (%a2),%d0
	tst.l %d4
	jeq .L154
	cmp.l %d0,%d5
	jcc .L155
.L154:
	move.l %d3,%d7
	move.l %d0,%d5
	addq.l #8,%d7
.L155:
	addq.l #1,%d4
.L153:
	addq.l #4,%a2
	moveq #31,%d3
	cmp.l %d2,%d3
	jne .L156
.L190:
	cmp.l %d4,%d3
	jcc .L157
	mov3q.l #7,%d4
	cmp.l %d7,%d4
	jcs .L158
	move.w %d7,%d0
	mulu.w #168,%d0
	move.l %d0,%a1
	add.l #-2147464744,%a1
	st %d0
	clr.b (%a1)
	lea poly_primary_note,%a1
	move.b %d0,(%a1,%d7.l)
.L157:
	mvz.w #168,%d4
	move.l 52(%sp),%d0
	muls.l %d4,%d0
	move.l %d0,%a1
	add.l #-2147464744,%a1
	tst.b (%a1)
	jeq .L159
.L193:
	clr.l %d0
.L163:
	mvz.w #168,%d2
	move.l %d0,%d1
	muls.l %d0,%d2
	addq.l #1,%d0
	tst.b (%a5,%d2.l)
	jeq .L187
	moveq #31,%d4
	cmp.l %d0,%d4
	jne .L163
.L159:
	moveq #1,%d1
	move.l 52(%sp),%a1
	mov3q.l #-1,%d0
	move.l 44(%sp),%a2
	lea primary_age,%a0
	move.l %a2,(%a0,%a1.l*4)
	lea dirty,%a0
	move.b %d1,(%a0,%a1.l)
.L142:
	movem.l (%sp),#31996
	lea (48,%sp),%sp
	rts
.L186:
	move.l %d2,-(%sp)
	jsr (%a3)
	addq.l #4,%sp
	tst.l %d0
	jeq .L145
	move.l 44(%sp),%d0
	lea primary_age,%a0
	sub.l (%a0,%d2.l*4),%d0
	tst.l %d4
	jeq .L166
	cmp.l %d0,%d5
	jcc .L188
.L166:
	move.l %d2,%d7
	addq.l #1,%d4
	move.l %d0,%d5
.L191:
	addq.l #1,%d2
	lea (168,%a2),%a2
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L148
	jra .L189
.L150:
	mvz.b (%a6,%d3.l),%d0
	mov3q.l #7,%d1
	cmp.l %d0,%d1
	jcs .L152
	mov3q.l #1,%d0
	lsl.l %d2,%d0
	mvz.b (%a6,%d3.l),%d1
	not.l %d0
	and.l %d0,(%a3,%d1.l*4)
.L152:
	mvz.w #168,%d0
	clr.b %d1
	addq.l #4,%a2
	muls.l %d0,%d3
	move.b %d1,(%a5,%d3.l)
	moveq #31,%d3
	cmp.l %d2,%d3
	jne .L156
	jra .L190
.L188:
	move.l %d5,%d0
	addq.l #1,%d4
	move.l %d0,%d5
	jra .L191
.L187:
	lea poly_extra_track,%a0
	mov3q.l #1,%d2
	mvz.b (%a0,%d1.l),%d3
	lsl.l %d0,%d2
	move.l %d1,%d0
	mov3q.l #7,%d4
	cmp.l %d3,%d4
	jcs .L192
	mvz.b (%a0,%d1.l),%d3
	lea poly_extra_mask,%a1
	move.l %d2,%d4
	not.l %d4
	lea (55,%sp),%a2
	and.l %d4,(%a1,%d3.l*4)
	move.b (%a2),(%a0,%d1.l)
	move.l 52(%sp),%d3
	lea primary_age,%a0
	lea (%a0,%d3.l*4),%a2
	lea extra_age,%a0
	or.l %d2,(%a1,%d3.l*4)
	move.l (%a2),(%a0,%d1.l*4)
.L194:
	moveq #1,%d1
	move.l 52(%sp),%a1
	move.l 44(%sp),%a2
	lea primary_age,%a0
	move.l %a2,(%a0,%a1.l*4)
	lea dirty,%a0
	move.b %d1,(%a0,%a1.l)
	jra .L142
.L158:
	move.l %d7,%d1
	mov3q.l #1,%d0
	subq.l #7,%d1
	lsl.l %d1,%d0
	subq.l #8,%d7
	lea poly_extra_track,%a1
	mvz.w #168,%d2
	mvz.b (%a1,%d7.l),%d1
	lea poly_extra_mask,%a1
	st %d3
	muls.l %d7,%d2
	mvz.w #168,%d4
	not.l %d0
	and.l %d0,(%a1,%d1.l*4)
	clr.b %d1
	lea poly_extra_note,%a1
	move.l 52(%sp),%d0
	muls.l %d4,%d0
	move.b %d1,(%a5,%d2.l)
	move.b %d3,(%a1,%d7.l)
	move.l %d0,%a1
	add.l #-2147464744,%a1
	tst.b (%a1)
	jeq .L159
	jra .L193
.L192:
	move.l 52(%sp),%d3
	lea (55,%sp),%a2
	move.b (%a2),(%a0,%d1.l)
	lea primary_age,%a0
	lea (%a0,%d3.l*4),%a2
	lea extra_age,%a0
	lea poly_extra_mask,%a1
	or.l %d2,(%a1,%d3.l*4)
	move.l (%a2),(%a0,%d1.l*4)
	jra .L194
.L164:
	movem.l (%sp),#31996
	mov3q.l #-1,%d0
	lea (48,%sp),%sp
	rts
	.size	pm_reserve, .-pm_reserve
	.align	2
	.globl	pm_release_head
	.type	pm_release_head, @function
pm_release_head:
	lea (-12,%sp),%sp
	mov3q.l #7,%d0
	move.l 16(%sp),%a0
	movem.l #3076,(%sp)
	move.l 20(%sp),%d2
	cmp.l %a0,%d0
	jcs .L195
	lea poly_primary_note,%a1
	mvz.b (%a1,%a0.l),%d0
	cmp.l %d0,%d2
	jeq .L209
.L197:
	clr.l %d0
	lea poly_extra_track,%a1
	lea poly_extra_note,%a2
	lea poly_env_stage,%a3
.L199:
	mvz.b (%a1,%d0.l),%d1
	cmp.l %d1,%a0
	jeq .L210
.L198:
	addq.l #1,%d0
	moveq #31,%d1
	cmp.l %d0,%d1
	jne .L199
.L195:
	movem.l (%sp),#3076
	lea (12,%sp),%sp
	rts
.L210:
	mvz.b (%a2,%d0.l),%d1
	cmp.l %d1,%d2
	jne .L198
	st %d1
	move.b %d1,(%a2,%d0.l)
	tst.b 8(%a3,%d0.l)
	jeq .L198
	moveq #3,%d1
	move.b %d1,8(%a3,%d0.l)
	addq.l #1,%d0
	moveq #31,%d1
	cmp.l %d0,%d1
	jne .L199
	jra .L195
.L209:
	st %d1
	move.b %d1,(%a1,%a0.l)
	lea poly_env_stage,%a1
	tst.b (%a1,%a0.l)
	jeq .L197
	moveq #3,%d0
	lea poly_extra_note,%a2
	lea poly_env_stage,%a3
	move.b %d0,(%a1,%a0.l)
	clr.l %d0
	lea poly_extra_track,%a1
	jra .L199
	.size	pm_release_head, .-pm_release_head
	.globl	poly_extra_mask
	.data
	.align	2
	.type	poly_extra_mask, @object
	.size	poly_extra_mask, 32
poly_extra_mask:
	.zero	32
	.type	dirty, @object
	.size	dirty, 8
dirty:
	.zero	8
	.align	2
	.type	serial, @object
	.size	serial, 4
serial:
	.zero	4
	.align	2
	.type	extra_age, @object
	.size	extra_age, 124
extra_age:
	.zero	124
	.align	2
	.type	primary_age, @object
	.size	primary_age, 32
primary_age:
	.zero	32
	.align	2
	.type	pool_browse, @object
	.size	pool_browse, 4
pool_browse:
	.zero	4
	.align	2
	.type	pool_direct, @object
	.size	pool_direct, 4
pool_direct:
	.zero	4
	.align	2
	.type	pool_pending, @object
	.size	pool_pending, 4
pool_pending:
	.zero	4
	.align	2
	.type	pool_track, @object
	.size	pool_track, 4
pool_track:
	.zero	4
	.align	2
	.type	pool_part, @object
	.size	pool_part, 4
pool_part:
	.zero	4
	.align	2
	.type	pool_bank, @object
	.size	pool_bank, 4
pool_bank:
	.zero	4

#APP
/* Original POLY integration; registration seams adapted from octabam's */
/* MIT Analog BD machine.s (Sam Banks / repeat98). Replayed stock instructions */
/* are generated only in the private local build by prepare.py. */
        .text
        .global pm_machine_name, pm_src_names, pm_main_commit
        .global pm_src_commit, pm_src_commit2, pm_name_a, pm_name_b
        .global pm_setup_open, pm_chooser_open, pm_setup_row, pm_chooser_row
        .global pm_setup_edit6, pm_setup_draw6, pm_tick_hook
        .equ BANK_PTR, 0x46c82456
        .equ PART_OFF, 0x8ed80
pm_machine_name:
        move.l 4(%sp),%d0
        cmpi.l #5,%d0
        beq.s 1f
        jmp pm_name_replay
1:      lea pm_name(%pc),%a0
        move.l %a0,%d0
        rts
pm_src_names:
        .long 0x400b3eac,0x400b3e98,0x400b7c67,0x400b5413,0x400b7a63,pm_name
pm_row_type:
        lea -20(%sp),%sp
        movem.l %d1/%a0-%a1,8(%sp)
        move.l %d0,(%sp)
        move.l %a0,4(%sp)
        jsr pm_type
        movem.l 8(%sp),%d1/%a0-%a1
        lea 20(%sp),%sp
        rts
pm_main_commit:
        lea -32(%sp),%sp
        movem.l %d0-%d2/%a0-%a1,12(%sp)
        move.l %a1,%d2
        add.l %d0,%d2
        addi.l #PART_OFF,%d2
        move.l %d2,(%sp)
        move.l %d1,4(%sp)
        moveq #0,%d2
        cmpi.l #5,%d4
        bne.s 1f
        moveq #1,%d2
1:      move.l %d2,8(%sp)
        jsr pm_assign
        cmpi.l #5,%d4
        bne.s 2f
        move.l %d0,%d4
2:      movem.l 12(%sp),%d0-%d2/%a0-%a1
        lea 32(%sp),%sp
        jmp pm_main_replay
pm_src_commit:
        pea 0x4005a61c
        bra.s pm_src_common
pm_src_commit2:
        pea 0x4005a856
pm_src_common:
        move.l 0x460d5c30,%d1
        lea -32(%sp),%sp
        movem.l %d0/%d2-%d3/%a0-%a1,12(%sp)
        move.l %a1,%d3
        add.l %d0,%d3
        addi.l #PART_OFF,%d3
        move.l %d3,(%sp)
        move.l %d2,4(%sp)
        moveq #0,%d3
        cmpi.l #5,%d1
        bne.s 1f
        moveq #1,%d3
1:      move.l %d3,8(%sp)
        move.l %d1,%d3
        jsr pm_assign
        cmpi.l #5,%d3
        beq.s 2f
        move.l %d3,%d0
2:      move.l %d0,%d1
        movem.l 12(%sp),%d0/%d2-%d3/%a0-%a1
        lea 32(%sp),%sp
        rts
pm_setup_open:
        move.b (%a0),%d3
        move.l %d0,-(%sp)
        mvs.b %d3,%d0
        bsr pm_row_type
        move.l %d0,%d3
        move.l (%sp)+,%d0
        mvs.b %d3,%d4
        pea 0x400bb704
        jmp 0x400585e6
pm_chooser_open:
        mvs.b (%a0),%d0
        bsr pm_chooser_row_type
        move.l %d0,-(%sp)
        pea 0x460e7386
        jmp 0x40078890
pm_name_a:
        bsr pm_name_pick
        jmp 0x4003d722
pm_name_b:
        bsr pm_name_pick
        jmp 0x4004c374
pm_name_pick:
        bsr pm_row_type
        lea pm_src_names(%pc),%a0
        move.l (%a0,%d0.l*4),%d1
        rts
pm_setup_row:
        mvs.b (%a0),%d0
        lea 24(%sp),%sp
        bsr pm_row_type
        jmp 0x4003c986
pm_chooser_row:
        mvs.b (%a0),%d0
        bsr pm_chooser_row_type
        cmp.l %d0,%d2
        bne.s 1f
        jmp 0x400786ce
1:      jmp 0x400786fc
pm_chooser_row_type:
        lea -20(%sp),%sp
        movem.l %d1/%a0-%a1,8(%sp)
        move.l %d0,(%sp)
        move.l %a0,4(%sp)
        jsr pm_chooser_type
        movem.l 8(%sp),%d1/%a0-%a1
        lea 20(%sp),%sp
        rts
/* SRC SETUP on row five edits the real underlying pool's settings. */
pm_pool_kind:
        move.l %a0,-(%sp)
        move.l %d1,-(%sp)
        movea.l BANK_PTR,%a0
        mvz.b 0x100b14cf,%d1
        mulu.w #6322,%d1
        adda.l %d1,%a0
        mvz.b 0x100b14cc,%d1
        adda.l #0x8eda2,%a0
        mvz.b (%a0,%d1.l),%d0
        move.l (%sp)+,%d1
        move.l (%sp)+,%a0
        rts
pm_setup_edit6:
        cmpi.l #5,%d2
        bne.s 1f
        move.l %a3,%d0
        cmpi.l #4,%d0
        bne.s 2f
        jmp 0x4003a624
2:      bsr pm_pool_kind
        move.l %d0,%d2
1:      jmp pm_edit_replay
pm_setup_draw6:
        cmpi.l #5,%d6
        bne.s 1f
        move.l %d0,-(%sp)
        bsr pm_pool_kind
        move.l %d0,%d6
        move.l (%sp)+,%d0
1:      jmp pm_draw_replay
pm_tick_hook:
        jsr 0x4005213c
        jsr 0x4007e940
        jsr pm_ui_tick
        jmp 0x40052228
pm_name:
        .asciz "POLY"
        .balign 2
/* POLY browser entry delegates directly to the stock FLEX sample pool. */
        .global pm_pool_open, pm_stock_pool_open, pm_lipm_draw, pm_pool_title
pm_pool_open:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr pm_selected
        tst.l %d0
        beq.s .pool_stock
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        jmp pm_pool_choice_open
.pool_stock:
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
pm_stock_pool_open:
        move.l %a2,-(%sp)
        tst.l 0x460e70e0
        jmp 0x400791ec
pm_lipm_draw:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr pm_pool_choice_draw
        tst.l %d0
        beq.s .lipm_stock
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        rts
.lipm_stock:
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        lea -24(%sp),%sp
        movem.l %d2-%d3/%a2-%a5,(%sp)
        jmp 0x4006d78c
pm_pool_title:
        moveq #1,%d6
        cmpi.l #5,%d0
        bne.s .title_stock
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr pm_selected
        tst.l %d0
        beq.s .title_unsigned
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        bra.s .title_pool
.title_unsigned:
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
.title_stock:
        cmp.l %d0,%d6
        bcs.s .title_plain
.title_pool:
        jmp 0x40077b62
.title_plain:
        jmp 0x40077b70

.text
.balign 2
pm_name_replay:
.space 6
jmp 0x400334de
pm_main_replay:
.space 6
jmp 0x40079822
pm_edit_replay:
.space 8
jmp 0x4003a536
pm_draw_replay:
.space 8
jmp 0x4003cda0
