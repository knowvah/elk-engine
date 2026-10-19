// SPDX-License-Identifier: EPL-2.0
import { AbstractDeclarativeValidator } from '../../../../xtext/validation/AbstractDeclarativeValidator.js';

/**
 * The custom validation rules of `.elkj`: none. Upstream's `ElkGraphJsonValidator.xtend` is the unmodified Xtext
 * template; its example check (`INVALID_NAME`, `checkGreetingStartsWithCapital(Greeting)`) is commented out and
 * therefore not ported. Everything `validate` reports for `.elkj` comes from the Xtext pipeline itself and from EMF's
 * `EObjectValidator`; unlike `.elkt` there is no `LayoutOptionValidator` check. The generated
 * `AbstractElkGraphJsonValidator` only names the validated `EPackage` (ElkGraph), which the port's single-package
 * `EValidatorRegistrar` stands for.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/validation/ElkGraphJsonValidator.xtend
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/validation/AbstractElkGraphJsonValidator.java
 */
export class ElkGraphJsonValidator extends AbstractDeclarativeValidator {}
