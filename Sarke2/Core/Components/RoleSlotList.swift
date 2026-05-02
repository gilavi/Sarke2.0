import SwiftUI

// MARK: - RoleSlotList
//
// SwiftUI port of `components/RoleSlotList.tsx`. Horizontal row of crew
// avatars used on the project detail screen. Tap an avatar → opens edit
// sheet. Trailing "+" tile → opens add sheet.
//
// The data model is `[CrewMember]` from Models.swift (already populated
// by Phase 1's schema sync from the `projects.crew` JSONB column).

struct RoleSlotList: View {
    let crew: [CrewMember]
    let onTap: (CrewMember) -> Void
    let onAdd: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(crew) { member in
                    avatarTile(member)
                }
                addTile
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func avatarTile(_ member: CrewMember) -> some View {
        Button {
            Haptic.tap()
            onTap(member)
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(Theme.accentSoftSurface)
                    if member.signature != nil {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.inter(11, weight: .bold))
                            .foregroundStyle(Theme.accentPrimary)
                            .padding(2)
                            .background(Theme.surface)
                            .clipShape(Circle())
                            .offset(x: 18, y: 18)
                    }
                    Text(initials(of: member.name))
                        .font(.spaceGrotesk(16, weight: .bold))
                        .foregroundStyle(Theme.accentPrimary)
                }
                .frame(width: 56, height: 56)
                .overlay(
                    Circle().strokeBorder(Theme.border, lineWidth: 0.5)
                )

                Text(firstNameOnly(of: member.name))
                    .font(.inter(11, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
                    .frame(width: 60)
            }
        }
        .buttonStyle(.plain)
    }

    private var addTile: some View {
        Button {
            Haptic.tap()
            onAdd()
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(Theme.surface)
                        .overlay(
                            Circle().strokeBorder(Theme.border, style: StrokeStyle(lineWidth: 1, dash: [4]))
                        )
                    Image(systemName: "plus")
                        .font(.inter(18, weight: .bold))
                        .foregroundStyle(Theme.inkFaint)
                }
                .frame(width: 56, height: 56)

                Text("დამატება")
                    .font(.inter(11, weight: .medium))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 60)
            }
        }
        .buttonStyle(.plain)
    }

    private func initials(of name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        let parts = trimmed.split(separator: " ").prefix(2)
        return parts.map { String($0.prefix(1)) }.joined().uppercased()
    }

    private func firstNameOnly(of name: String) -> String {
        let parts = name.split(separator: " ", maxSplits: 1)
        return String(parts.first ?? "")
    }
}
