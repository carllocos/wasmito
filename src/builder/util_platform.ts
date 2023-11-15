import { type BoardFQBN } from './platform_config';
import {
  ArduinoListBoards,
  ArduinoListBoardsFQBNs,
} from './platforms/arduino_platform';

export async function listAvailableBoards(): Promise<string[]> {
  return await ArduinoListBoards();
}

export async function listAllFQBN(): Promise<BoardFQBN[]> {
  return await ArduinoListBoardsFQBNs();
}
