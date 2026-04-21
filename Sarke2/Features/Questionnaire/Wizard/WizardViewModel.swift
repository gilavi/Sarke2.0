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
    var isSafeForUse: Bool = true
    var harnessName: String = ""
    var harnessRowCount: Int = 5          // how many N-rows are actually present
    var isLoading = false
    var errorMessage: String?

    init(questionnaire: Questionnaire, template: Template) {
        self.questionnaire = questionnaire
        self.template = template
        self.conclusionText = questionnaire.conclusionText ?? ""
        self.harnessName = questionnaire.harnessName ?? ""
        self.isSafeForUse = questionnaire.isSafeForUse ?? true
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

    // Grouped by section/order
    var orderedQuestions: [Question] {
        questions.sorted { lhs, rhs in
            if lhs.section != rhs.section { return lhs.section < rhs.section }
            return lhs.order < rhs.order
        }
    }

    @MainActor
    @discardableResult
    func saveAnswer(for question: Question, mutate: (inout Answer) -> Void) async -> Answer? {
        var answer = answersByQuestion[question.id] ?? Answer(
            id: UUID(),
            questionnaireId: questionnaire.id,
            questionId: question.id,
            valueBool: nil, valueNum: nil, valueText: nil,
            gridValues: nil, comment: nil
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
        var q = questionnaire
        q.conclusionText = conclusionText
        q.isSafeForUse = isSafeForUse
        q.harnessName = harnessName.isEmpty ? nil : harnessName
        _ = try? await QuestionnaireService.update(q)
    }
}
