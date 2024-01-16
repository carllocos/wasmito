
(module
  (type $i32->i32->void (func (param i32 i32)))
  (type $t1 (func (param i32) (result i32)))
  (type $t2 (func (param i32 i32 i32)))
  (type $callback (func (param i32 i32 i32 i32 i32)))
  (type $void->void (func))
  (type $i32->void (func (param i32)))

  (import "env" "chip_delay" (func $env.chip_delay (type $i32->void)))
  (import "env" "chip_pin_mode" (func $env.chip_pin_mode (type $i32->i32->void)))
  (import "env" "subscribe_interrupt" (func $env.subscribe_interrupt (type $t2)))
  (import "env" "chip_analog_write" (func $env.chip_analog_write (type $i32->i32->void)))

  (global $led i32 (i32.const 10))
  (global $up i32 (i32.const 39))
  (global $down i32 (i32.const 37))

  (global $delta (mut i32) (i32.const -127))

  (global $sleep_time i32 (i32.const 100))

  (func $decrease_delta (type $callback)
    i32.const -127
    global.set $delta)

  (func $increase_delta (type $callback)
    i32.const 127
    global.set $delta)

  (func $hardware_setup (type $void->void)
    (local $inputPullUp i32)
    i32.const 5
    local.set $inputPullUp

    ;; setup buttons
    global.get $up
    local.get $inputPullUp
    call $env.chip_pin_mode

    global.get $up
    i32.const 1 ;; table idx
    i32.const 2
    call $env.subscribe_interrupt

    global.get $down
    local.get $inputPullUp
    call $env.chip_pin_mode

    global.get $down
    i32.const 0 ;; table idx
    i32.const 2
    call $env.subscribe_interrupt)

  (func $update_led (type $i32->void)
      global.get $led
      local.get 0 ;; take argument
      drop
      drop)

  (func $main (type $void->void)
    (local $brightness i32)

    call $hardware_setup

    i32.const 127
    local.set $brightness

    loop $L0

      ;; brightness = brightness + delta
      local.get $brightness
      global.get $delta
      i32.add
      local.set $brightness

      ;; if brightness > 254 => brightness = 254
      (if (i32.gt_s (local.get $brightness) (i32.const 254))
        (then
          i32.const 254
          local.set $brightness))

      ;; if brightness < 0 => brightness = 0
      (if (i32.lt_s (local.get $brightness) (i32.const 0))
        (then
          i32.const 0
          local.set $brightness))

      local.get $brightness
      call $update_led
      
      ;; resetting delta
      i32.const 0
      global.set $delta
      
      global.get $sleep_time
      call $env.chip_delay
      br $L0
    end)

  (table 2 funcref)
  (memory $memory 1)

  (export "memory" (memory $memory))
  (export "main" (func $main))
  (export "decrease_delta" (func $decrease_delta))
  (export "increase_delta" (func $increase_delta))
  (export "hardware_setup" (func $hardware_setup))
  (export "update_led" (func $update_led))
  (elem (i32.const 0) func $decrease_delta)
  (elem (i32.const 1) func $increase_delta))