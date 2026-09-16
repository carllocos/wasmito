(module
  (func $sum3 (export "sum3") (param $a i32) (param $b i32) (param $c i32) (result i32)
    (local $tmp i32)
    local.get $a
    local.get $b
    i32.add
    local.get $c
    i32.add
  )
  (func $main (export "main") (result i32)
    i32.const 1
    i32.const 2
    i32.const 3
    call $sum3
  )
)
