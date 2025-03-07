#![no_std]
#![no_main]
use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

extern "C" {
    fn chip_delay(ms: u32);
    fn chip_digital_write(pin: u8, value: u8);
    fn chip_pin_mode(pin: u8, mode: u8);
}

fn pin_mode(pin: u8, mode: u8) {
    unsafe {
        chip_pin_mode(pin, mode);
    }
}

fn digital_write(pin: u8, value: u8) {
    unsafe {
        chip_digital_write(pin, value);
    }
}

fn delay(ms: u32) {
    unsafe {
        chip_delay(ms);
    }
}

#[no_mangle]
pub fn main() {
    const LED: u8 = 10;
    const ON: u8 = 1;
    const OFF: u8 = 0;
    const SLEEP: u32 = 1000;
    const OUTPUT: u8 = 2;

    pin_mode(LED, OUTPUT);

    loop {
        digital_write(LED, ON);
        delay(SLEEP);
        digital_write(LED, OFF);
        delay(SLEEP);
    }
}
