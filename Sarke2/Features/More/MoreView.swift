import SwiftUI

struct MoreView: View {
    @Environment(SessionStore.self) private var session

    @State private var history: [Questionnaire] = []
    @State private var certs: [Certificate] = []
    @State private var templates: [Template] = []
    @State private var projects: [Project] = []

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                profileCard
                statStrip
                LazyVGrid(columns: columns, spacing: 12) {
                    HubTile(
                        title: "ისტორია",
                        icon: "clock.arrow.circlepath",
                        tint: Theme.accent,
                        bg: Theme.accentSoft,
                        primary: "\(history.count)",
                        secondary: historySubtitle,
                        destination: AnyView(HistoryView())
                    )
                    HubTile(
                        title: "სერტიფიკატები",
                        icon: "rosette",
                        tint: Color(hex: 0xB45309),
                        bg: Color(hex: 0xFDEBCF),
                        primary: "\(certs.count)",
                        secondary: certsSubtitle,
                        badge: expiringCount > 0 ? "\(expiringCount) იწურება" : nil,
                        badgeColor: Theme.warn,
                        destination: AnyView(CertificatesView())
                    )
                    HubTile(
                        title: "შაბლონები",
                        icon: "doc.on.doc.fill",
                        tint: Color(hex: 0x2B5F9E),
                        bg: Color(hex: 0xDCE8F5),
                        primary: "\(templates.count)",
                        secondary: systemTemplateCount == templates.count
                            ? "სისტემური"
                            : "\(systemTemplateCount) სისტემური · \(templates.count - systemTemplateCount) ჩემი",
                        destination: AnyView(TemplatesView())
                    )
                    HubTile(
                        title: "რეგულაციები",
                        icon: "book.closed.fill",
                        tint: Color(hex: 0x5D3FD3),
                        bg: Color(hex: 0xE5DFF9),
                        primary: "3",
                        secondary: "დოკუმენტი",
                        destination: AnyView(RegulationsView())
                    )
                }
                .padding(.horizontal, 16)

                signOutButton
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            }
            .padding(.vertical, 12)
        }
        .screenBackground()
        .navigationTitle("მეტი")
        .task { await load() }
        .refreshable { await load() }
    }

    // MARK: - Profile

    private var profileCard: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(Theme.accent).frame(width: 56, height: 56)
                Text(initials)
                    .font(.display(22, weight: .bold))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(session.currentUser?.displayName ?? "—")
                    .font(.display(17, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                Text(session.currentUser?.email ?? "")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer()
        }
        .card()
        .padding(.horizontal, 16)
    }

    private var initials: String {
        let f = session.currentUser?.firstName.first.map(String.init) ?? ""
        let l = session.currentUser?.lastName.first.map(String.init) ?? ""
        let s = (f + l).trimmingCharacters(in: .whitespaces)
        return s.isEmpty ? "·" : s
    }

    // MARK: - Stat strip

    private var statStrip: some View {
        HStack(spacing: 10) {
            statPill(value: "\(projects.count)", label: "პროექტი", tint: Theme.accent)
            statPill(value: "\(completedCount)", label: "დასრულდა", tint: Color(hex: 0x2B5F9E))
            statPill(value: "\(draftCount)", label: "დრაფტი", tint: Theme.warn)
        }
        .padding(.horizontal, 16)
    }

    private func statPill(value: String, label: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.display(22, weight: .bold))
                .foregroundStyle(tint)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.inkSoft)
                .textCase(.uppercase)
                .tracking(0.5)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.hairline, lineWidth: 0.5)
        )
    }

    // MARK: - Sign out

    private var signOutButton: some View {
        Button {
            Task { try? await session.signOut() }
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("გასვლა")
            }
            .foregroundStyle(Theme.danger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(hex: 0xFBE8E6))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Derived

    private var completedCount: Int { history.filter { $0.status == .completed }.count }
    private var draftCount: Int { history.filter { $0.status == .draft }.count }
    private var expiringCount: Int { certs.filter { $0.isExpiring }.count }
    private var systemTemplateCount: Int { templates.filter { $0.isSystem }.count }

    private var historySubtitle: String {
        guard let latest = history.max(by: { $0.createdAt < $1.createdAt }) else { return "ცარიელია" }
        return "ბოლო: " + latest.createdAt.relativeShort
    }

    private var certsSubtitle: String {
        if certs.isEmpty { return "ცარიელია" }
        if expiringCount > 0 { return "\(certs.count) სულ" }
        return "ყველა აქტიური"
    }

    @MainActor
    private func load() async {
        async let h = (try? await QuestionnaireService.recent(limit: 500)) ?? []
        async let c = (try? await CertificateService.list()) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let p = (try? await ProjectService.list()) ?? []
        history = await h
        certs = await c
        templates = await t
        projects = await p
    }
}

// MARK: - Hub tile

struct HubTile: View {
    let title: String
    let icon: String
    let tint: Color
    let bg: Color
    let primary: String
    let secondary: String
    var badge: String? = nil
    var badgeColor: Color = .clear
    let destination: AnyView

    var body: some View {
        NavigationLink(destination: destination) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12).fill(bg)
                            .frame(width: 44, height: 44)
                        Image(systemName: icon)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(tint)
                    }
                    Spacer()
                    if let badge {
                        Text(badge)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(badgeColor.opacity(0.18))
                            .foregroundStyle(badgeColor)
                            .clipShape(Capsule())
                    }
                }

                Text(primary)
                    .font(.display(28, weight: .black))
                    .foregroundStyle(Theme.ink)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.display(15, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    Text(secondary)
                        .font(.caption)
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .stroke(Theme.hairline, lineWidth: 0.5)
            )
            .shadow(color: .black.opacity(0.04), radius: 10, y: 4)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Relative date helper

private extension Date {
    var relativeShort: String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        f.locale = Locale(identifier: "ka")
        return f.localizedString(for: self, relativeTo: Date())
    }
}
