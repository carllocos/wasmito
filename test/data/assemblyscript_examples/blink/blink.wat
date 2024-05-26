(module
 (type $0 (func (param i32 i32)))
 (type $1 (func (param i32) (result i32)))
 (type $2 (func (param i32 i32 i32)))
 (type $3 (func (param i32 i32) (result i32)))
 (type $4 (func (param i32)))
 (type $5 (func (param i32 i32 i32 i32)))
 (type $6 (func))
 (type $7 (func (param i32 i32 i32) (result i32)))
 (type $8 (func (param i32 i32 i32 i32) (result i32)))
 (import "env" "chip_pin_mode" (func $blink/_pin_mode (param i32 i32)))
 (import "env" "chip_digital_write" (func $blink/_digital_write (param i32 i32)))
 (import "env" "chip_delay" (func $blink/_delay (param i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $blink/PinMode.INPUT i32 (i32.const 0))
 (global $blink/PinMode.OUTPUT i32 (i32.const 2))
 (global $blink/PinVoltage.LOW i32 (i32.const 0))
 (global $blink/PinVoltage.HIGH i32 (i32.const 1))
 (global $~lib/shared/runtime/Runtime.Stub i32 (i32.const 0))
 (global $~lib/shared/runtime/Runtime.Minimal i32 (i32.const 1))
 (global $~lib/shared/runtime/Runtime.Incremental i32 (i32.const 2))
 (global $~lib/rt/stub/startOffset (mut i32) (i32.const 0))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $~lib/native/ASC_SHRINK_LEVEL i32 (i32.const 0))
 (global $~lib/native/ASC_RUNTIME i32 (i32.const 0))
 (global $~lib/memory/__heap_base i32 (i32.const 364))
 (memory $0 1 2)
 (data $0 (i32.const 12) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00 \00\00\00d\00\00\00,\01\00\00\f4\01\00\00X\02\00\00\bc\02\00\00 \03\00\00\84\03\00\00\e8\03\00\00\00\00\00\00\00\00\00\00\00\00\00\00")
 (data $1 (i32.const 76) "<\00\00\00\00\00\00\00\00\00\00\00\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e\00\00\00\00\00")
 (data $2 (i32.const 140) "<\00\00\00\00\00\00\00\00\00\00\00\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00")
 (data $3 (i32.const 204) "<\00\00\00\00\00\00\00\00\00\00\00\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e\00\00\00\00\00\00\00\00\00")
 (data $4 (i32.const 268) ",\00\00\00\00\00\00\00\00\00\00\00\02\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s\00\00\00")
 (data $5 (i32.const 316) ",\00\00\00\00\00\00\00\00\00\00\00\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h\00")
 (table $0 1 funcref)
 (elem $0 (i32.const 1))
 (export "_pin_mode" (func $blink/_pin_mode))
 (export "_digital_write" (func $blink/_digital_write))
 (export "_delay" (func $blink/_delay))
 (export "PinMode.INPUT" (global $blink/PinMode.INPUT))
 (export "PinMode.OUTPUT" (global $blink/PinMode.OUTPUT))
 (export "PinVoltage.LOW" (global $blink/PinVoltage.LOW))
 (export "PinVoltage.HIGH" (global $blink/PinVoltage.HIGH))
 (export "pinMode" (func $blink/pinMode))
 (export "delay" (func $blink/delay))
 (export "digitalWrite" (func $blink/digitalWrite))
 (export "main" (func $blink/main))
 (export "memory" (memory $0))
 (export "table" (table $0))
 (start $~start)
 (func $blink/pinMode (param $pin i32) (param $mode i32)
  local.get $pin
  local.get $mode
  call $blink/_pin_mode
 )
 (func $blink/delay (param $ms i32)
  local.get $ms
  call $blink/_delay
 )
 (func $blink/digitalWrite (param $pin i32) (param $value i32)
  local.get $pin
  local.get $value
  call $blink/_digital_write
 )
 (func $~lib/rt/stub/maybeGrowMemory (param $newOffset i32)
  (local $pagesBefore i32)
  (local $maxOffset i32)
  (local $pagesNeeded i32)
  (local $4 i32)
  (local $5 i32)
  (local $pagesWanted i32)
  memory.size
  local.set $pagesBefore
  local.get $pagesBefore
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const 15
  i32.const -1
  i32.xor
  i32.and
  local.set $maxOffset
  local.get $newOffset
  local.get $maxOffset
  i32.gt_u
  if
   local.get $newOffset
   local.get $maxOffset
   i32.sub
   i32.const 65535
   i32.add
   i32.const 65535
   i32.const -1
   i32.xor
   i32.and
   i32.const 16
   i32.shr_u
   local.set $pagesNeeded
   local.get $pagesBefore
   local.tee $4
   local.get $pagesNeeded
   local.tee $5
   local.get $4
   local.get $5
   i32.gt_s
   select
   local.set $pagesWanted
   local.get $pagesWanted
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $pagesNeeded
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $newOffset
  global.set $~lib/rt/stub/offset
 )
 (func $~lib/rt/common/BLOCK#set:mmInfo (param $this i32) (param $mmInfo i32)
  local.get $this
  local.get $mmInfo
  i32.store
 )
 (func $~lib/rt/stub/__alloc (param $size i32) (result i32)
  (local $block i32)
  (local $ptr i32)
  (local $size|3 i32)
  (local $payloadSize i32)
  local.get $size
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 96
   i32.const 160
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.set $block
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.set $ptr
  block $~lib/rt/stub/computeSize|inlined.0 (result i32)
   local.get $size
   local.set $size|3
   local.get $size|3
   i32.const 4
   i32.add
   i32.const 15
   i32.add
   i32.const 15
   i32.const -1
   i32.xor
   i32.and
   i32.const 4
   i32.sub
   br $~lib/rt/stub/computeSize|inlined.0
  end
  local.set $payloadSize
  local.get $ptr
  local.get $payloadSize
  i32.add
  call $~lib/rt/stub/maybeGrowMemory
  local.get $block
  local.get $payloadSize
  call $~lib/rt/common/BLOCK#set:mmInfo
  local.get $ptr
  return
 )
 (func $~lib/rt/common/OBJECT#set:gcInfo (param $this i32) (param $gcInfo i32)
  local.get $this
  local.get $gcInfo
  i32.store offset=4
 )
 (func $~lib/rt/common/OBJECT#set:gcInfo2 (param $this i32) (param $gcInfo2 i32)
  local.get $this
  local.get $gcInfo2
  i32.store offset=8
 )
 (func $~lib/rt/common/OBJECT#set:rtId (param $this i32) (param $rtId i32)
  local.get $this
  local.get $rtId
  i32.store offset=12
 )
 (func $~lib/rt/common/OBJECT#set:rtSize (param $this i32) (param $rtSize i32)
  local.get $this
  local.get $rtSize
  i32.store offset=16
 )
 (func $~lib/rt/stub/__new (param $size i32) (param $id i32) (result i32)
  (local $ptr i32)
  (local $object i32)
  local.get $size
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 96
   i32.const 160
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  i32.const 16
  local.get $size
  i32.add
  call $~lib/rt/stub/__alloc
  local.set $ptr
  local.get $ptr
  i32.const 4
  i32.sub
  local.set $object
  local.get $object
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo
  local.get $object
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo2
  local.get $object
  local.get $id
  call $~lib/rt/common/OBJECT#set:rtId
  local.get $object
  local.get $size
  call $~lib/rt/common/OBJECT#set:rtSize
  local.get $ptr
  i32.const 16
  i32.add
  return
 )
 (func $~lib/util/memory/memcpy (param $dest i32) (param $src i32) (param $n i32)
  (local $w i32)
  (local $x i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  (local $14 i32)
  (local $15 i32)
  (local $16 i32)
  (local $17 i32)
  (local $18 i32)
  (local $19 i32)
  (local $20 i32)
  (local $21 i32)
  (local $22 i32)
  (local $23 i32)
  (local $24 i32)
  (local $25 i32)
  (local $26 i32)
  (local $27 i32)
  (local $28 i32)
  (local $29 i32)
  (local $30 i32)
  (local $31 i32)
  (local $32 i32)
  (local $33 i32)
  (local $34 i32)
  (local $35 i32)
  (local $36 i32)
  (local $37 i32)
  (local $38 i32)
  (local $39 i32)
  (local $40 i32)
  (local $41 i32)
  (local $42 i32)
  (local $43 i32)
  (local $44 i32)
  (local $45 i32)
  (local $46 i32)
  (local $47 i32)
  (local $48 i32)
  (local $49 i32)
  (local $50 i32)
  (local $51 i32)
  (local $52 i32)
  (local $53 i32)
  (local $54 i32)
  (local $55 i32)
  (local $56 i32)
  (local $57 i32)
  (local $58 i32)
  (local $59 i32)
  (local $60 i32)
  (local $61 i32)
  (local $62 i32)
  (local $63 i32)
  (local $64 i32)
  (local $65 i32)
  (local $66 i32)
  (local $67 i32)
  (local $68 i32)
  (local $69 i32)
  (local $70 i32)
  (local $71 i32)
  (local $72 i32)
  (local $73 i32)
  (local $74 i32)
  (local $75 i32)
  (local $76 i32)
  (local $77 i32)
  (local $78 i32)
  (local $79 i32)
  (local $80 i32)
  (local $81 i32)
  (local $82 i32)
  (local $83 i32)
  loop $while-continue|0
   local.get $n
   if (result i32)
    local.get $src
    i32.const 3
    i32.and
   else
    i32.const 0
   end
   if
    local.get $dest
    local.tee $5
    i32.const 1
    i32.add
    local.set $dest
    local.get $5
    local.get $src
    local.tee $6
    i32.const 1
    i32.add
    local.set $src
    local.get $6
    i32.load8_u
    i32.store8
    local.get $n
    i32.const 1
    i32.sub
    local.set $n
    br $while-continue|0
   end
  end
  local.get $dest
  i32.const 3
  i32.and
  i32.const 0
  i32.eq
  if
   loop $while-continue|1
    local.get $n
    i32.const 16
    i32.ge_u
    if
     local.get $dest
     local.get $src
     i32.load
     i32.store
     local.get $dest
     i32.const 4
     i32.add
     local.get $src
     i32.const 4
     i32.add
     i32.load
     i32.store
     local.get $dest
     i32.const 8
     i32.add
     local.get $src
     i32.const 8
     i32.add
     i32.load
     i32.store
     local.get $dest
     i32.const 12
     i32.add
     local.get $src
     i32.const 12
     i32.add
     i32.load
     i32.store
     local.get $src
     i32.const 16
     i32.add
     local.set $src
     local.get $dest
     i32.const 16
     i32.add
     local.set $dest
     local.get $n
     i32.const 16
     i32.sub
     local.set $n
     br $while-continue|1
    end
   end
   local.get $n
   i32.const 8
   i32.and
   if
    local.get $dest
    local.get $src
    i32.load
    i32.store
    local.get $dest
    i32.const 4
    i32.add
    local.get $src
    i32.const 4
    i32.add
    i32.load
    i32.store
    local.get $dest
    i32.const 8
    i32.add
    local.set $dest
    local.get $src
    i32.const 8
    i32.add
    local.set $src
   end
   local.get $n
   i32.const 4
   i32.and
   if
    local.get $dest
    local.get $src
    i32.load
    i32.store
    local.get $dest
    i32.const 4
    i32.add
    local.set $dest
    local.get $src
    i32.const 4
    i32.add
    local.set $src
   end
   local.get $n
   i32.const 2
   i32.and
   if
    local.get $dest
    local.get $src
    i32.load16_u
    i32.store16
    local.get $dest
    i32.const 2
    i32.add
    local.set $dest
    local.get $src
    i32.const 2
    i32.add
    local.set $src
   end
   local.get $n
   i32.const 1
   i32.and
   if
    local.get $dest
    local.tee $7
    i32.const 1
    i32.add
    local.set $dest
    local.get $7
    local.get $src
    local.tee $8
    i32.const 1
    i32.add
    local.set $src
    local.get $8
    i32.load8_u
    i32.store8
   end
   return
  end
  local.get $n
  i32.const 32
  i32.ge_u
  if
   block $break|2
    block $case2|2
     block $case1|2
      block $case0|2
       local.get $dest
       i32.const 3
       i32.and
       local.set $9
       local.get $9
       i32.const 1
       i32.eq
       br_if $case0|2
       local.get $9
       i32.const 2
       i32.eq
       br_if $case1|2
       local.get $9
       i32.const 3
       i32.eq
       br_if $case2|2
       br $break|2
      end
      local.get $src
      i32.load
      local.set $w
      local.get $dest
      local.tee $10
      i32.const 1
      i32.add
      local.set $dest
      local.get $10
      local.get $src
      local.tee $11
      i32.const 1
      i32.add
      local.set $src
      local.get $11
      i32.load8_u
      i32.store8
      local.get $dest
      local.tee $12
      i32.const 1
      i32.add
      local.set $dest
      local.get $12
      local.get $src
      local.tee $13
      i32.const 1
      i32.add
      local.set $src
      local.get $13
      i32.load8_u
      i32.store8
      local.get $dest
      local.tee $14
      i32.const 1
      i32.add
      local.set $dest
      local.get $14
      local.get $src
      local.tee $15
      i32.const 1
      i32.add
      local.set $src
      local.get $15
      i32.load8_u
      i32.store8
      local.get $n
      i32.const 3
      i32.sub
      local.set $n
      loop $while-continue|3
       local.get $n
       i32.const 17
       i32.ge_u
       if
        local.get $src
        i32.const 1
        i32.add
        i32.load
        local.set $x
        local.get $dest
        local.get $w
        i32.const 24
        i32.shr_u
        local.get $x
        i32.const 8
        i32.shl
        i32.or
        i32.store
        local.get $src
        i32.const 5
        i32.add
        i32.load
        local.set $w
        local.get $dest
        i32.const 4
        i32.add
        local.get $x
        i32.const 24
        i32.shr_u
        local.get $w
        i32.const 8
        i32.shl
        i32.or
        i32.store
        local.get $src
        i32.const 9
        i32.add
        i32.load
        local.set $x
        local.get $dest
        i32.const 8
        i32.add
        local.get $w
        i32.const 24
        i32.shr_u
        local.get $x
        i32.const 8
        i32.shl
        i32.or
        i32.store
        local.get $src
        i32.const 13
        i32.add
        i32.load
        local.set $w
        local.get $dest
        i32.const 12
        i32.add
        local.get $x
        i32.const 24
        i32.shr_u
        local.get $w
        i32.const 8
        i32.shl
        i32.or
        i32.store
        local.get $src
        i32.const 16
        i32.add
        local.set $src
        local.get $dest
        i32.const 16
        i32.add
        local.set $dest
        local.get $n
        i32.const 16
        i32.sub
        local.set $n
        br $while-continue|3
       end
      end
      br $break|2
     end
     local.get $src
     i32.load
     local.set $w
     local.get $dest
     local.tee $16
     i32.const 1
     i32.add
     local.set $dest
     local.get $16
     local.get $src
     local.tee $17
     i32.const 1
     i32.add
     local.set $src
     local.get $17
     i32.load8_u
     i32.store8
     local.get $dest
     local.tee $18
     i32.const 1
     i32.add
     local.set $dest
     local.get $18
     local.get $src
     local.tee $19
     i32.const 1
     i32.add
     local.set $src
     local.get $19
     i32.load8_u
     i32.store8
     local.get $n
     i32.const 2
     i32.sub
     local.set $n
     loop $while-continue|4
      local.get $n
      i32.const 18
      i32.ge_u
      if
       local.get $src
       i32.const 2
       i32.add
       i32.load
       local.set $x
       local.get $dest
       local.get $w
       i32.const 16
       i32.shr_u
       local.get $x
       i32.const 16
       i32.shl
       i32.or
       i32.store
       local.get $src
       i32.const 6
       i32.add
       i32.load
       local.set $w
       local.get $dest
       i32.const 4
       i32.add
       local.get $x
       i32.const 16
       i32.shr_u
       local.get $w
       i32.const 16
       i32.shl
       i32.or
       i32.store
       local.get $src
       i32.const 10
       i32.add
       i32.load
       local.set $x
       local.get $dest
       i32.const 8
       i32.add
       local.get $w
       i32.const 16
       i32.shr_u
       local.get $x
       i32.const 16
       i32.shl
       i32.or
       i32.store
       local.get $src
       i32.const 14
       i32.add
       i32.load
       local.set $w
       local.get $dest
       i32.const 12
       i32.add
       local.get $x
       i32.const 16
       i32.shr_u
       local.get $w
       i32.const 16
       i32.shl
       i32.or
       i32.store
       local.get $src
       i32.const 16
       i32.add
       local.set $src
       local.get $dest
       i32.const 16
       i32.add
       local.set $dest
       local.get $n
       i32.const 16
       i32.sub
       local.set $n
       br $while-continue|4
      end
     end
     br $break|2
    end
    local.get $src
    i32.load
    local.set $w
    local.get $dest
    local.tee $20
    i32.const 1
    i32.add
    local.set $dest
    local.get $20
    local.get $src
    local.tee $21
    i32.const 1
    i32.add
    local.set $src
    local.get $21
    i32.load8_u
    i32.store8
    local.get $n
    i32.const 1
    i32.sub
    local.set $n
    loop $while-continue|5
     local.get $n
     i32.const 19
     i32.ge_u
     if
      local.get $src
      i32.const 3
      i32.add
      i32.load
      local.set $x
      local.get $dest
      local.get $w
      i32.const 8
      i32.shr_u
      local.get $x
      i32.const 24
      i32.shl
      i32.or
      i32.store
      local.get $src
      i32.const 7
      i32.add
      i32.load
      local.set $w
      local.get $dest
      i32.const 4
      i32.add
      local.get $x
      i32.const 8
      i32.shr_u
      local.get $w
      i32.const 24
      i32.shl
      i32.or
      i32.store
      local.get $src
      i32.const 11
      i32.add
      i32.load
      local.set $x
      local.get $dest
      i32.const 8
      i32.add
      local.get $w
      i32.const 8
      i32.shr_u
      local.get $x
      i32.const 24
      i32.shl
      i32.or
      i32.store
      local.get $src
      i32.const 15
      i32.add
      i32.load
      local.set $w
      local.get $dest
      i32.const 12
      i32.add
      local.get $x
      i32.const 8
      i32.shr_u
      local.get $w
      i32.const 24
      i32.shl
      i32.or
      i32.store
      local.get $src
      i32.const 16
      i32.add
      local.set $src
      local.get $dest
      i32.const 16
      i32.add
      local.set $dest
      local.get $n
      i32.const 16
      i32.sub
      local.set $n
      br $while-continue|5
     end
    end
    br $break|2
   end
  end
  local.get $n
  i32.const 16
  i32.and
  if
   local.get $dest
   local.tee $22
   i32.const 1
   i32.add
   local.set $dest
   local.get $22
   local.get $src
   local.tee $23
   i32.const 1
   i32.add
   local.set $src
   local.get $23
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $24
   i32.const 1
   i32.add
   local.set $dest
   local.get $24
   local.get $src
   local.tee $25
   i32.const 1
   i32.add
   local.set $src
   local.get $25
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $26
   i32.const 1
   i32.add
   local.set $dest
   local.get $26
   local.get $src
   local.tee $27
   i32.const 1
   i32.add
   local.set $src
   local.get $27
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $28
   i32.const 1
   i32.add
   local.set $dest
   local.get $28
   local.get $src
   local.tee $29
   i32.const 1
   i32.add
   local.set $src
   local.get $29
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $30
   i32.const 1
   i32.add
   local.set $dest
   local.get $30
   local.get $src
   local.tee $31
   i32.const 1
   i32.add
   local.set $src
   local.get $31
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $32
   i32.const 1
   i32.add
   local.set $dest
   local.get $32
   local.get $src
   local.tee $33
   i32.const 1
   i32.add
   local.set $src
   local.get $33
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $34
   i32.const 1
   i32.add
   local.set $dest
   local.get $34
   local.get $src
   local.tee $35
   i32.const 1
   i32.add
   local.set $src
   local.get $35
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $36
   i32.const 1
   i32.add
   local.set $dest
   local.get $36
   local.get $src
   local.tee $37
   i32.const 1
   i32.add
   local.set $src
   local.get $37
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $38
   i32.const 1
   i32.add
   local.set $dest
   local.get $38
   local.get $src
   local.tee $39
   i32.const 1
   i32.add
   local.set $src
   local.get $39
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $40
   i32.const 1
   i32.add
   local.set $dest
   local.get $40
   local.get $src
   local.tee $41
   i32.const 1
   i32.add
   local.set $src
   local.get $41
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $42
   i32.const 1
   i32.add
   local.set $dest
   local.get $42
   local.get $src
   local.tee $43
   i32.const 1
   i32.add
   local.set $src
   local.get $43
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $44
   i32.const 1
   i32.add
   local.set $dest
   local.get $44
   local.get $src
   local.tee $45
   i32.const 1
   i32.add
   local.set $src
   local.get $45
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $46
   i32.const 1
   i32.add
   local.set $dest
   local.get $46
   local.get $src
   local.tee $47
   i32.const 1
   i32.add
   local.set $src
   local.get $47
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $48
   i32.const 1
   i32.add
   local.set $dest
   local.get $48
   local.get $src
   local.tee $49
   i32.const 1
   i32.add
   local.set $src
   local.get $49
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $50
   i32.const 1
   i32.add
   local.set $dest
   local.get $50
   local.get $src
   local.tee $51
   i32.const 1
   i32.add
   local.set $src
   local.get $51
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $52
   i32.const 1
   i32.add
   local.set $dest
   local.get $52
   local.get $src
   local.tee $53
   i32.const 1
   i32.add
   local.set $src
   local.get $53
   i32.load8_u
   i32.store8
  end
  local.get $n
  i32.const 8
  i32.and
  if
   local.get $dest
   local.tee $54
   i32.const 1
   i32.add
   local.set $dest
   local.get $54
   local.get $src
   local.tee $55
   i32.const 1
   i32.add
   local.set $src
   local.get $55
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $56
   i32.const 1
   i32.add
   local.set $dest
   local.get $56
   local.get $src
   local.tee $57
   i32.const 1
   i32.add
   local.set $src
   local.get $57
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $58
   i32.const 1
   i32.add
   local.set $dest
   local.get $58
   local.get $src
   local.tee $59
   i32.const 1
   i32.add
   local.set $src
   local.get $59
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $60
   i32.const 1
   i32.add
   local.set $dest
   local.get $60
   local.get $src
   local.tee $61
   i32.const 1
   i32.add
   local.set $src
   local.get $61
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $62
   i32.const 1
   i32.add
   local.set $dest
   local.get $62
   local.get $src
   local.tee $63
   i32.const 1
   i32.add
   local.set $src
   local.get $63
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $64
   i32.const 1
   i32.add
   local.set $dest
   local.get $64
   local.get $src
   local.tee $65
   i32.const 1
   i32.add
   local.set $src
   local.get $65
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $66
   i32.const 1
   i32.add
   local.set $dest
   local.get $66
   local.get $src
   local.tee $67
   i32.const 1
   i32.add
   local.set $src
   local.get $67
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $68
   i32.const 1
   i32.add
   local.set $dest
   local.get $68
   local.get $src
   local.tee $69
   i32.const 1
   i32.add
   local.set $src
   local.get $69
   i32.load8_u
   i32.store8
  end
  local.get $n
  i32.const 4
  i32.and
  if
   local.get $dest
   local.tee $70
   i32.const 1
   i32.add
   local.set $dest
   local.get $70
   local.get $src
   local.tee $71
   i32.const 1
   i32.add
   local.set $src
   local.get $71
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $72
   i32.const 1
   i32.add
   local.set $dest
   local.get $72
   local.get $src
   local.tee $73
   i32.const 1
   i32.add
   local.set $src
   local.get $73
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $74
   i32.const 1
   i32.add
   local.set $dest
   local.get $74
   local.get $src
   local.tee $75
   i32.const 1
   i32.add
   local.set $src
   local.get $75
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $76
   i32.const 1
   i32.add
   local.set $dest
   local.get $76
   local.get $src
   local.tee $77
   i32.const 1
   i32.add
   local.set $src
   local.get $77
   i32.load8_u
   i32.store8
  end
  local.get $n
  i32.const 2
  i32.and
  if
   local.get $dest
   local.tee $78
   i32.const 1
   i32.add
   local.set $dest
   local.get $78
   local.get $src
   local.tee $79
   i32.const 1
   i32.add
   local.set $src
   local.get $79
   i32.load8_u
   i32.store8
   local.get $dest
   local.tee $80
   i32.const 1
   i32.add
   local.set $dest
   local.get $80
   local.get $src
   local.tee $81
   i32.const 1
   i32.add
   local.set $src
   local.get $81
   i32.load8_u
   i32.store8
  end
  local.get $n
  i32.const 1
  i32.and
  if
   local.get $dest
   local.tee $82
   i32.const 1
   i32.add
   local.set $dest
   local.get $82
   local.get $src
   local.tee $83
   i32.const 1
   i32.add
   local.set $src
   local.get $83
   i32.load8_u
   i32.store8
  end
 )
 (func $~lib/memory/memory.copy (param $dst i32) (param $src i32) (param $n i32)
  (local $dest i32)
  (local $src|4 i32)
  (local $n|5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  block $~lib/util/memory/memmove|inlined.0
   local.get $dst
   local.set $dest
   local.get $src
   local.set $src|4
   local.get $n
   local.set $n|5
   local.get $dest
   local.get $src|4
   i32.eq
   if
    br $~lib/util/memory/memmove|inlined.0
   end
   i32.const 0
   i32.const 1
   i32.lt_s
   drop
   local.get $src|4
   local.get $dest
   i32.sub
   local.get $n|5
   i32.sub
   i32.const 0
   local.get $n|5
   i32.const 1
   i32.shl
   i32.sub
   i32.le_u
   if
    local.get $dest
    local.get $src|4
    local.get $n|5
    call $~lib/util/memory/memcpy
    br $~lib/util/memory/memmove|inlined.0
   end
   local.get $dest
   local.get $src|4
   i32.lt_u
   if
    i32.const 0
    i32.const 2
    i32.lt_s
    drop
    local.get $src|4
    i32.const 7
    i32.and
    local.get $dest
    i32.const 7
    i32.and
    i32.eq
    if
     loop $while-continue|0
      local.get $dest
      i32.const 7
      i32.and
      if
       local.get $n|5
       i32.eqz
       if
        br $~lib/util/memory/memmove|inlined.0
       end
       local.get $n|5
       i32.const 1
       i32.sub
       local.set $n|5
       local.get $dest
       local.tee $6
       i32.const 1
       i32.add
       local.set $dest
       local.get $6
       local.get $src|4
       local.tee $7
       i32.const 1
       i32.add
       local.set $src|4
       local.get $7
       i32.load8_u
       i32.store8
       br $while-continue|0
      end
     end
     loop $while-continue|1
      local.get $n|5
      i32.const 8
      i32.ge_u
      if
       local.get $dest
       local.get $src|4
       i64.load
       i64.store
       local.get $n|5
       i32.const 8
       i32.sub
       local.set $n|5
       local.get $dest
       i32.const 8
       i32.add
       local.set $dest
       local.get $src|4
       i32.const 8
       i32.add
       local.set $src|4
       br $while-continue|1
      end
     end
    end
    loop $while-continue|2
     local.get $n|5
     if
      local.get $dest
      local.tee $8
      i32.const 1
      i32.add
      local.set $dest
      local.get $8
      local.get $src|4
      local.tee $9
      i32.const 1
      i32.add
      local.set $src|4
      local.get $9
      i32.load8_u
      i32.store8
      local.get $n|5
      i32.const 1
      i32.sub
      local.set $n|5
      br $while-continue|2
     end
    end
   else
    i32.const 0
    i32.const 2
    i32.lt_s
    drop
    local.get $src|4
    i32.const 7
    i32.and
    local.get $dest
    i32.const 7
    i32.and
    i32.eq
    if
     loop $while-continue|3
      local.get $dest
      local.get $n|5
      i32.add
      i32.const 7
      i32.and
      if
       local.get $n|5
       i32.eqz
       if
        br $~lib/util/memory/memmove|inlined.0
       end
       local.get $dest
       local.get $n|5
       i32.const 1
       i32.sub
       local.tee $n|5
       i32.add
       local.get $src|4
       local.get $n|5
       i32.add
       i32.load8_u
       i32.store8
       br $while-continue|3
      end
     end
     loop $while-continue|4
      local.get $n|5
      i32.const 8
      i32.ge_u
      if
       local.get $n|5
       i32.const 8
       i32.sub
       local.set $n|5
       local.get $dest
       local.get $n|5
       i32.add
       local.get $src|4
       local.get $n|5
       i32.add
       i64.load
       i64.store
       br $while-continue|4
      end
     end
    end
    loop $while-continue|5
     local.get $n|5
     if
      local.get $dest
      local.get $n|5
      i32.const 1
      i32.sub
      local.tee $n|5
      i32.add
      local.get $src|4
      local.get $n|5
      i32.add
      i32.load8_u
      i32.store8
      br $while-continue|5
     end
    end
   end
  end
 )
 (func $~lib/rt/__newBuffer (param $size i32) (param $id i32) (param $data i32) (result i32)
  (local $buffer i32)
  local.get $size
  local.get $id
  call $~lib/rt/stub/__new
  local.set $buffer
  local.get $data
  if
   local.get $buffer
   local.get $data
   local.get $size
   call $~lib/memory/memory.copy
  end
  local.get $buffer
  return
 )
 (func $~lib/rt/stub/__link (param $parentPtr i32) (param $childPtr i32) (param $expectMultiple i32)
 )
 (func $~lib/rt/__newArray (param $length i32) (param $alignLog2 i32) (param $id i32) (param $data i32) (result i32)
  (local $bufferSize i32)
  (local $buffer i32)
  (local $array i32)
  local.get $length
  local.get $alignLog2
  i32.shl
  local.set $bufferSize
  local.get $bufferSize
  i32.const 1
  local.get $data
  call $~lib/rt/__newBuffer
  local.set $buffer
  i32.const 16
  local.get $id
  call $~lib/rt/stub/__new
  local.set $array
  local.get $array
  local.get $buffer
  i32.store
  local.get $array
  local.get $buffer
  i32.const 0
  call $~lib/rt/stub/__link
  local.get $array
  local.get $buffer
  i32.store offset=4
  local.get $array
  local.get $bufferSize
  i32.store offset=8
  local.get $array
  local.get $length
  i32.store offset=12
  local.get $array
  return
 )
 (func $~lib/array/Array<u32>#get:length_ (param $this i32) (result i32)
  local.get $this
  i32.load offset=12
 )
 (func $~lib/array/Array<u32>#get:length (param $this i32) (result i32)
  local.get $this
  call $~lib/array/Array<u32>#get:length_
  return
 )
 (func $~lib/array/Array<u32>#get:dataStart (param $this i32) (result i32)
  local.get $this
  i32.load offset=4
 )
 (func $~lib/array/Array<u32>#__get (param $this i32) (param $index i32) (result i32)
  (local $value i32)
  local.get $index
  local.get $this
  call $~lib/array/Array<u32>#get:length_
  i32.ge_u
  if
   i32.const 224
   i32.const 288
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  local.get $this
  call $~lib/array/Array<u32>#get:dataStart
  local.get $index
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $value
  i32.const 0
  drop
  local.get $value
  return
 )
 (func $blink/newTime (param $oldTime i32) (result i32)
  local.get $oldTime
  i32.const 5000
  i32.gt_u
  if
   local.get $oldTime
   return
  else
   local.get $oldTime
   i32.const 2
   i32.mul
   return
  end
  unreachable
 )
 (func $~lib/arraybuffer/ArrayBufferView#get:byteLength (param $this i32) (result i32)
  local.get $this
  i32.load offset=8
 )
 (func $~lib/arraybuffer/ArrayBufferView#get:buffer (param $this i32) (result i32)
  local.get $this
  i32.load
 )
 (func $~lib/rt/common/BLOCK#get:mmInfo (param $this i32) (result i32)
  local.get $this
  i32.load
 )
 (func $~lib/rt/stub/__realloc (param $ptr i32) (param $size i32) (result i32)
  (local $block i32)
  (local $actualSize i32)
  (local $isLast i32)
  (local $size|5 i32)
  (local $payloadSize i32)
  (local $7 i32)
  (local $8 i32)
  (local $newPtr i32)
  local.get $ptr
  i32.const 0
  i32.ne
  if (result i32)
   local.get $ptr
   i32.const 15
   i32.and
   i32.eqz
  else
   i32.const 0
  end
  i32.eqz
  if
   i32.const 0
   i32.const 160
   i32.const 45
   i32.const 3
   call $~lib/builtins/abort
   unreachable
  end
  local.get $ptr
  i32.const 4
  i32.sub
  local.set $block
  local.get $block
  call $~lib/rt/common/BLOCK#get:mmInfo
  local.set $actualSize
  local.get $ptr
  local.get $actualSize
  i32.add
  global.get $~lib/rt/stub/offset
  i32.eq
  local.set $isLast
  block $~lib/rt/stub/computeSize|inlined.1 (result i32)
   local.get $size
   local.set $size|5
   local.get $size|5
   i32.const 4
   i32.add
   i32.const 15
   i32.add
   i32.const 15
   i32.const -1
   i32.xor
   i32.and
   i32.const 4
   i32.sub
   br $~lib/rt/stub/computeSize|inlined.1
  end
  local.set $payloadSize
  local.get $size
  local.get $actualSize
  i32.gt_u
  if
   local.get $isLast
   if
    local.get $size
    i32.const 1073741820
    i32.gt_u
    if
     i32.const 96
     i32.const 160
     i32.const 52
     i32.const 33
     call $~lib/builtins/abort
     unreachable
    end
    local.get $ptr
    local.get $payloadSize
    i32.add
    call $~lib/rt/stub/maybeGrowMemory
    local.get $block
    local.get $payloadSize
    call $~lib/rt/common/BLOCK#set:mmInfo
   else
    local.get $payloadSize
    local.tee $7
    local.get $actualSize
    i32.const 1
    i32.shl
    local.tee $8
    local.get $7
    local.get $8
    i32.gt_u
    select
    call $~lib/rt/stub/__alloc
    local.set $newPtr
    local.get $newPtr
    local.get $ptr
    local.get $actualSize
    call $~lib/memory/memory.copy
    local.get $newPtr
    local.tee $ptr
    i32.const 4
    i32.sub
    local.set $block
   end
  else
   local.get $isLast
   if
    local.get $ptr
    local.get $payloadSize
    i32.add
    global.set $~lib/rt/stub/offset
    local.get $block
    local.get $payloadSize
    call $~lib/rt/common/BLOCK#set:mmInfo
   end
  end
  local.get $ptr
  return
 )
 (func $~lib/rt/stub/__renew (param $oldPtr i32) (param $size i32) (result i32)
  (local $newPtr i32)
  local.get $size
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 96
   i32.const 160
   i32.const 99
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $oldPtr
  i32.const 16
  i32.sub
  i32.const 16
  local.get $size
  i32.add
  call $~lib/rt/stub/__realloc
  local.set $newPtr
  local.get $newPtr
  i32.const 4
  i32.sub
  local.get $size
  call $~lib/rt/common/OBJECT#set:rtSize
  local.get $newPtr
  i32.const 16
  i32.add
  return
 )
 (func $~lib/memory/memory.fill (param $dst i32) (param $c i32) (param $n i32)
  (local $dest i32)
  (local $c|4 i32)
  (local $n|5 i32)
  (local $dend i32)
  (local $k i32)
  (local $c32 i32)
  (local $c64 i64)
  block $~lib/util/memory/memset|inlined.0
   local.get $dst
   local.set $dest
   local.get $c
   local.set $c|4
   local.get $n
   local.set $n|5
   i32.const 0
   i32.const 1
   i32.gt_s
   drop
   local.get $n|5
   i32.eqz
   if
    br $~lib/util/memory/memset|inlined.0
   end
   local.get $dest
   local.get $n|5
   i32.add
   local.set $dend
   local.get $dest
   local.get $c|4
   i32.store8
   local.get $dend
   i32.const 1
   i32.sub
   local.get $c|4
   i32.store8
   local.get $n|5
   i32.const 2
   i32.le_u
   if
    br $~lib/util/memory/memset|inlined.0
   end
   local.get $dest
   local.get $c|4
   i32.store8 offset=1
   local.get $dest
   local.get $c|4
   i32.store8 offset=2
   local.get $dend
   i32.const 2
   i32.sub
   local.get $c|4
   i32.store8
   local.get $dend
   i32.const 3
   i32.sub
   local.get $c|4
   i32.store8
   local.get $n|5
   i32.const 6
   i32.le_u
   if
    br $~lib/util/memory/memset|inlined.0
   end
   local.get $dest
   local.get $c|4
   i32.store8 offset=3
   local.get $dend
   i32.const 4
   i32.sub
   local.get $c|4
   i32.store8
   local.get $n|5
   i32.const 8
   i32.le_u
   if
    br $~lib/util/memory/memset|inlined.0
   end
   i32.const 0
   local.get $dest
   i32.sub
   i32.const 3
   i32.and
   local.set $k
   local.get $dest
   local.get $k
   i32.add
   local.set $dest
   local.get $n|5
   local.get $k
   i32.sub
   local.set $n|5
   local.get $n|5
   i32.const -4
   i32.and
   local.set $n|5
   i32.const -1
   i32.const 255
   i32.div_u
   local.get $c|4
   i32.const 255
   i32.and
   i32.mul
   local.set $c32
   local.get $dest
   local.get $n|5
   i32.add
   local.set $dend
   local.get $dest
   local.get $c32
   i32.store
   local.get $dend
   i32.const 4
   i32.sub
   local.get $c32
   i32.store
   local.get $n|5
   i32.const 8
   i32.le_u
   if
    br $~lib/util/memory/memset|inlined.0
   end
   local.get $dest
   local.get $c32
   i32.store offset=4
   local.get $dest
   local.get $c32
   i32.store offset=8
   local.get $dend
   i32.const 12
   i32.sub
   local.get $c32
   i32.store
   local.get $dend
   i32.const 8
   i32.sub
   local.get $c32
   i32.store
   local.get $n|5
   i32.const 24
   i32.le_u
   if
    br $~lib/util/memory/memset|inlined.0
   end
   local.get $dest
   local.get $c32
   i32.store offset=12
   local.get $dest
   local.get $c32
   i32.store offset=16
   local.get $dest
   local.get $c32
   i32.store offset=20
   local.get $dest
   local.get $c32
   i32.store offset=24
   local.get $dend
   i32.const 28
   i32.sub
   local.get $c32
   i32.store
   local.get $dend
   i32.const 24
   i32.sub
   local.get $c32
   i32.store
   local.get $dend
   i32.const 20
   i32.sub
   local.get $c32
   i32.store
   local.get $dend
   i32.const 16
   i32.sub
   local.get $c32
   i32.store
   i32.const 24
   local.get $dest
   i32.const 4
   i32.and
   i32.add
   local.set $k
   local.get $dest
   local.get $k
   i32.add
   local.set $dest
   local.get $n|5
   local.get $k
   i32.sub
   local.set $n|5
   local.get $c32
   i64.extend_i32_u
   local.get $c32
   i64.extend_i32_u
   i64.const 32
   i64.shl
   i64.or
   local.set $c64
   loop $while-continue|0
    local.get $n|5
    i32.const 32
    i32.ge_u
    if
     local.get $dest
     local.get $c64
     i64.store
     local.get $dest
     local.get $c64
     i64.store offset=8
     local.get $dest
     local.get $c64
     i64.store offset=16
     local.get $dest
     local.get $c64
     i64.store offset=24
     local.get $n|5
     i32.const 32
     i32.sub
     local.set $n|5
     local.get $dest
     i32.const 32
     i32.add
     local.set $dest
     br $while-continue|0
    end
   end
  end
 )
 (func $~lib/array/ensureCapacity (param $array i32) (param $newSize i32) (param $alignLog2 i32) (param $canGrow i32)
  (local $oldCapacity i32)
  (local $oldData i32)
  (local $6 i32)
  (local $7 i32)
  (local $newCapacity i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $newData i32)
  local.get $array
  call $~lib/arraybuffer/ArrayBufferView#get:byteLength
  local.set $oldCapacity
  local.get $newSize
  local.get $oldCapacity
  local.get $alignLog2
  i32.shr_u
  i32.gt_u
  if
   local.get $newSize
   i32.const 1073741820
   local.get $alignLog2
   i32.shr_u
   i32.gt_u
   if
    i32.const 336
    i32.const 288
    i32.const 19
    i32.const 48
    call $~lib/builtins/abort
    unreachable
   end
   local.get $array
   call $~lib/arraybuffer/ArrayBufferView#get:buffer
   local.set $oldData
   local.get $newSize
   local.tee $6
   i32.const 8
   local.tee $7
   local.get $6
   local.get $7
   i32.gt_u
   select
   local.get $alignLog2
   i32.shl
   local.set $newCapacity
   local.get $canGrow
   if
    local.get $oldCapacity
    i32.const 1
    i32.shl
    local.tee $9
    i32.const 1073741820
    local.tee $10
    local.get $9
    local.get $10
    i32.lt_u
    select
    local.tee $11
    local.get $newCapacity
    local.tee $12
    local.get $11
    local.get $12
    i32.gt_u
    select
    local.set $newCapacity
   end
   local.get $oldData
   local.get $newCapacity
   call $~lib/rt/stub/__renew
   local.set $newData
   i32.const 0
   global.get $~lib/shared/runtime/Runtime.Incremental
   i32.ne
   drop
   local.get $newData
   local.get $oldCapacity
   i32.add
   i32.const 0
   local.get $newCapacity
   local.get $oldCapacity
   i32.sub
   call $~lib/memory/memory.fill
   local.get $newData
   local.get $oldData
   i32.ne
   if
    local.get $array
    local.get $newData
    i32.store
    local.get $array
    local.get $newData
    i32.store offset=4
    local.get $array
    local.get $newData
    i32.const 0
    call $~lib/rt/stub/__link
   end
   local.get $array
   local.get $newCapacity
   i32.store offset=8
  end
 )
 (func $~lib/array/Array<u32>#set:length_ (param $this i32) (param $length_ i32)
  local.get $this
  local.get $length_
  i32.store offset=12
 )
 (func $~lib/array/Array<u32>#__set (param $this i32) (param $index i32) (param $value i32)
  local.get $index
  local.get $this
  call $~lib/array/Array<u32>#get:length_
  i32.ge_u
  if
   local.get $index
   i32.const 0
   i32.lt_s
   if
    i32.const 224
    i32.const 288
    i32.const 130
    i32.const 22
    call $~lib/builtins/abort
    unreachable
   end
   local.get $this
   local.get $index
   i32.const 1
   i32.add
   i32.const 2
   i32.const 1
   call $~lib/array/ensureCapacity
   local.get $this
   local.get $index
   i32.const 1
   i32.add
   call $~lib/array/Array<u32>#set:length_
  end
  local.get $this
  call $~lib/array/Array<u32>#get:dataStart
  local.get $index
  i32.const 2
  i32.shl
  i32.add
  local.get $value
  i32.store
  i32.const 0
  drop
 )
 (func $blink/main
  (local $0 i32)
  (local $1 i32)
  (local $pauseTimes i32)
  (local $i i32)
  (local $pause i32)
  i32.const 8
  i32.const 2
  i32.const 4
  i32.const 32
  call $~lib/rt/__newArray
  local.set $pauseTimes
  i32.const 10
  global.get $blink/PinMode.OUTPUT
  call $blink/pinMode
  loop $while-continue|0
   i32.const 1
   if
    i32.const 0
    local.set $i
    loop $for-loop|1
     local.get $i
     local.get $pauseTimes
     call $~lib/array/Array<u32>#get:length
     i32.lt_s
     if
      local.get $pauseTimes
      local.get $i
      call $~lib/array/Array<u32>#__get
      local.set $pause
      i32.const 10
      global.get $blink/PinVoltage.HIGH
      call $blink/digitalWrite
      local.get $pause
      call $blink/delay
      i32.const 10
      global.get $blink/PinVoltage.LOW
      call $blink/digitalWrite
      local.get $pauseTimes
      local.get $i
      local.get $pause
      call $blink/newTime
      call $~lib/array/Array<u32>#__set
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      br $for-loop|1
     end
    end
    br $while-continue|0
   end
  end
  unreachable
 )
 (func $~start
  global.get $~lib/memory/__heap_base
  i32.const 4
  i32.add
  i32.const 15
  i32.add
  i32.const 15
  i32.const -1
  i32.xor
  i32.and
  i32.const 4
  i32.sub
  global.set $~lib/rt/stub/startOffset
  global.get $~lib/rt/stub/startOffset
  global.set $~lib/rt/stub/offset
 )
)
