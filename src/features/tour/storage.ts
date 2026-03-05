import * as SecureStore from 'expo-secure-store';

const TOUR_KEY = 'mediasis.has_seen_tour.v1';

export async function hasSeenTour() {
  const value = await SecureStore.getItemAsync(TOUR_KEY);
  return value === '1';
}

export async function markTourSeen() {
  await SecureStore.setItemAsync(TOUR_KEY, '1');
}

export async function resetTourSeen() {
  await SecureStore.deleteItemAsync(TOUR_KEY);
}
