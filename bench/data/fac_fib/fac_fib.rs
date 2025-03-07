#![no_std]
#![no_main]
use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

fn fac(n: u64) -> u64 {
    if n == 0 || n == 1 {
        1
    } else {
        n * fac(n - 1)
    }
}

fn fib(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fib(n - 1) + fib(n - 2),
    }
}

#[no_mangle]
pub fn main() {
    const FAC_ARG: u64 = 5;
    const FIB_ARG: u64 = 4;
    let mut counter: u64 = 0;

    while counter >= 0 {
        if counter > fac(FAC_ARG) {
            counter = 0;
        }
        else{
            fib(FIB_ARG);
            counter += 1;
        }
    }
}

