export function logInfo(message: string, context?: Record<string, unknown>) {
  console.info('[mediasis]', message, context ?? {});
}

export function logError(error: unknown, context?: Record<string, unknown>) {
  console.error('[mediasis:error]', error, context ?? {});
}
