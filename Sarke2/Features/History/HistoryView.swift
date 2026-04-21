import SwiftUI

struct HistoryView: View {
    @State private var questionnaires: [Questionnaire] = []
    @State private var templates: [Template] = []
    @State private var projects: [Project] = []
    @State private var filter: Filter = .all
    @State private var sharingURL: IdentifiableURL?
    @State private var isSharing = false
    @State private var isLoading = true

    enum Filter: Hashable { case all, drafts, completed }

    var filtered: [Questionnaire] {
        switch filter {
        case .all:       return questionnaires
        case .drafts:    return questionnaires.filter { $0.status == .draft }
        case .completed: return questionnaires.filter { $0.status == .completed }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                picker
                if isLoading && questionnaires.isEmpty {
                    ProgressView().padding(.top, 40)
                } else if filtered.isEmpty {
                    empty.padding(.top, 40)
                }
                ForEach(filtered) { q in
                    row(for: q)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .screenBackground()
        .navigationTitle("ისტორია")
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $sharingURL) { wrapper in
            PDFShareSheet(url: wrapper.url)
        }
    }

    private var picker: some View {
        HStack(spacing: 0) {
            segment("ყველა", .all)
            segment("დრაფტები", .drafts)
            segment("დასრულდა", .completed)
        }
        .padding(4)
        .background(Theme.subtleSurface)
        .clipShape(Capsule())
    }

    private func segment(_ title: String, _ value: Filter) -> some View {
        Button { filter = value } label: {
            Text(title)
                .font(.display(14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .foregroundStyle(filter == value ? .white : Theme.inkSoft)
                .background(filter == value ? Theme.accent : .clear)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func row(for q: Questionnaire) -> some View {
        let template = templates.first(where: { $0.id == q.templateId })
        let project = projects.first(where: { $0.id == q.projectId })

        if q.status == .draft, let template {
            NavigationLink {
                WizardView(questionnaire: q, template: template)
            } label: {
                content(q, template: template, project: project, trailing: .chevron)
            }
            .buttonStyle(.plain)
        } else {
            Button {
                if let path = q.pdfUrl { Task { await share(path: path) } }
            } label: {
                content(q, template: template, project: project, trailing: .share)
            }
            .buttonStyle(.plain)
        }
    }

    private enum Trailing { case chevron, share }

    private func content(_ q: Questionnaire, template: Template?, project: Project?, trailing: Trailing) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(q.status == .completed ? Theme.accentSoft : Theme.warnSoft)
                    .frame(width: 44, height: 44)
                Image(systemName: q.status == .completed ? "checkmark.seal.fill" : "pencil.and.list.clipboard")
                    .foregroundStyle(q.status == .completed ? Theme.accent : Theme.warn)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(template?.name ?? "კითხვარი")
                    .font(.display(15, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                if let project {
                    Text(project.name).font(.caption).foregroundStyle(Theme.inkSoft)
                }
                Text(q.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption2).foregroundStyle(Theme.inkSoft.opacity(0.75))
            }
            Spacer()
            switch trailing {
            case .chevron:
                Image(systemName: "chevron.right").foregroundStyle(Theme.inkSoft.opacity(0.5))
            case .share:
                if isSharing {
                    ProgressView()
                } else {
                    Image(systemName: "square.and.arrow.up").foregroundStyle(Theme.accent)
                }
            }
        }
        .card(padding: 12)
    }

    private var empty: some View {
        VStack(spacing: 10) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 46))
                .foregroundStyle(Theme.accent.opacity(0.6))
            Text("ცარიელია")
                .font(.display(18, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Text("კითხვარები აქ გამოჩნდება.")
                .font(.footnote)
                .foregroundStyle(Theme.inkSoft)
        }
        .frame(maxWidth: .infinity)
    }

    @MainActor
    private func load() async {
        isLoading = true; defer { isLoading = false }
        async let q = (try? await QuestionnaireService.recent(limit: 200)) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let p = (try? await ProjectService.list()) ?? []
        questionnaires = await q
        templates = await t
        projects = await p
    }

    @MainActor
    private func share(path: String) async {
        isSharing = true; defer { isSharing = false }
        guard let data = try? await StorageService.download(bucket: .pdfs, path: path) else { return }
        let name = path.split(separator: "/").last.map(String.init) ?? "report.pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? data.write(to: url)
        sharingURL = IdentifiableURL(url: url)
    }
}
