import SwiftUI

struct HomeView: View {
    @Environment(SessionStore.self) private var session
    @State private var certs: [Certificate] = []
    @State private var templates: [Template] = []
    @State private var showingCertBanner = false
    @State private var pickingProjectFor: Template?
    @State private var showingCerts = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                greeting
                if showingCertBanner {
                    certsBanner
                }
                Text("სწრაფი დაწყება")
                    .font(.title2.bold())
                    .padding(.horizontal)
                quickStartTiles
            }
            .padding(.vertical)
        }
        .navigationTitle("მთავარი")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("გასვლა", role: .destructive) {
                        Task { try? await session.signOut() }
                    }
                } label: {
                    Image(systemName: "person.circle")
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

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let user = session.currentUser {
                Text("გამარჯობა, \(user.firstName) 👋")
                    .font(.title.bold())
            } else {
                Text("გამარჯობა 👋").font(.title.bold())
            }
            Text("რას შევამოწმებთ დღეს?")
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
    }

    private var certsBanner: some View {
        Button {
            showingCerts = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.shield.fill")
                    .font(.title)
                    .foregroundStyle(.orange)
                VStack(alignment: .leading, spacing: 2) {
                    Text("ატვირთე შენი სერტიფიკატები")
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("კითხვარის PDF-ს სერტიფიკატი თან ერთვის.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
            .padding()
            .background(Color.orange.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .padding(.horizontal)
        }
        .buttonStyle(.plain)
    }

    private var quickStartTiles: some View {
        VStack(spacing: 12) {
            ForEach(systemTemplates) { template in
                Button {
                    pickingProjectFor = template
                } label: {
                    HStack(spacing: 16) {
                        Image(systemName: iconName(for: template))
                            .font(.system(size: 38))
                            .foregroundStyle(Theme.accent)
                            .frame(width: 64)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(template.name)
                                .font(.headline)
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                            Text("კითხვარის გახსნა")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                    }
                    .padding()
                    .background(Theme.subtleSurface)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
    }

    private var systemTemplates: [Template] {
        templates.filter { $0.isSystem }
    }

    private func iconName(for t: Template) -> String {
        switch t.category {
        case "xaracho": return "building.columns.fill"
        case "harness": return "figure.climbing"
        default: return "checkmark.seal.fill"
        }
    }

    @MainActor
    private func loadData() async {
        async let c = (try? CertificateService.list()) ?? []
        async let t = (try? TemplateService.list()) ?? []
        certs = await c
        templates = await t
        showingCertBanner = certs.isEmpty || certs.contains(where: { $0.isExpiring })
    }
}
