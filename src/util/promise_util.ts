export async function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
  error?: Error,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(error ?? new Error('Promise timed out'));
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
