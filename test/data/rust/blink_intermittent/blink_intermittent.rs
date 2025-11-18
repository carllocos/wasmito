#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

extern {
    pub fn env_chip_pin_mode(pin:u8, mode:u8);
    pub fn env_chip_digital_write(pin: u8, value: u8);
    pub fn env_chip_delay(ms: u32);
}

fn pin_mode(pin: u8, mode: u8) {
    unsafe{
    env_chip_pin_mode(pin, mode);
    }
}

fn digital_write(pin: u8, value: u8) {
    unsafe{
    env_chip_digital_write(pin, value);
    }
}

pub fn delay(ms: u32) {
    unsafe{
    env_chip_delay(ms);
    }
}

#[no_mangle]
pub fn main(){
    const LED: u8 = 10;
    const OUTPUT: u8 = 2;
    const ON: u8 = 1;
    const OFF: u8 = 0;
    const SHORT_SLEEP: u32 = 500;
    const LONG_SLEEP: u32 = 3000;
    const MAX_SHORT_SLEEPS: u32 = 5;

    pin_mode(LED, OUTPUT);

    loop {
        for _i in 1..MAX_SHORT_SLEEPS {
            digital_write(LED, ON);
            delay(SHORT_SLEEP);
            digital_write(LED, OFF);
            delay(SHORT_SLEEP);
        }

        digital_write(LED, ON);
        delay(LONG_SLEEP);
    }
}
