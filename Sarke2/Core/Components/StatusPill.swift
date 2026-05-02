import SwiftUI

// MARK: - StatusPill
//
// Small full-rounded badge with semantic-soft background + tint text. Used
// across history, recent inspections, project detail, briefings/incidents/
// reports for "draft" / "completed" status.

struct StatusPill: View {
    enum Kind { case draft, completed, frozen, info, danger, custom(bg: Color, fg: Color) }

    let kind: Kind
    let text: String

    private var bg: Color {
        switch kind {
        case .draft:     return Theme.Color.semantic.warningSoft
        case .completed: return Theme.Color.semantic.successSoft
        case .frozen:    return Theme.Color.neutral.n200
        case .info:      return Theme.Color.semantic.infoSoft
        case .danger:    return Theme.Color.semantic.dangerSoft
        case .custom(let bg, _): return bg
        }
    }

    private var fg: Color {
        switch kind {
        case .draft:     return SwiftUI.Color(hex: 0xB45309)  // certTint
        case .completed: return Theme.Color.semantic.success
        case .frozen:    return Theme.inkSoft
        case .info:      return Theme.Color.semantic.info
        case .danger:    return Theme.Color.semantic.danger
        case .custom(_, let fg): return fg
        }
    }

    var body: some View {
        Text(text)
            .font(.inter(11, weight: .semibold))
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bg)
            .clipShape(Capsule())
    }
}

extension StatusPill {
    static func forInspection(status: InspectionStatus) -> StatusPill {
        switch status {
        case .draft:     return StatusPill(kind: .draft, text: "დრაფტი")
        case .completed: return StatusPill(kind: .completed, text: "დასრულდა")
        }
    }
}
