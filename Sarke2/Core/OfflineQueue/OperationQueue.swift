import Foundation
import SwiftData
import Observation

// SwiftData-backed offline operation queue — Phase 1 scaffold.
// Replaces the Expo app's AsyncStorage-persisted queue from `lib/offline.tsx`.
//
// Each `PendingOperation` carries enough JSON for the executor to replay it
// once reachability returns. The executor itself (mapping `kind` → a real
// service call) is intentionally NOT implemented yet — it lands in Phase 2
// alongside answer-upsert / photo-upload flows. For now this file establishes
// the persistence shape so callers can start enqueuing operations even
// though they won't drain until the executor lands.
//
// Schema-migration policy: every breaking change to PendingOperation bumps
// `OfflineQueueSchema.versionedSchema` and adds a SwiftData migration plan.
// Until v2 ships, treat the on-device store as best-effort cache.

enum PendingOperationKind: String, Codable {
    case answerUpsert      = "answer_upsert"
    case photoUpload       = "photo_upload"
    case inspectionUpsert  = "inspection_upsert"
    case signatureUpsert   = "signature_upsert"
    case incidentUpsert    = "incident_upsert"
    case briefingUpsert    = "briefing_upsert"
    case reportUpsert      = "report_upsert"
}

@Model
final class PendingOperation {
    @Attribute(.unique) var id: UUID
    var kind: String                     // PendingOperationKind.rawValue
    var payload: Data                    // JSON-encoded operation body
    var dependsOn: UUID?                 // earlier operation that must succeed first
    var attempts: Int
    var lastError: String?
    var lastAttemptAt: Date?
    var createdAt: Date

    init(id: UUID = UUID(),
         kind: PendingOperationKind,
         payload: Data,
         dependsOn: UUID? = nil) {
        self.id = id
        self.kind = kind.rawValue
        self.payload = payload
        self.dependsOn = dependsOn
        self.attempts = 0
        self.lastError = nil
        self.lastAttemptAt = nil
        self.createdAt = Date()
    }

    var kindEnum: PendingOperationKind? {
        PendingOperationKind(rawValue: kind)
    }
}

@MainActor
@Observable
final class OperationQueue {
    static let shared = OperationQueue()

    private let container: ModelContainer
    private(set) var pendingCount: Int = 0
    private(set) var lastFlushError: String?

    private init() {
        do {
            // Container path: Application Support/sarke-offline-queue.sqlite
            let url = try FileManager.default
                .url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                .appendingPathComponent("sarke-offline-queue.sqlite")
            let config = ModelConfiguration(url: url)
            self.container = try ModelContainer(for: PendingOperation.self, configurations: config)
            refreshCount()
        } catch {
            // SwiftData failure here is fatal — there's no graceful fallback.
            fatalError("Could not initialise OfflineQueue: \(error)")
        }
    }

    var context: ModelContext { container.mainContext }

    // MARK: - Enqueue

    @discardableResult
    func enqueue<T: Encodable>(_ kind: PendingOperationKind, payload: T, dependsOn: UUID? = nil) throws -> UUID {
        let data = try JSONEncoder.iso8601.encode(payload)
        let op = PendingOperation(kind: kind, payload: data, dependsOn: dependsOn)
        context.insert(op)
        try context.save()
        refreshCount()
        return op.id
    }

    // MARK: - Drain (executor lands in Phase 2)

    // Placeholder — wired up alongside the answer-upsert / photo-upload flows
    // in Phase 2. Calling now is a no-op so existing screens can subscribe to
    // the @Observable count without behavioural surprise.
    func drain() async {
        // Phase 2: while NetworkMonitor.shared.isOnline { fetch oldest, dispatch
        // by kindEnum, on success delete; on failure increment attempts and
        // surface lastFlushError. }
    }

    // MARK: - Inspection

    func all() -> [PendingOperation] {
        let descriptor = FetchDescriptor<PendingOperation>(sortBy: [SortDescriptor(\.createdAt)])
        return (try? context.fetch(descriptor)) ?? []
    }

    func clearAll() throws {
        for op in all() { context.delete(op) }
        try context.save()
        refreshCount()
    }

    private func refreshCount() {
        pendingCount = all().count
    }
}

private extension JSONEncoder {
    static var iso8601: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }
}
