import Foundation
import UIKit

@Observable
final class WizardViewModel {
    let questionnaire: Questionnaire
    let template: Template
    var questions: [Question] = []
    var answersByQuestion: [UUID: Answer] = [:]
    var photosByAnswer: [UUID: [AnswerPhoto]] = [:]
    var conclusionText: String = ""
    var isSafeForUse: Bool? = nil
    var harnessName: String = ""
    var harnessRowCount: Int = 5
    var isLoading = false
    var errorMessage: String?

    // True once the inspection's status flipped to .completed. The 0008/0010
    // server-side trigger blocks any UPDATE on a completed inspections row,
    // and answers/answer_photos triggers (also 0008) block child writes.
    // Mutations from this VM must short-circuit when this is true so we don't
    // surface "Inspection X is completed and cannot be modified" to the user.
    var isFrozen: Bool { questionnaire.status == .completed }

    init(questionnaire: Questionnaire, template: Template) {
        self.questionnaire = questionnaire
        self.template = template
        self.conclusionText = questionnaire.conclusionText ?? ""
        self.harnessName = questionnaire.harnessName ?? ""
        self.isSafeForUse = questionnaire.isSafeForUse
    }

    @MainActor
    func load() async {
        isLoading = true; defer { isLoading = false }
        do {
            questions = try await TemplateService.questions(templateId: template.id)
            let existingAnswers = try await AnswerService.list(questionnaireId: questionnaire.id)
            answersByQuestion = Dictionary(uniqueKeysWithValues: existingAnswers.map { ($0.questionId, $0) })
            for a in existingAnswers {
                photosByAnswer[a.id] = (try? await AnswerService.photos(answerId: a.id)) ?? []
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    var orderedQuestions: [Question] {
        questions.sorted { lhs, rhs in
            if lhs.section != rhs.section { return lhs.section < rhs.section }
            return lhs.order < rhs.order
        }
    }

    // MARK: - Validation

    func isAnswered(_ q: Question) -> Bool {
        guard let a = answersByQuestion[q.id] else { return false }
        switch q.type {
        case .yesno:    return a.valueBool != nil
        case .measure:  return a.valueNum != nil
        case .freetext: return !(a.valueText?.isEmpty ?? true)
        case .componentGrid:
            let rows = visibleGridRows(for: q)
            let grid = a.gridValues ?? [:]
            return rows.allSatisfy { !(grid[$0]?.isEmpty ?? true) }
        case .photoUpload:
            return !(photosByAnswer[a.id]?.isEmpty ?? true)
        }
    }

    func visibleGridRows(for q: Question) -> [String] {
        let base = q.gridRows ?? []
        if base.first == "N1" { return Array(base.prefix(harnessRowCount)) }
        return base
    }

    var unansweredQuestions: [Question] {
        orderedQuestions.filter { !isAnswered($0) }
    }

    // MARK: - Step index persistence

    private var stepKey: String { "wizard.stepIndex.\(questionnaire.id.uuidString)" }

    var savedStepIndex: Int {
        get { UserDefaults.standard.integer(forKey: stepKey) }
        set { UserDefaults.standard.set(newValue, forKey: stepKey) }
    }

    func clearSavedStep() {
        UserDefaults.standard.removeObject(forKey: stepKey)
    }

    // MARK: - Harness orphan pruning

    @MainActor
    func pruneOrphanHarnessRows(for q: Question) async {
        guard (q.gridRows ?? []).first == "N1" else { return }
        guard let a = answersByQuestion[q.id], var grid = a.gridValues else { return }
        let visible = Set(visibleGridRows(for: q))
        let before = grid.keys.count
        grid = grid.filter { visible.contains($0.key) }
        guard grid.count != before else { return }
        await saveAnswer(for: q) { $0.gridValues = grid }
    }

    // MARK: - Mutations

    @MainActor
    @discardableResult
    func saveAnswer(for question: Question, mutate: (inout Answer) -> Void) async -> Answer? {
        // Read-only when the parent inspection is completed (0008 trigger).
        if isFrozen { return answersByQuestion[question.id] }
        var answer = answersByQuestion[question.id] ?? Answer(
            id: UUID(),
            questionnaireId: questionnaire.id,
            questionId: question.id,
            valueBool: nil, valueNum: nil, valueText: nil,
            gridValues: nil, comment: nil, notes: nil
        )
        mutate(&answer)
        do {
            let saved = try await AnswerService.upsert(answer)
            answersByQuestion[question.id] = saved
            return saved
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    @MainActor
    func addPhoto(for question: Question, image: UIImage) async {
        if isFrozen { return }
        guard let data = image.jpegData(compressionQuality: 0.7) else { return }
        var answer = answersByQuestion[question.id]
        if answer == nil {
            answer = await saveAnswer(for: question) { _ in }
        }
        guard let answer else { return }
        let path = "\(questionnaire.id.uuidString)/\(question.id.uuidString)/\(UUID().uuidString).jpg"
        do {
            try await StorageService.upload(data: data, bucket: .answerPhotos, path: path, contentType: "image/jpeg")
            let photo = try await AnswerService.addPhoto(answerId: answer.id, storagePath: path)
            photosByAnswer[answer.id, default: []].append(photo)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func saveConclusion() async {
        if isFrozen { return }
        var q = questionnaire
        q.conclusionText = conclusionText
        q.isSafeForUse = isSafeForUse
        q.harnessName = harnessName.isEmpty ? nil : harnessName
        _ = try? await QuestionnaireService.update(q)
    }
}
