import AppIntents
import Foundation

struct NookFocusFilter: SetFocusFilterIntent {
    static var title: LocalizedStringResource = "Waiting approvals"
    static var description = IntentDescription("Show only requests that need your attention while this Focus is active.")
    @Parameter(title: "Only waiting approvals", default: false) var onlyRequests: Bool
    var displayRepresentation: DisplayRepresentation {
        if onlyRequests { return DisplayRepresentation(title: "Nook requests", subtitle: "Only waiting approvals") }
        return DisplayRepresentation(title: "Nook requests", subtitle: "All agent activity")
    }
    func perform() async throws -> some IntentResult {
        UserDefaults(suiteName: NookShared.group)?.set(onlyRequests, forKey: "focusOnlyRequests")
        await MainActor.run { NookStore.shared.systemFocusRequests = onlyRequests }
        return .result()
    }
}
