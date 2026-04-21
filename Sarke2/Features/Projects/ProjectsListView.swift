import SwiftUI

struct ProjectsListView: View {
    @State private var projects: [Project] = []
    @State private var isLoading = false
    @State private var showingCreate = false

    var body: some View {
        List {
            if projects.isEmpty && !isLoading {
                ContentUnavailableView(
                    "პროექტი არ არის",
                    systemImage: "folder.badge.plus",
                    description: Text("დააჭირე + ღილაკს ახალი პროექტის შესაქმნელად.")
                )
            }
            ForEach(projects) { project in
                NavigationLink(value: project) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(project.name).font(.headline)
                        if let company = project.companyName, !company.isEmpty {
                            Text(company).font(.subheadline).foregroundStyle(.secondary)
                        }
                        if let addr = project.address, !addr.isEmpty {
                            Text(addr).font(.caption).foregroundStyle(.tertiary)
                        }
                    }
                }
            }
            .onDelete { offsets in
                Task { await deleteProjects(at: offsets) }
            }
        }
        .navigationTitle("პროექტები")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingCreate = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showingCreate) {
            CreateProjectSheet { await load() }
        }
        .navigationDestination(for: Project.self) { project in
            ProjectDetailView(project: project)
        }
    }

    @MainActor
    private func load() async {
        isLoading = true; defer { isLoading = false }
        projects = (try? await ProjectService.list()) ?? []
    }

    @MainActor
    private func deleteProjects(at offsets: IndexSet) async {
        for i in offsets {
            try? await ProjectService.delete(projects[i].id)
        }
        await load()
    }
}

struct CreateProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    var onCreated: () async -> Void = {}

    @State private var name = ""
    @State private var company = ""
    @State private var address = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("სახელი", text: $name)
                TextField("კომპანია", text: $company)
                TextField("მისამართი", text: $address)
            }
            .navigationTitle("ახალი პროექტი")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") {
                        Task { await save() }
                    }
                    .disabled(name.isEmpty || isSaving)
                }
            }
        }
    }

    @MainActor
    private func save() async {
        isSaving = true; defer { isSaving = false }
        _ = try? await ProjectService.create(
            name: name,
            companyName: company.isEmpty ? nil : company,
            address: address.isEmpty ? nil : address
        )
        await onCreated()
        dismiss()
    }
}
