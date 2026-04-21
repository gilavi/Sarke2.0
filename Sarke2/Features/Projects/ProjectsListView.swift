import SwiftUI

struct ProjectsListView: View {
    @State private var projects: [Project] = []
    @State private var isLoading = true
    @State private var showingCreate = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if isLoading && projects.isEmpty {
                    ProgressView().padding(.top, 80)
                } else if projects.isEmpty {
                    empty.padding(.top, 60)
                }
                ForEach(projects) { project in
                    NavigationLink(value: project) {
                        row(for: project)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .screenBackground()
        .navigationTitle("პროექტები")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingCreate = true } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Theme.accent)
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

    private func row(for project: Project) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12).fill(Theme.accentSoft)
                    .frame(width: 46, height: 46)
                Image(systemName: "folder.fill")
                    .foregroundStyle(Theme.accent)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(project.name)
                    .font(.display(16, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                if let company = project.companyName, !company.isEmpty {
                    Text(company).font(.footnote).foregroundStyle(Theme.inkSoft)
                }
                if let addr = project.address, !addr.isEmpty {
                    Text(addr).font(.caption).foregroundStyle(Theme.inkSoft.opacity(0.75))
                }
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(Theme.inkSoft.opacity(0.5))
        }
        .card(padding: 14)
    }

    private var empty: some View {
        VStack(spacing: 14) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent.opacity(0.6))
            Text("პროექტი არ არის")
                .font(.display(20, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Text("დააჭირე + ღილაკს ახალი პროექტის\nშესაქმნელად.")
                .font(.footnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    @MainActor
    private func load() async {
        isLoading = true; defer { isLoading = false }
        projects = (try? await ProjectService.list()) ?? []
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
            ScrollView {
                VStack(spacing: 14) {
                    labeledField(label: "სახელი") {
                        TextField("მაგ. \"ვაკე-საბურთალოს ობიექტი\"", text: $name)
                            .textFieldStyle(.rounded)
                    }
                    labeledField(label: "კომპანია") {
                        TextField("შემკვეთი", text: $company).textFieldStyle(.rounded)
                    }
                    labeledField(label: "მისამართი") {
                        TextField("ობიექტის მისამართი", text: $address).textFieldStyle(.rounded)
                    }

                    Button { Task { await save() } } label: {
                        Text("შენახვა")
                    }
                    .buttonStyle(.primary)
                    .disabled(name.isEmpty || isSaving)
                    .padding(.top, 8)
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("ახალი პროექტი")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
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
