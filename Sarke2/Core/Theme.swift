import SwiftUI
import UIKit

// MARK: - Theme tokens
//
// 1:1 port of `lib/theme.ts` from the Expo app on `main`. The goal is that
// any SwiftUI screen rendered against Theme.* matches the React Native
// version on the same backend data.
//
// Token families:
//   - Theme.Color.primary.{50…900}, .neutral.{50…900}, .semantic.*
//   - Theme.surface / .ink / .border (resolve light/dark automatically)
//   - Theme.actionColors (the 6 quick-action tile palettes on home)
//   - Theme.space(_)  4-pt grid
//   - Theme.radius.{xs … xxl, full}
//   - Theme.shadow.{xs, sm, md, lg, xl, glow, button, card}
//   - Theme.motion.springGentle / .fast / .normal …
//
// Backwards-compat aliases (`Theme.accent`, `Theme.background`,
// `Theme.cornerRadius`) and existing styles (PrimaryButtonStyle,
// SecondaryButtonStyle, RoundedTextFieldStyle, .card(padding:)) are
// preserved so screens authored under the old scaffold continue to
// compile while later phases migrate them.

enum Theme {

    // MARK: Color primitives — mirrors `lib/theme.ts` primary / neutral / semantic

    enum Color {
        enum primary {
            static let p50  = SwiftUI.Color(hex: 0xE8F5F0)
            static let p100 = SwiftUI.Color(hex: 0xD1EBE1)
            static let p200 = SwiftUI.Color(hex: 0xA3D7C3)
            static let p300 = SwiftUI.Color(hex: 0x75C3A5)
            static let p400 = SwiftUI.Color(hex: 0x47AF87)
            static let p500 = SwiftUI.Color(hex: 0x147A4F)
            static let p600 = SwiftUI.Color(hex: 0x106240)
            static let p700 = SwiftUI.Color(hex: 0x0C4930)
            static let p800 = SwiftUI.Color(hex: 0x083120)
            static let p900 = SwiftUI.Color(hex: 0x041810)
        }

        enum neutral {
            static let n50  = SwiftUI.Color(hex: 0xFAFAF8)
            static let n100 = SwiftUI.Color(hex: 0xF5F5F0)
            static let n200 = SwiftUI.Color(hex: 0xE8E6E0)
            static let n300 = SwiftUI.Color(hex: 0xD4D0C8)
            static let n400 = SwiftUI.Color(hex: 0xA8A49C)
            static let n500 = SwiftUI.Color(hex: 0x7C7870)
            static let n600 = SwiftUI.Color(hex: 0x504C44)
            static let n700 = SwiftUI.Color(hex: 0x3A3630)
            static let n800 = SwiftUI.Color(hex: 0x242018)
            static let n900 = SwiftUI.Color(hex: 0x0E0C08)
        }

        enum semantic {
            static let success     = SwiftUI.Color(hex: 0x10B981)
            static let successSoft = SwiftUI.Color(hex: 0xD1FAE5)
            static let warning     = SwiftUI.Color(hex: 0xF59E0B)
            static let warningSoft = SwiftUI.Color(hex: 0xFEF3C7)
            static let danger      = SwiftUI.Color(hex: 0xEF4444)
            static let dangerSoft  = SwiftUI.Color(hex: 0xFEE2E2)
            static let info        = SwiftUI.Color(hex: 0x3B82F6)
            static let infoSoft    = SwiftUI.Color(hex: 0xDBEAFE)
        }
    }

    // MARK: Semantic surfaces (light/dark adaptive)

    static var background: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n50, dark: SwiftUI.Color(hex: 0x0F0F0F))
    }
    static var surface: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: .white, dark: SwiftUI.Color(hex: 0x1A1A1A))
    }
    static var surfaceElevated: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: .white, dark: SwiftUI.Color(hex: 0x242424))
    }
    static var surfaceSecondary: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n100, dark: SwiftUI.Color(hex: 0x1F1F1F))
    }
    static var ink: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n900, dark: SwiftUI.Color(hex: 0xF5F5F0))
    }
    static var inkSoft: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n600, dark: SwiftUI.Color(hex: 0xE0E0E0))
    }
    static var inkFaint: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n400, dark: SwiftUI.Color(hex: 0xB0B0B0))
    }
    static var border: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n200, dark: SwiftUI.Color(hex: 0x2A2A2A))
    }
    static var borderStrong: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.neutral.n300, dark: SwiftUI.Color(hex: 0x3A3A3A))
    }
    static var accentPrimary: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.primary.p500, dark: Color.primary.p400)
    }
    static var accentSoftSurface: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.primary.p50, dark: Color.primary.p500.opacity(0.15))
    }
    static var accentGhost: SwiftUI.Color {
        SwiftUI.Color.dynamic(light: Color.primary.p100, dark: Color.primary.p500.opacity(0.08))
    }

    // MARK: Quick-action tile palette (Phase D — home screen)

    struct ActionColor {
        let background: SwiftUI.Color
        let icon: SwiftUI.Color
    }
    enum actionColors {
        static let inspection  = ActionColor(background: Color.primary.p50,           icon: Color.primary.p700)
        static let incident    = ActionColor(background: Color.semantic.warningSoft,  icon: Color.semantic.warning)
        static let briefing    = ActionColor(background: Color.semantic.infoSoft,     icon: Color.semantic.info)
        static let report      = ActionColor(background: Color.semantic.dangerSoft,   icon: Color.semantic.danger)
        static let participant = ActionColor(background: SwiftUI.Color(hex: 0xE5DFF9), icon: SwiftUI.Color(hex: 0x5D3FD3))
        static let file        = ActionColor(background: SwiftUI.Color(hex: 0xFDEBCF), icon: SwiftUI.Color(hex: 0xB45309))
    }

    // MARK: Spacing (4-pt grid)

    static func space(_ n: CGFloat) -> CGFloat { n * 4 }

    // MARK: Radius scale

    enum radius {
        static let none: CGFloat = 0
        static let xs: CGFloat = 6
        static let sm: CGFloat = 8
        static let input: CGFloat = 10
        static let md: CGFloat = 12
        static let cardInner: CGFloat = 14
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let full: CGFloat = 9999
        static let pill: CGFloat = 999  // backwards-compat alias
    }

    // MARK: Shadow tiers

    struct ShadowSpec {
        let color: SwiftUI.Color
        let radius: CGFloat
        let x: CGFloat
        let y: CGFloat
        let opacity: Double
    }
    enum shadow {
        static let xs   = ShadowSpec(color: .black, radius: 2,  x: 0, y: 1,  opacity: 0.03)
        static let sm   = ShadowSpec(color: .black, radius: 3,  x: 0, y: 1,  opacity: 0.05)
        static let md   = ShadowSpec(color: .black, radius: 8,  x: 0, y: 4,  opacity: 0.08)
        static let lg   = ShadowSpec(color: .black, radius: 16, x: 0, y: 8,  opacity: 0.12)
        static let xl   = ShadowSpec(color: .black, radius: 32, x: 0, y: 16, opacity: 0.16)
        static let card = ShadowSpec(color: .black, radius: 10, x: 0, y: 4,  opacity: 0.04)
        static let glow = ShadowSpec(color: Color.primary.p500, radius: 12, x: 0, y: 4, opacity: 0.30)
        static let button = ShadowSpec(color: Color.primary.p500, radius: 8, x: 0, y: 4, opacity: 0.25)
    }

    // MARK: Motion

    enum motion {
        static let instant: Double = 0
        static let fast: Double = 0.15
        static let normal: Double = 0.25
        static let slow: Double = 0.35
        static let slower: Double = 0.5

        static let springGentle = Animation.spring(response: 0.4, dampingFraction: 0.75)
        static let springBouncy = Animation.spring(response: 0.35, dampingFraction: 0.55)
        static let springStiff  = Animation.spring(response: 0.25, dampingFraction: 0.85)
        static let springSoft   = Animation.spring(response: 0.5,  dampingFraction: 0.85)
    }

    // MARK: Backwards-compat aliases (existing screens still reference these)

    static var accent: SwiftUI.Color       { accentPrimary }
    static var accentSoft: SwiftUI.Color   { accentSoftSurface }
    static var warn: SwiftUI.Color         { Color.semantic.warning }
    static var warnSoft: SwiftUI.Color     { Color.semantic.warningSoft }
    static var danger: SwiftUI.Color       { Color.semantic.danger }
    static var success: SwiftUI.Color      { accentPrimary }
    static var card: SwiftUI.Color         { surface }
    static var hairline: SwiftUI.Color     { border }
    static var subtleSurface: SwiftUI.Color { surfaceSecondary }
    static let cornerRadius: CGFloat = radius.lg  // was 18 — closest tier is lg (16)
}

// MARK: - SwiftUI.Color helpers

extension SwiftUI.Color {
    init(hex: UInt, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }

    static func dynamic(light: SwiftUI.Color, dark: SwiftUI.Color) -> SwiftUI.Color {
        SwiftUI.Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
    }
}

// MARK: - View modifiers

extension View {
    /// Apply a Theme shadow tier.
    func themeShadow(_ spec: Theme.ShadowSpec) -> some View {
        self.shadow(color: spec.color.opacity(spec.opacity), radius: spec.radius, x: spec.x, y: spec.y)
    }

    /// Cream/off-white screen background — applied at root of every screen.
    func screenBackground() -> some View {
        modifier(ScreenBackground())
    }

    /// Standard card chrome — Theme.surface fill, hairline border,
    /// `Theme.shadow.card` elevation, `Theme.radius.lg` corners.
    func card(padding: CGFloat = 16, radius: CGFloat = Theme.radius.lg) -> some View {
        modifier(CardStyle(padding: padding, radius: radius))
    }
}

struct CardStyle: ViewModifier {
    var padding: CGFloat = 16
    var radius: CGFloat = Theme.radius.lg

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 0.5)
            )
            .themeShadow(Theme.shadow.card)
    }
}

struct ScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            content
        }
    }
}

// MARK: - Typography
//
// Three font families ported from `lib/theme.ts`:
//   - Inter (variable, body / UI text)
//   - Space Grotesk (variable, display / headings)
//   - JetBrains Mono (regular only, monospace)
//
// `Font.custom(_:size:)` + `.weight(_)` works on variable fonts in iOS 16+,
// so a single .ttf serves all weights. Georgian glyphs that Inter/Space
// Grotesk lack will fall through to iOS's system Georgian font automatically
// via Core Text's font cascade.

extension Font {
    /// Body / UI text. Uses Inter; weight applied via SwiftUI.
    static func inter(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font.custom("Inter", size: size).weight(weight)
    }

    /// Display / headings. Uses Space Grotesk.
    static func spaceGrotesk(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        Font.custom("Space Grotesk", size: size).weight(weight)
    }

    /// Monospace — JetBrains Mono.
    static func jetMono(_ size: CGFloat) -> Font {
        Font.custom("JetBrainsMono-Regular", size: size)
    }

    /// Georgian-explicit text (PDF body etc). Falls back to Inter when the
    /// optional Noto Sans Georgian files aren't bundled — system Georgian
    /// glyphs still render correctly via Core Text font cascade.
    static func notoGeorgian(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name = weight == .bold ? "NotoSansGeorgian-Bold" : "NotoSansGeorgian-Regular"
        if UIFont(name: name, size: size) != nil {
            return Font.custom(name, size: size)
        }
        return inter(size, weight: weight)
    }

    // ── Backwards-compat: existing screens use `.display(_)` and
    //    `.georgian(_, weight:)`. Forward to the new accessors.

    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        spaceGrotesk(size, weight: weight)
    }

    static func georgian(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        notoGeorgian(size, weight: weight)
    }
}

// MARK: - Button styles
//
// Shape preserved from prior scaffold so existing call sites
// (`PrimaryButtonStyle(filled: false)`, `.buttonStyle(.primary)`) compile.

struct PrimaryButtonStyle: ButtonStyle {
    var filled: Bool = true
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.inter(16, weight: .bold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
            .background(filled ? Theme.accentPrimary : Theme.accentSoftSurface)
            .foregroundStyle(filled ? .white : Theme.accentPrimary)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous))
            .themeShadow(filled ? Theme.shadow.button : Theme.shadow.xs)
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1.0) : 0.55)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(Theme.motion.springStiff, value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.inter(15, weight: .medium))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(Theme.surfaceSecondary)
            .foregroundStyle(Theme.ink)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous))
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1.0) : 0.55)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle(filled: true) }
    static var primaryGhost: PrimaryButtonStyle { PrimaryButtonStyle(filled: false) }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondaryMuted: SecondaryButtonStyle { SecondaryButtonStyle() }
}

// MARK: - Text-field style

struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.inter(15))
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.input, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius.input, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 0.5)
            )
    }
}

extension TextFieldStyle where Self == RoundedTextFieldStyle {
    static var rounded: RoundedTextFieldStyle { RoundedTextFieldStyle() }
}

// MARK: - PDF share-sheet helper (preserved from prior scaffold)

struct IdentifiableURL: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

// MARK: - Haptics

enum Haptic {
    static func tap()     { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func medium()  { UIImpactFeedbackGenerator(style: .medium).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }
    static func error()   { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
