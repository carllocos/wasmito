(module
 (type $0 (func (param i32 i32)))
 (type $1 (func (param i32)))
 (type $2 (func))
 (import "env" "chip_pin_mode" (func $assembly-blink-intermittent/blink_intermittent/_pin_mode (param i32 i32)))
 (import "env" "chip_digital_write" (func $assembly-blink-intermittent/blink_intermittent/_digital_write (param i32 i32)))
 (import "env" "chip_delay" (func $assembly-blink-intermittent/blink_intermittent/_delay (param i32)))
 (memory $0 0 2)
 (table $0 1 funcref)
 (elem $0 (i32.const 1))
 (export "_pin_mode" (func $assembly-blink-intermittent/blink_intermittent/_pin_mode))
 (export "_digital_write" (func $assembly-blink-intermittent/blink_intermittent/_digital_write))
 (export "_delay" (func $assembly-blink-intermittent/blink_intermittent/_delay))
 (export "pinMode" (func $assembly-blink-intermittent/blink_intermittent/pinMode))
 (export "delay" (func $assembly-blink-intermittent/blink_intermittent/delay))
 (export "digitalWrite" (func $assembly-blink-intermittent/blink_intermittent/digitalWrite))
 (export "main" (func $assembly-blink-intermittent/blink_intermittent/main))
 (export "memory" (memory $0))
 (export "table" (table $0))
 (func $assembly-blink-intermittent/blink_intermittent/pinMode (param $pin i32) (param $mode i32)
  ;;@ assembly-blink-intermittent/blink_intermittent.ts:6:4
  (call $assembly-blink-intermittent/blink_intermittent/_pin_mode
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:6:14
   (local.get $pin)
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:6:19
   (local.get $mode)
  )
 )
 (func $assembly-blink-intermittent/blink_intermittent/delay (param $ms i32)
  ;;@ assembly-blink-intermittent/blink_intermittent.ts:10:4
  (call $assembly-blink-intermittent/blink_intermittent/_delay
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:10:11
   (local.get $ms)
  )
 )
 (func $assembly-blink-intermittent/blink_intermittent/digitalWrite (param $pin i32) (param $value i32)
  ;;@ assembly-blink-intermittent/blink_intermittent.ts:14:4
  (call $assembly-blink-intermittent/blink_intermittent/_digital_write
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:14:19
   (local.get $pin)
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:14:24
   (local.get $value)
  )
 )
 (func $assembly-blink-intermittent/blink_intermittent/main
  (local $i i32)
  ;;@ assembly-blink-intermittent/blink_intermittent.ts:27:4
  (call $assembly-blink-intermittent/blink_intermittent/pinMode
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:27:12
   (i32.const 10)
   ;;@ assembly-blink-intermittent/blink_intermittent.ts:27:17
   (i32.const 2)
  )
  ;;@ assembly-blink-intermittent/blink_intermittent.ts:29:4
  (block $while-break|0
   (loop $while-continue|0
    (if
     ;;@ assembly-blink-intermittent/blink_intermittent.ts:29:11
     (i32.const 1)
     (then
      ;;@ assembly-blink-intermittent/blink_intermittent.ts:30:13
      (local.set $i
       ;;@ assembly-blink-intermittent/blink_intermittent.ts:30:26
       (i32.const 0)
      )
      (loop $for-loop|1
       (if
        ;;@ assembly-blink-intermittent/blink_intermittent.ts:30:29
        (i32.lt_u
         (local.get $i)
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:30:33
         (i32.const 5)
        )
        (then
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:31:12
         (call $assembly-blink-intermittent/blink_intermittent/digitalWrite
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:31:25
          (i32.const 10)
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:31:30
          (i32.const 1)
         )
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:32:12
         (call $assembly-blink-intermittent/blink_intermittent/delay
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:32:18
          (i32.const 500)
         )
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:33:12
         (call $assembly-blink-intermittent/blink_intermittent/digitalWrite
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:33:25
          (i32.const 10)
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:33:30
          (i32.const 0)
         )
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:34:12
         (call $assembly-blink-intermittent/blink_intermittent/delay
          ;;@ assembly-blink-intermittent/blink_intermittent.ts:34:18
          (i32.const 500)
         )
         ;;@ assembly-blink-intermittent/blink_intermittent.ts:30:51
         (local.set $i
          (i32.add
           (local.get $i)
           (i32.const 1)
          )
         )
         (br $for-loop|1)
        )
       )
      )
      ;;@ assembly-blink-intermittent/blink_intermittent.ts:37:8
      (call $assembly-blink-intermittent/blink_intermittent/digitalWrite
       ;;@ assembly-blink-intermittent/blink_intermittent.ts:37:21
       (i32.const 10)
       ;;@ assembly-blink-intermittent/blink_intermittent.ts:37:26
       (i32.const 1)
      )
      ;;@ assembly-blink-intermittent/blink_intermittent.ts:38:8
      (call $assembly-blink-intermittent/blink_intermittent/delay
       ;;@ assembly-blink-intermittent/blink_intermittent.ts:38:14
       (i32.const 3000)
      )
      (br $while-continue|0)
     )
    )
   )
   (unreachable)
  )
 )
)
