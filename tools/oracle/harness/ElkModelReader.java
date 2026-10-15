// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;

import org.eclipse.elk.graph.ElkGraphPackage;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

/**
 * Reads a model file into an ElkGraph: ELK JSON ({@code .json}), ELK
 * textual format ({@code .elkt}) or ELK textual JSON format ({@code .elkj}), chosen by
 * extension; {@link #readAsElkj} reads any file through the {@code .elkj} language. The
 * {@code .elkt} setup follows ELK's own PlainJavaInitialization and GraphFromFile.
 */
final class ElkModelReader {

    private static final String ELKT_EXTENSION = ".elkt";
    private static final String ELKJ_EXTENSION = ".elkj";

    private boolean elktReady;
    private static boolean elkjReady;

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
        if (input.getFileName().toString().endsWith(ELKJ_EXTENSION)) {
            return readAsElkj(input);
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

    /**
     * Registers the {@code .elkj} language once. The standalone setup does not register the ElkGraph
     * package (the Eclipse runtime does); touching it makes the parsed proxies resolvable.
     */
    static synchronized void setupElkj() {
        if (!elkjReady) {
            ElkGraphPackage.eINSTANCE.getNsURI();
            ElkGraphJsonStandaloneSetup.doSetup();
            elkjReady = true;
        }
    }

    /**
     * Reads any file's bytes through the {@code .elkj} language (a resource with a
     * {@code .elkj} URI, {@code load(InputStream)}).
     *
     * @param input the model file
     * @return the root node
     * @throws IOException if the file cannot be read (a harness fault)
     */
    ElkNode readAsElkj(final Path input) throws IOException {
        if (!Files.isReadable(input)) {
            throw new IOException("cannot read " + input);
        }
        setupElkj();
        Resource resource = new ResourceSetImpl().createResource(
                URI.createFileURI(input.toAbsolutePath() + ELKJ_EXTENSION));
        try (InputStream in = Files.newInputStream(input)) {
            resource.load(in, Collections.emptyMap());
        }
        if (!resource.getErrors().isEmpty()) {
            throw new ElkTextException(resource.getErrors().get(0).getMessage());
        }
        EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
        if (root instanceof ElkNode node) {
            return node;
        }
        throw new ElkTextException("no ElkNode root in " + input.getFileName());
    }
}
