import SwiftUI

enum Theme {
    // Core palette — safety-green primary on warm cream background
    static let accent      = Color(hex: 0x147A4F)   // deep emerald
    static let accentSoft  = Color(hex: 0xDDF0E7)
    static let warn        = Color(hex: 0xE08A1B)
    static let warnSoft    = Color(hex: 0xFCEFD9)
    static let danger      = Color(hex: 0xC0433C)
    static let success     = Color(hex: 0x147A4F)

    static let background  = Color(hex: 0xF6F2EA)   // cream
    static let card        = Color(hex: 0xFFFFFF)
    static let hairline    = Color(hex: 0xE8E1D4)
    static let subtleSurface = Color(hex: 0xEFEAE0)

    static let ink         = Color(hex: 0x1A1A1A)
    static let inkSoft     = Color(hex: 0x4A4A4A)

    static let cornerRadius: CGFloat = 18
}

// MARK: - Color from hex

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xff) / 255
        let g = Double((hex >> 8) & 0xff) / 255
        let b = Double(hex & 0xff) / 255
        self = Color(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}

// MARK: - Typography

extension Font {
    static func georgian(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name = weight == .bold ? "NotoSansGeorgian-Bold" : "NotoSansGeorgian-Regular"
        return .custom(name, size: size)
    }

    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
}

// MARK: - Card container

struct CardStyle: ViewModifier {
    var padding: CGFloat = 16
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .stroke(Theme.hairline, lineWidth: 0.5)
            )
            .shadow(color: .black.opacity(0.04), radius: 10, y: 4)
    }
}

extension View {
    func card(padding: CGFloat = 16) -> some View { modifier(CardStyle(padding: padding)) }
}

// MARK: - Primary button

struct PrimaryButtonStyle: ButtonStyle {
    var filled: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.display(17, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(filled ? Theme.accent : Theme.accentSoft)
            .foregroundStyle(filled ? .white : Theme.accent)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: filled ? Theme.accent.opacity(0.25) : .clear, radius: 8, y: 4)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.display(15, weight: .medium))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Theme.subtleSurface)
            .foregroundStyle(Theme.ink)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle(filled: true) }
    static var primaryGhost: PrimaryButtonStyle { PrimaryButtonStyle(filled: false) }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondaryMuted: SecondaryButtonStyle { SecondaryButtonStyle() }
}

// MARK: - Screen background

struct ScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            content
        }
    }
}

extension View {
    func screenBackground() -> some View { modifier(ScreenBackground()) }
}

// MARK: - Text field

struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.hairline, lineWidth: 0.5)
            )
    }
}

extension TextFieldStyle where Self == RoundedTextFieldStyle {
    static var rounded: RoundedTextFieldStyle { RoundedTextFieldStyle() }
}

// Keep legacy struct for PDF share-sheet compatibility
struct IdentifiableURL: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

// MARK: - Haptics

enum Haptic {
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }
    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
