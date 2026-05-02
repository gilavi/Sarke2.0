import SwiftUI

struct HomeView: View {
    @Environment(SessionStore.self) private var session
    @State private var certs: [Qualification] = []
    @State private var templates: [Template] = []
    @State private var recent: [Questionnaire] = []
    @State private var showingCertBanner = false
    @State private var pickingProjectFor: Template?
    @State private var showingCerts = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero
                if showingCertBanner { certsBanner }
                sectionHeader("სწრაფი დაწყება")
                quickStartTiles
                if !recent.isEmpty {
                    sectionHeader("ბოლოდროინდელი")
                    recentList
                }
            }
            .padding(.vertical, 16)
        }
        .screenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) { EmptyView() }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("გასვლა", role: .destructive) {
                        Task { try? await session.signOut() }
                    }
                } label: {
                    Image(systemName: "person.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Theme.accent)
                }
            }
        }
        .task { await loadData() }
        .refreshable { await loadData() }
        .sheet(item: $pickingProjectFor) { template in
            StartQuestionnaireSheet(template: template)
        }
        .sheet(isPresented: $showingCerts) {
            NavigationStack { CertificatesView() }
        }
    }

    // Hero with gradient pill behind greeting
    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(greetingText)
                .font(.display(32, weight: .black))
                .foregroundStyle(Theme.ink)
            Text("რას შევამოწმებთ დღეს?")
                .font(.callout)
                .foregroundStyle(Theme.inkSoft)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let g = hour < 5 ? "კარგი ღამე" : hour < 12 ? "დილა მშვიდობისა" : hour < 18 ? "გამარჯობა" : "საღამო მშვიდობისა"
        if let user = session.currentUser {
            return "\(g), \(user.firstName)"
        }
        return g
    }

    private var certsBanner: some View {
        Button { showingCerts = true } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(Theme.warnSoft).frame(width: 44, height: 44)
                    Image(systemName: "exclamationmark.shield.fill")
                        .foregroundStyle(Theme.warn)
                        .font(.title3)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("ატვირთე სერტიფიკატები")
                        .font(.display(16, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    Text("კითხვარს PDF-ში ერთვის თან.")
                        .font(.footnote)
                        .foregroundStyle(Theme.inkSoft)
                }
                Spacer()
                Image(systemName: "arrow.right")
                    .foregroundStyle(Theme.warn)
            }
            .card(padding: 14)
            .padding(.horizontal, 16)
        }
        .buttonStyle(.plain)
    }

    private var quickStartTiles: some View {
        VStack(spacing: 14) {
            ForEach(systemTemplates) { template in
                Button { pickingProjectFor = template } label: {
                    quickTile(template)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func quickTile(_ template: Template) -> some View {
        let (color, bgColor) = tileColors(for: template)
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(bgColor)
                    .frame(width: 62, height: 62)
                Image(systemName: template.categoryKind.iconName)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(color)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(template.name)
                    .font(.display(17, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                Text("კითხვარის გახსნა")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(Theme.inkSoft.opacity(0.6))
        }
        .card()
    }

    private func tileColors(for t: Template) -> (Color, Color) {
        switch t.categoryKind {
        case .xaracho: return (Theme.accent, Theme.accentSoft)
        case .harness: return (Color(hex: 0x2B5F9E), Color(hex: 0xDCE8F5))
        case .other:   return (Theme.inkSoft, Theme.subtleSurface)
        }
    }

    private var recentList: some View {
        VStack(spacing: 10) {
            ForEach(recent.prefix(5)) { q in
                if let t = templates.first(where: { $0.id == q.templateId }) {
                    NavigationLink {
                        WizardView(questionnaire: q, template: t)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(t.name)
                                    .font(.display(14, weight: .semibold))
                                    .foregroundStyle(Theme.ink)
                                    .lineLimit(1)
                                Text(q.createdAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption)
                                    .foregroundStyle(Theme.inkSoft)
                            }
                            Spacer()
                            statusPill(q.status)
                            Image(systemName: "chevron.right")
                                .foregroundStyle(Theme.inkSoft.opacity(0.5))
                        }
                        .card(padding: 12)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private func statusPill(_ status: QuestionnaireStatus) -> some View {
        let done = status == .completed
        return Text(done ? "დასრულდა" : "დრაფტი")
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(done ? Theme.accentSoft : Theme.warnSoft)
            .foregroundStyle(done ? Theme.accent : Theme.warn)
            .clipShape(Capsule())
    }

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.display(13, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 20)
            .padding(.top, 4)
    }

    private var systemTemplates: [Template] { templates.filter { $0.isSystem } }

    @MainActor
    private func loadData() async {
        async let c = (try? CertificateService.list()) ?? []
        async let t = (try? TemplateService.list()) ?? []
        async let r = (try? QuestionnaireService.recent(limit: 5)) ?? []
        certs = await c
        templates = await t
        recent = await r
        showingCertBanner = certs.isEmpty || certs.contains(where: { $0.isExpiring })
    }
}
