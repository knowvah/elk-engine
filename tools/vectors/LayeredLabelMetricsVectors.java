// SPDX-License-Identifier: EPL-2.0
// Records the JVM's label metrics for the JUnit runner subset (decision FX8, user, mission 7f):
// org.eclipse.elk.alg.test/.../framework/config/TestConfiguration.java computeLabelSize measures a label's text with
// java.awt font metrics, SansSerif (Arial on Windows, not recorded here), plain, size 10, on a 1x1 ARGB image. This program only calls the JDK API
// the Java calls, and needs no ELK class. The sizes depend on the platform's fonts; the ref freezes one recording like any vector.
// Run: tools/vectors/layered-label-metrics-vectors.sh <outDir>
// Input: tools/vectors/layered-label-metrics-texts.txt, one label text per line.
// Output: <outDir>/layered-label-metrics.json { jdk, font: { name, style, size }, sizes: { "<text>": [width, height] } }.
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class LayeredLabelMetricsVectors {
    private static final String FONT_NAME = "SansSerif";
    private static final int FONT_SIZE = 10;

    private static String quote(final String text) {
        return '"' + text.replace("\\", "\\\\").replace("\"", "\\\"") + '"';
    }

    public static void main(final String[] args) throws Exception {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setFont(new Font(FONT_NAME, Font.PLAIN, FONT_SIZE));
        List<String> rows = new ArrayList<>();
        for (String text : Files.readAllLines(Path.of(args[1]), StandardCharsets.UTF_8)) {
            Rectangle2D rect = graphics.getFontMetrics().getStringBounds(text, graphics);
            rows.add("    " + quote(text) + ": [" + rect.getWidth() + ", " + rect.getHeight() + "]");
        }
        String out = "{\n  \"jdk\": " + quote(System.getProperty("java.version")) + ",\n"
                + "  \"font\": { \"name\": " + quote(FONT_NAME) + ", \"style\": \"plain\", \"size\": " + FONT_SIZE + " },\n"
                + "  \"sizes\": {\n" + String.join(",\n", rows) + "\n  }\n}\n";
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], "layered-label-metrics.json"), out, StandardCharsets.UTF_8);
    }
}
