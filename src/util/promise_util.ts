export class TimeoutPromise extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutPromise';
    Error.captureStackTrace(this, TimeoutPromise);
  }
}

export async function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
  error?: Error,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(
        error ?? new TimeoutPromise(`Promise timed out after ${timeout} ms`),
      );
    }, timeout);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function maybeTimeoutPromise<T>(
  promise: Promise<T>,
  timeout?: number,
  error?: Error,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    if (timeout === undefined) {
      promise.then(resolve).catch(reject);
    } else {
      timeoutPromise(promise, timeout, error).then(resolve).catch(reject);
    }
  });
}
