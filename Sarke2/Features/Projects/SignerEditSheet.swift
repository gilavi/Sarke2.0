import SwiftUI

struct SignerEditSheet: View {
    @Environment(\.dismiss) private var dismiss

    let projectId: UUID
    let role: SignerRole
    let existing: ProjectSigner?
    var onSaved: () async -> Void

    @State private var fullName = ""
    @State private var phone = ""
    @State private var position = ""
    @State private var signatureImage: UIImage?
    @State private var showingCanvas = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section(role.georgianName) {
                    TextField("სახელი გვარი", text: $fullName)
                    TextField("ტელეფონი", text: $phone).keyboardType(.phonePad)
                    TextField("პოზიცია", text: $position)
                }

                Section("ხელმოწერა") {
                    if let img = signatureImage {
                        Image(uiImage: img)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 100)
                    }
                    Button(signatureImage == nil ? "ხელის მოწერა" : "ხელახლა მოწერა") {
                        showingCanvas = true
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red).font(.footnote) }
                }
            }
            .navigationTitle(existing == nil ? "დამატება" : "რედაქტირება")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") { Task { await save() } }
                        .disabled(fullName.isEmpty || isSaving)
                }
            }
            .sheet(isPresented: $showingCanvas) {
                SignatureCanvasSheet { image in
                    signatureImage = image
                }
            }
            .onAppear {
                guard let existing else { return }
                fullName = existing.fullName
                phone = existing.phone ?? ""
                position = existing.position ?? ""
            }
        }
    }

    @MainActor
    private func save() async {
        isSaving = true; defer { isSaving = false }
        errorMessage = nil

        do {
            var signatureURL = existing?.signaturePngUrl
            if let img = signatureImage, let data = img.pngData() {
                let path = "\(projectId.uuidString)/\(role.rawValue)-\(UUID().uuidString).png"
                try await StorageService.upload(data: data, bucket: .signatures, path: path, contentType: "image/png")
                signatureURL = path
            }

            let signer = ProjectSigner(
                id: existing?.id ?? UUID(),
                projectId: projectId,
                role: role,
                fullName: fullName,
                phone: phone.isEmpty ? nil : phone,
                position: position.isEmpty ? nil : position,
                signaturePngUrl: signatureURL
            )
            _ = try await ProjectService.upsertSigner(signer)
            await onSaved()
            Haptic.success()
            dismiss()
        } catch {
            Haptic.error()
            errorMessage = error.localizedDescription
        }
    }
}
