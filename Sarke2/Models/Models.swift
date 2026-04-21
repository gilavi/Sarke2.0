import Foundation

// MARK: - Enums

enum SignerRole: String, Codable, CaseIterable, Hashable {
    case expert
    case xarachoSupervisor = "xaracho_supervisor"
    case xarachoAssembler = "xaracho_assembler"

    var georgianName: String {
        switch self {
        case .expert:             return "შრომის უსაფრთხოების სპეციალისტი"
        case .xarachoSupervisor:  return "ხარაჩოს ზედამხედველი"
        case .xarachoAssembler:   return "ხარაჩოს ამწყობი"
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

enum QuestionnaireStatus: String, Codable { case draft, completed }

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

    enum CodingKeys: String, CodingKey {
        case id, email
        case firstName = "first_name"
        case lastName = "last_name"
        case createdAt = "created_at"
    }

    var displayName: String { "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) }
}

// MARK: - Certificates

struct Certificate: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    var type: String
    var number: String?
    var issuedAt: Date?
    var expiresAt: Date?
    var fileUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type, number
        case issuedAt = "issued_at"
        case expiresAt = "expires_at"
        case fileUrl = "file_url"
    }

    var isExpiring: Bool {
        guard let expiresAt else { return false }
        return expiresAt.timeIntervalSinceNow < 60 * 60 * 24 * 30
    }
}

// MARK: - Projects

struct Project: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    var name: String
    var companyName: String?
    var address: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case companyName = "company_name"
        case address
        case createdAt = "created_at"
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

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case role
        case fullName = "full_name"
        case phone, position
        case signaturePngUrl = "signature_png_url"
    }
}

// MARK: - Templates

struct Template: Codable, Identifiable, Hashable {
    let id: UUID
    let ownerId: UUID?
    var name: String
    var category: String?
    var isSystem: Bool
    var requiredCertTypes: [String]
    var requiredSignerRoles: [SignerRole]

    enum CodingKeys: String, CodingKey {
        case id
        case ownerId = "owner_id"
        case name, category
        case isSystem = "is_system"
        case requiredCertTypes = "required_cert_types"
        case requiredSignerRoles = "required_signer_roles"
    }
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

// MARK: - Questionnaires

struct Questionnaire: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let templateId: UUID
    let userId: UUID
    var status: QuestionnaireStatus
    var harnessName: String?
    var conclusionText: String?
    var isSafeForUse: Bool?
    var pdfUrl: String?
    var createdAt: Date
    var completedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case templateId = "template_id"
        case userId = "user_id"
        case status
        case harnessName = "harness_name"
        case conclusionText = "conclusion_text"
        case isSafeForUse = "is_safe_for_use"
        case pdfUrl = "pdf_url"
        case createdAt = "created_at"
        case completedAt = "completed_at"
    }
}

struct Answer: Codable, Identifiable, Hashable {
    let id: UUID
    let questionnaireId: UUID
    let questionId: UUID
    var valueBool: Bool?
    var valueNum: Double?
    var valueText: String?
    var gridValues: [String: [String: String]]?    // row -> col -> value
    var comment: String?

    enum CodingKeys: String, CodingKey {
        case id
        case questionnaireId = "questionnaire_id"
        case questionId = "question_id"
        case valueBool = "value_bool"
        case valueNum = "value_num"
        case valueText = "value_text"
        case gridValues = "grid_values"
        case comment
    }
}

struct AnswerPhoto: Codable, Identifiable, Hashable {
    let id: UUID
    let answerId: UUID
    var storagePath: String
    var caption: String?

    enum CodingKeys: String, CodingKey {
        case id
        case answerId = "answer_id"
        case storagePath = "storage_path"
        case caption
    }
}

struct SignatureRecord: Codable, Identifiable, Hashable {
    let id: UUID
    let questionnaireId: UUID
    var signerRole: SignerRole
    var fullName: String
    var phone: String?
    var position: String?
    var signaturePngUrl: String
    var signedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case questionnaireId = "questionnaire_id"
        case signerRole = "signer_role"
        case fullName = "full_name"
        case phone, position
        case signaturePngUrl = "signature_png_url"
        case signedAt = "signed_at"
    }
}
