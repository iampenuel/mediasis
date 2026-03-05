export function toUserMessage(error: unknown, fallback: string) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  const lower = message.toLowerCase();

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'Connection issue. Saved locally and will retry when online.';
  }

  if (lower.includes('permission')) {
    return 'Permission is required for this action.';
  }

  if (lower.includes('sqlite') || lower.includes('database')) {
    return 'Local data storage is temporarily unavailable. Please retry.';
  }

  return fallback;
}
