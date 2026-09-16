(module
  ;; A small, terminating program exercising a Block wrapping a Loop,
  ;; followed by an If/Else. Used to test hooking `after` a Loop, Block
  ;; and If, i.e. after their matching `end` instruction.
  ;;
  ;; The loop is written test-at-the-bottom (a `do { } while (cond)` shape):
  ;; the back-edge is a conditional `br_if $l` on the loop's own body, and
  ;; the loop is exited by letting that branch fall through. This keeps the
  ;; loop's own `end` instruction on a reachable code path -- unlike a
  ;; `loop { ...; br_if $exit; ...; br $l }` shape (test-at-the-top, wrapped
  ;; in an outer block used only as the exit target), where the loop's own
  ;; `end` is unreachable: the outer `br_if $exit` jumps straight past it to
  ;; the enclosing block's `end` and the trailing `br $l` never falls
  ;; through either.
  (func $main (export "main") (result i32)
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
        i32.const 5
        i32.lt_s
        br_if $l
      )
    )

    (if (result i32) (i32.gt_s (local.get $sum) (i32.const 0))
      (then (local.get $sum))
      (else (i32.const -1))
    )
  )

  ;; Never called from `main`; only present so a Wasm module fixture is
  ;; available with an If that has no alternative (else) branch.
  (func $if_no_else
    (local $x i32)
    (if (i32.eqz (local.get $x))
      (then (nop))
    )
  )
)
