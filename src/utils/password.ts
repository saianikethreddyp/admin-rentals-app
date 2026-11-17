import * as Crypto from 'expo-crypto';

// No look-alike characters (0/O, 1/l/I) so a password read aloud or typed from a
// message is hard to get wrong.
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;

/** Picks an unbiased random index below max using cryptographic randomness. */
function randomIndex(max: number): number {
  const limit = 256 - (256 % max);
  for (;;) {
    const [b] = Crypto.getRandomBytes(1);
    if (b! < limit) return b! % max;
  }
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)]!;
}

/** A 16 character temporary password containing lower case, upper case and digits. */
export function generatePassword(length = 16): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
