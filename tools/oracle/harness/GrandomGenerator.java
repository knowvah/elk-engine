// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.eclipse.elk.core.debug.grandom.GRandomStandaloneSetup;
import org.eclipse.elk.core.debug.grandom.generators.RandomGraphGenerator;
import org.eclipse.elk.core.debug.grandom.gRandom.Configuration;
import org.eclipse.elk.core.debug.grandom.gRandom.RandGraph;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

/**
 * Generates one graph from a random-graph config ({@code .elkr}). The setup
 * follows ELK's PlainJavaInitialization; generation is seeded by the config's
 * {@code seed} through {@code new Random(seed)}.
 */
final class GrandomGenerator {

    /**
     * Identifier given to the root, which the generator leaves unnamed. Without it the
     * JSON exporter numbers the root {@code n0}, collides with the generated {@code n0},
     * and renames the collision with an unseeded random suffix (JsonExporter.xtend:505).
     */
    static final String ROOT_ID = "root";

    private boolean ready;

    /**
     * Generates the graph.
     *
     * @param input the {@code .elkr} file, holding exactly one {@code generate 1} configuration
     * @return the generated root node
     * @throws IOException if the file cannot be read (a harness fault)
     * @throws ElkTextException if the config does not parse
     * @throws OracleFault if the config does not hold exactly one single-graph configuration
     */
    ElkNode generate(final Path input) throws IOException {
        if (!Files.isReadable(input)) {
            throw new IOException("cannot read " + input);
        }
        if (!ready) {
            GRandomStandaloneSetup.doSetup();
            ready = true;
        }
        ResourceSet resourceSet = new ResourceSetImpl();
        Resource resource = resourceSet.getResource(
                URI.createFileURI(input.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new ElkTextException(resource.getErrors().get(0).getMessage());
        }
        Configuration config = singleConfiguration(resource, input);
        List<ElkNode> graphs = new RandomGraphGenerator(null).generate(config);
        ElkNode root = graphs.get(0);
        if (root.getIdentifier() == null) {
            root.setIdentifier(ROOT_ID);
        }
        return root;
    }

    private static Configuration singleConfiguration(final Resource resource, final Path input) {
        if (resource.getContents().isEmpty() || !(resource.getContents().get(0) instanceof RandGraph root)
                || root.getConfigs().size() != 1) {
            throw new OracleFault(input.getFileName() + " must hold exactly one generate configuration");
        }
        Configuration config = root.getConfigs().get(0);
        if (config.getSamples() != 1) {
            throw new OracleFault(input.getFileName() + " must generate exactly 1 graph");
        }
        return config;
    }
}
