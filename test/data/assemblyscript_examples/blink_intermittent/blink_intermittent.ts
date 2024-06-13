@external("env", "chip_pin_mode")       export declare function _pin_mode(pin: u8, mode: u8): void;
@external("env", "chip_digital_write")  export declare function _digital_write(pin: u8, value: u8): void;
@external("env", "chip_delay")          export declare function _delay(ms: u32): void;

export function pinMode(pin: u8, mode: u8): void {
    _pin_mode(pin, mode);
}

export function delay(ms: u32): void {
    _delay(ms);
}

export function digitalWrite(pin: u8, value: u8): void {
    _digital_write(pin, value);
}


export function main(): void {
    const LED: u8 = 10;
    const OUTPUT: u8 = 2;
    const ON: u8 = 1;
    const OFF: u8 = 0;
    const SHORT_SLEEP: u32 = 500;
    const LONG_SLEEP: u32 = 3000;
    const MAX_SHORT_SLEEPS: u32 = 5;

    pinMode(LED, OUTPUT);
    
    while (true) {
        for (let i: u32 = 0; i < MAX_SHORT_SLEEPS; i++) {
            digitalWrite(LED, ON);
            delay(SHORT_SLEEP);
            digitalWrite(LED, OFF);
            delay(SHORT_SLEEP);
        }
        
        digitalWrite(LED, ON);
        delay(LONG_SLEEP);
  }
}

