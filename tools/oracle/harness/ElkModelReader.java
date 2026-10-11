// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;

import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

/**
 * Reads a model file into an ElkGraph: ELK JSON ({@code .json}) or ELK
 * textual format ({@code .elkt}), chosen by extension. The {@code .elkt}
 * setup follows ELK's own PlainJavaInitialization and GraphFromFile.
 */
final class ElkModelReader {

    private static final String ELKT_EXTENSION = ".elkt";

    private boolean elktReady;

    /**
     * Reads the model.
     *
     * @param input the model file
     * @return the root node
     * @throws IOException if the file cannot be read (a harness fault)
     */
    ElkNode read(final Path input) throws IOException {
        if (input.getFileName().toString().endsWith(ELKT_EXTENSION)) {
            return readElkt(input);
        }
        String text = Files.readString(input, StandardCharsets.UTF_8);
        return ElkGraphJson.forGraph(text).toElk();
    }

    private ElkNode readElkt(final Path input) throws IOException {
        if (!Files.isReadable(input)) {
            throw new IOException("cannot read " + input);
        }
        if (!elktReady) {
            ElkGraphStandaloneSetup.doSetup();
            elktReady = true;
        }
        ResourceSet resourceSet = new ResourceSetImpl();
        Resource resource = resourceSet.getResource(
                URI.createFileURI(input.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new ElkTextException(resource.getErrors().get(0).getMessage());
        }
        resource.load(Collections.emptyMap());
        EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
        if (root instanceof ElkNode node) {
            return node;
        }
        throw new ElkTextException("no ElkNode root in " + input.getFileName());
    }
}
