// SPDX-License-Identifier: EPL-2.0
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
// Brand: the Warm Studio palette as VitePress variables, the brand mono
// face self-hosted at the two weights the corporate site loads, and this
// site's own rules for where that face applies. Same stack as dot-engine.
import '@knowvah/theme/vitepress';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './custom.css';

// This file is the single place site components get registered (T5 adds the
// showcase components, T7 the stale banner).
export default {
  extends: DefaultTheme,
} satisfies Theme;
