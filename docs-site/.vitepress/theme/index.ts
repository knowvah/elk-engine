// SPDX-License-Identifier: EPL-2.0
import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
// Brand: the Warm Studio palette as VitePress variables, the brand mono
// face self-hosted at the two weights the corporate site loads, and this
// site's own rules for where that face applies. Same stack as dot-engine.
import '@knowvah/theme/vitepress';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './custom.css';
import ElkDiagram from './ElkDiagram.vue';
import GoldenGallery from './GoldenGallery.vue';
import StaleBanner from './StaleBanner.vue';

// This file is the single place site components get registered.
export default {
  extends: DefaultTheme,
  // Localized "English source changed" notice above translated pages.
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(StaleBanner) }),
  enhanceApp({ app }) {
    app.component('GoldenGallery', GoldenGallery);
    app.component('ElkDiagram', ElkDiagram);
  },
} satisfies Theme;
