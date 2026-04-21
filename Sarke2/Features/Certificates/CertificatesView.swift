import SwiftUI
import PhotosUI

struct CertificatesView: View {
    @State private var certs: [Certificate] = []
    @State private var isLoading = true
    @State private var showingAdd = false
    @State private var pendingDelete: IndexSet?

    var body: some View {
        List {
            if isLoading && certs.isEmpty {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if certs.isEmpty {
                ContentUnavailableView(
                    "სერტიფიკატი არ არის",
                    systemImage: "rosette",
                    description: Text("დაამატე სერტიფიკატი, რომ PDF-ებს თან ერთოდეს.")
                )
            }
            ForEach(certs) { cert in
                VStack(alignment: .leading) {
                    Text(cert.type).font(.headline)
                    if let num = cert.number { Text("№ \(num)").font(.subheadline) }
                    if let exp = cert.expiresDate {
                        Text("ვადა: \(exp.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(cert.isExpiring ? .orange : .secondary)
                    }
                }
            }
            .onDelete { idx in pendingDelete = idx }
        }
        .navigationTitle("სერტიფიკატები")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingAdd = true } label: { Image(systemName: "plus") }
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showingAdd) {
            AddCertificateSheet { await load() }
        }
        .confirmationDialog(
            "სერტიფიკატის წაშლა?",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("წაშლა", role: .destructive) {
                if let idx = pendingDelete { Task { await delete(at: idx) } }
                pendingDelete = nil
            }
            Button("გაუქმება", role: .cancel) { pendingDelete = nil }
        }
    }

    @MainActor
    private func load() async {
        isLoading = true; defer { isLoading = false }
        certs = (try? await CertificateService.list()) ?? []
    }

    @MainActor
    private func delete(at offsets: IndexSet) async {
        for i in offsets { try? await CertificateService.delete(certs[i].id) }
        await load()
    }
}

struct AddCertificateSheet: View {
    @Environment(\.dismiss) private var dismiss
    var onSaved: () async -> Void

    @State private var type = "xaracho_inspector"
    @State private var number = ""
    @State private var issuedAt = Date()
    @State private var expiresAt = Date().addingTimeInterval(60 * 60 * 24 * 365)
    @State private var photoItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var isLoadingPhoto = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let types: [(String, String)] = [
        ("xaracho_inspector", "ხარაჩოს ინსპექტორი"),
        ("harness_inspector", "ქამრების ინსპექტორი"),
        ("general", "სხვა")
    ]

    var body: some View {
        NavigationStack {
            Form {
                Picker("ტიპი", selection: $type) {
                    ForEach(types, id: \.0) { Text($0.1).tag($0.0) }
                }
                TextField("ნომერი", text: $number)
                DatePicker("გაცემის თარიღი", selection: $issuedAt, displayedComponents: .date)
                DatePicker("ვადა", selection: $expiresAt, displayedComponents: .date)
                PhotosPicker("ფოტო/სკანი", selection: $photoItem, matching: .images)
                if isLoadingPhoto { ProgressView("იტვირთება ფოტო...") }
                else if photoData != nil { Label("ფოტო არჩეულია", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.footnote)
                }
            }
            .navigationTitle("სერტიფიკატი")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") { Task { await save() } }
                        .disabled(isSaving)
                }
            }
            .task(id: photoItem) {
                guard let item = photoItem else { return }
                isLoadingPhoto = true; defer { isLoadingPhoto = false }
                photoData = try? await item.loadTransferable(type: Data.self)
            }
        }
    }

    // Detect format from magic bytes. Supports PNG, JPEG, HEIC/HEIF, GIF, WebP.
    private func imageKind(for data: Data) -> (String, String) {
        let b = [UInt8](data.prefix(12))
        if b.starts(with: [0x89, 0x50, 0x4E, 0x47])       { return ("png", "image/png") }
        if b.starts(with: [0xFF, 0xD8, 0xFF])             { return ("jpg", "image/jpeg") }
        if b.starts(with: [0x47, 0x49, 0x46, 0x38])       { return ("gif", "image/gif") }
        if b.count >= 12 {
            let ftyp = Array(b[4..<12])
            let heicTags: [[UInt8]] = [
                [0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x63],
                [0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x78],
                [0x66,0x74,0x79,0x70,0x6D,0x69,0x66,0x31]
            ]
            if heicTags.contains(ftyp) { return ("heic", "image/heic") }
            if b.starts(with: [0x52, 0x49, 0x46, 0x46]),
               Array(b[8..<12]) == [0x57, 0x45, 0x42, 0x50] {
                return ("webp", "image/webp")
            }
        }
        return ("jpg", "image/jpeg")
    }

    @MainActor
    private func save() async {
        isSaving = true; defer { isSaving = false }
        errorMessage = nil
        do {
            guard let user = try? await SupabaseService.shared.auth.session.user else {
                throw DataError.notSignedIn
            }
            var filePath: String? = nil
            if let data = photoData {
                let (ext, mime) = imageKind(for: data)
                let path = "\(user.id.uuidString)/\(UUID().uuidString).\(ext)"
                try await StorageService.upload(data: data, bucket: .certificates, path: path, contentType: mime)
                filePath = path
            }
            let cert = Certificate(
                id: UUID(),
                userId: user.id,
                type: type,
                number: number.isEmpty ? nil : number,
                issuedAt: Certificate.dateString(issuedAt),
                expiresAt: Certificate.dateString(expiresAt),
                fileUrl: filePath
            )
            _ = try await CertificateService.upsert(cert)
            Haptic.success()
            await onSaved()
            dismiss()
        } catch {
            Haptic.error()
            errorMessage = error.localizedDescription
        }
    }
}
