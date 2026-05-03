import SwiftUI

// MARK: - HomeView (Phase D)
//
// Rewritten to mirror the Expo home screen's structure:
//   - Hero (time-of-day greeting + question prompt)
//   - Cert-expiry banner (when uploads are needed)
//   - 6 quick-action tiles (BOG-style row)
//   - Projects carousel (1 = full / 2 = split / 3+ = horizontal scroll)
//   - Recent inspections list (top 5)
//
// "New Inspection" is the only quick-action whose destination is fully
// built today — it opens the existing StartQuestionnaireSheet's template
// picker. The other 5 (incident / briefing / report / participant / file)
// are routed to a "მალე გამოვა" alert until Plan B Phase 4 builds the
// underlying flows.

struct HomeView: View {
    @Environment(SessionStore.self) private var session

    @State private var qualifications: [Qualification] = []
    @State private var templates: [Template] = []
    @State private var recent: [Questionnaire] = []
    @State private var projects: [Project] = []
    @State private var showingCertBanner = false
    @State private var showingTemplatePicker = false
    @State private var pickingProjectFor: Template?
    @State private var showingCerts = false
    @State private var comingSoonAction: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                hero
                if showingCertBanner { certsBanner.padding(.horizontal, 16) }
                draftContinuationBanner
                quickActionGrid
                projectsCarousel
                recentSection
            }
            .padding(.vertical, 16)
        }
        .screenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("გასვლა", role: .destructive) {
                        Task { try? await session.signOut() }
                    }
                } label: {
                    Image(systemName: "person.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Theme.accentPrimary)
                }
            }
        }
        .task { await loadData() }
        .refreshable { await loadData() }
        .sheet(isPresented: $showingTemplatePicker) {
            TemplatePickerSheet(templates: systemTemplates) { picked in
                showingTemplatePicker = false
                pickingProjectFor = picked
            }
        }
        .sheet(item: $pickingProjectFor) { template in
            StartQuestionnaireSheet(template: template)
        }
        .sheet(isPresented: $showingCerts) {
            NavigationStack { CertificatesView() }
        }
        .alert("მალე გამოვა", isPresented: Binding(
            get: { comingSoonAction != nil },
            set: { if !$0 { comingSoonAction = nil } }
        )) {
            Button("კარგი", role: .cancel) {}
        } message: {
            Text("\(comingSoonAction ?? "ეს") ფუნქცია იქნება ხელმისაწვდომი მოახლოებულ განახლებაში.")
        }
    }

    // MARK: Hero

    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(greetingText)
                .font(.spaceGrotesk(32, weight: .bold))
                .foregroundStyle(Theme.ink)
                .lineLimit(2)
            Text("რას შევამოწმებთ დღეს?")
                .font(.inter(15))
                .foregroundStyle(Theme.inkSoft)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let g = hour < 5 ? "კარგი ღამე"
              : hour < 12 ? "დილა მშვიდობისა"
              : hour < 18 ? "გამარჯობა"
              : "საღამო მშვიდობისა"
        if let user = session.currentUser {
            return "\(g), \(user.firstName)"
        }
        return g
    }

    // MARK: Cert expiry banner

    private var certsBanner: some View {
        Button { showingCerts = true } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(Theme.Color.semantic.warningSoft).frame(width: 44, height: 44)
                    Image(systemName: "exclamationmark.shield.fill")
                        .foregroundStyle(Theme.Color.semantic.warning)
                        .font(.title3)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("ატვირთე სერტიფიკატები")
                        .font(.spaceGrotesk(16, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    Text("კითხვარს PDF-ში ერთვის თან.")
                        .font(.inter(13))
                        .foregroundStyle(Theme.inkSoft)
                }
                Spacer()
                Image(systemName: "arrow.right")
                    .foregroundStyle(Theme.Color.semantic.warning)
            }
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

    // MARK: Draft continuation banner

    @ViewBuilder
    private var draftContinuationBanner: some View {
        if let draft = recent.first(where: { $0.status == .draft }),
           let template = templates.first(where: { $0.id == draft.templateId }),
           let project = projects.first(where: { $0.id == draft.projectId }) {
            NavigationLink {
                WizardView(questionnaire: draft, template: template)
            } label: {
                HStack(spacing: 14) {
                    ZStack {
                        Circle().fill(Theme.Color.semantic.warningSoft).frame(width: 44, height: 44)
                        Image(systemName: "arrow.clockwise")
                            .foregroundStyle(Theme.Color.semantic.warning)
                            .font(.title3.bold())
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("გააგრძელე დრაფტი")
                            .font(.spaceGrotesk(16, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                        Text("\(template.name) — \(project.name)")
                            .font(.inter(13))
                            .foregroundStyle(Theme.inkSoft)
                            .lineLimit(1)
                    }
                    Spacer()
                    Image(systemName: "arrow.right")
                        .foregroundStyle(Theme.Color.semantic.warning)
                }
                .padding(14)
                .background(Theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                        .strokeBorder(Theme.border, lineWidth: 0.5)
                )
                .themeShadow(Theme.shadow.card)
                .padding(.horizontal, 16)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: Quick-action grid (6 tiles)

    private var quickActionGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("სწრაფი მოქმედება")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10),
                                GridItem(.flexible(), spacing: 10),
                                GridItem(.flexible(), spacing: 10)],
                      spacing: 10) {
                QuickActionTile(icon: "checkmark.shield.fill",  label: "ახალი\nშემოწმება", palette: Theme.actionColors.inspection) {
                    showingTemplatePicker = true
                }
                QuickActionTile(icon: "exclamationmark.triangle.fill", label: "ინციდენტი", palette: Theme.actionColors.incident) {
                    comingSoonAction = "ინციდენტი"
                }
                QuickActionTile(icon: "bubble.left.and.bubble.right.fill", label: "ინსტრუქტაჟი", palette: Theme.actionColors.briefing) {
                    comingSoonAction = "ინსტრუქტაჟი"
                }
                QuickActionTile(icon: "doc.text.fill",          label: "რეპორტი",         palette: Theme.actionColors.report) {
                    comingSoonAction = "რეპორტი"
                }
                QuickActionTile(icon: "person.fill.badge.plus", label: "მონაწილე",        palette: Theme.actionColors.participant) {
                    comingSoonAction = "მონაწილე"
                }
                QuickActionTile(icon: "paperclip",              label: "ფაილი",          palette: Theme.actionColors.file) {
                    comingSoonAction = "ფაილი"
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: Projects carousel

    @ViewBuilder
    private var projectsCarousel: some View {
        if !projects.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    sectionHeader("პროექტები")
                    Spacer()
                    NavigationLink {
                        ProjectsListView()
                    } label: {
                        Text("ყველა")
                            .font(.inter(13, weight: .semibold))
                            .foregroundStyle(Theme.accentPrimary)
                    }
                    .padding(.trailing, 20)
                }

                if projects.count == 1 {
                    NavigationLink { ProjectDetailView(project: projects[0]) } label: {
                        ProjectAvatarCard(project: projects[0], variant: .full)
                            .padding(.horizontal, 16)
                    }
                    .buttonStyle(.plain)
                } else if projects.count == 2 {
                    HStack(spacing: 12) {
                        ForEach(projects.prefix(2)) { p in
                            NavigationLink { ProjectDetailView(project: p) } label: {
                                ProjectAvatarCard(project: p, variant: .half)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(projects.prefix(8)) { p in
                                NavigationLink { ProjectDetailView(project: p) } label: {
                                    ProjectAvatarCard(project: p, variant: .carousel)
                                        .frame(width: UIScreen.main.bounds.width * 0.42)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
        }
    }

    // MARK: Recent inspections

    @ViewBuilder
    private var recentSection: some View {
        if !recent.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionHeader("ბოლოდროინდელი")
                VStack(spacing: 8) {
                    ForEach(recent.prefix(5)) { q in
                        if let t = templates.first(where: { $0.id == q.templateId }) {
                            NavigationLink {
                                WizardView(questionnaire: q, template: t)
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(t.name)
                                            .font(.spaceGrotesk(14, weight: .semibold))
                                            .foregroundStyle(Theme.ink)
                                            .lineLimit(1)
                                        Text(q.createdAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(.inter(12))
                                            .foregroundStyle(Theme.inkFaint)
                                    }
                                    Spacer()
                                    StatusPill.forInspection(status: q.status)
                                    Image(systemName: "chevron.right")
                                        .font(.inter(13, weight: .medium))
                                        .foregroundStyle(Theme.inkFaint)
                                }
                                .padding(12)
                                .background(Theme.surface)
                                .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                                        .strokeBorder(Theme.border, lineWidth: 0.5)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: Helpers

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.inter(11, weight: .bold))
            .tracking(1.0)
            .foregroundStyle(Theme.inkFaint)
            .padding(.horizontal, 20)
            .padding(.top, 4)
    }

    private var systemTemplates: [Template] { templates.filter { $0.isSystem } }

    @MainActor
    private func loadData() async {
        async let q = (try? await QualificationService.list()) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let r = (try? await QuestionnaireService.recent(limit: 5)) ?? []
        async let p = (try? await ProjectService.list()) ?? []
        qualifications = await q
        templates = await t
        recent = await r
        projects = await p
        showingCertBanner = qualifications.isEmpty || qualifications.contains(where: { $0.isExpiring })
    }
}

// MARK: - TemplatePickerSheet
//
// Compact bottom sheet to choose a template before opening the full
// StartQuestionnaireSheet. Triggered by the "ახალი შემოწმება" quick-action
// when there's more than one system template.

struct TemplatePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let templates: [Template]
    let onPick: (Template) -> Void

    var body: some View {
        BottomSheet(title: "აირჩიე ტიპი", detents: [.medium]) {
            VStack(spacing: 10) {
                ForEach(templates) { template in
                    Button {
                        Haptic.tap()
                        onPick(template)
                    } label: {
                        HStack(spacing: 14) {
                            ZStack {
                                RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous)
                                    .fill(Theme.accentSoftSurface)
                                    .frame(width: 52, height: 52)
                                Image(systemName: template.categoryKind.iconName)
                                    .font(.inter(22, weight: .bold))
                                    .foregroundStyle(Theme.accentPrimary)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(template.name)
                                    .font(.spaceGrotesk(16, weight: .semibold))
                                    .foregroundStyle(Theme.ink)
                                    .multilineTextAlignment(.leading)
                                Text("კითხვარის გახსნა")
                                    .font(.inter(12))
                                    .foregroundStyle(Theme.inkSoft)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.inter(13, weight: .medium))
                                .foregroundStyle(Theme.inkFaint)
                        }
                        .padding(14)
                        .background(Theme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                                .strokeBorder(Theme.border, lineWidth: 0.5)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        } footer: {
            Button {
                dismiss()
            } label: {
                Text("გაუქმება").foregroundStyle(Theme.inkSoft)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)
        }
    }
}
