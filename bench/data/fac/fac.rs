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

#[no_mangle]
pub fn main() {
    loop {
        fac(5);
    }
}