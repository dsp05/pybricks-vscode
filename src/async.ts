function withTimeout<T>(promise: Promise<T>, timeout: number) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Operation timed out')), timeout)
    )
  ]);
}

export async function retryWithTimeout<T>(fn: () => Promise<T>, cleanUp?: () => Promise<T>, {
  retries = 5,
  timeout = 5000,
  delay = 100,
  backoff = false,
} = {}) {
  let attempt = 0;
  let lastError;

  while (attempt < retries) {
    try {
      return await withTimeout(fn(), timeout);
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= retries) { break; }
      cleanUp && await cleanUp();
      await new Promise(res => setTimeout(res, delay));

      if (backoff) {
        delay *= 2;
      }
    }
  }

  // All attempts failed
  throw lastError;
}