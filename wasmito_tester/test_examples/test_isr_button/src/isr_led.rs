#![no_std]
#![no_main]

use core::panic::PanicInfo;
mod warduino;
use warduino as env;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

const LED: u8 = 10;
static mut LED_STATE: u8 = env::HIGH;

pub fn toggleLed(_a1: u32, _a2: u32, _a3: u32, _a4: u32, _a5: u32) {
    unsafe {
        if LED_STATE == env::HIGH {
            LED_STATE = env::LOW;
            env::serial_print_string("Off\n");
        } else {
            LED_STATE = env::HIGH;
            env::serial_print_string("On\n");
        }
        env::digital_write(LED, LED_STATE);
    }
}

#[no_mangle]
pub fn main() {
    const Button: u8 = 39;
    env::pin_mode(LED, env::OUTPUT);
    env::pin_mode(Button, env::INPUT);
    env::attach_interrupt(Button, env::CHANGED, toggleLed);
    loop {}
}
