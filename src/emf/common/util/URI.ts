// SPDX-License-Identifier: EPL-2.0

/** `URI.FRAGMENT_SEPARATOR`: the first `#` of a URI string starts its fragment. */
const FRAGMENT_SEPARATOR = '#';

/**
 * The subset of EMF's `URI` the proxy and resource code reaches, built on string operations only
 * (browser-safe; no `node:url`, no `URL`). EMF parses a URI into scheme, authority, device, path
 * segments and query, interns it in a pool and keeps the fragment in a `Fragment` wrapper around
 * the fragment-less URI. This port keeps exactly that split: the text before the first `#` (the
 * "base") and the optional fragment. `createURI` splits at the first `#` as
 * `URI.createURIWithCache` does; `equals` compares base text and fragment text, which for the
 * unparsed text is equal to EMF's component-wise comparison of URIs built by `createURI`.
 *
 * Not ported: every component accessor and URI algebra (`scheme`, `authority`, `segments`,
 * `resolve`, `deresolve`, `isHierarchical`, ...), the `createFileURI`/`createPlatform*` factories,
 * the `ignoreEscaped`/`fragmentLocationStyle` encoding overloads, `hashCode` (no hashed container
 * holds a `URI`; EMF derives it from the parsed components and the pool), and the pool itself.
 * EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common.util.URI
 */
export class URI {
  readonly #base: string;
  readonly #fragment: string | null;

  private constructor(base: string, fragment: string | null) {
    this.#base = base;
    this.#fragment = fragment;
  }

  /**
   * Splits at the first `#`: the rest is the fragment (which may be empty and may contain further
   * `#`).
   *
   * @see org.eclipse.emf.common.util.URI#createURI(String)
   * @see org.eclipse.emf.common.util.URI#createURIWithCache(String)
   */
  static createURI(uri: string): URI {
    const index = uri.indexOf(FRAGMENT_SEPARATOR);
    return index === -1 ? new URI(uri, null) : new URI(uri.substring(0, index), uri.substring(index + 1));
  }

  /**
   * Whether this URI has a fragment (an empty fragment counts).
   *
   * @see org.eclipse.emf.common.util.URI#hasFragment()
   */
  hasFragment(): boolean {
    return this.#fragment !== null;
  }

  /**
   * The fragment, or `null` without one.
   *
   * @see org.eclipse.emf.common.util.URI#fragment()
   */
  fragment(): string | null {
    return this.#fragment;
  }

  /**
   * This URI with `fragment` as its fragment, replacing an existing one (EMF's `Fragment` delegates
   * to the wrapped URI); `null` returns this URI unchanged. EMF's Javadoc promises an
   * `IllegalArgumentException` for an invalid fragment, but the code never validates.
   *
   * @see org.eclipse.emf.common.util.URI#appendFragment(String)
   */
  appendFragment(fragment: string | null): URI {
    if (fragment === null) {
      return this;
    }
    return new URI(this.#base, fragment);
  }

  /**
   * This URI without its fragment; this URI itself when it has none.
   *
   * @see org.eclipse.emf.common.util.URI#trimFragment()
   */
  trimFragment(): URI {
    return this.#fragment === null ? this : new URI(this.#base, null);
  }

  /**
   * Same base text and same fragment (or both without).
   *
   * @see org.eclipse.emf.common.util.URI#equals(Object)
   */
  equals(object: unknown): boolean {
    if (object === this) {
      return true;
    }
    return object instanceof URI && this.#base === object.#base && this.#fragment === object.#fragment;
  }

  /** @see org.eclipse.emf.common.util.URI#toString() */
  toString(): string {
    return this.#fragment === null ? this.#base : `${this.#base}${FRAGMENT_SEPARATOR}${this.#fragment}`;
  }
}
