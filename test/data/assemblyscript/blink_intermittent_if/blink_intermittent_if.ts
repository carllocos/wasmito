@external("env", "chip_pin_mode")       export declare function _pin_mode(pin: u32, mode: u32): void;
@external("env", "chip_digital_write")  export declare function _digital_write(pin: u32, value: u32): void;
@external("env", "chip_delay")          export declare function _delay(ms: u32): void;

export enum PinMode {
    INPUT  = 0x0,
    OUTPUT = 0x2,
}

export enum PinVoltage {
    LOW  = 0,
    HIGH = 1,
}

export function pinMode(pin: u32, mode: PinMode): void {
    _pin_mode(pin, mode);
}

export function delay(ms: u32): void {
    _delay(ms);
}

export function digitalWrite(pin: u32, value: PinVoltage): void {
    _digital_write(pin, value);
}


function newTime(oldTime: u32): u32{
    if(oldTime > 5000){
        return oldTime
    }
    else {
        return oldTime * 2;
    }
}


function addTime(v: u32): u32{
    return v + 1;
}


export function main(): void {
  const led: u32 = 10;
  const pauseTimes: u32[] = [100, 300, 500, 600, 700, 800, 900, 1000];

  pinMode(led, PinMode.OUTPUT);

  while (true) {
    for (let i = 0; i < pauseTimes.length; i++) {
        const pause = addTime(pauseTimes[i]) + addTime(300);
        digitalWrite(led, PinVoltage.HIGH);
        delay(pause);
        digitalWrite(led, PinVoltage.LOW);
        pauseTimes[i] = newTime(pause);
    }
  }
}
