#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

extern {
    pub fn chip_pin_mode(pin:u32, mode:u8);
    pub fn chip_digital_write(pin: u32, value: u8);
    pub fn chip_delay(ms: u32);
}

fn pin_mode(pin: u32, mode: u8) {
    unsafe{
    chip_pin_mode(pin, mode);
    }
}

fn digital_write(pin: u32, value: u8) {
    unsafe{
    chip_digital_write(pin, value);
    }
}

pub fn delay(ms: u32) {
    unsafe{
    chip_delay(ms);
    }
}

fn fac(n: u64) -> u64 {
    if n == 0 || n == 1 {
        1
    } else {
        n * fac(n - 1)
    }
}

fn fac_while(mut n: u64) -> u64 {
    let mut result = 1;

    while n > 1 {
        result *= n;
        n -= 1;
    }

    result
}

#[no_mangle]
pub fn main(){
    const LED: u32 = 10;
    const PAUSE: u32 = 1000;
    const OUTPUT: u8 = 2;
    const HIGH: u8 = 1;
    const LOW: u8 = 0;

    pin_mode(LED, OUTPUT);
    loop {
        digital_write(LED, HIGH);
        fac(5);
        fac_while(5);
        delay(PAUSE);
        digital_write(LED, LOW);
        delay(PAUSE);
    }
}
