(module
  (import "env" "chip_delay"
    (func $chip_delay (param i32)))
  (import "env" "chip_pin_mode"
    (func $chip_pin_mode (param i32 i32)))
  (import "env" "chip_digital_write"
    (func $chip_digital_write (param i32 i32)))
  (import "env" "subscribe_interrupt"
    (func $subscribe_interrupt (param i32 i32 i32)))

  (global $ledOn (mut i32) (i32.const 0))
  (global $btn i32 (i32.const 37))
  (global $led i32 (i32.const 10))
  (global $output i32 (i32.const 2))
  (global $pullup i32 (i32.const 5))
  (global $change i32 (i32.const 1))



  (func $setupHardware
    global.get $led
    global.get $output
    call $chip_pin_mode

    global.get $btn
    global.get $pullup
    call $chip_pin_mode

    global.get $btn
    i32.const 0 ;; table idx of $toggleLed
    global.get $change
    call $subscribe_interrupt
  )

  (func $toggleLed
    (param i32 i32 i32 i32 i32)

    global.get $ledOn
    i32.eqz
    global.set $ledOn

    global.get $led
    global.get $ledOn
    call $chip_digital_write
  )

  (func $main
    call $setupHardware

    (loop $forever
      i32.const 1000
      call $chip_delay
      br $forever
    )
  )

  (memory $memory 1)
  (table 2 funcref)
  (elem (i32.const 0) $toggleLed)
  (export "main" (func $main))
)