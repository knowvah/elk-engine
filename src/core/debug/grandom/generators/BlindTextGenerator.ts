// SPDX-License-Identifier: EPL-2.0
import { trim } from '../../../../java/lang/JavaString.js';
import { Random } from '../../../../java/util/Random.js';

/** The blind text the generator is based on. */
const LOREM_IPSUM: string =
  'Lorem ipsum dolor sit amet, consetetur sadipscing elitr,' +
  ' sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,' +
  ' sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. ' +
  'Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';

/** The generated text will have at least this many characters. */
const CHARACTER_MIN_LENGTH = 40;

/** We randomly add up to this many characters onto the minimum text length. */
const CHARACTER_RANGE = 10;

/**
 * Utility class which generates blind text. As a utility class it is not instantiated (private
 * constructor, as in Java).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/BlindTextGenerator.java
 */
export class BlindTextGenerator {
  private constructor() {}

  /**
   * Generate a random excerpt of our blind text. The generator is unseeded (a fresh `Random` per
   * call, as in Java), so the result is never compared exactly. The excerpt is trimmed, so its
   * length is at most `CHARACTER_MIN_LENGTH + CHARACTER_RANGE - 1`, and below the minimum when the
   * excerpt starts or ends on a blank.
   *
   * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/BlindTextGenerator.java
   */
  static generate(): string {
    const randomGenerator = new Random();

    // Choose the number of characters
    let numOfCharacters = randomGenerator.nextInt(CHARACTER_RANGE);
    numOfCharacters += CHARACTER_MIN_LENGTH;

    // Choose where to start extracting from our base text
    const offset = randomGenerator.nextInt(LOREM_IPSUM.length - (CHARACTER_RANGE + CHARACTER_MIN_LENGTH));

    return trim(LOREM_IPSUM.substring(offset, offset + numOfCharacters));
  }
}
