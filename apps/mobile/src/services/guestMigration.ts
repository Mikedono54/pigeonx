import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Moving what is on the phone up to the account, once.
 *
 * Someone can use the whole app without an account. The first time they sign
 * in, everything they made here has to travel with them: their sounds, their
 * times, what played, and their places. This module only remembers whether
 * that move still has to happen. The moving itself happens in `sync.ts`.
 */

const PENDING_KEY = 'pigeonx.moveup.pending';
const DONE_KEY = 'pigeonx.moveup.done';

export async function moveUpDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DONE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function moveUpPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Called the first time a person signs in on this phone. */
export async function askForMoveUp(): Promise<boolean> {
  if (await moveUpDone()) return false;
  try {
    await AsyncStorage.setItem(PENDING_KEY, '1');
  } catch {
    return false;
  }
  return true;
}

/** Called once everything reached the account. */
export async function markMoveUpDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_KEY, '1');
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // the next start tries again
  }
}

/** Test seam. */
export async function __resetMoveUp(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DONE_KEY);
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // nothing to clear
  }
}
