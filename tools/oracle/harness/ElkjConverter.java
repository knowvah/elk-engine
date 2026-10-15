// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.file.Path;
import java.util.Collections;

import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.util.GraphIdentifierGenerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;

/**
 * Converts a graph to ELK-native {@code .elkj} exactly as the "Convert graph" command of the
 * graph.json.text.ui bundle does.
 *
 * @see org.eclipse.elk.graph.json.text.ui.ConvertGraphHandler (ConvertGraphHandler.xtend:140-160,
 *      {@code transform}; 186-192, {@code saveModel}). Its commented-out
 *      {@code removeInvalidProperties} and {@code removeUnnecessaryLayouts} stay out.
 */
final class ElkjConverter {

    private static final String ELKJ_EXTENSION = "elkj";

    private ElkjConverter() {
    }

    /** Copies the model and, for a graph, writes missing identifiers and makes them unique. */
    static EObject transform(final EObject model) {
        EObject copy = EcoreUtil.copy(model);
        if (copy instanceof ElkNode graph) {
            GraphIdentifierGenerator.forGraph(graph)
                    .assertValid()
                    .assertExists()
                    .assertUnique()
                    .execute();
        }
        return copy;
    }

    /** Saves the model unformatted into a fresh resource with the given path (extension forced to elkj). */
    static void save(final EObject model, final Path target) throws IOException {
        // The Eclipse command has the language registered by the UI plugin; standalone needs the setup.
        ElkModelReader.setupElkj();
        Resource resource = new ResourceSetImpl().createResource(
                URI.createFileURI(target.toAbsolutePath().toString()).trimFileExtension()
                        .appendFileExtension(ELKJ_EXTENSION));
        resource.getContents().add(model);
        resource.save(Collections.EMPTY_MAP);
    }
}
