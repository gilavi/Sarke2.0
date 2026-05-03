# Fonts

## Noto Sans Georgian (for PDF output)

The PDF renderer ([lib/pdf.ts](../../lib/pdf.ts)) currently pulls Noto Sans Georgian from Google Fonts at print time via `<link rel="stylesheet">`, so Georgian text renders correctly in generated PDFs as long as the device has network access (already a requirement for Supabase).

### To bundle offline (recommended before App Store release)

1. Download Noto Sans Georgian TTFs from https://fonts.google.com/noto/specimen/Noto+Sans+Georgian and place them here:
   - `NotoSansGeorgian-Regular.ttf`
   - `NotoSansGeorgian-Bold.ttf`

2. In `lib/pdf.ts`, swap the Google Fonts `<link>` for an inline `@font-face` block:

   ```ts
   import { Asset } from 'expo-asset';
   import * as FileSystem from 'expo-file-system/legacy';

   async function loadFontBase64(module: number): Promise<string> {
     const asset = Asset.fromModule(module);
     await asset.downloadAsync();
     return FileSystem.readAsStringAsync(asset.localUri!, { encoding: 'base64' });
   }

   // Then in buildPdfHtml (make it async):
   const [reg, bold] = await Promise.all([
     loadFontBase64(require('../assets/fonts/NotoSansGeorgian-Regular.ttf')),
     loadFontBase64(require('../assets/fonts/NotoSansGeorgian-Bold.ttf')),
   ]);
   // Then inline:
   //   @font-face { font-family: 'Noto Sans Georgian'; font-weight: 400;
   //                src: url(data:font/ttf;base64,${reg}) format('truetype'); }
   //   @font-face { font-family: 'Noto Sans Georgian'; font-weight: 700;
   //                src: url(data:font/ttf;base64,${bold}) format('truetype'); }
   ```

3. `buildPdfHtml` becomes async; await it in `app/questionnaire/[id]/signing.tsx`.

This produces truly offline-capable Georgian PDF output.
