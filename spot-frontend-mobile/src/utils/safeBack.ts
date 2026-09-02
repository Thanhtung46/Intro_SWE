import type { Router } from 'expo-router';

/**
 * Safe back for expo-router: avoid the dev warning
 * "The action 'GO_BACK' was not handled by any navigator"
 * when the screen was opened via deep link / replace / empty stack.
 */
export function safeBack(router: Pick<Router, 'canGoBack' | 'back' | 'replace'>, fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as never);
}
