(module
  ;; `$loopy`'s very first top-level body instruction is a bare `loop`
  ;; (not wrapped in an outer block). Used to confirm that hooking `before`
  ;; this WASMFunction pins the hook to the loop's own opcode address
  ;; instead of being redirected to the loop's first sub-instruction, the
  ;; way a direct `before` hook on that same Loop instruction would be.
  (func $loopy (export "loopy") (param $n i32) (result i32)
    (local $i i32)
    (local $sum i32)
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
    local.get $sum
  )

  (func $main (export "main") (result i32)
    i32.const 5
    call $loopy
  )
)
