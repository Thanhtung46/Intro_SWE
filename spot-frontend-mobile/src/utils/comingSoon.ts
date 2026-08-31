import { showAlert } from './showAlert';

/** Shared placeholder for features that don't have a real screen/API yet. */
export function comingSoon(feature: string): void {
  showAlert('Coming soon', `${feature} is not available yet.`);
}
