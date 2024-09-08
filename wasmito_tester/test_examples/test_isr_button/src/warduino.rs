extern "C" {
    fn chip_analog_read(pin: u8) -> i32;
    fn chip_delay(ms: u32);
    fn chip_digital_write(pin: u8, value: u8);
    fn chip_digital_read(pin: u8) -> u32;
    fn chip_pin_mode(pin: u8, mode: u8);
    fn print_int(i: i32);
    fn print_string(addr: *const u8, size: u32);
    fn subscribe_interrupt(pin: u8, f: fn(u32, u32, u32, u32, u32), mode: u8);
    fn write_spi_byte(b: u32);
}

pub fn analog_read(pin: u8) -> i32 {
    unsafe { chip_analog_read(pin) }
}

pub fn attach_interrupt(pin: u8, mode: u8, f: fn(u32, u32, u32, u32, u32)) {
    unsafe {
        subscribe_interrupt(pin, f, mode);
    }
}

pub fn delay(ms: u32) {
    unsafe {
        chip_delay(ms);
    }
}

pub fn digital_read(pin: u8) -> u8 {
    unsafe { chip_digital_read(pin) as u8 }
}

pub fn digital_write(pin: u8, value: u8) {
    unsafe {
        chip_digital_write(pin, value);
    }
}

pub fn pin_mode(pin: u8, mode: u8) {
    unsafe {
        chip_pin_mode(pin, mode);
    }
}

pub fn serial_print_int(i: i32) {
    unsafe {
        print_int(i);
    }
}

pub fn serial_print_string(s: &str) {
    unsafe {
        let addr: *const u8 = s.as_ptr();
        let size = s.len() as u32;
        print_string(addr, size);
    }
}

pub fn serial_write(val: u8) {
    unsafe {
        write_spi_byte(val as u32);
    }
}

// Constants
pub const OUTPUT: u8 = 2;
pub const INPUT: u8 = 1; // or 0
pub const INPUT_PULLUP: u8 = 5;

pub const HIGH: u8 = 1;
pub const LOW: u8 = 0;

pub const CHANGED: u8 = 1; //TODO confirm type
pub const FALLING: u8 = 2;
pub const RISING: u8 = 3;
