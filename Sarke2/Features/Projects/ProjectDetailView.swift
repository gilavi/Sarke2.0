import SwiftUI
import MapKit

// MARK: - ProjectDetailView (Phase E)
//
// Match the Expo project-detail surface:
//   - Hero: project logo (or initials) + name + location text + MapKit
//     preview when latitude/longitude are present.
//   - Information section: company + address + contact phone.
//   - მონაწილეები (Crew): RoleSlotList row of signers + crew JSONB.
//     Tap → SignerEditSheet. Trailing "+" → role picker → SignerEditSheet.
//   - ფაილები (Files): placeholder grid using ProjectFileService data;
//     full file-import flow lands in Plan B Phase 2.
//   - შემოწმებები (Inspections): max 3 preview rows + "ყველა" link to full
//     list inside History tab.
//   - ინციდენტები / ინსტრუქტაჟი / რეპორტები — preview placeholder cards
//     with "დაამატე" stubs that route to "მალე" alert until Plan B Phase 4
//     builds the real flows.

struct ProjectDetailView: View {
    let project: Project

    @State private var signers: [ProjectSigner] = []
    @State private var questionnaires: [Questionnaire] = []
    @State private var templates: [Template] = []
    @State private var files: [ProjectFile] = []

    @State private var showingSignerEdit: ProjectSigner?
    @State private var addingSignerRole: SignerRole?
    @State private var pickingRoleForAdd = false
    @State private var showingStart: Template?
    @State private var startTemplatePicker = false
    @State private var comingSoonAction: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                hero
                informationSection
                crewSection
                filesSection
                inspectionsSection
                emptyAuxiliarySection(title: "ინციდენტები", icon: "exclamationmark.triangle.fill", palette: Theme.actionColors.incident, label: "ინციდენტი")
                emptyAuxiliarySection(title: "ინსტრუქტაჟი", icon: "bubble.left.and.bubble.right.fill", palette: Theme.actionColors.briefing, label: "ინსტრუქტაჟი")
                emptyAuxiliarySection(title: "რეპორტები", icon: "doc.text.fill", palette: Theme.actionColors.report, label: "რეპორტი")
            }
            .padding(.vertical, 16)
            .padding(.bottom, 24)
        }
        .screenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $addingSignerRole) { role in
            SignerEditSheet(projectId: project.id, role: role, existing: nil) {
                await load()
            }
        }
        .sheet(item: $showingSignerEdit) { signer in
            SignerEditSheet(projectId: project.id, role: signer.role, existing: signer) {
                await load()
            }
        }
        .sheet(item: $showingStart) { template in
            StartQuestionnaireSheet(template: template)
        }
        .sheet(isPresented: $startTemplatePicker) {
            TemplatePickerSheet(templates: systemTemplates) { picked in
                startTemplatePicker = false
                showingStart = picked
            }
        }
        .confirmationDialog("ხელმოწერის როლი", isPresented: $pickingRoleForAdd, titleVisibility: .visible) {
            ForEach(SignerRole.allCases, id: \.self) { role in
                Button(role.georgianName) { addingSignerRole = role }
            }
            Button("გაუქმება", role: .cancel) {}
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
        VStack(spacing: 14) {
            HStack(spacing: 14) {
                logoView
                    .frame(width: 64, height: 64)
                    .background(Theme.accentSoftSurface)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius.cardInner, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(project.name)
                        .font(.spaceGrotesk(22, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(2)
                    if let companyName = project.companyName, !companyName.isEmpty {
                        Text(companyName)
                            .font(.inter(13, weight: .medium))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 20)

            if let lat = project.latitude, let lng = project.longitude {
                mapPreview(lat: lat, lng: lng)
                    .frame(height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                            .strokeBorder(Theme.border, lineWidth: 0.5)
                    )
                    .padding(.horizontal, 16)
            }
        }
    }

    @ViewBuilder
    private var logoView: some View {
        if let logo = project.logo,
           logo.hasPrefix("data:image"),
           let comma = logo.firstIndex(of: ","),
           let data = Data(base64Encoded: String(logo[logo.index(after: comma)...])),
           let img = UIImage(data: data) {
            Image(uiImage: img).resizable().aspectRatio(contentMode: .fill)
        } else {
            Text(initials)
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(Theme.accentPrimary)
        }
    }

    private var initials: String {
        let parts = project.name.split(separator: " ").prefix(2)
        return parts.map { String($0.prefix(1)) }.joined().uppercased()
    }

    private func mapPreview(lat: Double, lng: Double) -> some View {
        let coord = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        return Map(initialPosition: .region(MKCoordinateRegion(
            center: coord,
            span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
        ))) {
            Marker("", coordinate: coord)
                .tint(Theme.accentPrimary)
        }
        .allowsHitTesting(false)
    }

    // MARK: Information

    private var informationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("ინფორმაცია")
            VStack(alignment: .leading, spacing: 0) {
                infoRow(label: "კომპანია", value: project.companyName ?? "—")
                Divider().background(Theme.border)
                infoRow(label: "მისამართი", value: project.address ?? "—")
                if let phone = project.contactPhone, !phone.isEmpty {
                    Divider().background(Theme.border)
                    infoRow(label: "ტელეფონი", value: phone)
                }
            }
            .padding(.vertical, 4)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 0.5)
            )
            .padding(.horizontal, 16)
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.inter(14, weight: .medium))
                .foregroundStyle(Theme.inkSoft)
            Spacer()
            Text(value)
                .font(.inter(14, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .lineLimit(2)
                .multilineTextAlignment(.trailing)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    // MARK: Crew section (RoleSlotList)

    private var crewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("მონაწილეები")
            RoleSlotList(
                crew: combinedCrew,
                onTap: { member in
                    if let signer = signers.first(where: {
                        let nameMatch = $0.fullName == member.name
                        let roleMatch = (member.roleKey ?? "") == $0.role.rawValue
                        return nameMatch && roleMatch
                    }) {
                        showingSignerEdit = signer
                    } else {
                        pickingRoleForAdd = true
                    }
                },
                onAdd: { pickingRoleForAdd = true }
            )
        }
    }

    /// Merge `project.crew` JSONB members with `project_signers` rows.
    /// Prefer the signers (they have signature paths) but augment with
    /// any free-form crew members that aren't yet signers.
    private var combinedCrew: [CrewMember] {
        var result: [CrewMember] = signers.map { signer in
            CrewMember(
                id: signer.id,
                name: signer.fullName,
                role: signer.role.georgianName,
                signature: signer.signaturePngUrl,
                roleKey: signer.role.rawValue
            )
        }
        if let crew = project.crew {
            for member in crew where !result.contains(where: { $0.name == member.name }) {
                result.append(member)
            }
        }
        return result
    }

    // MARK: Files

    private var filesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionHeader("ფაილები")
                Spacer()
                Button {
                    Haptic.tap()
                    comingSoonAction = "ფაილი"
                } label: {
                    Label("დამატება", systemImage: "plus")
                        .font(.inter(13, weight: .semibold))
                        .foregroundStyle(Theme.accentPrimary)
                }
                .padding(.trailing, 20)
            }

            if files.isEmpty {
                emptySectionPlaceholder(text: "ფაილი არ არის ატვირთული")
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10)
                ], spacing: 10) {
                    ForEach(files.prefix(6)) { file in
                        fileTile(file)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func fileTile(_ file: ProjectFile) -> some View {
        VStack(spacing: 6) {
            Image(systemName: iconName(for: file.mimeType))
                .font(.inter(28, weight: .bold))
                .foregroundStyle(Theme.accentPrimary)
                .frame(width: 64, height: 64)
                .background(Theme.accentSoftSurface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous))
            Text(file.name)
                .font(.inter(11, weight: .medium))
                .foregroundStyle(Theme.inkSoft)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
    }

    private func iconName(for mime: String?) -> String {
        switch mime {
        case let m? where m.starts(with: "image/"): return "photo.fill"
        case let m? where m.starts(with: "video/"): return "video.fill"
        case let m? where m.contains("pdf"):        return "doc.fill"
        default: return "paperclip"
        }
    }

    // MARK: Inspections preview

    private var inspectionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionHeader("შემოწმებები")
                Spacer()
                Button {
                    Haptic.tap()
                    startTemplatePicker = true
                } label: {
                    Label("დამატება", systemImage: "plus")
                        .font(.inter(13, weight: .semibold))
                        .foregroundStyle(Theme.accentPrimary)
                }
                .padding(.trailing, 20)
            }

            if questionnaires.isEmpty {
                emptySectionPlaceholder(text: "შემოწმება არ არის შესრულებული")
            } else {
                VStack(spacing: 8) {
                    ForEach(questionnaires.prefix(3)) { q in
                        if let template = templates.first(where: { $0.id == q.templateId }) {
                            NavigationLink {
                                WizardView(questionnaire: q, template: template)
                            } label: {
                                inspectionRow(q: q, template: template)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func inspectionRow(q: Questionnaire, template: Template) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(template.name)
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

    // MARK: Empty auxiliary section (Incidents / Briefings / Reports)

    private func emptyAuxiliarySection(title: String, icon: String, palette: Theme.ActionColor, label: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionHeader(title)
                Spacer()
                Button {
                    Haptic.tap()
                    comingSoonAction = label
                } label: {
                    Label("დამატება", systemImage: "plus")
                        .font(.inter(13, weight: .semibold))
                        .foregroundStyle(Theme.accentPrimary)
                }
                .padding(.trailing, 20)
            }

            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous)
                        .fill(palette.background)
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.inter(18, weight: .bold))
                        .foregroundStyle(palette.icon)
                }
                Text("ცარიელია")
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                Spacer()
            }
            .padding(14)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 0.5)
            )
            .padding(.horizontal, 16)
        }
    }

    private func emptySectionPlaceholder(text: String) -> some View {
        HStack {
            Text(text)
                .font(.inter(13))
                .foregroundStyle(Theme.inkFaint)
            Spacer()
        }
        .padding(14)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 0.5)
        )
        .padding(.horizontal, 16)
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
    private func load() async {
        async let s = (try? await ProjectService.signers(projectId: project.id)) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let q = (try? await QuestionnaireService.list(projectId: project.id)) ?? []
        async let f = (try? await ProjectFileService.list(projectId: project.id)) ?? []
        signers = await s
        templates = await t
        questionnaires = await q
        files = await f
    }
}

extension SignerRole: Identifiable { public var id: String { rawValue } }
