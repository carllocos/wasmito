extern fn chip_pin_mode(u32, u8) void;
extern fn chip_digital_write(u8, u8) void;
extern fn chip_delay(u32) void;

export fn digital_write(pin: u8, value: u8) void {
    chip_digital_write(pin, value);
}

export fn delay(ms: u32) void {
    chip_delay(ms);
}

export fn pin_mode(pin: u8, mode: u8) void {
    chip_pin_mode(pin, mode);
}
