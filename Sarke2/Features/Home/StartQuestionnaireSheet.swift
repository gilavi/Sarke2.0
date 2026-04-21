import SwiftUI

struct StartQuestionnaireSheet: View {
    @Environment(\.dismiss) private var dismiss
    let template: Template

    @State private var projects: [Project] = []
    @State private var selectedProjectId: UUID?
    @State private var isLoading = false
    @State private var startedQuestionnaire: Questionnaire?
    @State private var errorMessage: String?

    // New project inline
    @State private var creatingNew = false
    @State private var newName = ""
    @State private var newCompany = ""
    @State private var newAddress = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(template.name) {
                    if projects.isEmpty && !creatingNew {
                        Text("ჯერ არცერთი პროექტი არ გაქვს.")
                            .foregroundStyle(.secondary)
                    } else if !creatingNew {
                        Picker("პროექტი", selection: $selectedProjectId) {
                            ForEach(projects) { p in
                                Text(p.name).tag(Optional(p.id))
                            }
                        }
                    }

                    Toggle("ახალი პროექტის შექმნა", isOn: $creatingNew.animation())
                }

                if creatingNew {
                    Section("ახალი პროექტი") {
                        TextField("სახელი", text: $newName)
                        TextField("კომპანია", text: $newCompany)
                        TextField("მისამართი", text: $newAddress)
                    }
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }

                Section {
                    Button("დაიწყე კითხვარი") {
                        Task { await start() }
                    }
                    .disabled(!canStart || isLoading)
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("დაწყება")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("გაუქმება") { dismiss() }
                }
            }
            .task { await loadProjects() }
            .navigationDestination(item: $startedQuestionnaire) { q in
                WizardView(questionnaire: q, template: template)
            }
        }
    }

    private var canStart: Bool {
        if creatingNew { return !newName.isEmpty }
        return selectedProjectId != nil
    }

    @MainActor
    private func loadProjects() async {
        projects = (try? await ProjectService.list()) ?? []
        if selectedProjectId == nil { selectedProjectId = projects.first?.id }
    }

    @MainActor
    private func start() async {
        isLoading = true; defer { isLoading = false }
        do {
            let projectId: UUID
            if creatingNew {
                let p = try await ProjectService.create(
                    name: newName,
                    companyName: newCompany.isEmpty ? nil : newCompany,
                    address: newAddress.isEmpty ? nil : newAddress
                )
                projectId = p.id
            } else {
                guard let sel = selectedProjectId else { return }
                projectId = sel
            }
            let q = try await QuestionnaireService.create(
                projectId: projectId,
                templateId: template.id
            )
            startedQuestionnaire = q
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
