import SwiftUI

struct TemplatesView: View {
    @State private var templates: [Template] = []

    var body: some View {
        List {
            Section("სისტემური") {
                ForEach(templates.filter(\.isSystem)) { t in
                    NavigationLink {
                        TemplateDetailView(template: t)
                    } label: {
                        Text(t.name)
                    }
                }
            }
            let userTemplates = templates.filter { !$0.isSystem }
            if !userTemplates.isEmpty {
                Section("ჩემი შაბლონები") {
                    ForEach(userTemplates) { t in
                        NavigationLink { TemplateDetailView(template: t) } label: { Text(t.name) }
                    }
                }
            }
        }
        .navigationTitle("შაბლონები")
        .task { templates = (try? await TemplateService.list()) ?? [] }
    }
}

struct TemplateDetailView: View {
    let template: Template
    @State private var questions: [Question] = []

    var body: some View {
        List {
            Section("ინფორმაცია") {
                LabeledContent("კატეგორია", value: template.category ?? "—")
                LabeledContent("სისტემური", value: template.isSystem ? "კი" : "არა")
                LabeledContent("საჭირო სერტიფიკატი", value: template.requiredCertTypes.joined(separator: ", "))
                LabeledContent("საჭირო ხელმომწერი", value: template.requiredSignerRoles.map(\.georgianName).joined(separator: ", "))
            }
            Section("კითხვები") {
                ForEach(questions) { q in
                    VStack(alignment: .leading) {
                        Text("Section \(q.section) · #\(q.order)")
                            .font(.caption).foregroundStyle(.secondary)
                        Text(q.title).font(.subheadline)
                        Text("ტიპი: \(q.type.rawValue)")
                            .font(.caption2).foregroundStyle(.tertiary)
                    }
                }
            }
        }
        .navigationTitle(template.name)
        .task {
            questions = (try? await TemplateService.questions(templateId: template.id)) ?? []
        }
    }
}
