extern fn env_chip_pin_mode(u8, u8) void;
extern fn env_chip_digital_write(u8, u8) void;
extern fn env_chip_delay(u32) void;

fn chip_pin_mode(pin: u8, mode: u8) void {
    env_chip_pin_mode(pin, mode);
}

fn chip_digital_write(pin: u8, val: u8) void {
    env_chip_digital_write(pin, val);
}

fn chip_delay(ms: u32) void {
    env_chip_delay(ms);
}

pub fn main() void {
    const LED: u32 = 10;
    const OUTPUT: u8 = 2;
    const ON: u8 = 1;
    const OFF: u8 = 0;
    const LONG_SLEEP: u32 = 3000;
    const SHORT_SLEEP: u32 = 500;
    const MAX_SHORT_SLEEP: u8 = 5;

    chip_pin_mode(LED, OUTPUT);

    while (true) {
        for (1..MAX_SHORT_SLEEP) |_| {
            chip_digital_write(LED, ON);
            chip_delay(SHORT_SLEEP);
            chip_digital_write(LED, OFF);
            chip_delay(SHORT_SLEEP);
        }

        chip_digital_write(LED, ON);
        chip_delay(LONG_SLEEP);
    }
}
