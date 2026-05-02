import SwiftUI

// MARK: - ProjectAvatarCard
//
// SwiftUI port of `components/ProjectAvatar.tsx`. Project tile used by the
// home screen's projects carousel and the projects list. Three layout
// variants:
//
//   .full       — full-width hero card (single project on home)
//   .half       — half-width tile (two-project HStack)
//   .carousel   — 42% width (3+ projects, horizontal scroll showing 2 + clip)
//
// Renders a logo (or initials), name, location/address, and optional crew
// count badge.

struct ProjectAvatarCard: View {
    enum Variant { case full, half, carousel }

    let project: Project
    var variant: Variant = .full
    var crewCount: Int? = nil

    private var initials: String {
        let words = project.name.split(separator: " ").prefix(2)
        return words.map { String($0.prefix(1)) }.joined().uppercased()
    }

    private var logoSize: CGFloat {
        switch variant { case .full: return 64; case .half: return 52; case .carousel: return 48 }
    }

    private var titleSize: CGFloat {
        switch variant { case .full: return 18; case .half: return 16; case .carousel: return 15 }
    }

    private var subtitleSize: CGFloat {
        switch variant { case .full: return 13; case .half: return 12; case .carousel: return 12 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                logo
                    .frame(width: logoSize, height: logoSize)
                    .background(Theme.accentSoftSurface)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius.cardInner, style: .continuous))

                if variant == .full {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(project.name)
                            .font(.spaceGrotesk(titleSize, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                        if let companyName = project.companyName, !companyName.isEmpty {
                            Text(companyName)
                                .font(.inter(subtitleSize, weight: .medium))
                                .foregroundStyle(Theme.inkSoft)
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
            }

            if variant != .full {
                Text(project.name)
                    .font(.spaceGrotesk(titleSize, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let companyName = project.companyName, !companyName.isEmpty {
                    Text(companyName)
                        .font(.inter(subtitleSize, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
            }

            if let address = project.address, !address.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.inter(11, weight: .medium))
                        .foregroundStyle(Theme.inkFaint)
                    Text(address)
                        .font(.inter(subtitleSize, weight: .regular))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
            }

            if let crewCount, crewCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.inter(11, weight: .medium))
                    Text("\(crewCount)")
                        .font(.inter(12, weight: .semibold))
                }
                .foregroundStyle(Theme.accentPrimary)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Theme.accentSoftSurface)
                .clipShape(Capsule())
            }
        }
        .padding(variant == .full ? 16 : 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 0.5)
        )
        .themeShadow(Theme.shadow.card)
    }

    @ViewBuilder
    private var logo: some View {
        if let logo = project.logo,
           logo.hasPrefix("data:image"),
           let data = decodedLogoData(from: logo),
           let img = UIImage(data: data) {
            Image(uiImage: img)
                .resizable()
                .aspectRatio(contentMode: .fill)
        } else {
            Text(initials)
                .font(.spaceGrotesk(variant == .full ? 22 : 18, weight: .bold))
                .foregroundStyle(Theme.accentPrimary)
        }
    }

    private func decodedLogoData(from dataURL: String) -> Data? {
        guard let comma = dataURL.firstIndex(of: ",") else { return nil }
        let base64 = String(dataURL[dataURL.index(after: comma)...])
        return Data(base64Encoded: base64)
    }
}
