// Generated from data/fluent-tokens.json + data/repo-tokens.json — do not edit by hand.
// Rebuild: node scripts/extract-tokens.mjs && node scripts/generate.mjs
import type { Preset } from 'unocss'

/** tokens.css 文本，可由 preset preflight 注入或单独引入。 */
export const tokensCssText = `/* Generated from data/fluent-tokens.json + data/repo-tokens.json — do not edit by hand. */
/* Rebuild: node scripts/extract-tokens.mjs && node scripts/generate.mjs */
:root {
  --borderRadiusNone: 0;
  --borderRadiusSmall: 2px;
  --borderRadiusMedium: 4px;
  --borderRadiusLarge: 6px;
  --borderRadiusXLarge: 8px;
  --borderRadius2XLarge: 12px;
  --borderRadius3XLarge: 16px;
  --borderRadius4XLarge: 24px;
  --borderRadius5XLarge: 32px;
  --borderRadius6XLarge: 40px;
  --borderRadiusCircular: 10000px;
  --fontSizeBase100: 10px;
  --fontSizeBase200: 12px;
  --fontSizeBase300: 14px;
  --fontSizeBase400: 16px;
  --fontSizeBase500: 20px;
  --fontSizeBase600: 24px;
  --fontSizeHero700: 28px;
  --fontSizeHero800: 32px;
  --fontSizeHero900: 40px;
  --fontSizeHero1000: 68px;
  --lineHeightBase100: 14px;
  --lineHeightBase200: 16px;
  --lineHeightBase300: 20px;
  --lineHeightBase400: 22px;
  --lineHeightBase500: 28px;
  --lineHeightBase600: 32px;
  --lineHeightHero700: 36px;
  --lineHeightHero800: 40px;
  --lineHeightHero900: 52px;
  --lineHeightHero1000: 92px;
  --fontFamilyBase: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
  --fontFamilyMonospace: Consolas, 'Courier New', Courier, monospace;
  --fontFamilyNumeric: Bahnschrift, 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
  --fontWeightRegular: 400;
  --fontWeightMedium: 500;
  --fontWeightSemibold: 600;
  --fontWeightBold: 700;
  --strokeWidthThin: 1px;
  --strokeWidthThick: 2px;
  --strokeWidthThicker: 3px;
  --strokeWidthThickest: 4px;
  --spacingHorizontalNone: 0;
  --spacingHorizontalXXS: 2px;
  --spacingHorizontalXS: 4px;
  --spacingHorizontalSNudge: 6px;
  --spacingHorizontalS: 8px;
  --spacingHorizontalMNudge: 10px;
  --spacingHorizontalM: 12px;
  --spacingHorizontalL: 16px;
  --spacingHorizontalXL: 20px;
  --spacingHorizontalXXL: 24px;
  --spacingHorizontalXXXL: 32px;
  --spacingVerticalNone: 0;
  --spacingVerticalXXS: 2px;
  --spacingVerticalXS: 4px;
  --spacingVerticalSNudge: 6px;
  --spacingVerticalS: 8px;
  --spacingVerticalMNudge: 10px;
  --spacingVerticalM: 12px;
  --spacingVerticalL: 16px;
  --spacingVerticalXL: 20px;
  --spacingVerticalXXL: 24px;
  --spacingVerticalXXXL: 32px;
  --durationUltraFast: 50ms;
  --durationFaster: 100ms;
  --durationFast: 150ms;
  --durationNormal: 200ms;
  --durationGentle: 250ms;
  --durationSlow: 300ms;
  --durationSlower: 400ms;
  --durationUltraSlow: 500ms;
  --curveAccelerateMax: cubic-bezier(0.9,0.1,1,0.2);
  --curveAccelerateMid: cubic-bezier(1,0,1,1);
  --curveAccelerateMin: cubic-bezier(0.8,0,0.78,1);
  --curveDecelerateMax: cubic-bezier(0.1,0.9,0.2,1);
  --curveDecelerateMid: cubic-bezier(0,0,0,1);
  --curveDecelerateMin: cubic-bezier(0.33,0,0.1,1);
  --curveEasyEaseMax: cubic-bezier(0.8,0,0.2,1);
  --curveEasyEase: cubic-bezier(0.33,0,0.67,1);
  --curveLinear: cubic-bezier(0,0,1,1);
  --colorNeutralForegroundInvertedDisabled: rgba(255, 255, 255, 0.4);
  --colorNeutralForeground1Static: #242424;
  --colorNeutralForegroundStaticInverted: #ffffff;
  --colorNeutralForegroundOnBrand: #ffffff;
  --colorNeutralForegroundInvertedLink: #ffffff;
  --colorNeutralForegroundInvertedLinkHover: #ffffff;
  --colorNeutralForegroundInvertedLinkPressed: #ffffff;
  --colorNeutralForegroundInvertedLinkSelected: #ffffff;
  --colorBrandForegroundOnLight: #0f6cbd;
  --colorBrandForegroundOnLightHover: #115ea3;
  --colorBrandForegroundOnLightPressed: #0e4775;
  --colorBrandForegroundOnLightSelected: #0f548c;
  --colorNeutralBackground7: #00000000;
  --colorNeutralBackground7Selected: #00000000;
  --colorSubtleBackground: transparent;
  --colorSubtleBackgroundLightAlphaSelected: transparent;
  --colorSubtleBackgroundInverted: transparent;
  --colorSubtleBackgroundInvertedHover: rgba(0, 0, 0, 0.1);
  --colorSubtleBackgroundInvertedPressed: rgba(0, 0, 0, 0.3);
  --colorSubtleBackgroundInvertedSelected: rgba(0, 0, 0, 0.2);
  --colorTransparentBackground: transparent;
  --colorTransparentBackgroundHover: transparent;
  --colorTransparentBackgroundPressed: transparent;
  --colorTransparentBackgroundSelected: transparent;
  --colorNeutralBackgroundInvertedDisabled: rgba(255, 255, 255, 0.1);
  --colorBrandBackgroundPressed: #0c3b5e;
  --colorBrandBackgroundSelected: #0f548c;
  --colorBrandBackgroundStatic: #0f6cbd;
  --colorBrandBackground3Static: #0f548c;
  --colorBrandBackground4Static: #0c3b5e;
  --colorBrandBackgroundInverted: #ffffff;
  --colorBrandBackgroundInvertedHover: #ebf3fc;
  --colorBrandBackgroundInvertedPressed: #b4d6fa;
  --colorBrandBackgroundInvertedSelected: #cfe4fa;
  --colorNeutralStrokeOnBrand2: #ffffff;
  --colorNeutralStrokeOnBrand2Hover: #ffffff;
  --colorNeutralStrokeOnBrand2Pressed: #ffffff;
  --colorNeutralStrokeOnBrand2Selected: #ffffff;
  --colorNeutralStrokeInvertedDisabled: rgba(255, 255, 255, 0.4);
  --colorTransparentStroke: transparent;
  --colorTransparentStrokeInteractive: transparent;
  --colorTransparentStrokeDisabled: transparent;
  --colorNeutralStrokeAlpha2: rgba(255, 255, 255, 0.2);
  --colorBrandShadowAmbient: rgba(0,0,0,0.30);
  --colorBrandShadowKey: rgba(0,0,0,0.25);
  --colorPaletteRedBackground3: #d13438;
  --colorPaletteGreenBackground3: #107c10;
  --colorPaletteDarkOrangeBackground3: #da3b01;
  --colorPaletteYellowBackground3: #fde300;
  --colorPaletteBerryBackground3: #c239b3;
  --colorPaletteLightGreenBackground3: #13a10e;
  --colorPaletteMarigoldBackground3: #eaa300;
  --colorStatusSuccessBackground3: #107c10;
  --colorStatusWarningBackground3: #f7630c;
  --colorStatusDangerBackground3: #c50f1f;
  --colorStatusDangerBackground3Hover: #b10e1c;
  --colorStatusDangerBackground3Pressed: #960b18;
  --shadow2Brand: 0 0 2px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.25);
  --shadow4Brand: 0 0 2px rgba(0,0,0,0.30), 0 2px 4px rgba(0,0,0,0.25);
  --shadow8Brand: 0 0 2px rgba(0,0,0,0.30), 0 4px 8px rgba(0,0,0,0.25);
  --shadow16Brand: 0 0 2px rgba(0,0,0,0.30), 0 8px 16px rgba(0,0,0,0.25);
  --shadow28Brand: 0 0 8px rgba(0,0,0,0.30), 0 14px 28px rgba(0,0,0,0.25);
  --shadow64Brand: 0 0 8px rgba(0,0,0,0.30), 0 32px 64px rgba(0,0,0,0.25);
  --zIndexWindow: 0;
  --zIndexContent: 100;
  --zIndexNavFlyout: 1000;
  --zIndexMenu: 1100;
  --zIndexSubmenu: 1200;
  --zIndexModal: 1300;
  --zIndexTooltip: 1400;
  --zIndexShell: 1500;
  --zIndexStartMenu: 1600;
  --zIndexStep: 10;
  --smokeFillColorDefault: rgba(0, 0, 0, 0.302);
  --subtleFillColorTransparent: rgba(255, 255, 255, 0);
  --navigationPaneExpandedWidth: 320;
  --navigationPaneCompactWidth: 48;
  --shellTaskbarHeight: 48;
  --windowsAccentPrimary: #0078d4;
  --windowsAccentLight2: #4cc2ff;
}

:root {
  color-scheme: light dark;
  --colorNeutralForeground1: light-dark(#242424, #ffffff);
  --colorNeutralForeground1Hover: light-dark(#242424, #ffffff);
  --colorNeutralForeground1Pressed: light-dark(#242424, #ffffff);
  --colorNeutralForeground1Selected: light-dark(#242424, #ffffff);
  --colorNeutralForeground2: light-dark(#424242, #d6d6d6);
  --colorNeutralForeground2Hover: light-dark(#242424, #ffffff);
  --colorNeutralForeground2Pressed: light-dark(#242424, #ffffff);
  --colorNeutralForeground2Selected: light-dark(#242424, #ffffff);
  --colorNeutralForeground2BrandHover: light-dark(#0f6cbd, #479ef5);
  --colorNeutralForeground2BrandPressed: light-dark(#115ea3, #2886de);
  --colorNeutralForeground2BrandSelected: light-dark(#0f6cbd, #479ef5);
  --colorNeutralForeground3: light-dark(#616161, #adadad);
  --colorNeutralForeground3Hover: light-dark(#424242, #d6d6d6);
  --colorNeutralForeground3Pressed: light-dark(#424242, #d6d6d6);
  --colorNeutralForeground3Selected: light-dark(#424242, #d6d6d6);
  --colorNeutralForeground3BrandHover: light-dark(#0f6cbd, #479ef5);
  --colorNeutralForeground3BrandPressed: light-dark(#115ea3, #2886de);
  --colorNeutralForeground3BrandSelected: light-dark(#0f6cbd, #479ef5);
  --colorNeutralForeground4: light-dark(#707070, #999999);
  --colorNeutralForeground5: light-dark(#616161, #adadad);
  --colorNeutralForeground5Hover: light-dark(#242424, #ffffff);
  --colorNeutralForeground5Pressed: light-dark(#242424, #ffffff);
  --colorNeutralForeground5Selected: light-dark(#242424, #ffffff);
  --colorNeutralForegroundDisabled: light-dark(#bdbdbd, #5c5c5c);
  --colorBrandForegroundLink: light-dark(#115ea3, #479ef5);
  --colorBrandForegroundLinkHover: light-dark(#0f548c, #62abf5);
  --colorBrandForegroundLinkPressed: light-dark(#0c3b5e, #2886de);
  --colorBrandForegroundLinkSelected: light-dark(#115ea3, #479ef5);
  --colorNeutralForeground2Link: light-dark(#424242, #d6d6d6);
  --colorNeutralForeground2LinkHover: light-dark(#242424, #ffffff);
  --colorNeutralForeground2LinkPressed: light-dark(#242424, #ffffff);
  --colorNeutralForeground2LinkSelected: light-dark(#242424, #ffffff);
  --colorCompoundBrandForeground1: light-dark(#0f6cbd, #479ef5);
  --colorCompoundBrandForeground1Hover: light-dark(#115ea3, #62abf5);
  --colorCompoundBrandForeground1Pressed: light-dark(#0f548c, #2886de);
  --colorBrandForeground1: light-dark(#0f6cbd, #479ef5);
  --colorBrandForeground2: light-dark(#115ea3, #62abf5);
  --colorBrandForeground2Hover: light-dark(#0f548c, #96c6fa);
  --colorBrandForeground2Pressed: light-dark(#0a2e4a, #ebf3fc);
  --colorNeutralForegroundInverted: light-dark(#ffffff, #242424);
  --colorNeutralForegroundInvertedHover: light-dark(#ffffff, #242424);
  --colorNeutralForegroundInvertedPressed: light-dark(#ffffff, #242424);
  --colorNeutralForegroundInvertedSelected: light-dark(#ffffff, #242424);
  --colorNeutralForegroundInverted2: light-dark(#ffffff, #242424);
  --colorBrandForegroundInverted: light-dark(#479ef5, #0f6cbd);
  --colorBrandForegroundInvertedHover: light-dark(#62abf5, #115ea3);
  --colorBrandForegroundInvertedPressed: light-dark(#479ef5, #0f548c);
  --colorNeutralBackground1: light-dark(#ffffff, #292929);
  --colorNeutralBackground1Hover: light-dark(#f5f5f5, #3d3d3d);
  --colorNeutralBackground1Pressed: light-dark(#e0e0e0, #1f1f1f);
  --colorNeutralBackground1Selected: light-dark(#ebebeb, #383838);
  --colorNeutralBackground2: light-dark(#fafafa, #1f1f1f);
  --colorNeutralBackground2Hover: light-dark(#f0f0f0, #333333);
  --colorNeutralBackground2Pressed: light-dark(#dbdbdb, #141414);
  --colorNeutralBackground2Selected: light-dark(#e6e6e6, #2e2e2e);
  --colorNeutralBackground3: light-dark(#f5f5f5, #141414);
  --colorNeutralBackground3Hover: light-dark(#ebebeb, #292929);
  --colorNeutralBackground3Pressed: light-dark(#d6d6d6, #0a0a0a);
  --colorNeutralBackground3Selected: light-dark(#e0e0e0, #242424);
  --colorNeutralBackground4: light-dark(#f0f0f0, #0a0a0a);
  --colorNeutralBackground4Hover: light-dark(#fafafa, #1f1f1f);
  --colorNeutralBackground4Pressed: light-dark(#f5f5f5, #000000);
  --colorNeutralBackground4Selected: light-dark(#ffffff, #1a1a1a);
  --colorNeutralBackground5: light-dark(#ebebeb, #000000);
  --colorNeutralBackground5Hover: light-dark(#f5f5f5, #141414);
  --colorNeutralBackground5Pressed: light-dark(#f0f0f0, #050505);
  --colorNeutralBackground5Selected: light-dark(#fafafa, #0f0f0f);
  --colorNeutralBackground6: light-dark(#e6e6e6, #333333);
  --colorNeutralBackground7Hover: light-dark(#ebebeb, #1a1a1a);
  --colorNeutralBackground7Pressed: light-dark(#d6d6d6, #0a0a0a);
  --colorNeutralBackground8: light-dark(#fcfcfc, #292929);
  --colorNeutralBackgroundInverted: light-dark(#292929, #ffffff);
  --colorNeutralBackgroundInvertedHover: light-dark(#3d3d3d, #f5f5f5);
  --colorNeutralBackgroundInvertedPressed: light-dark(#1f1f1f, #e0e0e0);
  --colorNeutralBackgroundInvertedSelected: light-dark(#383838, #ebebeb);
  --colorNeutralBackgroundStatic: light-dark(#333333, #3d3d3d);
  --colorNeutralBackgroundAlpha: light-dark(rgba(255, 255, 255, 0.5), rgba(26, 26, 26, 0.5));
  --colorNeutralBackgroundAlpha2: light-dark(rgba(255, 255, 255, 0.8), rgba(31, 31, 31, 0.7));
  --colorSubtleBackgroundHover: light-dark(#f5f5f5, #383838);
  --colorSubtleBackgroundPressed: light-dark(#e0e0e0, #2e2e2e);
  --colorSubtleBackgroundSelected: light-dark(#ebebeb, #333333);
  --colorSubtleBackgroundLightAlphaHover: light-dark(rgba(255, 255, 255, 0.7), rgba(36, 36, 36, 0.8));
  --colorSubtleBackgroundLightAlphaPressed: light-dark(rgba(255, 255, 255, 0.5), rgba(36, 36, 36, 0.5));
  --colorNeutralBackgroundDisabled: light-dark(#f0f0f0, #141414);
  --colorNeutralBackgroundDisabled2: light-dark(#ffffff, #292929);
  --colorNeutralStencil1: light-dark(#e6e6e6, #575757);
  --colorNeutralStencil2: light-dark(#fafafa, #333333);
  --colorNeutralStencil1Alpha: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
  --colorNeutralStencil2Alpha: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.05));
  --colorBackgroundOverlay: light-dark(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5));
  --colorScrollbarOverlay: light-dark(rgba(0, 0, 0, 0.5), rgba(255, 255, 255, 0.6));
  --colorBrandBackground: light-dark(#0f6cbd, #115ea3);
  --colorBrandBackgroundHover: light-dark(#115ea3, #0f6cbd);
  --colorCompoundBrandBackground: light-dark(#0f6cbd, #479ef5);
  --colorCompoundBrandBackgroundHover: light-dark(#115ea3, #62abf5);
  --colorCompoundBrandBackgroundPressed: light-dark(#0f548c, #2886de);
  --colorBrandBackground2: light-dark(#ebf3fc, #082338);
  --colorBrandBackground2Hover: light-dark(#cfe4fa, #0c3b5e);
  --colorBrandBackground2Pressed: light-dark(#96c6fa, #061724);
  --colorNeutralCardBackground: light-dark(#fafafa, #333333);
  --colorNeutralCardBackgroundHover: light-dark(#ffffff, #3d3d3d);
  --colorNeutralCardBackgroundPressed: light-dark(#f5f5f5, #2e2e2e);
  --colorNeutralCardBackgroundSelected: light-dark(#ebebeb, #383838);
  --colorNeutralCardBackgroundDisabled: light-dark(#f0f0f0, #141414);
  --colorNeutralStrokeAccessible: light-dark(#616161, #adadad);
  --colorNeutralStrokeAccessibleHover: light-dark(#575757, #bdbdbd);
  --colorNeutralStrokeAccessiblePressed: light-dark(#4d4d4d, #b3b3b3);
  --colorNeutralStrokeAccessibleSelected: light-dark(#0f6cbd, #479ef5);
  --colorNeutralStroke1: light-dark(#d1d1d1, #666666);
  --colorNeutralStroke1Hover: light-dark(#c7c7c7, #757575);
  --colorNeutralStroke1Pressed: light-dark(#b3b3b3, #6b6b6b);
  --colorNeutralStroke1Selected: light-dark(#bdbdbd, #707070);
  --colorNeutralStroke2: light-dark(#e0e0e0, #525252);
  --colorNeutralStroke3: light-dark(#f0f0f0, #3d3d3d);
  --colorNeutralStroke4: light-dark(#ebebeb, #3d3d3d);
  --colorNeutralStroke4Hover: light-dark(#e0e0e0, #2e2e2e);
  --colorNeutralStroke4Pressed: light-dark(#d6d6d6, #242424);
  --colorNeutralStroke4Selected: light-dark(#ebebeb, #3d3d3d);
  --colorNeutralStrokeSubtle: light-dark(#e0e0e0, #0a0a0a);
  --colorNeutralStrokeOnBrand: light-dark(#ffffff, #292929);
  --colorBrandStroke1: light-dark(#0f6cbd, #479ef5);
  --colorBrandStroke2: light-dark(#b4d6fa, #0e4775);
  --colorBrandStroke2Hover: light-dark(#77b7f7, #0e4775);
  --colorBrandStroke2Pressed: light-dark(#0f6cbd, #0a2e4a);
  --colorBrandStroke2Contrast: light-dark(#b4d6fa, #0e4775);
  --colorCompoundBrandStroke: light-dark(#0f6cbd, #479ef5);
  --colorCompoundBrandStrokeHover: light-dark(#115ea3, #62abf5);
  --colorCompoundBrandStrokePressed: light-dark(#0f548c, #2886de);
  --colorNeutralStrokeDisabled: light-dark(#e0e0e0, #424242);
  --colorNeutralStrokeDisabled2: light-dark(#ebebeb, #3d3d3d);
  --colorNeutralStrokeAlpha: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1));
  --colorStrokeFocus1: light-dark(#ffffff, #000000);
  --colorStrokeFocus2: light-dark(#000000, #ffffff);
  --colorNeutralShadowAmbient: light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24));
  --colorNeutralShadowKey: light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --colorNeutralShadowAmbientLighter: light-dark(rgba(0,0,0,0.06), rgba(0,0,0,0.12));
  --colorNeutralShadowKeyLighter: light-dark(rgba(0,0,0,0.07), rgba(0,0,0,0.14));
  --colorNeutralShadowAmbientDarker: light-dark(rgba(0,0,0,0.20), rgba(0,0,0,0.40));
  --colorNeutralShadowKeyDarker: light-dark(rgba(0,0,0,0.24), rgba(0,0,0,0.48));
  --colorPaletteRedBackground1: light-dark(#fdf6f6, #3f1011);
  --colorPaletteRedBackground2: light-dark(#f1bbbc, #751d1f);
  --colorPaletteRedForeground1: light-dark(#bc2f32, #e37d80);
  --colorPaletteRedForeground2: light-dark(#751d1f, #f1bbbc);
  --colorPaletteRedForeground3: light-dark(#d13438, #e37d80);
  --colorPaletteRedBorderActive: light-dark(#d13438, #e37d80);
  --colorPaletteRedBorder1: light-dark(#f1bbbc, #d13438);
  --colorPaletteRedBorder2: light-dark(#d13438, #e37d80);
  --colorPaletteGreenBackground1: light-dark(#f1faf1, #052505);
  --colorPaletteGreenBackground2: light-dark(#9fd89f, #094509);
  --colorPaletteGreenForeground1: light-dark(#0e700e, #54b054);
  --colorPaletteGreenForeground2: light-dark(#094509, #9fd89f);
  --colorPaletteGreenForeground3: light-dark(#107c10, #9fd89f);
  --colorPaletteGreenBorderActive: light-dark(#107c10, #54b054);
  --colorPaletteGreenBorder1: light-dark(#9fd89f, #107c10);
  --colorPaletteGreenBorder2: light-dark(#107c10, #9fd89f);
  --colorPaletteDarkOrangeBackground1: light-dark(#fdf6f3, #411200);
  --colorPaletteDarkOrangeBackground2: light-dark(#f4bfab, #7a2101);
  --colorPaletteDarkOrangeForeground1: light-dark(#c43501, #e9835e);
  --colorPaletteDarkOrangeForeground2: light-dark(#7a2101, #f4bfab);
  --colorPaletteDarkOrangeForeground3: light-dark(#da3b01, #e9835e);
  --colorPaletteDarkOrangeBorderActive: light-dark(#da3b01, #e9835e);
  --colorPaletteDarkOrangeBorder1: light-dark(#f4bfab, #da3b01);
  --colorPaletteDarkOrangeBorder2: light-dark(#da3b01, #e9835e);
  --colorPaletteYellowBackground1: light-dark(#fffef5, #4c4400);
  --colorPaletteYellowBackground2: light-dark(#fef7b2, #817400);
  --colorPaletteYellowForeground1: light-dark(#817400, #feee66);
  --colorPaletteYellowForeground2: light-dark(#817400, #fef7b2);
  --colorPaletteYellowForeground3: light-dark(#fde300, #fdea3d);
  --colorPaletteYellowBorderActive: light-dark(#fde300, #feee66);
  --colorPaletteYellowBorder1: light-dark(#fef7b2, #fde300);
  --colorPaletteYellowBorder2: light-dark(#fde300, #fdea3d);
  --colorPaletteBerryBackground1: light-dark(#fdf5fc, #3a1136);
  --colorPaletteBerryBackground2: light-dark(#edbbe7, #6d2064);
  --colorPaletteBerryForeground1: light-dark(#af33a1, #da7ed0);
  --colorPaletteBerryForeground2: light-dark(#6d2064, #edbbe7);
  --colorPaletteBerryForeground3: light-dark(#c239b3, #d161c4);
  --colorPaletteBerryBorderActive: light-dark(#c239b3, #da7ed0);
  --colorPaletteBerryBorder1: light-dark(#edbbe7, #c239b3);
  --colorPaletteBerryBorder2: light-dark(#c239b3, #d161c4);
  --colorPaletteLightGreenBackground1: light-dark(#f2fbf2, #063004);
  --colorPaletteLightGreenBackground2: light-dark(#a7e3a5, #0b5a08);
  --colorPaletteLightGreenForeground1: light-dark(#11910d, #5ec75a);
  --colorPaletteLightGreenForeground2: light-dark(#0b5a08, #a7e3a5);
  --colorPaletteLightGreenForeground3: light-dark(#13a10e, #3db838);
  --colorPaletteLightGreenBorderActive: light-dark(#13a10e, #5ec75a);
  --colorPaletteLightGreenBorder1: light-dark(#a7e3a5, #13a10e);
  --colorPaletteLightGreenBorder2: light-dark(#13a10e, #3db838);
  --colorPaletteMarigoldBackground1: light-dark(#fefbf4, #463100);
  --colorPaletteMarigoldBackground2: light-dark(#f9e2ae, #835b00);
  --colorPaletteMarigoldForeground1: light-dark(#d39300, #f2c661);
  --colorPaletteMarigoldForeground2: light-dark(#835b00, #f9e2ae);
  --colorPaletteMarigoldForeground3: light-dark(#eaa300, #efb839);
  --colorPaletteMarigoldBorderActive: light-dark(#eaa300, #f2c661);
  --colorPaletteMarigoldBorder1: light-dark(#f9e2ae, #eaa300);
  --colorPaletteMarigoldBorder2: light-dark(#eaa300, #efb839);
  --colorPaletteRedForegroundInverted: light-dark(#dc5e62, #d13438);
  --colorPaletteGreenForegroundInverted: light-dark(#359b35, #107c10);
  --colorPaletteYellowForegroundInverted: light-dark(#fef7b2, #817400);
  --colorPaletteDarkRedBackground2: light-dark(#d69ca5, #590815);
  --colorPaletteDarkRedForeground2: light-dark(#420610, #d69ca5);
  --colorPaletteDarkRedBorderActive: light-dark(#750b1c, #ac4f5e);
  --colorPaletteCranberryBackground2: light-dark(#eeacb2, #6e0811);
  --colorPaletteCranberryForeground2: light-dark(#6e0811, #eeacb2);
  --colorPaletteCranberryBorderActive: light-dark(#c50f1f, #dc626d);
  --colorPalettePumpkinBackground2: light-dark(#efc4ad, #712d09);
  --colorPalettePumpkinForeground2: light-dark(#712d09, #efc4ad);
  --colorPalettePumpkinBorderActive: light-dark(#ca5010, #df8e64);
  --colorPalettePeachBackground2: light-dark(#ffddb3, #8f4e00);
  --colorPalettePeachForeground2: light-dark(#8f4e00, #ffddb3);
  --colorPalettePeachBorderActive: light-dark(#ff8c00, #ffba66);
  --colorPaletteGoldBackground2: light-dark(#ecdfa5, #6c5700);
  --colorPaletteGoldForeground2: light-dark(#6c5700, #ecdfa5);
  --colorPaletteGoldBorderActive: light-dark(#c19c00, #dac157);
  --colorPaletteBrassBackground2: light-dark(#e0cea2, #553e06);
  --colorPaletteBrassForeground2: light-dark(#553e06, #e0cea2);
  --colorPaletteBrassBorderActive: light-dark(#986f0b, #c1a256);
  --colorPaletteBrownBackground2: light-dark(#ddc3b0, #50301a);
  --colorPaletteBrownForeground2: light-dark(#50301a, #ddc3b0);
  --colorPaletteBrownBorderActive: light-dark(#8e562e, #bb8f6f);
  --colorPaletteForestBackground2: light-dark(#bdd99b, #294903);
  --colorPaletteForestForeground2: light-dark(#294903, #bdd99b);
  --colorPaletteForestBorderActive: light-dark(#498205, #85b44c);
  --colorPaletteSeafoamBackground2: light-dark(#a8f0cd, #00723b);
  --colorPaletteSeafoamForeground2: light-dark(#00723b, #a8f0cd);
  --colorPaletteSeafoamBorderActive: light-dark(#00cc6a, #5ae0a0);
  --colorPaletteDarkGreenBackground2: light-dark(#9ad29a, #063b06);
  --colorPaletteDarkGreenForeground2: light-dark(#063b06, #9ad29a);
  --colorPaletteDarkGreenBorderActive: light-dark(#0b6a0b, #4da64d);
  --colorPaletteLightTealBackground2: light-dark(#a6e9ed, #00666d);
  --colorPaletteLightTealForeground2: light-dark(#00666d, #a6e9ed);
  --colorPaletteLightTealBorderActive: light-dark(#00b7c3, #58d3db);
  --colorPaletteTealBackground2: light-dark(#9bd9db, #02494c);
  --colorPaletteTealForeground2: light-dark(#02494c, #9bd9db);
  --colorPaletteTealBorderActive: light-dark(#038387, #4cb4b7);
  --colorPaletteSteelBackground2: light-dark(#94c8d4, #00333f);
  --colorPaletteSteelForeground2: light-dark(#00333f, #94c8d4);
  --colorPaletteSteelBorderActive: light-dark(#005b70, #4496a9);
  --colorPaletteBlueBackground2: light-dark(#a9d3f2, #004377);
  --colorPaletteBlueForeground2: light-dark(#004377, #a9d3f2);
  --colorPaletteBlueBorderActive: light-dark(#0078d4, #5caae5);
  --colorPaletteRoyalBlueBackground2: light-dark(#9abfdc, #002c4e);
  --colorPaletteRoyalBlueForeground2: light-dark(#002c4e, #9abfdc);
  --colorPaletteRoyalBlueBorderActive: light-dark(#004e8c, #4a89ba);
  --colorPaletteCornflowerBackground2: light-dark(#c8d1fa, #2c3c85);
  --colorPaletteCornflowerForeground2: light-dark(#2c3c85, #c8d1fa);
  --colorPaletteCornflowerBorderActive: light-dark(#4f6bed, #93a4f4);
  --colorPaletteNavyBackground2: light-dark(#a3b2e8, #001665);
  --colorPaletteNavyForeground2: light-dark(#001665, #a3b2e8);
  --colorPaletteNavyBorderActive: light-dark(#0027b4, #546fd2);
  --colorPaletteLavenderBackground2: light-dark(#d2ccf8, #3f3682);
  --colorPaletteLavenderForeground2: light-dark(#3f3682, #d2ccf8);
  --colorPaletteLavenderBorderActive: light-dark(#7160e8, #a79cf1);
  --colorPalettePurpleBackground2: light-dark(#c6b1de, #341a51);
  --colorPalettePurpleForeground2: light-dark(#341a51, #c6b1de);
  --colorPalettePurpleBorderActive: light-dark(#5c2e91, #9470bd);
  --colorPaletteGrapeBackground2: light-dark(#d9a7e0, #4c0d55);
  --colorPaletteGrapeForeground2: light-dark(#4c0d55, #d9a7e0);
  --colorPaletteGrapeBorderActive: light-dark(#881798, #b55fc1);
  --colorPaletteLilacBackground2: light-dark(#e6bfed, #63276d);
  --colorPaletteLilacForeground2: light-dark(#63276d, #e6bfed);
  --colorPaletteLilacBorderActive: light-dark(#b146c2, #cf87da);
  --colorPalettePinkBackground2: light-dark(#f7c0e3, #80215d);
  --colorPalettePinkForeground2: light-dark(#80215d, #f7c0e3);
  --colorPalettePinkBorderActive: light-dark(#e43ba6, #ef85c8);
  --colorPaletteMagentaBackground2: light-dark(#eca5d1, #6b0043);
  --colorPaletteMagentaForeground2: light-dark(#6b0043, #eca5d1);
  --colorPaletteMagentaBorderActive: light-dark(#bf0077, #d957a8);
  --colorPalettePlumBackground2: light-dark(#d696c0, #5a003b);
  --colorPalettePlumForeground2: light-dark(#43002b, #d696c0);
  --colorPalettePlumBorderActive: light-dark(#77004d, #ad4589);
  --colorPaletteBeigeBackground2: light-dark(#d7d4d4, #444241);
  --colorPaletteBeigeForeground2: light-dark(#444241, #d7d4d4);
  --colorPaletteBeigeBorderActive: light-dark(#7a7574, #afabaa);
  --colorPaletteMinkBackground2: light-dark(#cecccb, #343231);
  --colorPaletteMinkForeground2: light-dark(#343231, #cecccb);
  --colorPaletteMinkBorderActive: light-dark(#5d5a58, #9e9b99);
  --colorPalettePlatinumBackground2: light-dark(#cdd6d8, #3b4447);
  --colorPalettePlatinumForeground2: light-dark(#3b4447, #cdd6d8);
  --colorPalettePlatinumBorderActive: light-dark(#69797e, #a0adb2);
  --colorPaletteAnchorBackground2: light-dark(#bcc3c7, #202427);
  --colorPaletteAnchorForeground2: light-dark(#202427, #bcc3c7);
  --colorPaletteAnchorBorderActive: light-dark(#394146, #808a90);
  --colorStatusSuccessBackground1: light-dark(#f1faf1, #052505);
  --colorStatusSuccessBackground2: light-dark(#9fd89f, #094509);
  --colorStatusSuccessForeground1: light-dark(#0e700e, #54b054);
  --colorStatusSuccessForeground2: light-dark(#094509, #9fd89f);
  --colorStatusSuccessForeground3: light-dark(#107c10, #9fd89f);
  --colorStatusSuccessForegroundInverted: light-dark(#54b054, #0e700e);
  --colorStatusSuccessBorderActive: light-dark(#107c10, #54b054);
  --colorStatusSuccessBorder1: light-dark(#9fd89f, #107c10);
  --colorStatusSuccessBorder2: light-dark(#107c10, #9fd89f);
  --colorStatusWarningBackground1: light-dark(#fff9f5, #4a1e04);
  --colorStatusWarningBackground2: light-dark(#fdcfb4, #8a3707);
  --colorStatusWarningForeground1: light-dark(#bc4b09, #faa06b);
  --colorStatusWarningForeground2: light-dark(#8a3707, #fdcfb4);
  --colorStatusWarningForeground3: light-dark(#bc4b09, #f98845);
  --colorStatusWarningForegroundInverted: light-dark(#faa06b, #bc4b09);
  --colorStatusWarningBorderActive: light-dark(#f7630c, #faa06b);
  --colorStatusWarningBorder1: light-dark(#fdcfb4, #f7630c);
  --colorStatusWarningBorder2: light-dark(#bc4b09, #f98845);
  --colorStatusDangerBackground1: light-dark(#fdf3f4, #3b0509);
  --colorStatusDangerBackground2: light-dark(#eeacb2, #6e0811);
  --colorStatusDangerForeground1: light-dark(#b10e1c, #dc626d);
  --colorStatusDangerForeground2: light-dark(#6e0811, #eeacb2);
  --colorStatusDangerForeground3: light-dark(#c50f1f, #eeacb2);
  --colorStatusDangerForegroundInverted: light-dark(#dc626d, #b10e1c);
  --colorStatusDangerBorderActive: light-dark(#c50f1f, #dc626d);
  --colorStatusDangerBorder1: light-dark(#eeacb2, #c50f1f);
  --colorStatusDangerBorder2: light-dark(#c50f1f, #dc626d);
  --shadow2: 0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 1px 2px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --shadow4: 0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 2px 4px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --shadow8: 0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 4px 8px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --shadow16: 0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 8px 16px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --shadow28: 0 0 8px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 14px 28px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --shadow64: 0 0 8px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), 0 32px 64px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));
  --layerFillColorDefault: light-dark(rgba(255, 255, 255, 0.502), rgba(58, 58, 58, 0.298));
  --layerFillColorAlt: light-dark(#ffffff, rgba(255, 255, 255, 0.051));
  --layerOnAcrylicFillColorDefault: light-dark(rgba(255, 255, 255, 0.251), rgba(255, 255, 255, 0.035));
  --layerOnMicaBaseAltFillColorDefault: light-dark(rgba(255, 255, 255, 0.702), rgba(58, 58, 58, 0.451));
  --layerOnMicaBaseAltFillColorSecondary: light-dark(rgba(0, 0, 0, 0.039), rgba(255, 255, 255, 0.059));
  --layerOnMicaBaseAltFillColorTransparent: light-dark(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0));
  --solidBackgroundFillColorTertiary: light-dark(#f9f9f9, #282828);
  --surfaceStrokeColorFlyout: light-dark(rgba(0, 0, 0, 0.059), rgba(0, 0, 0, 0.2));
  --dividerStrokeColorDefault: light-dark(rgba(0, 0, 0, 0.059), rgba(255, 255, 255, 0.082));
  --layerOnMicaBaseAltFillColorTertiary: light-dark(#f9f9f9, #2c2c2c);
  --cardBackgroundFillColorDefault: light-dark(rgba(255, 255, 255, 0.702), rgba(255, 255, 255, 0.051));
  --subtleFillColorSecondary: light-dark(rgba(0, 0, 0, 0.035), rgba(255, 255, 255, 0.059));
  --subtleFillColorTertiary: light-dark(rgba(0, 0, 0, 0.024), rgba(255, 255, 255, 0.039));
  --acrylicBackgroundFillColorDefault: light-dark(#f9f9f9, #2c2c2c);
  --acrylicInAppFillColorDefault: light-dark(#f9f9f9, #2c2c2c);
  --acrylicBackgroundFillColorBase: light-dark(#eeeeee, #1c1c1c);
  --acrylicInAppFillColorBase: light-dark(#eeeeee, #1c1c1c);
  --acrylicTintColorDefault: light-dark(rgba(252, 252, 252, 0), rgba(44, 44, 44, 0.15));
  --acrylicTintLuminosityColorDefault: light-dark(rgba(252, 252, 252, 0.85), rgba(44, 44, 44, 0.96));
  --acrylicTintColorBase: light-dark(rgba(243, 243, 243, 0), rgba(32, 32, 32, 0.5));
  --acrylicTintLuminosityColorBase: light-dark(rgba(243, 243, 243, 0.9), rgba(32, 32, 32, 0.96));
  --micaBackgroundFillColorBase: light-dark(#f3f3f3, #202020);
  --micaBackgroundFillColorBaseAlt: light-dark(#dadada, #0a0a0a);
  --controlFillColorSecondary: light-dark(rgba(249, 249, 249, 0.502), rgba(255, 255, 255, 0.082));
  --controlFillColorTertiary: light-dark(rgba(249, 249, 249, 0.302), rgba(255, 255, 255, 0.031));
  --controlStrokeColorDefault: light-dark(rgba(0, 0, 0, 0.059), rgba(255, 255, 255, 0.071));
}
`

const themeColors = {
    'colorNeutralForeground1': 'var(--colorNeutralForeground1)',
    'colorNeutralForeground1Hover': 'var(--colorNeutralForeground1Hover)',
    'colorNeutralForeground1Pressed': 'var(--colorNeutralForeground1Pressed)',
    'colorNeutralForeground1Selected': 'var(--colorNeutralForeground1Selected)',
    'colorNeutralForeground2': 'var(--colorNeutralForeground2)',
    'colorNeutralForeground2Hover': 'var(--colorNeutralForeground2Hover)',
    'colorNeutralForeground2Pressed': 'var(--colorNeutralForeground2Pressed)',
    'colorNeutralForeground2Selected': 'var(--colorNeutralForeground2Selected)',
    'colorNeutralForeground2BrandHover': 'var(--colorNeutralForeground2BrandHover)',
    'colorNeutralForeground2BrandPressed': 'var(--colorNeutralForeground2BrandPressed)',
    'colorNeutralForeground2BrandSelected': 'var(--colorNeutralForeground2BrandSelected)',
    'colorNeutralForeground3': 'var(--colorNeutralForeground3)',
    'colorNeutralForeground3Hover': 'var(--colorNeutralForeground3Hover)',
    'colorNeutralForeground3Pressed': 'var(--colorNeutralForeground3Pressed)',
    'colorNeutralForeground3Selected': 'var(--colorNeutralForeground3Selected)',
    'colorNeutralForeground3BrandHover': 'var(--colorNeutralForeground3BrandHover)',
    'colorNeutralForeground3BrandPressed': 'var(--colorNeutralForeground3BrandPressed)',
    'colorNeutralForeground3BrandSelected': 'var(--colorNeutralForeground3BrandSelected)',
    'colorNeutralForeground4': 'var(--colorNeutralForeground4)',
    'colorNeutralForeground5': 'var(--colorNeutralForeground5)',
    'colorNeutralForeground5Hover': 'var(--colorNeutralForeground5Hover)',
    'colorNeutralForeground5Pressed': 'var(--colorNeutralForeground5Pressed)',
    'colorNeutralForeground5Selected': 'var(--colorNeutralForeground5Selected)',
    'colorNeutralForegroundDisabled': 'var(--colorNeutralForegroundDisabled)',
    'colorNeutralForegroundInvertedDisabled': 'var(--colorNeutralForegroundInvertedDisabled)',
    'colorBrandForegroundLink': 'var(--colorBrandForegroundLink)',
    'colorBrandForegroundLinkHover': 'var(--colorBrandForegroundLinkHover)',
    'colorBrandForegroundLinkPressed': 'var(--colorBrandForegroundLinkPressed)',
    'colorBrandForegroundLinkSelected': 'var(--colorBrandForegroundLinkSelected)',
    'colorNeutralForeground2Link': 'var(--colorNeutralForeground2Link)',
    'colorNeutralForeground2LinkHover': 'var(--colorNeutralForeground2LinkHover)',
    'colorNeutralForeground2LinkPressed': 'var(--colorNeutralForeground2LinkPressed)',
    'colorNeutralForeground2LinkSelected': 'var(--colorNeutralForeground2LinkSelected)',
    'colorCompoundBrandForeground1': 'var(--colorCompoundBrandForeground1)',
    'colorCompoundBrandForeground1Hover': 'var(--colorCompoundBrandForeground1Hover)',
    'colorCompoundBrandForeground1Pressed': 'var(--colorCompoundBrandForeground1Pressed)',
    'colorBrandForeground1': 'var(--colorBrandForeground1)',
    'colorBrandForeground2': 'var(--colorBrandForeground2)',
    'colorBrandForeground2Hover': 'var(--colorBrandForeground2Hover)',
    'colorBrandForeground2Pressed': 'var(--colorBrandForeground2Pressed)',
    'colorNeutralForeground1Static': 'var(--colorNeutralForeground1Static)',
    'colorNeutralForegroundStaticInverted': 'var(--colorNeutralForegroundStaticInverted)',
    'colorNeutralForegroundInverted': 'var(--colorNeutralForegroundInverted)',
    'colorNeutralForegroundInvertedHover': 'var(--colorNeutralForegroundInvertedHover)',
    'colorNeutralForegroundInvertedPressed': 'var(--colorNeutralForegroundInvertedPressed)',
    'colorNeutralForegroundInvertedSelected': 'var(--colorNeutralForegroundInvertedSelected)',
    'colorNeutralForegroundInverted2': 'var(--colorNeutralForegroundInverted2)',
    'colorNeutralForegroundOnBrand': 'var(--colorNeutralForegroundOnBrand)',
    'colorNeutralForegroundInvertedLink': 'var(--colorNeutralForegroundInvertedLink)',
    'colorNeutralForegroundInvertedLinkHover': 'var(--colorNeutralForegroundInvertedLinkHover)',
    'colorNeutralForegroundInvertedLinkPressed': 'var(--colorNeutralForegroundInvertedLinkPressed)',
    'colorNeutralForegroundInvertedLinkSelected': 'var(--colorNeutralForegroundInvertedLinkSelected)',
    'colorBrandForegroundInverted': 'var(--colorBrandForegroundInverted)',
    'colorBrandForegroundInvertedHover': 'var(--colorBrandForegroundInvertedHover)',
    'colorBrandForegroundInvertedPressed': 'var(--colorBrandForegroundInvertedPressed)',
    'colorBrandForegroundOnLight': 'var(--colorBrandForegroundOnLight)',
    'colorBrandForegroundOnLightHover': 'var(--colorBrandForegroundOnLightHover)',
    'colorBrandForegroundOnLightPressed': 'var(--colorBrandForegroundOnLightPressed)',
    'colorBrandForegroundOnLightSelected': 'var(--colorBrandForegroundOnLightSelected)',
    'colorNeutralBackground1': 'var(--colorNeutralBackground1)',
    'colorNeutralBackground1Hover': 'var(--colorNeutralBackground1Hover)',
    'colorNeutralBackground1Pressed': 'var(--colorNeutralBackground1Pressed)',
    'colorNeutralBackground1Selected': 'var(--colorNeutralBackground1Selected)',
    'colorNeutralBackground2': 'var(--colorNeutralBackground2)',
    'colorNeutralBackground2Hover': 'var(--colorNeutralBackground2Hover)',
    'colorNeutralBackground2Pressed': 'var(--colorNeutralBackground2Pressed)',
    'colorNeutralBackground2Selected': 'var(--colorNeutralBackground2Selected)',
    'colorNeutralBackground3': 'var(--colorNeutralBackground3)',
    'colorNeutralBackground3Hover': 'var(--colorNeutralBackground3Hover)',
    'colorNeutralBackground3Pressed': 'var(--colorNeutralBackground3Pressed)',
    'colorNeutralBackground3Selected': 'var(--colorNeutralBackground3Selected)',
    'colorNeutralBackground4': 'var(--colorNeutralBackground4)',
    'colorNeutralBackground4Hover': 'var(--colorNeutralBackground4Hover)',
    'colorNeutralBackground4Pressed': 'var(--colorNeutralBackground4Pressed)',
    'colorNeutralBackground4Selected': 'var(--colorNeutralBackground4Selected)',
    'colorNeutralBackground5': 'var(--colorNeutralBackground5)',
    'colorNeutralBackground5Hover': 'var(--colorNeutralBackground5Hover)',
    'colorNeutralBackground5Pressed': 'var(--colorNeutralBackground5Pressed)',
    'colorNeutralBackground5Selected': 'var(--colorNeutralBackground5Selected)',
    'colorNeutralBackground6': 'var(--colorNeutralBackground6)',
    'colorNeutralBackground7': 'var(--colorNeutralBackground7)',
    'colorNeutralBackground7Hover': 'var(--colorNeutralBackground7Hover)',
    'colorNeutralBackground7Pressed': 'var(--colorNeutralBackground7Pressed)',
    'colorNeutralBackground7Selected': 'var(--colorNeutralBackground7Selected)',
    'colorNeutralBackground8': 'var(--colorNeutralBackground8)',
    'colorNeutralBackgroundInverted': 'var(--colorNeutralBackgroundInverted)',
    'colorNeutralBackgroundInvertedHover': 'var(--colorNeutralBackgroundInvertedHover)',
    'colorNeutralBackgroundInvertedPressed': 'var(--colorNeutralBackgroundInvertedPressed)',
    'colorNeutralBackgroundInvertedSelected': 'var(--colorNeutralBackgroundInvertedSelected)',
    'colorNeutralBackgroundStatic': 'var(--colorNeutralBackgroundStatic)',
    'colorNeutralBackgroundAlpha': 'var(--colorNeutralBackgroundAlpha)',
    'colorNeutralBackgroundAlpha2': 'var(--colorNeutralBackgroundAlpha2)',
    'colorSubtleBackground': 'var(--colorSubtleBackground)',
    'colorSubtleBackgroundHover': 'var(--colorSubtleBackgroundHover)',
    'colorSubtleBackgroundPressed': 'var(--colorSubtleBackgroundPressed)',
    'colorSubtleBackgroundSelected': 'var(--colorSubtleBackgroundSelected)',
    'colorSubtleBackgroundLightAlphaHover': 'var(--colorSubtleBackgroundLightAlphaHover)',
    'colorSubtleBackgroundLightAlphaPressed': 'var(--colorSubtleBackgroundLightAlphaPressed)',
    'colorSubtleBackgroundLightAlphaSelected': 'var(--colorSubtleBackgroundLightAlphaSelected)',
    'colorSubtleBackgroundInverted': 'var(--colorSubtleBackgroundInverted)',
    'colorSubtleBackgroundInvertedHover': 'var(--colorSubtleBackgroundInvertedHover)',
    'colorSubtleBackgroundInvertedPressed': 'var(--colorSubtleBackgroundInvertedPressed)',
    'colorSubtleBackgroundInvertedSelected': 'var(--colorSubtleBackgroundInvertedSelected)',
    'colorTransparentBackground': 'var(--colorTransparentBackground)',
    'colorTransparentBackgroundHover': 'var(--colorTransparentBackgroundHover)',
    'colorTransparentBackgroundPressed': 'var(--colorTransparentBackgroundPressed)',
    'colorTransparentBackgroundSelected': 'var(--colorTransparentBackgroundSelected)',
    'colorNeutralBackgroundDisabled': 'var(--colorNeutralBackgroundDisabled)',
    'colorNeutralBackgroundDisabled2': 'var(--colorNeutralBackgroundDisabled2)',
    'colorNeutralBackgroundInvertedDisabled': 'var(--colorNeutralBackgroundInvertedDisabled)',
    'colorNeutralStencil1': 'var(--colorNeutralStencil1)',
    'colorNeutralStencil2': 'var(--colorNeutralStencil2)',
    'colorNeutralStencil1Alpha': 'var(--colorNeutralStencil1Alpha)',
    'colorNeutralStencil2Alpha': 'var(--colorNeutralStencil2Alpha)',
    'colorBackgroundOverlay': 'var(--colorBackgroundOverlay)',
    'colorScrollbarOverlay': 'var(--colorScrollbarOverlay)',
    'colorBrandBackground': 'var(--colorBrandBackground)',
    'colorBrandBackgroundHover': 'var(--colorBrandBackgroundHover)',
    'colorBrandBackgroundPressed': 'var(--colorBrandBackgroundPressed)',
    'colorBrandBackgroundSelected': 'var(--colorBrandBackgroundSelected)',
    'colorCompoundBrandBackground': 'var(--colorCompoundBrandBackground)',
    'colorCompoundBrandBackgroundHover': 'var(--colorCompoundBrandBackgroundHover)',
    'colorCompoundBrandBackgroundPressed': 'var(--colorCompoundBrandBackgroundPressed)',
    'colorBrandBackgroundStatic': 'var(--colorBrandBackgroundStatic)',
    'colorBrandBackground2': 'var(--colorBrandBackground2)',
    'colorBrandBackground2Hover': 'var(--colorBrandBackground2Hover)',
    'colorBrandBackground2Pressed': 'var(--colorBrandBackground2Pressed)',
    'colorBrandBackground3Static': 'var(--colorBrandBackground3Static)',
    'colorBrandBackground4Static': 'var(--colorBrandBackground4Static)',
    'colorBrandBackgroundInverted': 'var(--colorBrandBackgroundInverted)',
    'colorBrandBackgroundInvertedHover': 'var(--colorBrandBackgroundInvertedHover)',
    'colorBrandBackgroundInvertedPressed': 'var(--colorBrandBackgroundInvertedPressed)',
    'colorBrandBackgroundInvertedSelected': 'var(--colorBrandBackgroundInvertedSelected)',
    'colorNeutralCardBackground': 'var(--colorNeutralCardBackground)',
    'colorNeutralCardBackgroundHover': 'var(--colorNeutralCardBackgroundHover)',
    'colorNeutralCardBackgroundPressed': 'var(--colorNeutralCardBackgroundPressed)',
    'colorNeutralCardBackgroundSelected': 'var(--colorNeutralCardBackgroundSelected)',
    'colorNeutralCardBackgroundDisabled': 'var(--colorNeutralCardBackgroundDisabled)',
    'colorNeutralStrokeAccessible': 'var(--colorNeutralStrokeAccessible)',
    'colorNeutralStrokeAccessibleHover': 'var(--colorNeutralStrokeAccessibleHover)',
    'colorNeutralStrokeAccessiblePressed': 'var(--colorNeutralStrokeAccessiblePressed)',
    'colorNeutralStrokeAccessibleSelected': 'var(--colorNeutralStrokeAccessibleSelected)',
    'colorNeutralStroke1': 'var(--colorNeutralStroke1)',
    'colorNeutralStroke1Hover': 'var(--colorNeutralStroke1Hover)',
    'colorNeutralStroke1Pressed': 'var(--colorNeutralStroke1Pressed)',
    'colorNeutralStroke1Selected': 'var(--colorNeutralStroke1Selected)',
    'colorNeutralStroke2': 'var(--colorNeutralStroke2)',
    'colorNeutralStroke3': 'var(--colorNeutralStroke3)',
    'colorNeutralStroke4': 'var(--colorNeutralStroke4)',
    'colorNeutralStroke4Hover': 'var(--colorNeutralStroke4Hover)',
    'colorNeutralStroke4Pressed': 'var(--colorNeutralStroke4Pressed)',
    'colorNeutralStroke4Selected': 'var(--colorNeutralStroke4Selected)',
    'colorNeutralStrokeSubtle': 'var(--colorNeutralStrokeSubtle)',
    'colorNeutralStrokeOnBrand': 'var(--colorNeutralStrokeOnBrand)',
    'colorNeutralStrokeOnBrand2': 'var(--colorNeutralStrokeOnBrand2)',
    'colorNeutralStrokeOnBrand2Hover': 'var(--colorNeutralStrokeOnBrand2Hover)',
    'colorNeutralStrokeOnBrand2Pressed': 'var(--colorNeutralStrokeOnBrand2Pressed)',
    'colorNeutralStrokeOnBrand2Selected': 'var(--colorNeutralStrokeOnBrand2Selected)',
    'colorBrandStroke1': 'var(--colorBrandStroke1)',
    'colorBrandStroke2': 'var(--colorBrandStroke2)',
    'colorBrandStroke2Hover': 'var(--colorBrandStroke2Hover)',
    'colorBrandStroke2Pressed': 'var(--colorBrandStroke2Pressed)',
    'colorBrandStroke2Contrast': 'var(--colorBrandStroke2Contrast)',
    'colorCompoundBrandStroke': 'var(--colorCompoundBrandStroke)',
    'colorCompoundBrandStrokeHover': 'var(--colorCompoundBrandStrokeHover)',
    'colorCompoundBrandStrokePressed': 'var(--colorCompoundBrandStrokePressed)',
    'colorNeutralStrokeDisabled': 'var(--colorNeutralStrokeDisabled)',
    'colorNeutralStrokeDisabled2': 'var(--colorNeutralStrokeDisabled2)',
    'colorNeutralStrokeInvertedDisabled': 'var(--colorNeutralStrokeInvertedDisabled)',
    'colorTransparentStroke': 'var(--colorTransparentStroke)',
    'colorTransparentStrokeInteractive': 'var(--colorTransparentStrokeInteractive)',
    'colorTransparentStrokeDisabled': 'var(--colorTransparentStrokeDisabled)',
    'colorNeutralStrokeAlpha': 'var(--colorNeutralStrokeAlpha)',
    'colorNeutralStrokeAlpha2': 'var(--colorNeutralStrokeAlpha2)',
    'colorStrokeFocus1': 'var(--colorStrokeFocus1)',
    'colorStrokeFocus2': 'var(--colorStrokeFocus2)',
    'colorNeutralShadowAmbient': 'var(--colorNeutralShadowAmbient)',
    'colorNeutralShadowKey': 'var(--colorNeutralShadowKey)',
    'colorNeutralShadowAmbientLighter': 'var(--colorNeutralShadowAmbientLighter)',
    'colorNeutralShadowKeyLighter': 'var(--colorNeutralShadowKeyLighter)',
    'colorNeutralShadowAmbientDarker': 'var(--colorNeutralShadowAmbientDarker)',
    'colorNeutralShadowKeyDarker': 'var(--colorNeutralShadowKeyDarker)',
    'colorBrandShadowAmbient': 'var(--colorBrandShadowAmbient)',
    'colorBrandShadowKey': 'var(--colorBrandShadowKey)',
    'colorPaletteRedBackground1': 'var(--colorPaletteRedBackground1)',
    'colorPaletteRedBackground2': 'var(--colorPaletteRedBackground2)',
    'colorPaletteRedBackground3': 'var(--colorPaletteRedBackground3)',
    'colorPaletteRedForeground1': 'var(--colorPaletteRedForeground1)',
    'colorPaletteRedForeground2': 'var(--colorPaletteRedForeground2)',
    'colorPaletteRedForeground3': 'var(--colorPaletteRedForeground3)',
    'colorPaletteRedBorderActive': 'var(--colorPaletteRedBorderActive)',
    'colorPaletteRedBorder1': 'var(--colorPaletteRedBorder1)',
    'colorPaletteRedBorder2': 'var(--colorPaletteRedBorder2)',
    'colorPaletteGreenBackground1': 'var(--colorPaletteGreenBackground1)',
    'colorPaletteGreenBackground2': 'var(--colorPaletteGreenBackground2)',
    'colorPaletteGreenBackground3': 'var(--colorPaletteGreenBackground3)',
    'colorPaletteGreenForeground1': 'var(--colorPaletteGreenForeground1)',
    'colorPaletteGreenForeground2': 'var(--colorPaletteGreenForeground2)',
    'colorPaletteGreenForeground3': 'var(--colorPaletteGreenForeground3)',
    'colorPaletteGreenBorderActive': 'var(--colorPaletteGreenBorderActive)',
    'colorPaletteGreenBorder1': 'var(--colorPaletteGreenBorder1)',
    'colorPaletteGreenBorder2': 'var(--colorPaletteGreenBorder2)',
    'colorPaletteDarkOrangeBackground1': 'var(--colorPaletteDarkOrangeBackground1)',
    'colorPaletteDarkOrangeBackground2': 'var(--colorPaletteDarkOrangeBackground2)',
    'colorPaletteDarkOrangeBackground3': 'var(--colorPaletteDarkOrangeBackground3)',
    'colorPaletteDarkOrangeForeground1': 'var(--colorPaletteDarkOrangeForeground1)',
    'colorPaletteDarkOrangeForeground2': 'var(--colorPaletteDarkOrangeForeground2)',
    'colorPaletteDarkOrangeForeground3': 'var(--colorPaletteDarkOrangeForeground3)',
    'colorPaletteDarkOrangeBorderActive': 'var(--colorPaletteDarkOrangeBorderActive)',
    'colorPaletteDarkOrangeBorder1': 'var(--colorPaletteDarkOrangeBorder1)',
    'colorPaletteDarkOrangeBorder2': 'var(--colorPaletteDarkOrangeBorder2)',
    'colorPaletteYellowBackground1': 'var(--colorPaletteYellowBackground1)',
    'colorPaletteYellowBackground2': 'var(--colorPaletteYellowBackground2)',
    'colorPaletteYellowBackground3': 'var(--colorPaletteYellowBackground3)',
    'colorPaletteYellowForeground1': 'var(--colorPaletteYellowForeground1)',
    'colorPaletteYellowForeground2': 'var(--colorPaletteYellowForeground2)',
    'colorPaletteYellowForeground3': 'var(--colorPaletteYellowForeground3)',
    'colorPaletteYellowBorderActive': 'var(--colorPaletteYellowBorderActive)',
    'colorPaletteYellowBorder1': 'var(--colorPaletteYellowBorder1)',
    'colorPaletteYellowBorder2': 'var(--colorPaletteYellowBorder2)',
    'colorPaletteBerryBackground1': 'var(--colorPaletteBerryBackground1)',
    'colorPaletteBerryBackground2': 'var(--colorPaletteBerryBackground2)',
    'colorPaletteBerryBackground3': 'var(--colorPaletteBerryBackground3)',
    'colorPaletteBerryForeground1': 'var(--colorPaletteBerryForeground1)',
    'colorPaletteBerryForeground2': 'var(--colorPaletteBerryForeground2)',
    'colorPaletteBerryForeground3': 'var(--colorPaletteBerryForeground3)',
    'colorPaletteBerryBorderActive': 'var(--colorPaletteBerryBorderActive)',
    'colorPaletteBerryBorder1': 'var(--colorPaletteBerryBorder1)',
    'colorPaletteBerryBorder2': 'var(--colorPaletteBerryBorder2)',
    'colorPaletteLightGreenBackground1': 'var(--colorPaletteLightGreenBackground1)',
    'colorPaletteLightGreenBackground2': 'var(--colorPaletteLightGreenBackground2)',
    'colorPaletteLightGreenBackground3': 'var(--colorPaletteLightGreenBackground3)',
    'colorPaletteLightGreenForeground1': 'var(--colorPaletteLightGreenForeground1)',
    'colorPaletteLightGreenForeground2': 'var(--colorPaletteLightGreenForeground2)',
    'colorPaletteLightGreenForeground3': 'var(--colorPaletteLightGreenForeground3)',
    'colorPaletteLightGreenBorderActive': 'var(--colorPaletteLightGreenBorderActive)',
    'colorPaletteLightGreenBorder1': 'var(--colorPaletteLightGreenBorder1)',
    'colorPaletteLightGreenBorder2': 'var(--colorPaletteLightGreenBorder2)',
    'colorPaletteMarigoldBackground1': 'var(--colorPaletteMarigoldBackground1)',
    'colorPaletteMarigoldBackground2': 'var(--colorPaletteMarigoldBackground2)',
    'colorPaletteMarigoldBackground3': 'var(--colorPaletteMarigoldBackground3)',
    'colorPaletteMarigoldForeground1': 'var(--colorPaletteMarigoldForeground1)',
    'colorPaletteMarigoldForeground2': 'var(--colorPaletteMarigoldForeground2)',
    'colorPaletteMarigoldForeground3': 'var(--colorPaletteMarigoldForeground3)',
    'colorPaletteMarigoldBorderActive': 'var(--colorPaletteMarigoldBorderActive)',
    'colorPaletteMarigoldBorder1': 'var(--colorPaletteMarigoldBorder1)',
    'colorPaletteMarigoldBorder2': 'var(--colorPaletteMarigoldBorder2)',
    'colorPaletteRedForegroundInverted': 'var(--colorPaletteRedForegroundInverted)',
    'colorPaletteGreenForegroundInverted': 'var(--colorPaletteGreenForegroundInverted)',
    'colorPaletteYellowForegroundInverted': 'var(--colorPaletteYellowForegroundInverted)',
    'colorPaletteDarkRedBackground2': 'var(--colorPaletteDarkRedBackground2)',
    'colorPaletteDarkRedForeground2': 'var(--colorPaletteDarkRedForeground2)',
    'colorPaletteDarkRedBorderActive': 'var(--colorPaletteDarkRedBorderActive)',
    'colorPaletteCranberryBackground2': 'var(--colorPaletteCranberryBackground2)',
    'colorPaletteCranberryForeground2': 'var(--colorPaletteCranberryForeground2)',
    'colorPaletteCranberryBorderActive': 'var(--colorPaletteCranberryBorderActive)',
    'colorPalettePumpkinBackground2': 'var(--colorPalettePumpkinBackground2)',
    'colorPalettePumpkinForeground2': 'var(--colorPalettePumpkinForeground2)',
    'colorPalettePumpkinBorderActive': 'var(--colorPalettePumpkinBorderActive)',
    'colorPalettePeachBackground2': 'var(--colorPalettePeachBackground2)',
    'colorPalettePeachForeground2': 'var(--colorPalettePeachForeground2)',
    'colorPalettePeachBorderActive': 'var(--colorPalettePeachBorderActive)',
    'colorPaletteGoldBackground2': 'var(--colorPaletteGoldBackground2)',
    'colorPaletteGoldForeground2': 'var(--colorPaletteGoldForeground2)',
    'colorPaletteGoldBorderActive': 'var(--colorPaletteGoldBorderActive)',
    'colorPaletteBrassBackground2': 'var(--colorPaletteBrassBackground2)',
    'colorPaletteBrassForeground2': 'var(--colorPaletteBrassForeground2)',
    'colorPaletteBrassBorderActive': 'var(--colorPaletteBrassBorderActive)',
    'colorPaletteBrownBackground2': 'var(--colorPaletteBrownBackground2)',
    'colorPaletteBrownForeground2': 'var(--colorPaletteBrownForeground2)',
    'colorPaletteBrownBorderActive': 'var(--colorPaletteBrownBorderActive)',
    'colorPaletteForestBackground2': 'var(--colorPaletteForestBackground2)',
    'colorPaletteForestForeground2': 'var(--colorPaletteForestForeground2)',
    'colorPaletteForestBorderActive': 'var(--colorPaletteForestBorderActive)',
    'colorPaletteSeafoamBackground2': 'var(--colorPaletteSeafoamBackground2)',
    'colorPaletteSeafoamForeground2': 'var(--colorPaletteSeafoamForeground2)',
    'colorPaletteSeafoamBorderActive': 'var(--colorPaletteSeafoamBorderActive)',
    'colorPaletteDarkGreenBackground2': 'var(--colorPaletteDarkGreenBackground2)',
    'colorPaletteDarkGreenForeground2': 'var(--colorPaletteDarkGreenForeground2)',
    'colorPaletteDarkGreenBorderActive': 'var(--colorPaletteDarkGreenBorderActive)',
    'colorPaletteLightTealBackground2': 'var(--colorPaletteLightTealBackground2)',
    'colorPaletteLightTealForeground2': 'var(--colorPaletteLightTealForeground2)',
    'colorPaletteLightTealBorderActive': 'var(--colorPaletteLightTealBorderActive)',
    'colorPaletteTealBackground2': 'var(--colorPaletteTealBackground2)',
    'colorPaletteTealForeground2': 'var(--colorPaletteTealForeground2)',
    'colorPaletteTealBorderActive': 'var(--colorPaletteTealBorderActive)',
    'colorPaletteSteelBackground2': 'var(--colorPaletteSteelBackground2)',
    'colorPaletteSteelForeground2': 'var(--colorPaletteSteelForeground2)',
    'colorPaletteSteelBorderActive': 'var(--colorPaletteSteelBorderActive)',
    'colorPaletteBlueBackground2': 'var(--colorPaletteBlueBackground2)',
    'colorPaletteBlueForeground2': 'var(--colorPaletteBlueForeground2)',
    'colorPaletteBlueBorderActive': 'var(--colorPaletteBlueBorderActive)',
    'colorPaletteRoyalBlueBackground2': 'var(--colorPaletteRoyalBlueBackground2)',
    'colorPaletteRoyalBlueForeground2': 'var(--colorPaletteRoyalBlueForeground2)',
    'colorPaletteRoyalBlueBorderActive': 'var(--colorPaletteRoyalBlueBorderActive)',
    'colorPaletteCornflowerBackground2': 'var(--colorPaletteCornflowerBackground2)',
    'colorPaletteCornflowerForeground2': 'var(--colorPaletteCornflowerForeground2)',
    'colorPaletteCornflowerBorderActive': 'var(--colorPaletteCornflowerBorderActive)',
    'colorPaletteNavyBackground2': 'var(--colorPaletteNavyBackground2)',
    'colorPaletteNavyForeground2': 'var(--colorPaletteNavyForeground2)',
    'colorPaletteNavyBorderActive': 'var(--colorPaletteNavyBorderActive)',
    'colorPaletteLavenderBackground2': 'var(--colorPaletteLavenderBackground2)',
    'colorPaletteLavenderForeground2': 'var(--colorPaletteLavenderForeground2)',
    'colorPaletteLavenderBorderActive': 'var(--colorPaletteLavenderBorderActive)',
    'colorPalettePurpleBackground2': 'var(--colorPalettePurpleBackground2)',
    'colorPalettePurpleForeground2': 'var(--colorPalettePurpleForeground2)',
    'colorPalettePurpleBorderActive': 'var(--colorPalettePurpleBorderActive)',
    'colorPaletteGrapeBackground2': 'var(--colorPaletteGrapeBackground2)',
    'colorPaletteGrapeForeground2': 'var(--colorPaletteGrapeForeground2)',
    'colorPaletteGrapeBorderActive': 'var(--colorPaletteGrapeBorderActive)',
    'colorPaletteLilacBackground2': 'var(--colorPaletteLilacBackground2)',
    'colorPaletteLilacForeground2': 'var(--colorPaletteLilacForeground2)',
    'colorPaletteLilacBorderActive': 'var(--colorPaletteLilacBorderActive)',
    'colorPalettePinkBackground2': 'var(--colorPalettePinkBackground2)',
    'colorPalettePinkForeground2': 'var(--colorPalettePinkForeground2)',
    'colorPalettePinkBorderActive': 'var(--colorPalettePinkBorderActive)',
    'colorPaletteMagentaBackground2': 'var(--colorPaletteMagentaBackground2)',
    'colorPaletteMagentaForeground2': 'var(--colorPaletteMagentaForeground2)',
    'colorPaletteMagentaBorderActive': 'var(--colorPaletteMagentaBorderActive)',
    'colorPalettePlumBackground2': 'var(--colorPalettePlumBackground2)',
    'colorPalettePlumForeground2': 'var(--colorPalettePlumForeground2)',
    'colorPalettePlumBorderActive': 'var(--colorPalettePlumBorderActive)',
    'colorPaletteBeigeBackground2': 'var(--colorPaletteBeigeBackground2)',
    'colorPaletteBeigeForeground2': 'var(--colorPaletteBeigeForeground2)',
    'colorPaletteBeigeBorderActive': 'var(--colorPaletteBeigeBorderActive)',
    'colorPaletteMinkBackground2': 'var(--colorPaletteMinkBackground2)',
    'colorPaletteMinkForeground2': 'var(--colorPaletteMinkForeground2)',
    'colorPaletteMinkBorderActive': 'var(--colorPaletteMinkBorderActive)',
    'colorPalettePlatinumBackground2': 'var(--colorPalettePlatinumBackground2)',
    'colorPalettePlatinumForeground2': 'var(--colorPalettePlatinumForeground2)',
    'colorPalettePlatinumBorderActive': 'var(--colorPalettePlatinumBorderActive)',
    'colorPaletteAnchorBackground2': 'var(--colorPaletteAnchorBackground2)',
    'colorPaletteAnchorForeground2': 'var(--colorPaletteAnchorForeground2)',
    'colorPaletteAnchorBorderActive': 'var(--colorPaletteAnchorBorderActive)',
    'colorStatusSuccessBackground1': 'var(--colorStatusSuccessBackground1)',
    'colorStatusSuccessBackground2': 'var(--colorStatusSuccessBackground2)',
    'colorStatusSuccessBackground3': 'var(--colorStatusSuccessBackground3)',
    'colorStatusSuccessForeground1': 'var(--colorStatusSuccessForeground1)',
    'colorStatusSuccessForeground2': 'var(--colorStatusSuccessForeground2)',
    'colorStatusSuccessForeground3': 'var(--colorStatusSuccessForeground3)',
    'colorStatusSuccessForegroundInverted': 'var(--colorStatusSuccessForegroundInverted)',
    'colorStatusSuccessBorderActive': 'var(--colorStatusSuccessBorderActive)',
    'colorStatusSuccessBorder1': 'var(--colorStatusSuccessBorder1)',
    'colorStatusSuccessBorder2': 'var(--colorStatusSuccessBorder2)',
    'colorStatusWarningBackground1': 'var(--colorStatusWarningBackground1)',
    'colorStatusWarningBackground2': 'var(--colorStatusWarningBackground2)',
    'colorStatusWarningBackground3': 'var(--colorStatusWarningBackground3)',
    'colorStatusWarningForeground1': 'var(--colorStatusWarningForeground1)',
    'colorStatusWarningForeground2': 'var(--colorStatusWarningForeground2)',
    'colorStatusWarningForeground3': 'var(--colorStatusWarningForeground3)',
    'colorStatusWarningForegroundInverted': 'var(--colorStatusWarningForegroundInverted)',
    'colorStatusWarningBorderActive': 'var(--colorStatusWarningBorderActive)',
    'colorStatusWarningBorder1': 'var(--colorStatusWarningBorder1)',
    'colorStatusWarningBorder2': 'var(--colorStatusWarningBorder2)',
    'colorStatusDangerBackground1': 'var(--colorStatusDangerBackground1)',
    'colorStatusDangerBackground2': 'var(--colorStatusDangerBackground2)',
    'colorStatusDangerBackground3': 'var(--colorStatusDangerBackground3)',
    'colorStatusDangerForeground1': 'var(--colorStatusDangerForeground1)',
    'colorStatusDangerForeground2': 'var(--colorStatusDangerForeground2)',
    'colorStatusDangerForeground3': 'var(--colorStatusDangerForeground3)',
    'colorStatusDangerForegroundInverted': 'var(--colorStatusDangerForegroundInverted)',
    'colorStatusDangerBorderActive': 'var(--colorStatusDangerBorderActive)',
    'colorStatusDangerBorder1': 'var(--colorStatusDangerBorder1)',
    'colorStatusDangerBorder2': 'var(--colorStatusDangerBorder2)',
    'colorStatusDangerBackground3Hover': 'var(--colorStatusDangerBackground3Hover)',
    'colorStatusDangerBackground3Pressed': 'var(--colorStatusDangerBackground3Pressed)',
    'layerFillColorDefault': 'var(--layerFillColorDefault)',
    'layerFillColorAlt': 'var(--layerFillColorAlt)',
    'layerOnAcrylicFillColorDefault': 'var(--layerOnAcrylicFillColorDefault)',
    'layerOnMicaBaseAltFillColorDefault': 'var(--layerOnMicaBaseAltFillColorDefault)',
    'layerOnMicaBaseAltFillColorSecondary': 'var(--layerOnMicaBaseAltFillColorSecondary)',
    'layerOnMicaBaseAltFillColorTransparent': 'var(--layerOnMicaBaseAltFillColorTransparent)',
    'solidBackgroundFillColorTertiary': 'var(--solidBackgroundFillColorTertiary)',
    'surfaceStrokeColorFlyout': 'var(--surfaceStrokeColorFlyout)',
    'dividerStrokeColorDefault': 'var(--dividerStrokeColorDefault)',
    'layerOnMicaBaseAltFillColorTertiary': 'var(--layerOnMicaBaseAltFillColorTertiary)',
    'cardBackgroundFillColorDefault': 'var(--cardBackgroundFillColorDefault)',
    'smokeFillColorDefault': 'var(--smokeFillColorDefault)',
    'subtleFillColorTransparent': 'var(--subtleFillColorTransparent)',
    'subtleFillColorSecondary': 'var(--subtleFillColorSecondary)',
    'subtleFillColorTertiary': 'var(--subtleFillColorTertiary)',
    'acrylicBackgroundFillColorDefault': 'var(--acrylicBackgroundFillColorDefault)',
    'acrylicInAppFillColorDefault': 'var(--acrylicInAppFillColorDefault)',
    'acrylicBackgroundFillColorBase': 'var(--acrylicBackgroundFillColorBase)',
    'acrylicInAppFillColorBase': 'var(--acrylicInAppFillColorBase)',
    'acrylicTintColorDefault': 'var(--acrylicTintColorDefault)',
    'acrylicTintLuminosityColorDefault': 'var(--acrylicTintLuminosityColorDefault)',
    'acrylicTintColorBase': 'var(--acrylicTintColorBase)',
    'acrylicTintLuminosityColorBase': 'var(--acrylicTintLuminosityColorBase)',
    'micaBackgroundFillColorBase': 'var(--micaBackgroundFillColorBase)',
    'micaBackgroundFillColorBaseAlt': 'var(--micaBackgroundFillColorBaseAlt)',
    'windowsAccentPrimary': 'var(--windowsAccentPrimary)',
    'windowsAccentLight2': 'var(--windowsAccentLight2)',
    'controlFillColorSecondary': 'var(--controlFillColorSecondary)',
    'controlFillColorTertiary': 'var(--controlFillColorTertiary)',
    'controlStrokeColorDefault': 'var(--controlStrokeColorDefault)',
}

const themeFontFamily = {
    'base': 'var(--fontFamilyBase)',
    'mono': 'var(--fontFamilyMonospace)',
    'numeric': 'var(--fontFamilyNumeric)',
}

const themeFontSize = {
    'base-100': 'var(--fontSizeBase100)',
    'base-200': 'var(--fontSizeBase200)',
    'base-300': 'var(--fontSizeBase300)',
    'base-400': 'var(--fontSizeBase400)',
    'base-500': 'var(--fontSizeBase500)',
    'base-600': 'var(--fontSizeBase600)',
    'hero-700': 'var(--fontSizeHero700)',
    'hero-800': 'var(--fontSizeHero800)',
    'hero-900': 'var(--fontSizeHero900)',
    'hero-1000': 'var(--fontSizeHero1000)',
}

const themeLineHeight = {
    'base-100': 'var(--lineHeightBase100)',
    'base-200': 'var(--lineHeightBase200)',
    'base-300': 'var(--lineHeightBase300)',
    'base-400': 'var(--lineHeightBase400)',
    'base-500': 'var(--lineHeightBase500)',
    'base-600': 'var(--lineHeightBase600)',
    'hero-700': 'var(--lineHeightHero700)',
    'hero-800': 'var(--lineHeightHero800)',
    'hero-900': 'var(--lineHeightHero900)',
    'hero-1000': 'var(--lineHeightHero1000)',
}

const themeText = {
    'base-100': { fontSize: 'var(--fontSizeBase100)', lineHeight: 'var(--lineHeightBase100)' },
    'base-200': { fontSize: 'var(--fontSizeBase200)', lineHeight: 'var(--lineHeightBase200)' },
    'base-300': { fontSize: 'var(--fontSizeBase300)', lineHeight: 'var(--lineHeightBase300)' },
    'base-400': { fontSize: 'var(--fontSizeBase400)', lineHeight: 'var(--lineHeightBase400)' },
    'base-500': { fontSize: 'var(--fontSizeBase500)', lineHeight: 'var(--lineHeightBase500)' },
    'base-600': { fontSize: 'var(--fontSizeBase600)', lineHeight: 'var(--lineHeightBase600)' },
    'hero-700': { fontSize: 'var(--fontSizeHero700)', lineHeight: 'var(--lineHeightHero700)' },
    'hero-800': { fontSize: 'var(--fontSizeHero800)', lineHeight: 'var(--lineHeightHero800)' },
    'hero-900': { fontSize: 'var(--fontSizeHero900)', lineHeight: 'var(--lineHeightHero900)' },
    'hero-1000': { fontSize: 'var(--fontSizeHero1000)', lineHeight: 'var(--lineHeightHero1000)' },
}

const themeFontWeight = {
    'regular': 'var(--fontWeightRegular)',
    'medium': 'var(--fontWeightMedium)',
    'semibold': 'var(--fontWeightSemibold)',
    'bold': 'var(--fontWeightBold)',
}

const themeSpacing = {
    'fluent-none': 'var(--spacingHorizontalNone)',
    'fluent-xxs': 'var(--spacingHorizontalXXS)',
    'fluent-xs': 'var(--spacingHorizontalXS)',
    'fluent-s-nudge': 'var(--spacingHorizontalSNudge)',
    'fluent-s': 'var(--spacingHorizontalS)',
    'fluent-m-nudge': 'var(--spacingHorizontalMNudge)',
    'fluent-m': 'var(--spacingHorizontalM)',
    'fluent-l': 'var(--spacingHorizontalL)',
    'fluent-xl': 'var(--spacingHorizontalXL)',
    'fluent-xxl': 'var(--spacingHorizontalXXL)',
    'fluent-xxxl': 'var(--spacingHorizontalXXXL)',
}

const themeRadius = {
    'fluent-none': 'var(--borderRadiusNone)',
    'fluent-sm': 'var(--borderRadiusSmall)',
    'fluent-md': 'var(--borderRadiusMedium)',
    'fluent-lg': 'var(--borderRadiusLarge)',
    'fluent-xl': 'var(--borderRadiusXLarge)',
    'fluent-2xl': 'var(--borderRadius2XLarge)',
    'fluent-3xl': 'var(--borderRadius3XLarge)',
    'fluent-4xl': 'var(--borderRadius4XLarge)',
    'fluent-5xl': 'var(--borderRadius5XLarge)',
    'fluent-6xl': 'var(--borderRadius6XLarge)',
    'fluent-circular': 'var(--borderRadiusCircular)',
}

const themeBorderWidth = {
    'thin': 'var(--strokeWidthThin)',
    'thick': 'var(--strokeWidthThick)',
    'thicker': 'var(--strokeWidthThicker)',
    'thickest': 'var(--strokeWidthThickest)',
}

const themeShadow = {
    '2': 'var(--shadow2)',
    '4': 'var(--shadow4)',
    '8': 'var(--shadow8)',
    '16': 'var(--shadow16)',
    '28': 'var(--shadow28)',
    '64': 'var(--shadow64)',
    '2-brand': 'var(--shadow2Brand)',
    '4-brand': 'var(--shadow4Brand)',
    '8-brand': 'var(--shadow8Brand)',
    '16-brand': 'var(--shadow16Brand)',
    '28-brand': 'var(--shadow28Brand)',
    '64-brand': 'var(--shadow64Brand)',
}

const themeDuration = {
    'fluent-ultra-fast': 'var(--durationUltraFast)',
    'fluent-faster': 'var(--durationFaster)',
    'fluent-fast': 'var(--durationFast)',
    'fluent-normal': 'var(--durationNormal)',
    'fluent-gentle': 'var(--durationGentle)',
    'fluent-slow': 'var(--durationSlow)',
    'fluent-slower': 'var(--durationSlower)',
    'fluent-ultra-slow': 'var(--durationUltraSlow)',
}

const themeEasing = {
    'accelerate-max': 'var(--curveAccelerateMax)',
    'accelerate-mid': 'var(--curveAccelerateMid)',
    'accelerate-min': 'var(--curveAccelerateMin)',
    'decelerate-max': 'var(--curveDecelerateMax)',
    'decelerate-mid': 'var(--curveDecelerateMid)',
    'decelerate-min': 'var(--curveDecelerateMin)',
    'easy-ease-max': 'var(--curveEasyEaseMax)',
    'easy-ease': 'var(--curveEasyEase)',
    'linear': 'var(--curveLinear)',
}

const themeZIndex = {
    'window': 'var(--zIndexWindow)',
    'content': 'var(--zIndexContent)',
    'nav-flyout': 'var(--zIndexNavFlyout)',
    'menu': 'var(--zIndexMenu)',
    'submenu': 'var(--zIndexSubmenu)',
    'modal': 'var(--zIndexModal)',
    'tooltip': 'var(--zIndexTooltip)',
    'shell': 'var(--zIndexShell)',
    'start-menu': 'var(--zIndexStartMenu)',
    'step': 'var(--zIndexStep)',
}

const themeTypography = {
    'body1': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase300)', fontWeight: 'var(--fontWeightRegular)', lineHeight: 'var(--lineHeightBase300)' },
    'body1Strong': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase300)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase300)' },
    'body1Stronger': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase300)', fontWeight: 'var(--fontWeightBold)', lineHeight: 'var(--lineHeightBase300)' },
    'body2': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase400)', fontWeight: 'var(--fontWeightRegular)', lineHeight: 'var(--lineHeightBase400)' },
    'caption1': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase200)', fontWeight: 'var(--fontWeightRegular)', lineHeight: 'var(--lineHeightBase200)' },
    'caption1Strong': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase200)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase200)' },
    'caption1Stronger': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase200)', fontWeight: 'var(--fontWeightBold)', lineHeight: 'var(--lineHeightBase200)' },
    'caption2': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase100)', fontWeight: 'var(--fontWeightRegular)', lineHeight: 'var(--lineHeightBase100)' },
    'caption2Strong': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase100)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase100)' },
    'subtitle1': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase500)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase500)' },
    'subtitle2': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase400)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase400)' },
    'subtitle2Stronger': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase400)', fontWeight: 'var(--fontWeightBold)', lineHeight: 'var(--lineHeightBase400)' },
    'title1': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeHero800)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightHero800)' },
    'title2': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeHero700)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightHero700)' },
    'title3': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeBase600)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightBase600)' },
    'largeTitle': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeHero900)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightHero900)' },
    'display': { fontFamily: 'var(--fontFamilyBase)', fontSize: 'var(--fontSizeHero1000)', fontWeight: 'var(--fontWeightSemibold)', lineHeight: 'var(--lineHeightHero1000)' },
}

/**
 * Fluent 2 UnoCSS preset。
 * - preflight 注入全部 token CSS 变量（light-dark() + color-scheme）
 * - theme.colors 用**精确 token 名**（bg-colorBrandBackground）
 * - theme.spacing / borderRadius / duration 用 fluent-* 短别名（p-fluent-m 等）
 */
export function presetFluere(): Preset {
  return {
    name: 'fluent2',
    preflights: [
      {
        getCSS: () => tokensCssText,
        layer: 'base',
      },
    ],
    theme: {
      colors: themeColors,
      fontFamily: themeFontFamily,
      fontSize: themeFontSize,
      lineHeight: themeLineHeight,
      text: themeText,
      fontWeight: themeFontWeight,
      spacing: themeSpacing,
      spacingHorizontal: themeSpacing,
      spacingVertical: themeSpacing,
      radius: themeRadius,
      borderRadius: themeRadius,
      borderWidth: themeBorderWidth,
      shadow: themeShadow,
      duration: themeDuration,
      easing: themeEasing,
      ease: themeEasing,
      zIndex: themeZIndex,
      typography: themeTypography,
    },
  }
}

export default presetFluere
