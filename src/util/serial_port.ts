export enum BoardBaudRate {
  NONE = 0,
  BD_9600 = 9600,
  BD_115200 = 115200,
}

export function convertToBoardBaudRate(
  baudrate: number,
): BoardBaudRate | undefined {
  switch (baudrate) {
    case BoardBaudRate.NONE:
    case BoardBaudRate.BD_9600:
    case BoardBaudRate.BD_115200:
      return baudrate as BoardBaudRate;
    default:
      return undefined;
  }
}

export function isSerialPort(str: string): boolean {
  const unixPattern = /^(\/dev\/ttyS\w+|\/dev\/ttyUSB\w+)$/i;
  return unixPattern.test(str);
}
