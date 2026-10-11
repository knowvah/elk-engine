// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.data.LayoutOptionData;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * Applies a D6 variant overlay at the root, then the D2 retarget (algorithm on
 * every node with children, {@code randomSeed = 1} on the root).
 */
final class GraphOverlay {

    static final int RANDOM_SEED = 1;

    private final Path variantsFile;
    private JsonObject variants;

    GraphOverlay(final Path variantsFile) {
        this.variantsFile = variantsFile;
    }

    /**
     * Applies the overlays; a null variant or algorithm skips that step.
     *
     * @throws OracleFault for an unknown variant, algorithm or option, or an unparsable value
     */
    void apply(final ElkNode root, final String algorithm, final String variant) {
        if (variant != null) {
            applyVariant(root, variant);
        }
        if (algorithm != null) {
            retarget(root, algorithm);
        }
    }

    private void applyVariant(final ElkNode root, final String variant) {
        JsonElement overlay = loadVariants().get(variant);
        if (overlay == null || !overlay.isJsonObject()) {
            throw new OracleFault("unknown variant '" + variant + "'");
        }
        for (Map.Entry<String, JsonElement> entry : overlay.getAsJsonObject().entrySet()) {
            setOption(root, entry.getKey(), entry.getValue().getAsString());
        }
    }

    private static void setOption(final ElkNode root, final String optionId, final String text) {
        LayoutOptionData option = LayoutMetaDataService.getInstance().getOptionData(optionId);
        if (option == null) {
            throw new OracleFault("unknown option '" + optionId + "'");
        }
        Object value = option.parseValue(text);
        if (value == null) {
            throw new OracleFault("cannot parse '" + text + "' for option '" + optionId + "'");
        }
        root.setProperty(option, value);
    }

    private static void retarget(final ElkNode root, final String algorithm) {
        if (LayoutMetaDataService.getInstance().getAlgorithmData(algorithm) == null) {
            throw new OracleFault("unknown algorithm '" + algorithm + "'");
        }
        root.setProperty(CoreOptions.RANDOM_SEED, RANDOM_SEED);
        // Collect first: a property is a contained map entry, so setting one
        // while iterating eAllContents() is a ConcurrentModificationException.
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        TreeIterator<EObject> all = root.eAllContents();
        while (all.hasNext()) {
            if (all.next() instanceof ElkNode node) {
                nodes.add(node);
            }
        }
        for (ElkNode node : nodes) {
            markIfParent(node, algorithm);
        }
    }

    private static void markIfParent(final ElkNode node, final String algorithm) {
        if (!node.getChildren().isEmpty()) {
            node.setProperty(CoreOptions.ALGORITHM, algorithm);
        }
    }

    private JsonObject loadVariants() {
        if (variants == null) {
            if (variantsFile == null) {
                throw new OracleFault("variants file not configured");
            }
            try {
                String text = Files.readString(variantsFile, StandardCharsets.UTF_8);
                variants = JsonParser.parseString(text).getAsJsonObject();
            } catch (IOException e) {
                throw new OracleFault("cannot read variants file " + variantsFile);
            }
        }
        return variants;
    }
}
