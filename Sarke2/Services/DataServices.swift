import Foundation
import Supabase

// Thin data layer. Each method returns decoded models or throws.
// All queries are RLS-scoped — caller never passes user_id.
//
// Naming note: server tables `questionnaires` → `inspections` and old
// `certificates` → `qualifications` were renamed in migration 0006. A NEW
// `certificates` table now holds generated PDFs derived from inspections.
// Swift parameter labels still spell `questionnaireId` in places to avoid
// breaking call sites; the underlying queries target the renamed columns.

enum DataError: LocalizedError {
    case notSignedIn
    var errorDescription: String? { "მომხმარებელი არ არის ავტორიზებული." }
}

// MARK: - Projects

enum ProjectService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list() async throws -> [Project] {
        try await db.from("projects")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetch(id: UUID) async throws -> Project {
        try await db.from("projects").select().eq("id", value: id).single().execute().value
    }

    static func create(name: String, companyName: String?, address: String?) async throws -> Project {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let user_id: UUID
            let name: String
            let company_name: String?
            let address: String?
        }
        let payload = Payload(user_id: user.id, name: name, company_name: companyName, address: address)
        return try await db.from("projects")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func update(_ p: Project) async throws -> Project {
        try await db.from("projects")
            .update(p)
            .eq("id", value: p.id)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("projects").delete().eq("id", value: id).execute()
    }

    static func signers(projectId: UUID) async throws -> [ProjectSigner] {
        try await db.from("project_signers")
            .select()
            .eq("project_id", value: projectId)
            .execute()
            .value
    }

    static func upsertSigner(_ signer: ProjectSigner) async throws -> ProjectSigner {
        try await db.from("project_signers")
            .upsert(signer, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func deleteSigner(_ id: UUID) async throws {
        try await db.from("project_signers").delete().eq("id", value: id).execute()
    }
}

// MARK: - Project Items + Schedules (0003 / 0005)

enum ProjectItemService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(projectId: UUID) async throws -> [ProjectItem] {
        try await db.from("project_items")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func create(projectId: UUID, name: String, category: String?) async throws -> ProjectItem {
        struct Payload: Encodable {
            let project_id: UUID
            let name: String
            let category: String?
        }
        return try await db.from("project_items")
            .insert(Payload(project_id: projectId, name: name, category: category), returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("project_items").delete().eq("id", value: id).execute()
    }
}

enum ScheduleService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list() async throws -> [Schedule] {
        try await db.from("schedules")
            .select()
            .order("next_due_at", ascending: true)
            .execute()
            .value
    }

    static func forItem(_ projectItemId: UUID) async throws -> Schedule? {
        let rows: [Schedule] = try await db.from("schedules")
            .select()
            .eq("project_item_id", value: projectItemId)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    static func setGoogleEventId(_ scheduleId: UUID, googleEventId: String?) async throws {
        struct Patch: Encodable { let google_event_id: String? }
        try await db.from("schedules")
            .update(Patch(google_event_id: googleEventId))
            .eq("id", value: scheduleId)
            .execute()
    }
}

// MARK: - Project Files (0014)

enum ProjectFileService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(projectId: UUID) async throws -> [ProjectFile] {
        try await db.from("project_files")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func create(projectId: UUID, name: String, storagePath: String, sizeBytes: Int64?, mimeType: String?) async throws -> ProjectFile {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let project_id: UUID
            let user_id: UUID
            let name: String
            let storage_path: String
            let size_bytes: Int64?
            let mime_type: String?
        }
        let payload = Payload(project_id: projectId, user_id: user.id, name: name,
                              storage_path: storagePath, size_bytes: sizeBytes, mime_type: mimeType)
        return try await db.from("project_files")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("project_files").delete().eq("id", value: id).execute()
    }
}

// MARK: - Templates

enum TemplateService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list() async throws -> [Template] {
        try await db.from("templates")
            .select()
            .order("is_system", ascending: false)
            .order("created_at", ascending: true)
            .execute()
            .value
    }

    static func fetch(id: UUID) async throws -> Template {
        try await db.from("templates").select().eq("id", value: id).single().execute().value
    }

    static func questions(templateId: UUID) async throws -> [Question] {
        try await db.from("questions")
            .select()
            .eq("template_id", value: templateId)
            .order("section", ascending: true)
            .order("order", ascending: true)
            .execute()
            .value
    }
}

// MARK: - Inspections (table renamed from `questionnaires` in 0006)

enum InspectionService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func recent(limit: Int = 50) async throws -> [Inspection] {
        try await db.from("inspections")
            .select()
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    static func list(projectId: UUID) async throws -> [Inspection] {
        try await db.from("inspections")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetch(id: UUID) async throws -> Inspection {
        try await db.from("inspections").select().eq("id", value: id).single().execute().value
    }

    static func create(projectId: UUID, templateId: UUID, harnessName: String? = nil, projectItemId: UUID? = nil) async throws -> Inspection {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let project_id: UUID
            let template_id: UUID
            let user_id: UUID
            let status: String = "draft"
            let harness_name: String?
            let project_item_id: UUID?
        }
        let payload = Payload(project_id: projectId, template_id: templateId,
                              user_id: user.id, harness_name: harnessName,
                              project_item_id: projectItemId)
        return try await db.from("inspections")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func update(_ q: Inspection) async throws -> Inspection {
        // Server-side trigger from 0008/0010 blocks updates to completed rows;
        // catch the error at call sites if the user attempts a draft-era flush
        // post-completion.
        try await db.from("inspections")
            .update(q)
            .eq("id", value: q.id)
            .select()
            .single()
            .execute()
            .value
    }

    // After 0006, completing an inspection no longer writes pdf_url onto the
    // inspection itself — it inserts a fresh `certificates` row pointing at
    // the rendered PDF. This call orchestrates both: flip the inspection to
    // completed, then create the certificate snapshot.
    @discardableResult
    static func complete(id: UUID, pdfUrl: String, isSafeForUse: Bool?, conclusionText: String?, templateId: UUID) async throws -> Certificate {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }

        struct InspectionPatch: Encodable {
            let status: String = "completed"
            let completed_at: Date
        }
        try await db.from("inspections")
            .update(InspectionPatch(completed_at: Date()))
            .eq("id", value: id)
            .execute()

        struct CertPayload: Encodable {
            let inspection_id: UUID
            let user_id: UUID
            let template_id: UUID
            let pdf_url: String
            let is_safe_for_use: Bool?
            let conclusion_text: String?
        }
        let payload = CertPayload(inspection_id: id, user_id: user.id, template_id: templateId,
                                  pdf_url: pdfUrl, is_safe_for_use: isSafeForUse, conclusion_text: conclusionText)
        return try await db.from("certificates")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }
}

// Backwards-compatibility alias for screens that still call
// `QuestionnaireService.foo(...)`. Remove after the Phase 2 rename pass.
typealias QuestionnaireService = InspectionService

// MARK: - Answers (column `inspection_id` since 0006)

enum AnswerService {
    static var db: SupabaseClient { SupabaseService.shared }

    // Param label keeps the old spelling so existing call sites compile. The
    // column on the wire is `inspection_id`.
    static func list(questionnaireId: UUID) async throws -> [Answer] {
        try await db.from("answers")
            .select()
            .eq("inspection_id", value: questionnaireId)
            .execute()
            .value
    }

    static func upsert(_ a: Answer) async throws -> Answer {
        try await db.from("answers")
            .upsert(a, onConflict: "inspection_id,question_id", returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func photos(answerId: UUID) async throws -> [AnswerPhoto] {
        try await db.from("answer_photos")
            .select()
            .eq("answer_id", value: answerId)
            .execute()
            .value
    }

    static func addPhoto(answerId: UUID, storagePath: String, caption: String? = nil,
                         latitude: Double? = nil, longitude: Double? = nil, address: String? = nil) async throws -> AnswerPhoto {
        struct Payload: Encodable {
            let answer_id: UUID
            let storage_path: String
            let caption: String?
            let latitude: Double?
            let longitude: Double?
            let address: String?
        }
        return try await db.from("answer_photos")
            .insert(Payload(answer_id: answerId, storage_path: storagePath, caption: caption,
                            latitude: latitude, longitude: longitude, address: address),
                    returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }
}

// MARK: - Signatures (column `inspection_id` since 0006, status enum since 0004)

enum SignatureService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(questionnaireId: UUID) async throws -> [SignatureRecord] {
        try await db.from("signatures")
            .select()
            .eq("inspection_id", value: questionnaireId)
            .execute()
            .value
    }

    static func upsert(_ s: SignatureRecord) async throws -> SignatureRecord {
        try await db.from("signatures")
            .upsert(s, onConflict: "inspection_id,signer_role", returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }
}

// MARK: - Qualifications (table renamed from `certificates` in 0006)

// The expert's professional credentials. Distinct from the new `certificates`
// table (generated PDFs — see CertificateService below).
enum QualificationService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list() async throws -> [Qualification] {
        try await db.from("qualifications")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func upsert(_ q: Qualification) async throws -> Qualification {
        try await db.from("qualifications")
            .upsert(q, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("qualifications").delete().eq("id", value: id).execute()
    }
}

// Compat alias for code that still calls `CertificateService.list()` expecting
// the old "credentials" table semantics. Remove after Phase 2 rename pass.
typealias CertificateService = QualificationService

// MARK: - Generated Certificates (NEW table from 0006)

enum GeneratedCertificateService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(userId: UUID? = nil) async throws -> [Certificate] {
        let base = db.from("certificates").select()
        if let userId {
            return try await base.eq("user_id", value: userId)
                .order("generated_at", ascending: false)
                .execute()
                .value
        }
        return try await base.order("generated_at", ascending: false).execute().value
    }

    static func latest(inspectionId: UUID) async throws -> Certificate? {
        let rows: [Certificate] = try await db.from("certificates")
            .select()
            .eq("inspection_id", value: inspectionId)
            .order("generated_at", ascending: false)
            .limit(1)
            .execute()
            .value
        return rows.first
    }
}

// MARK: - Inspection attachments (0021)

enum InspectionAttachmentService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(inspectionId: UUID) async throws -> [InspectionAttachment] {
        try await db.from("inspection_attachments")
            .select()
            .eq("inspection_id", value: inspectionId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func create(inspectionId: UUID, certType: String, certNumber: String?, photoPath: String?) async throws -> InspectionAttachment {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let inspection_id: UUID
            let user_id: UUID
            let cert_type: String
            let cert_number: String?
            let photo_path: String?
        }
        return try await db.from("inspection_attachments")
            .insert(Payload(inspection_id: inspectionId, user_id: user.id, cert_type: certType,
                            cert_number: certNumber, photo_path: photoPath),
                    returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("inspection_attachments").delete().eq("id", value: id).execute()
    }
}

// MARK: - Incidents (0017)

enum IncidentService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(projectId: UUID? = nil, limit: Int = 200) async throws -> [Incident] {
        let base = db.from("incidents").select()
        if let projectId {
            return try await base.eq("project_id", value: projectId)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
                .value
        }
        return try await base.order("created_at", ascending: false).limit(limit).execute().value
    }

    static func fetch(id: UUID) async throws -> Incident {
        try await db.from("incidents").select().eq("id", value: id).single().execute().value
    }

    static func upsert(_ i: Incident) async throws -> Incident {
        try await db.from("incidents")
            .upsert(i, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("incidents").delete().eq("id", value: id).execute()
    }
}

// MARK: - Briefings (0018)

enum BriefingService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(projectId: UUID? = nil, limit: Int = 200) async throws -> [Briefing] {
        let base = db.from("briefings").select()
        if let projectId {
            return try await base.eq("project_id", value: projectId)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
                .value
        }
        return try await base.order("created_at", ascending: false).limit(limit).execute().value
    }

    static func fetch(id: UUID) async throws -> Briefing {
        try await db.from("briefings").select().eq("id", value: id).single().execute().value
    }

    static func upsert(_ b: Briefing) async throws -> Briefing {
        try await db.from("briefings")
            .upsert(b, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("briefings").delete().eq("id", value: id).execute()
    }
}

// MARK: - Reports (0019)

enum ReportService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(projectId: UUID? = nil, limit: Int = 200) async throws -> [Report] {
        let base = db.from("reports").select()
        if let projectId {
            return try await base.eq("project_id", value: projectId)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
                .value
        }
        return try await base.order("created_at", ascending: false).limit(limit).execute().value
    }

    static func fetch(id: UUID) async throws -> Report {
        try await db.from("reports").select().eq("id", value: id).single().execute().value
    }

    static func upsert(_ r: Report) async throws -> Report {
        try await db.from("reports")
            .upsert(r, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("reports").delete().eq("id", value: id).execute()
    }
}

// MARK: - Remote Signing (0011)

enum RemoteSigningService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func listForInspection(_ inspectionId: UUID) async throws -> [RemoteSigningRequest] {
        try await db.from("remote_signing_requests")
            .select()
            .eq("inspection_id", value: inspectionId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func create(inspectionId: UUID, signerName: String, signerPhone: String,
                       signerRole: SignerRole, pdfSignedUrl: String?) async throws -> RemoteSigningRequest {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let token: String
            let inspection_id: UUID
            let expert_user_id: UUID
            let signer_name: String
            let signer_phone: String
            let signer_role: String
            let pdf_signed_url: String?
            let last_sent_at: Date
        }
        let payload = Payload(token: Self.generateToken(),
                              inspection_id: inspectionId,
                              expert_user_id: user.id,
                              signer_name: signerName,
                              signer_phone: signerPhone,
                              signer_role: signerRole.rawValue,
                              pdf_signed_url: pdfSignedUrl,
                              last_sent_at: Date())
        return try await db.from("remote_signing_requests")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    private static func generateToken() -> String {
        // 32 bytes of randomness, URL-safe base64. Server has UNIQUE on token.
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

// MARK: - Storage

// Buckets per migrations 0001 (initial: certificates, answer-photos, pdfs,
// signatures), 0011 (remote-signatures), 0014 (project-files), 0017
// (incident-photos), 0019 (report-photos).
enum StorageBucket: String {
    case certificates
    case answerPhotos = "answer-photos"
    case pdfs
    case signatures
    case remoteSignatures = "remote-signatures"
    case projectFiles = "project-files"
    case incidentPhotos = "incident-photos"
    case reportPhotos = "report-photos"
}

enum StorageService {
    static var db: SupabaseClient { SupabaseService.shared }

    @discardableResult
    static func upload(data: Data, bucket: StorageBucket, path: String, contentType: String) async throws -> String {
        let options = FileOptions(contentType: contentType, upsert: true)
        _ = try await db.storage.from(bucket.rawValue).upload(path, data: data, options: options)
        return path
    }

    static func publicURL(bucket: StorageBucket, path: String) throws -> URL {
        try db.storage.from(bucket.rawValue).getPublicURL(path: path)
    }

    static func signedURL(bucket: StorageBucket, path: String, expiresIn seconds: Int = 60 * 60 * 24 * 14) async throws -> URL {
        // Used for remote-signing — mints a 14-day URL the web client can hit
        // without authentication.
        try await db.storage.from(bucket.rawValue).createSignedURL(path: path, expiresIn: seconds)
    }

    static func download(bucket: StorageBucket, path: String) async throws -> Data {
        try await db.storage.from(bucket.rawValue).download(path: path)
    }

    static func delete(bucket: StorageBucket, paths: [String]) async throws {
        _ = try await db.storage.from(bucket.rawValue).remove(paths: paths)
    }
}
