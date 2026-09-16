(module
  ;; `$abs_early_return` exits through an explicit `return` on the taken
  ;; branch (n < 0), instead of falling through to the function's own
  ;; closing `end`. Used to check whether the VM still executes/visits
  ;; that trailing `end` instruction -- which is where `after` a
  ;; WASMFunction places its hook -- when a call takes the early-return
  ;; path rather than the natural fall-through path.
  (func $abs_early_return (export "abs_early_return") (param $n i32) (result i32)
    local.get $n
    i32.const 0
    i32.lt_s
    if
      i32.const 0
      local.get $n
      i32.sub
      return
    end
    local.get $n
  )

  ;; Calls `$abs_early_return` twice: once taking the early-`return` path
  ;; (n = -5) and once taking the natural fall-through path (n = 3).
  (func $main (export "main") (result i32)
    i32.const -5
    call $abs_early_return
    i32.const 3
    call $abs_early_return
    i32.add
  )
)
