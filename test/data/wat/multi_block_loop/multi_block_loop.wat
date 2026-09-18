(module
  ;; Two functions, each with their own Block and Loop, used to check that
  ;; `WasmCode.Struct.Block`/`WasmCode.Struct.Loop` apply their hook to
  ;; every Block/Loop instruction across the whole module -- not just the
  ;; first one found -- the same way `WasmCode.Struct.Func` does for every
  ;; function.
  (func $count_up (export "count_up") (param $n i32) (result i32)
    (local $i i32)
    (local $sum i32)
    (block $b
      (loop $l
        local.get $sum
        local.get $i
        i32.add
        local.set $sum

        local.get $i
        i32.const 1
        i32.add
        local.set $i

        local.get $i
        local.get $n
        i32.lt_s
        br_if $l
      )
    )
    local.get $sum
  )

  (func $count_down (export "count_down") (param $n i32) (result i32)
    (local $i i32)
    (local $sum i32)
    local.get $n
    local.set $i
    (block $b
      (loop $l
        local.get $sum
        local.get $i
        i32.add
        local.set $sum

        local.get $i
        i32.const 1
        i32.sub
        local.set $i

        local.get $i
        i32.const 0
        i32.gt_s
        br_if $l
      )
    )
    local.get $sum
  )

  (func $main (export "main") (result i32)
    i32.const 3
    call $count_up
    i32.const 3
    call $count_down
    i32.add
  )
)
