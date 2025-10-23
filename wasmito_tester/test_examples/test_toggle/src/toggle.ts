import {
  digitalWrite,
  pinMode,
  delay,
  interruptOn,
  OUTPUT,
  INPUT_PULLUP,
  CHANGED,
  HIGH,
  LOW,
} from './arduino';
import { LED, BTN_A } from './m5stickc';

const BIG_BTN: u8 = BTN_A;
const LED_ON: u8 = HIGH;
const LED_OFF: u8 = LOW;
const PAUSE: u32 = 1000;
let ledOn = false;

function setupHardware(): void {
  pinMode(LED, OUTPUT);
  pinMode(BIG_BTN, INPUT_PULLUP);
  interruptOn(BIG_BTN, CHANGED, toggleLed);
}

function toggleLed(
  topic_start: u32,
  topic_len: u32,
  mem_start: u32,
  payload_len: u32,
  payload_len2: u32,
): void {
  ledOn = !ledOn;
  digitalWrite(LED, ledOn ? LED_ON : LED_OFF);
}

export function main(): void {
  setupHardware();
  while (true) {
    delay(PAUSE);
  }
}
