import Foundation
import UIKit
import TPPDF

final class PDFRenderer {
    let questionnaire: Questionnaire
    let template: Template
    let questions: [Question]
    let answers: [Answer]
    let photosByAnswer: [UUID: [AnswerPhoto]]
    let signatures: [SignatureRecord]
    let conclusionText: String
    let isSafeForUse: Bool
    let harnessName: String
    let harnessRowCount: Int
    let certificates: [Certificate]

    init(questionnaire: Questionnaire, template: Template, questions: [Question],
         answers: [Answer], photosByAnswer: [UUID: [AnswerPhoto]],
         signatures: [SignatureRecord], conclusionText: String, isSafeForUse: Bool,
         harnessName: String, harnessRowCount: Int, certificates: [Certificate]) {
        self.questionnaire = questionnaire
        self.template = template
        self.questions = questions
        self.answers = answers
        self.photosByAnswer = photosByAnswer
        self.signatures = signatures
        self.conclusionText = conclusionText
        self.isSafeForUse = isSafeForUse
        self.harnessName = harnessName
        self.harnessRowCount = harnessRowCount
        self.certificates = certificates
    }

    private var titleFont: UIFont {
        UIFont(name: "NotoSansGeorgian-Bold", size: 18) ?? .boldSystemFont(ofSize: 18)
    }
    private var headerFont: UIFont {
        UIFont(name: "NotoSansGeorgian-Bold", size: 14) ?? .boldSystemFont(ofSize: 14)
    }
    private var bodyFont: UIFont {
        UIFont(name: "NotoSansGeorgian-Regular", size: 11) ?? .systemFont(ofSize: 11)
    }

    func render() async throws -> URL {
        let document = PDFDocument(format: .a4)

        // Title
        document.add(.contentCenter, attributedText: NSAttributedString(
            string: template.name,
            attributes: [.font: titleFont]
        ))
        document.add(space: 10)

        addHeaderFields(to: document)
        document.add(space: 10)

        // Grouped by section
        let sections = Dictionary(grouping: questions) { $0.section }
        for sectionIdx in sections.keys.sorted() {
            let sectionQuestions = (sections[sectionIdx] ?? []).sorted(by: { $0.order < $1.order })
            for q in sectionQuestions {
                try await addQuestion(q, to: document)
                document.add(space: 6)
            }
        }

        document.add(space: 8)
        addConclusion(to: document)
        document.add(.contentLeft, text: "")
        document.createNewPage()
        addSignatures(to: document)

        if !certificates.isEmpty {
            document.createNewPage()
            document.add(.contentLeft, attributedText: NSAttributedString(
                string: "თანდართული სერტიფიკატები",
                attributes: [.font: headerFont]
            ))
            for cert in certificates {
                document.add(space: 6)
                document.add(.contentLeft, attributedText: NSAttributedString(
                    string: "\(cert.type) \(cert.number.map { "№ \($0)" } ?? "")",
                    attributes: [.font: bodyFont]
                ))
                if let path = cert.fileUrl,
                   let data = try? await StorageService.download(bucket: .certificates, path: path),
                   let img = UIImage(data: data) {
                    document.add(.contentCenter, image: PDFImage(image: img, options: [.resize]))
                }
            }
        }

        let generator = PDFGenerator(document: document)
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(questionnaire.id.uuidString).pdf")
        try generator.generate(to: fileURL)
        return fileURL
    }

    private func addHeaderFields(to doc: PDFDocument) {
        let fields: [(String, String)] = {
            var base: [(String, String)] = [
                ("კომპანია", questionnaire.harnessName ?? ""),
                ("თარიღი", questionnaire.createdAt.formatted(date: .long, time: .omitted))
            ]
            if template.category == "harness" {
                base.insert(("ღვედის დასახელება", harnessName), at: 0)
            }
            return base
        }()

        let table = PDFTable(rows: fields.count, columns: 2)
        table.widths = [0.35, 0.65]
        for (i, (label, value)) in fields.enumerated() {
            try? table[i, 0].content = PDFTableContent(content: label)
            try? table[i, 1].content = PDFTableContent(content: value)
        }
        styleTable(table)
        doc.add(table: table)
    }

    private func addQuestion(_ q: Question, to doc: PDFDocument) async throws {
        let answer = answers.first { $0.questionId == q.id }

        doc.add(.contentLeft, attributedText: NSAttributedString(
            string: q.title, attributes: [.font: headerFont]
        ))
        doc.add(space: 4)

        switch q.type {
        case .yesno:
            let txt: String
            switch answer?.valueBool {
            case .some(true): txt = "✓ კი"
            case .some(false): txt = "✗ არა"
            default: txt = "—"
            }
            doc.add(.contentLeft, attributedText: NSAttributedString(string: txt, attributes: [.font: bodyFont]))

        case .measure:
            let value = answer?.valueNum.map { "\($0)" } ?? "—"
            let unit = q.unit ?? ""
            doc.add(.contentLeft, attributedText: NSAttributedString(
                string: "\(value) \(unit)", attributes: [.font: bodyFont]))

        case .componentGrid:
            try addGrid(q, answer: answer, to: doc)

        case .freetext:
            doc.add(.contentLeft, attributedText: NSAttributedString(
                string: answer?.valueText ?? "—", attributes: [.font: bodyFont]))

        case .photoUpload:
            if let a = answer, let photos = photosByAnswer[a.id], !photos.isEmpty {
                await addPhotos(photos, to: doc)
            } else {
                doc.add(.contentLeft, attributedText: NSAttributedString(
                    string: "ფოტო არ არის.", attributes: [.font: bodyFont]))
            }
        }

        if let comment = answer?.comment, !comment.isEmpty {
            doc.add(space: 3)
            doc.add(.contentLeft, attributedText: NSAttributedString(
                string: "კომენტარი: \(comment)",
                attributes: [.font: bodyFont, .foregroundColor: UIColor.darkGray]))
        }

        if let a = answer, q.type != .photoUpload {
            if let photos = photosByAnswer[a.id], !photos.isEmpty {
                await addPhotos(photos, to: doc)
            }
        }
    }

    private func addGrid(_ q: Question, answer: Answer?, to doc: PDFDocument) throws {
        let rawRows = q.gridRows ?? []
        let rows: [String] = rawRows.first == "N1" ? Array(rawRows.prefix(harnessRowCount)) : rawRows
        let cols = q.gridCols ?? []
        guard !rows.isEmpty, !cols.isEmpty else { return }

        let table = PDFTable(rows: rows.count + 1, columns: cols.count + 1)
        let widths: [CGFloat] = [0.22] + Array(repeating: CGFloat(0.78 / Double(cols.count)), count: cols.count)
        table.widths = widths

        try table[0, 0].content = PDFTableContent(content: "")
        for (ci, col) in cols.enumerated() {
            try table[0, ci + 1].content = PDFTableContent(content: col)
        }
        for (ri, row) in rows.enumerated() {
            try table[ri + 1, 0].content = PDFTableContent(content: row)
            for (ci, col) in cols.enumerated() {
                let value = answer?.gridValues?[row]?[col] ?? ""
                try table[ri + 1, ci + 1].content = PDFTableContent(content: value)
            }
        }
        styleTable(table, headerRow: true)
        doc.add(table: table)
    }

    private func addPhotos(_ photos: [AnswerPhoto], to doc: PDFDocument) async {
        var images: [PDFImage] = []
        for photo in photos {
            if let data = try? await StorageService.download(bucket: .answerPhotos, path: photo.storagePath),
               let img = UIImage(data: data) {
                let pdfImg = PDFImage(image: img, options: [.resize])
                pdfImg.caption = PDFAttributedText(text: NSAttributedString(
                    string: photo.caption ?? "",
                    attributes: [.font: bodyFont, .foregroundColor: UIColor.darkGray]
                ))
                images.append(pdfImg)
            }
        }
        if !images.isEmpty {
            doc.add(imagesInRow: images, spacing: 8)
        }
    }

    private func addConclusion(to doc: PDFDocument) {
        doc.add(.contentLeft, attributedText: NSAttributedString(
            string: "დასკვნითი ნაწილი", attributes: [.font: headerFont]))
        doc.add(space: 4)
        doc.add(.contentLeft, attributedText: NSAttributedString(
            string: conclusionText.isEmpty ? "—" : conclusionText,
            attributes: [.font: bodyFont]))
        doc.add(space: 6)
        doc.add(.contentLeft, attributedText: NSAttributedString(
            string: isSafeForUse
                ? "✓ უსაფრთხოა ექსპლუატაციისთვის"
                : "✗ არ არის უსაფრთხო ექსპლუატაციისთვის",
            attributes: [.font: headerFont,
                         .foregroundColor: isSafeForUse ? UIColor.systemGreen : UIColor.systemRed]))
    }

    private func addSignatures(to doc: PDFDocument) {
        doc.add(.contentLeft, attributedText: NSAttributedString(
            string: "ხელმოწერები", attributes: [.font: headerFont]))
        doc.add(space: 8)

        for record in signatures {
            doc.add(.contentLeft, attributedText: NSAttributedString(
                string: record.signerRole.georgianName,
                attributes: [.font: headerFont, .foregroundColor: UIColor.darkGray]))

            Task {
                // Synchronous signature download isn't ideal; load beforehand if needed.
            }

            let info = """
            სახელი გვარი: \(record.fullName)
            ტელეფონი: \(record.phone ?? "—")
            პოზიცია: \(record.position ?? "—")
            """
            doc.add(.contentLeft, attributedText: NSAttributedString(
                string: info, attributes: [.font: bodyFont]))

            if let cachedImage = try? downloadImageSync(bucket: .signatures, path: record.signaturePngUrl) {
                doc.add(.contentLeft, image: PDFImage(image: cachedImage, size: CGSize(width: 180, height: 60), options: [.resize]))
            }
            doc.add(space: 12)
        }
    }

    private func styleTable(_ table: PDFTable, headerRow: Bool = false) {
        table.style = PDFTableStyleDefaults.simple
        table.padding = 4
        table.margin = 4
        if headerRow {
            for c in 0..<table.cells[0].count {
                try? table[0, c].style = PDFTableCellStyle(
                    colors: (fill: .systemGray5, text: .black),
                    font: headerFont
                )
            }
        }
    }

    // Helper that synchronously bridges an async download. Used in sections that can't suspend.
    private func downloadImageSync(bucket: StorageBucket, path: String) throws -> UIImage? {
        let semaphore = DispatchSemaphore(value: 0)
        var data: Data?
        Task {
            data = try? await StorageService.download(bucket: bucket, path: path)
            semaphore.signal()
        }
        semaphore.wait()
        return data.flatMap(UIImage.init(data:))
    }
}
