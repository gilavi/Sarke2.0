import Foundation

// MARK: - Enums

enum SignerRole: String, Codable, CaseIterable, Hashable {
    case expert
    case xarachoSupervisor = "xaracho_supervisor"
    case xarachoAssembler = "xaracho_assembler"
    case other  // 0016: freeform crew members captured via project participants widget

    var georgianName: String {
        switch self {
        case .expert:             return "შრომის უსაფრთხოების სპეციალისტი"
        case .xarachoSupervisor:  return "ხარაჩოს ზედამხედველი"
        case .xarachoAssembler:   return "ხარაჩოს ამწყობი"
        case .other:              return "სხვა"
        }
    }
}

enum QuestionType: String, Codable {
    case yesno
    case measure
    case componentGrid = "component_grid"
    case freetext
    case photoUpload = "photo_upload"
}

// Server-side enum is `questionnaire_status` for legacy reasons but the table
// is now `inspections`. Keep the Swift name aligned with the table.
enum InspectionStatus: String, Codable { case draft, completed }
typealias QuestionnaireStatus = InspectionStatus

// 0004: signature_status enum (signed | not_present).
enum SignatureStatus: String, Codable { case signed, notPresent = "not_present" }

// 0011: remote_signing_requests.status
enum RemoteSigningStatus: String, Codable { case pending, sent, signed, declined, expired }

// 0017: incidents.type — Georgian labour-law incident categories.
enum IncidentType: String, Codable, CaseIterable {
    case minor, severe, fatal, mass, nearmiss

    var georgianName: String {
        switch self {
        case .minor:    return "მსუბუქი"
        case .severe:   return "მძიმე"
        case .fatal:    return "ფატალური"
        case .mass:     return "მასობრივი"
        case .nearmiss: return "სახიფათო ვითარება"
        }
    }
}

// 0017: incidents.status (also reused by briefings, reports — same draft/completed shape)
enum DocStatus: String, Codable { case draft, completed }

enum TemplateCategory: String {
    case xaracho
    case harness
    case other

    init(raw: String?) {
        self = TemplateCategory(rawValue: raw ?? "") ?? .other
    }

    var iconName: String {
        switch self {
        case .xaracho: return "building.columns.fill"
        case .harness: return "figure.climbing"
        case .other:   return "checkmark.seal.fill"
        }
    }
}

extension Template {
    var categoryKind: TemplateCategory { TemplateCategory(raw: category) }
}

// MARK: - Users

struct AppUser: Codable, Identifiable, Hashable {
    let id: UUID
    let email: String
    var firstName: String
    var lastName: String
    var createdAt: Date
    // 0002: T&C acceptance
    var tcAcceptedVersion: String?
    var tcAcceptedAt: Date?
    // 0004: expert's reusable signature PNG path
    var savedSignatureUrl: String?
    // 0020: updated_at audit timestamp
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, email
        case firstName = "first_name"
        case lastName = "last_name"
        case createdAt = "created_at"
        case tcAcceptedVersion = "tc_accepted_version"
        case tcAcceptedAt = "tc_accepted_at"
        case savedSignatureUrl = "saved_signature_url"
        case updatedAt = "updated_at"
    }

    var displayName: String { "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) }
}

// MARK: - Qualifications (formerly `certificates` table, renamed in 0006)

// Expert's professional credentials (e.g. xaracho_inspector). Renamed from
// `Certificate` to align with the table rename; the new `Certificate` struct
// below represents generated PDFs.
struct Qualification: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    var type: String
    var number: String?
    // Stored as ISO "YYYY-MM-DD" strings (Postgres `date` column).
    // Swift's default ISO8601 decoder rejects date-only strings, so keep as String.
    var issuedAt: String?
    var expiresAt: String?
    var fileUrl: String?
    var updatedAt: Date?  // 0020

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type, number
        case issuedAt = "issued_at"
        case expiresAt = "expires_at"
        case fileUrl = "file_url"
        case updatedAt = "updated_at"
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    var issuedDate: Date? { issuedAt.flatMap { Self.dateFormatter.date(from: $0) } }
    var expiresDate: Date? { expiresAt.flatMap { Self.dateFormatter.date(from: $0) } }

    var isExpiring: Bool {
        guard let d = expiresDate else { return false }
        return d.timeIntervalSinceNow < 60 * 60 * 24 * 30
    }

    static func dateString(_ d: Date) -> String {
        dateFormatter.string(from: d)
    }
}

// Backwards-compatibility alias for screens that still spell the type
// `Certificate`. Remove after the Phase 2 rename pass when all call sites
// have been migrated to either `Qualification` (the credential) or
// `Certificate` (the generated PDF, see below).
@available(*, deprecated, renamed: "Qualification", message: "Renamed in schema 0006: this is the expert's credential, not the generated PDF.")
typealias CertificateQualification = Qualification

// MARK: - Projects

struct Project: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    var name: String
    var companyName: String?
    var address: String?
    var createdAt: Date
    // 0003: company metadata
    var projectNumber: Int64?
    var companyIdNumber: String?
    var companyContactName: String?
    var companyContactPhone: String?
    // 0012: geo coords (sanity-bounded server-side)
    var latitude: Double?
    var longitude: Double?
    // 0013: crew (JSONB array of CrewMember)
    var crew: [CrewMember]?
    // 0015: optional logo (base64 data URL)
    var logo: String?
    // 0022: contact phone (separate from companyContactPhone)
    var contactPhone: String?
    // 0020: updated_at audit
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case companyName = "company_name"
        case address
        case createdAt = "created_at"
        case projectNumber = "project_number"
        case companyIdNumber = "company_id_number"
        case companyContactName = "company_contact_name"
        case companyContactPhone = "company_contact_phone"
        case latitude, longitude
        case crew, logo
        case contactPhone = "contact_phone"
        case updatedAt = "updated_at"
    }
}

// 0013: crew JSONB element shape — { id, name, role, signature?, roleKey? }.
// roleKey ('other' for freeform members) feeds the signer_role enum on PDF
// generation (see 0016 — added 'other' to the enum).
struct CrewMember: Codable, Hashable, Identifiable {
    let id: UUID
    var name: String
    var role: String
    var signature: String?
    // Optional explicit role key when crewmember should map to a signer_role.
    var roleKey: String?

    enum CodingKeys: String, CodingKey {
        case id, name, role, signature
        case roleKey = "role_key"
    }
}

struct ProjectSigner: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    var role: SignerRole
    var fullName: String
    var phone: String?
    var position: String?
    var signaturePngUrl: String?
    var updatedAt: Date?  // 0020

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case role
        case fullName = "full_name"
        case phone, position
        case signaturePngUrl = "signature_png_url"
        case updatedAt = "updated_at"
    }
}

// 0014: project_files — arbitrary documents/photos uploaded against a project.
struct ProjectFile: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let userId: UUID
    var name: String
    var storagePath: String
    var sizeBytes: Int64?
    var mimeType: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case userId = "user_id"
        case name
        case storagePath = "storage_path"
        case sizeBytes = "size_bytes"
        case mimeType = "mime_type"
        case createdAt = "created_at"
    }
}

// 0003: project_items — discrete inspectable items inside a project that can
// be put on a 10-day recurring inspection schedule.
struct ProjectItem: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    var name: String
    var category: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case name, category
        case createdAt = "created_at"
    }
}

// 0003 + 0005: schedules — recurring inspection cadence per project_item, with
// optional Google Calendar event id for two-way sync.
struct Schedule: Codable, Identifiable, Hashable {
    let id: UUID
    let projectItemId: UUID
    var lastInspectedAt: Date?
    var nextDueAt: Date?
    var intervalDays: Int
    var googleEventId: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case projectItemId = "project_item_id"
        case lastInspectedAt = "last_inspected_at"
        case nextDueAt = "next_due_at"
        case intervalDays = "interval_days"
        case googleEventId = "google_event_id"
        case createdAt = "created_at"
    }
}

// MARK: - Templates

struct Template: Codable, Identifiable, Hashable {
    let id: UUID
    let ownerId: UUID?
    var name: String
    var category: String?
    var isSystem: Bool
    // 0007: required_cert_types renamed to required_qualifications.
    var requiredQualifications: [String]
    var requiredSignerRoles: [SignerRole]

    enum CodingKeys: String, CodingKey {
        case id
        case ownerId = "owner_id"
        case name, category
        case isSystem = "is_system"
        case requiredQualifications = "required_qualifications"
        case requiredSignerRoles = "required_signer_roles"
    }
}

extension Template {
    // Bridge for screens that still reference the pre-0007 name.
    var requiredCertTypes: [String] { requiredQualifications }
}

struct Question: Codable, Identifiable, Hashable {
    let id: UUID
    let templateId: UUID
    var section: Int
    var order: Int
    var type: QuestionType
    var title: String
    var minVal: Double?
    var maxVal: Double?
    var unit: String?
    var gridRows: [String]?
    var gridCols: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case templateId = "template_id"
        case section, type, title, unit
        case order = "order"
        case minVal = "min_val"
        case maxVal = "max_val"
        case gridRows = "grid_rows"
        case gridCols = "grid_cols"
    }
}

// MARK: - Inspections (formerly `questionnaires`, renamed in 0006)

struct Inspection: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let templateId: UUID
    let userId: UUID
    var status: InspectionStatus
    var harnessName: String?
    var conclusionText: String?
    var isSafeForUse: Bool?
    var createdAt: Date
    var completedAt: Date?
    // 0003: linked project item (optional)
    var projectItemId: UUID?
    // 0020: updated_at audit
    var updatedAt: Date?
    // Transient: latest generated certificate's PDF path. Not in CodingKeys
    // because the inspections table no longer has pdf_url after 0006 — the
    // History/Detail screens populate this via a join against `certificates`.
    var pdfUrl: String? = nil

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case templateId = "template_id"
        case userId = "user_id"
        case status
        case harnessName = "harness_name"
        case conclusionText = "conclusion_text"
        case isSafeForUse = "is_safe_for_use"
        case createdAt = "created_at"
        case completedAt = "completed_at"
        case projectItemId = "project_item_id"
        case updatedAt = "updated_at"
    }
}

// Type-name compat for screens authored before the rename. Field shape is
// identical because the columns are the same — only the table name and a
// dropped `pdf_url` differ.
typealias Questionnaire = Inspection

struct Answer: Codable, Identifiable, Hashable {
    let id: UUID
    // Server column renamed to `inspection_id` in 0006. Keep the Swift property
    // name `questionnaireId` so existing call sites don't break in this commit;
    // CodingKeys translate to the new column.
    let questionnaireId: UUID
    let questionId: UUID
    var valueBool: Bool?
    var valueNum: Double?
    var valueText: String?
    var gridValues: [String: [String: String]]?    // row -> col -> value
    var comment: String?
    // 0009: per-question inspector remarks
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case questionnaireId = "inspection_id"
        case questionId = "question_id"
        case valueBool = "value_bool"
        case valueNum = "value_num"
        case valueText = "value_text"
        case gridValues = "grid_values"
        case comment, notes
    }
}

extension Answer {
    var inspectionId: UUID { questionnaireId }  // forward-compat alias
}

struct AnswerPhoto: Codable, Identifiable, Hashable {
    let id: UUID
    let answerId: UUID
    var storagePath: String
    var caption: String?
    // 0023: GPS + reverse-geocoded address (replaces the prior addr:-prefixed
    // caption hack — still nullable because backfill skipped non-addr captions)
    var latitude: Double?
    var longitude: Double?
    var address: String?

    enum CodingKeys: String, CodingKey {
        case id
        case answerId = "answer_id"
        case storagePath = "storage_path"
        case caption, latitude, longitude, address
    }
}

struct SignatureRecord: Codable, Identifiable, Hashable {
    let id: UUID
    // Same naming compromise as Answer.questionnaireId — column is now
    // `inspection_id` but the Swift label stays for now.
    let questionnaireId: UUID
    var signerRole: SignerRole
    var fullName: String
    var phone: String?
    var position: String?
    // Nullable since 0004 (status='not_present' rows have no png).
    var signaturePngUrl: String?
    var signedAt: Date
    // 0004: 'signed' or 'not_present'
    var status: SignatureStatus
    // 0004: ad-hoc inline-captured signer name (not on roster)
    var personName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case questionnaireId = "inspection_id"
        case signerRole = "signer_role"
        case fullName = "full_name"
        case phone, position, status
        case signaturePngUrl = "signature_png_url"
        case signedAt = "signed_at"
        case personName = "person_name"
    }
}

extension SignatureRecord {
    var inspectionId: UUID { questionnaireId }  // forward-compat alias
}

// MARK: - Certificates (NEW table from 0006: generated PDF derived from inspection)

struct Certificate: Codable, Identifiable, Hashable {
    let id: UUID
    let inspectionId: UUID
    let userId: UUID
    let templateId: UUID
    var pdfUrl: String              // storage path in `pdfs` bucket
    var isSafeForUse: Bool?         // snapshot at generation time
    var conclusionText: String?     // snapshot at generation time
    var generatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case inspectionId = "inspection_id"
        case userId = "user_id"
        case templateId = "template_id"
        case pdfUrl = "pdf_url"
        case isSafeForUse = "is_safe_for_use"
        case conclusionText = "conclusion_text"
        case generatedAt = "generated_at"
    }
}

// MARK: - Inspection attachments (0021)

// Equipment certificates uploaded per inspection (16:9 photo + type chip + №).
// Distinct from `qualifications` (expert credentials) and `certificates` (PDFs).
struct InspectionAttachment: Codable, Identifiable, Hashable {
    let id: UUID
    let inspectionId: UUID
    let userId: UUID
    var certType: String
    var certNumber: String?
    var photoPath: String?
    var createdAt: Date
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case inspectionId = "inspection_id"
        case userId = "user_id"
        case certType = "cert_type"
        case certNumber = "cert_number"
        case photoPath = "photo_path"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Remote signing (0011)

struct RemoteSigningRequest: Codable, Identifiable, Hashable {
    let id: UUID
    var token: String
    let inspectionId: UUID
    let expertUserId: UUID
    var signerName: String
    var signerPhone: String
    var signerRole: SignerRole
    var status: RemoteSigningStatus
    var pdfSignedUrl: String?
    var signaturePngUrl: String?
    var signedAt: Date?
    var declinedReason: String?
    var expiresAt: Date
    var lastSentAt: Date?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, token, status
        case inspectionId = "inspection_id"
        case expertUserId = "expert_user_id"
        case signerName = "signer_name"
        case signerPhone = "signer_phone"
        case signerRole = "signer_role"
        case pdfSignedUrl = "pdf_signed_url"
        case signaturePngUrl = "signature_png_url"
        case signedAt = "signed_at"
        case declinedReason = "declined_reason"
        case expiresAt = "expires_at"
        case lastSentAt = "last_sent_at"
        case createdAt = "created_at"
    }
}

// MARK: - Incidents (0017)

struct Incident: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let userId: UUID
    var type: IncidentType
    var injuredName: String?
    var injuredRole: String?
    var dateTime: Date
    var location: String
    var description: String
    var cause: String
    var actionsTaken: String
    var witnesses: [String]
    var photos: [String]            // storage paths in incident-photos bucket
    var inspectorSignature: String?
    var status: DocStatus
    var pdfUrl: String?
    var createdAt: Date
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case userId = "user_id"
        case type
        case injuredName = "injured_name"
        case injuredRole = "injured_role"
        case dateTime = "date_time"
        case location, description, cause
        case actionsTaken = "actions_taken"
        case witnesses, photos
        case inspectorSignature = "inspector_signature"
        case status
        case pdfUrl = "pdf_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Briefings (0018)

// JSONB shape from migration: { name: text, signature: text|null }
// where signature is a base64-encoded PNG (no "data:" prefix).
struct BriefingParticipant: Codable, Hashable {
    var name: String
    var signature: String?
}

struct Briefing: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let userId: UUID
    var dateTime: Date
    var topics: [String]
    var participants: [BriefingParticipant]
    var inspectorSignature: String?
    var inspectorName: String
    var status: DocStatus
    var createdAt: Date
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case userId = "user_id"
        case dateTime = "date_time"
        case topics, participants
        case inspectorSignature = "inspector_signature"
        case inspectorName = "inspector_name"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Reports (0019)

// JSONB slide shape per migration 0019.
struct ReportSlide: Codable, Identifiable, Hashable {
    var id: String
    var order: Int
    var title: String
    var description: String
    var imagePath: String?              // storage path in report-photos bucket
    var annotatedImagePath: String?     // PDF prefers this when present

    enum CodingKeys: String, CodingKey {
        case id, order, title, description
        case imagePath = "image_path"
        case annotatedImagePath = "annotated_image_path"
    }
}

struct Report: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let userId: UUID
    var title: String
    var status: DocStatus
    var slides: [ReportSlide]
    var pdfUrl: String?
    var createdAt: Date
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case userId = "user_id"
        case title, status, slides
        case pdfUrl = "pdf_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
