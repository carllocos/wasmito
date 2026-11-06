(module
  (global $g (mut i32) (i32.const 0))
  ;; 2 + 3 = 5
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )
  ;; side effect: g += 1, returns the new g
  (func $bump (result i32)
    global.get $g
    i32.const 1
    i32.add
    global.set $g
    global.get $g
  )
  ;; without any around: 5 + 1 + 100 + 7 = 113
  (func $main (export "main") (result i32)
    i32.const 2
    i32.const 3
    call $add
    call $bump
    i32.add
    block (result i32)
      i32.const 100
    end
    i32.add
    i32.const 7
    global.set $g
    global.get $g
    i32.add
  )
)
