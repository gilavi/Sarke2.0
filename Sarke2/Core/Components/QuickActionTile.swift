import SwiftUI

// MARK: - QuickActionTile
//
// SwiftUI port of the colorful quick-action button tiles from the Expo
// home screen (the BOG-style row: New Inspection / Report Incident /
// Schedule Briefing / Write Report / Add Participant / Upload File).
//
// Each tile uses one of `Theme.actionColors`'s palette pairs. Tap emits a
// haptic and runs the closure.

struct QuickActionTile: View {
    let icon: String
    let label: String
    let palette: Theme.ActionColor
    let action: () -> Void

    var body: some View {
        Button {
            Haptic.tap()
            action()
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous)
                        .fill(palette.background)
                    Image(systemName: icon)
                        .font(.inter(20, weight: .bold))
                        .foregroundStyle(palette.icon)
                }
                .frame(width: 44, height: 44)

                Text(label)
                    .font(.inter(13, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 0.5)
            )
            .themeShadow(Theme.shadow.card)
        }
        .buttonStyle(.plain)
    }
}
