<!-- SPDX-License-Identifier: EPL-2.0 -->

# Notices for elk-engine

elk-engine (`@knowvah/elk-engine`) is a derivative work of the
[Eclipse Layout Kernel (ELK)](https://www.eclipse.org/elk). It is a TypeScript port of ELK's
Java sources and is made available under the same license.

## Upstream sources

- Eclipse ELK: https://github.com/eclipse-elk/elk, ported from commit
  `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`.
- Test models: https://github.com/eclipse-elk/elk-models at commit
  `ac5af2ba511c0037e4f347e8bd91f013950951c7`. The models are referenced by a pinned manifest
  and are not vendored in this repository, except 31 `.elkt` test inputs copied unchanged to
  `test/corpus/elkt-curated/` (EPL-2.0, upstream headers kept).

## Copyright

Portions of this work derive from Eclipse ELK. As stated in the upstream notice, all ELK content
is the property of the respective authors or their employers; for authorship, consult the source
code repository logs of the upstream repositories.

## Declared license

This program and the accompanying materials are made available under the terms of the Eclipse
Public License 2.0, which is available at https://www.eclipse.org/legal/epl-2.0. The full text is
in [LICENSE](LICENSE).

SPDX-License-Identifier: EPL-2.0

## Trademarks

"Eclipse" and "Eclipse Layout Kernel" ("ELK") are trademarks of the Eclipse Foundation. This
project is an independent port and is not affiliated with, endorsed by, or sponsored by the
Eclipse Foundation.

## Third-party content

elk-engine has no runtime dependencies. Upstream ELK documents its own third-party content in its
[NOTICE.md](https://github.com/eclipse-elk/elk/blob/master/NOTICE.md); none of that content is
included here.
