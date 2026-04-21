# Fonts

Drop these files here before building:

- `NotoSansGeorgian-Regular.ttf`
- `NotoSansGeorgian-Bold.ttf`

Source: https://fonts.google.com/noto/specimen/Noto+Sans+Georgian

Without them, PDFs will fall back to a system font and some Georgian glyphs may not render correctly. In-app UI is unaffected — SwiftUI uses the system font by default and `Font.georgian(_:weight:)` is only used where explicitly requested.
