/*
 * Converts error codes given emitted by the VM to human readable exception messages
 */

const errorCodeMapping = new Map<number, string>();
const exceptions: Array<[number, string]> = [[22, 'TODO']];
exceptions.forEach(([errorCode, errorMsg]: [number, string]) => {
  errorCodeMapping.set(errorCode, errorMsg);
});

export function getExceptionMsgFromErrorCode(
  errorCode: number,
): string | undefined {
  return errorCodeMapping.get(errorCode);
}
