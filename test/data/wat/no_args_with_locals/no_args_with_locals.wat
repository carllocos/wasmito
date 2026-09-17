(module
  (func $answer (export "answer") (result i32)
    (local $tmp i32)
    i32.const 42
    local.set $tmp
    local.get $tmp
  )
  (func $main (export "main") (result i32)
    call $answer
  )
)
