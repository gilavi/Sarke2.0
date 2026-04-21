import SwiftUI
import PhotosUI

struct CertificatesView: View {
    @State private var certs: [Certificate] = []
    @State private var showingAdd = false

    var body: some View {
        List {
            if certs.isEmpty {
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
                    if let exp = cert.expiresAt {
                        Text("ვადა: \(exp.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(cert.isExpiring ? .orange : .secondary)
                    }
                }
            }
            .onDelete { idx in
                Task {
                    for i in idx { try? await CertificateService.delete(certs[i].id) }
                    await load()
                }
            }
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
    }

    @MainActor
    private func load() async {
        certs = (try? await CertificateService.list()) ?? []
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
                if photoData != nil { Text("ფოტო არჩეულია").foregroundStyle(.green) }
            }
            .navigationTitle("სერტიფიკატი")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") { Task { await save() } }
                }
            }
            .task(id: photoItem) {
                if let item = photoItem {
                    photoData = try? await item.loadTransferable(type: Data.self)
                }
            }
        }
    }

    @MainActor
    private func save() async {
        guard let user = try? await SupabaseService.shared.auth.session.user else { return }
        var filePath: String? = nil
        if let data = photoData {
            let path = "\(user.id.uuidString)/\(UUID().uuidString).jpg"
            try? await StorageService.upload(data: data, bucket: .certificates, path: path, contentType: "image/jpeg")
            filePath = path
        }
        let cert = Certificate(
            id: UUID(),
            userId: user.id,
            type: type,
            number: number.isEmpty ? nil : number,
            issuedAt: issuedAt,
            expiresAt: expiresAt,
            fileUrl: filePath
        )
        _ = try? await CertificateService.upsert(cert)
        await onSaved()
        dismiss()
    }
}
