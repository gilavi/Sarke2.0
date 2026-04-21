import SwiftUI

struct ProjectDetailView: View {
    let project: Project

    @State private var signers: [ProjectSigner] = []
    @State private var questionnaires: [Questionnaire] = []
    @State private var templates: [Template] = []
    @State private var showingSignerEdit: ProjectSigner?
    @State private var addingSignerRole: SignerRole?
    @State private var showingStart: Template?

    var body: some View {
        List {
            Section("ინფორმაცია") {
                LabeledContent("კომპანია", value: project.companyName ?? "—")
                LabeledContent("მისამართი", value: project.address ?? "—")
            }

            Section("ხელმომწერები") {
                ForEach(signers) { signer in
                    Button {
                        showingSignerEdit = signer
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(signer.role.georgianName).font(.caption).foregroundStyle(.secondary)
                            Text(signer.fullName).font(.body)
                        }
                    }
                }
                Menu {
                    ForEach(SignerRole.allCases, id: \.self) { role in
                        Button(role.georgianName) { addingSignerRole = role }
                    }
                } label: {
                    Label("ხელმომწერის დამატება", systemImage: "person.badge.plus")
                }
            }

            Section("კითხვარები") {
                ForEach(questionnaires) { q in
                    if let template = templates.first(where: { $0.id == q.templateId }) {
                        NavigationLink {
                            WizardView(questionnaire: q, template: template)
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(template.name).font(.subheadline)
                                    Text(q.createdAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(q.status == .completed ? "დასრულდა" : "დრაფტი")
                                    .font(.caption)
                                    .padding(.horizontal, 8).padding(.vertical, 3)
                                    .background((q.status == .completed ? Color.green : Color.orange).opacity(0.18))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                Menu {
                    ForEach(templates.filter { $0.isSystem }) { t in
                        Button(t.name) { showingStart = t }
                    }
                } label: {
                    Label("ახალი კითხვარი", systemImage: "doc.badge.plus")
                }
            }
        }
        .navigationTitle(project.name)
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
    }

    @MainActor
    private func load() async {
        async let s = (try? await ProjectService.signers(projectId: project.id)) ?? []
        async let t = (try? await TemplateService.list()) ?? []
        async let allQ = (try? await QuestionnaireService.recent(limit: 200)) ?? []
        signers = await s
        templates = await t
        questionnaires = (await allQ).filter { $0.projectId == project.id }
    }
}

extension SignerRole: Identifiable { var id: String { rawValue } }
