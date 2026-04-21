import SwiftUI

struct SigningView: View {
    @Bindable var vm: WizardViewModel

    @State private var signers: [ProjectSigner] = []
    @State private var collected: [SignerRole: SignatureRecord] = [:]
    @State private var liveCanvasRole: SignerRole?
    @State private var picking: SignerRole?
    @State private var certs: [Certificate] = []
    @State private var showingCertPrompt = false
    @State private var isGenerating = false
    @State private var generatedPDF: URL?
    @State private var errorMessage: String?

    private var requiredRoles: [SignerRole] { vm.template.requiredSignerRoles }

    var body: some View {
        Form {
            Section("საჭირო ხელმოწერები") {
                ForEach(requiredRoles, id: \.self) { role in
                    signerRow(for: role)
                }
            }

            Section("სერტიფიკატი") {
                let needed = Set(vm.template.requiredCertTypes)
                let have = certs.map(\.type)
                let missing = needed.subtracting(have)
                if missing.isEmpty && !needed.isEmpty {
                    Label("ყველა სერტიფიკატი ატვირთულია", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                } else if !needed.isEmpty {
                    Label("აკლია: \(missing.joined(separator: ", "))", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Button("სერტიფიკატის ატვირთვა") { showingCertPrompt = true }
                }
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            Section {
                Button {
                    Task { await generate() }
                } label: {
                    HStack {
                        if isGenerating { ProgressView() }
                        Text("PDF-ის დაგენერირება")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!readyToGenerate || isGenerating)
            }
        }
        .navigationTitle("ხელმოწერა")
        .task { await load() }
        .sheet(item: $liveCanvasRole) { role in
            LiveSignSheet(role: role, questionnaireId: vm.questionnaire.id) { record in
                collected[role] = record
            }
        }
        .sheet(item: $picking) { role in
            PickRosterSignerSheet(projectId: vm.questionnaire.projectId, role: role, signers: signers) { signer in
                Task {
                    if let rec = await upsertSignature(from: signer) {
                        collected[role] = rec
                    }
                }
            }
        }
        .sheet(isPresented: $showingCertPrompt) {
            NavigationStack { CertificatesView() }
        }
        .sheet(item: $generatedPDF) { url in
            PDFShareSheet(url: url)
        }
    }

    @ViewBuilder
    private func signerRow(for role: SignerRole) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(role.georgianName).font(.subheadline.weight(.medium))
            if let rec = collected[role] {
                HStack {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                    Text(rec.fullName)
                    Spacer()
                    Button("ხელახლა") { liveCanvasRole = role }
                        .font(.caption)
                }
            } else {
                HStack {
                    if role == .expert {
                        Button("ხელის მოწერა") { liveCanvasRole = role }
                            .buttonStyle(.borderedProminent)
                    } else {
                        Button("არსებულიდან") { picking = role }
                            .buttonStyle(.bordered)
                        Button("ახლავე მოწერა") { liveCanvasRole = role }
                            .buttonStyle(.bordered)
                    }
                }
            }
        }
    }

    private var readyToGenerate: Bool {
        let allSigned = requiredRoles.allSatisfy { collected[$0] != nil }
        let certsOK = Set(vm.template.requiredCertTypes).isSubset(of: Set(certs.map(\.type)))
        return allSigned && certsOK
    }

    @MainActor
    private func load() async {
        async let s = (try? await ProjectService.signers(projectId: vm.questionnaire.projectId)) ?? []
        async let c = (try? await CertificateService.list()) ?? []
        async let existing = (try? await SignatureService.list(questionnaireId: vm.questionnaire.id)) ?? []
        signers = await s
        certs = await c
        for r in await existing { collected[r.signerRole] = r }
    }

    @MainActor
    private func upsertSignature(from signer: ProjectSigner) async -> SignatureRecord? {
        guard let sigPath = signer.signaturePngUrl else { return nil }
        let record = SignatureRecord(
            id: UUID(),
            questionnaireId: vm.questionnaire.id,
            signerRole: signer.role,
            fullName: signer.fullName,
            phone: signer.phone,
            position: signer.position,
            signaturePngUrl: sigPath,
            signedAt: Date()
        )
        return try? await SignatureService.upsert(record)
    }

    @MainActor
    private func generate() async {
        isGenerating = true; defer { isGenerating = false }
        errorMessage = nil
        do {
            let renderer = PDFRenderer(
                questionnaire: vm.questionnaire,
                template: vm.template,
                questions: vm.questions,
                answers: Array(vm.answersByQuestion.values),
                photosByAnswer: vm.photosByAnswer,
                signatures: Array(collected.values),
                conclusionText: vm.conclusionText,
                isSafeForUse: vm.isSafeForUse,
                harnessName: vm.harnessName,
                harnessRowCount: vm.harnessRowCount,
                certificates: certs.filter { vm.template.requiredCertTypes.contains($0.type) }
            )
            let url = try await renderer.render()
            let path = "\(vm.questionnaire.id.uuidString).pdf"
            if let data = try? Data(contentsOf: url) {
                try await StorageService.upload(data: data, bucket: .pdfs, path: path, contentType: "application/pdf")
                try await QuestionnaireService.complete(id: vm.questionnaire.id, pdfUrl: path)
            }
            generatedPDF = url
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

extension URL: @retroactive Identifiable { public var id: String { absoluteString } }

// MARK: - Live sign sheet (expert or in-person signer)

struct LiveSignSheet: View {
    @Environment(\.dismiss) private var dismiss
    let role: SignerRole
    let questionnaireId: UUID
    var onSigned: (SignatureRecord) -> Void

    @State private var fullName = ""
    @State private var phone = ""
    @State private var position = ""
    @State private var signatureImage: UIImage?
    @State private var showingCanvas = false
    @State private var isSaving = false

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
                        Image(uiImage: img).resizable().scaledToFit().frame(height: 100)
                    }
                    Button(signatureImage == nil ? "ხელის მოწერა" : "ხელახლა მოწერა") {
                        showingCanvas = true
                    }
                }
            }
            .navigationTitle("ხელმოწერა")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") { Task { await save() } }
                        .disabled(!canSave || isSaving)
                }
            }
            .sheet(isPresented: $showingCanvas) {
                SignatureCanvasSheet { signatureImage = $0 }
            }
        }
    }

    private var canSave: Bool {
        !fullName.isEmpty && signatureImage != nil
    }

    @MainActor
    private func save() async {
        isSaving = true; defer { isSaving = false }
        guard let img = signatureImage, let data = img.pngData() else { return }
        let path = "questionnaire/\(questionnaireId.uuidString)/\(role.rawValue).png"
        do {
            try await StorageService.upload(data: data, bucket: .signatures, path: path, contentType: "image/png")
            let rec = SignatureRecord(
                id: UUID(),
                questionnaireId: questionnaireId,
                signerRole: role,
                fullName: fullName,
                phone: phone.isEmpty ? nil : phone,
                position: position.isEmpty ? nil : position,
                signaturePngUrl: path,
                signedAt: Date()
            )
            let saved = try await SignatureService.upsert(rec)
            onSigned(saved)
            dismiss()
        } catch { /* ignore */ }
    }
}

// MARK: - Roster picker

struct PickRosterSignerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let projectId: UUID
    let role: SignerRole
    let signers: [ProjectSigner]
    var onPicked: (ProjectSigner) -> Void

    var body: some View {
        NavigationStack {
            List {
                let filtered = signers.filter { $0.role == role && $0.signaturePngUrl != nil }
                if filtered.isEmpty {
                    ContentUnavailableView("ხელმომწერი არ არის",
                                           systemImage: "person.slash",
                                           description: Text("დაამატე ამ როლისთვის ხელმომწერი პროექტის გვერდზე."))
                }
                ForEach(filtered) { signer in
                    Button {
                        onPicked(signer); dismiss()
                    } label: {
                        VStack(alignment: .leading) {
                            Text(signer.fullName).font(.body)
                            Text(signer.role.georgianName).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("აირჩიე ხელმომწერი")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("დახურვა") { dismiss() } }
            }
        }
    }
}

// MARK: - PDF share

struct PDFShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
