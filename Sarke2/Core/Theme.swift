import SwiftUI

enum Theme {
    static let accent = Color(red: 0.09, green: 0.45, blue: 0.85)
    static let surface = Color(.systemBackground)
    static let subtleSurface = Color(.secondarySystemBackground)
    static let danger = Color.red
    static let success = Color.green

    static let cornerRadius: CGFloat = 14
}

extension Font {
    static func georgian(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name = weight == .bold ? "NotoSansGeorgian-Bold" : "NotoSansGeorgian-Regular"
        return .custom(name, size: size)
    }
}
