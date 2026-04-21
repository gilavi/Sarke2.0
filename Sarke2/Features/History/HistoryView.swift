import SwiftUI

struct HistoryView: View {
    @State private var questionnaires: [Questionnaire] = []
    @State private var templates: [Template] = []
    @State private var projects: [Project] = []
    @State private var sharingURL: IdentifiableURL?

    var body: some View {
        List {
            if questionnaires.isEmpty {
                ContentUnavailableView("ჯერ ისტორია ცარიელია",
                                       systemImage: "doc.text.magnifyingglass",
                                       description: Text("დასრულებული კითხვარები აქ გამოჩნდება."))
            }
            ForEach(questionnaires) { q in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(templates.first(where: { $0.id == q.templateId })?.name ?? "კითხვარი")
                            .font(.headline)
                        if let p = projects.first(where: { $0.id == q.projectId }) {
                            Text(p.name).font(.subheadline).foregroundStyle(.secondary)
                        }
                        Text(q.createdAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption).foregroundStyle(.tertiary)
                    }
                    Spacer()
                    if let path = q.pdfUrl {
                        Button {
                            Task { await share(path: path) }
                        } label: {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
        }
        .navigationTitle("ისტორია")
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $sharingURL) { wrapper in
            PDFShareSheet(url: wrapper.url)
        }
    }

    @MainActor
    private func load() async {
        async let q = (try? await QuestionnaireService.recent(limit: 100)) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let p = (try? await ProjectService.list()) ?? []
        questionnaires = (await q).filter { $0.status == .completed }
        templates = await t
        projects = await p
    }

    @MainActor
    private func share(path: String) async {
        guard let data = try? await StorageService.download(bucket: .pdfs, path: path) else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(path.split(separator: "/").last.map(String.init) ?? "report.pdf")
        try? data.write(to: url)
        sharingURL = IdentifiableURL(url: url)
    }
}
