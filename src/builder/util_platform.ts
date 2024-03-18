import { type BoardFQBN } from './platform_config';
import {
  ArduinoListBoards,
  ArduinoListBoardsFQBNs,
} from './platforms/arduino_platform';

export async function listAvailableBoards(): Promise<string[]> {
  // TODO reimplement to use list of serial port OSX because ArduinoListBoards uses WiFi
  return await ArduinoListBoards();
}

export async function listAllFQBN(): Promise<BoardFQBN[]> {
  return await ArduinoListBoardsFQBNs();
}
