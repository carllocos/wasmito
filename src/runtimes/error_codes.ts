export type ErrorCode = number;

const REQUEST_HAS_WRONG_INTERRUPT_NR_ERROR_CODE = 1;
const REQUEST_HAS_UN_EXISTING_MOMENT_ERROR_CODE = 2;
const REQUEST_HAS_UNEXISTING_ADDR_ERROR_CODE = 3;
const COULD_NOT_ADD_HOOK_ERROR_CODE = 4;
const COULD_NOT_REMOVE_HOOK_ERROR_CODE = 5;

const errorMessages = new Map<ErrorCode, string>([
  [REQUEST_HAS_WRONG_INTERRUPT_NR_ERROR_CODE, ''],
  [
    REQUEST_HAS_UN_EXISTING_MOMENT_ERROR_CODE,
    'Request does not support the provided Hook Mode',
  ],
  [REQUEST_HAS_UNEXISTING_ADDR_ERROR_CODE, ''],
  [COULD_NOT_ADD_HOOK_ERROR_CODE, ''],
  [COULD_NOT_REMOVE_HOOK_ERROR_CODE, ''],
]);

export function errorCodeToMessage(errorCode: ErrorCode): string | undefined {
  return errorMessages.get(errorCode);
}
