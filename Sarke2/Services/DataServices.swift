import Foundation
import Supabase

// Thin data layer. Each method returns decoded models or throws.
// All queries are RLS-scoped — caller never passes user_id.

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

// MARK: - Questionnaires

enum QuestionnaireService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func recent(limit: Int = 50) async throws -> [Questionnaire] {
        try await db.from("questionnaires")
            .select()
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    static func list(projectId: UUID) async throws -> [Questionnaire] {
        try await db.from("questionnaires")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func create(projectId: UUID, templateId: UUID, harnessName: String? = nil) async throws -> Questionnaire {
        guard let user = try? await db.auth.session.user else { throw DataError.notSignedIn }
        struct Payload: Encodable {
            let project_id: UUID
            let template_id: UUID
            let user_id: UUID
            let status: String = "draft"
            let harness_name: String?
        }
        let payload = Payload(project_id: projectId, template_id: templateId, user_id: user.id, harness_name: harnessName)
        return try await db.from("questionnaires")
            .insert(payload, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func update(_ q: Questionnaire) async throws -> Questionnaire {
        try await db.from("questionnaires")
            .update(q)
            .eq("id", value: q.id)
            .select()
            .single()
            .execute()
            .value
    }

    static func complete(id: UUID, pdfUrl: String) async throws {
        struct Patch: Encodable {
            let status: String = "completed"
            let pdf_url: String
            let completed_at: Date
        }
        try await db.from("questionnaires")
            .update(Patch(pdf_url: pdfUrl, completed_at: Date()))
            .eq("id", value: id)
            .execute()
    }
}

// MARK: - Answers

enum AnswerService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(questionnaireId: UUID) async throws -> [Answer] {
        try await db.from("answers")
            .select()
            .eq("questionnaire_id", value: questionnaireId)
            .execute()
            .value
    }

    static func upsert(_ a: Answer) async throws -> Answer {
        try await db.from("answers")
            .upsert(a, onConflict: "questionnaire_id,question_id", returning: .representation)
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

    static func addPhoto(answerId: UUID, storagePath: String, caption: String? = nil) async throws -> AnswerPhoto {
        struct Payload: Encodable {
            let answer_id: UUID
            let storage_path: String
            let caption: String?
        }
        return try await db.from("answer_photos")
            .insert(Payload(answer_id: answerId, storage_path: storagePath, caption: caption), returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }
}

// MARK: - Signatures

enum SignatureService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list(questionnaireId: UUID) async throws -> [SignatureRecord] {
        try await db.from("signatures")
            .select()
            .eq("questionnaire_id", value: questionnaireId)
            .execute()
            .value
    }

    static func upsert(_ s: SignatureRecord) async throws -> SignatureRecord {
        try await db.from("signatures")
            .upsert(s, onConflict: "questionnaire_id,signer_role", returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }
}

// MARK: - Certificates

enum CertificateService {
    static var db: SupabaseClient { SupabaseService.shared }

    static func list() async throws -> [Certificate] {
        try await db.from("certificates")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func upsert(_ c: Certificate) async throws -> Certificate {
        try await db.from("certificates")
            .upsert(c, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    static func delete(_ id: UUID) async throws {
        try await db.from("certificates").delete().eq("id", value: id).execute()
    }
}

// MARK: - Storage

enum StorageBucket: String {
    case certificates, answerPhotos = "answer-photos", pdfs, signatures
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

    static func download(bucket: StorageBucket, path: String) async throws -> Data {
        try await db.storage.from(bucket.rawValue).download(path: path)
    }
}
