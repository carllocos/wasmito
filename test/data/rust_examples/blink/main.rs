// A small blink led example meant to test the language agnosticity tool support for rust
// The example is unnecessarily complicated which is intentional just for the sake of testing
//
// to build rust programs for mcu the following compile line should do
// rustc -C link-self-contained=no \
// -C link-args=--no-entry -C link-args=-zstack-size=32768 \
// --target wasm32-unknown-unknown -g src/main.rs

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

fn pin_mode_lib(pin: u32, mode: u8) {
    unsafe{
    chip_pin_mode(pin, mode);
    }
}

fn digital_write_lib(pin: u32, value: u8) {
    unsafe{
    chip_digital_write(pin, value);
    }
}

pub fn delay_lib(ms: u32) {
    unsafe{
    chip_delay(ms);
    }
}

#[no_mangle]
pub fn main(){
    const LED: u32 = 10;
    const PAUSE: u32 = 1000;
    const OUTPUT: u8 = 2;
    const HIGH: u8 = 1;
    const LOW: u8 = 0;


    pin_mode_lib(LED, OUTPUT);
    let mut sleep_delta: u32 = 2;

    let increment_delta = | old_delta: u32|
        if old_delta > 3000{
            2
        }
        else {
            old_delta + 1
        };

    loop {
        sleep_delta = increment_delta(sleep_delta);
        digital_write_lib(LED, HIGH);
        delay_lib(PAUSE + sleep_delta);
        digital_write_lib(LED, LOW);
        delay_lib(PAUSE);
    }
}
