import SwiftUI
import ActivityKit
import AppIntents

enum NookShared {
    static let group = "group.com.nook.phone"
    static let accent = Color(red: 183/255, green: 198/255, blue: 1)
    static let slate = Color(red: 23/255, green: 27/255, blue: 36/255)
    static func cached() -> WidgetSnapshot {
        guard let data = UserDefaults(suiteName: group)?.data(forKey: "snapshot"), let result = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else { return WidgetSnapshot(status: "Open Nook to connect", agent: "Nook", waiting: false, count: 0, updated: Date()) }
        return result
    }
}
struct WidgetSnapshot: Codable {
    var status: String
    var agent: String
    var waiting: Bool
    var count: Int
    var updated: Date
}
struct NookActivity: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var status: String
        var agent: String
        var waiting: Bool
        var requestId: String
        var updated: Int
        var locked: Bool
    }
    var name: String
}
struct NookMark: View {
    var body: some View {
        GeometryReader { geometry in
            let side = min(geometry.size.width, geometry.size.height)
            ZStack {
                RoundedRectangle(cornerRadius: side * .22).fill(NookShared.slate)
                Path { path in
                    path.move(to: CGPoint(x: side * .3, y: side * .72))
                    path.addLine(to: CGPoint(x: side * .3, y: side * .47))
                    path.addArc(center: CGPoint(x: side * .5, y: side * .47), radius: side * .2, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
                    path.addLine(to: CGPoint(x: side * .7, y: side * .72))
                }.stroke(NookShared.accent, style: StrokeStyle(lineWidth: side * .115, lineCap: .round))
                Circle().fill(NookShared.accent).frame(width: side * .094, height: side * .094).offset(y: side * .08)
            }.frame(width: side, height: side)
        }.accessibilityHidden(true)
    }
}
struct AgentStatusIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Nook agents"
    static var description = IntentDescription("Read the last agent status from your paired PC.")
    func perform() async throws -> some IntentResult & ProvidesDialog { let snapshot = NookShared.cached(); return .result(dialog: IntentDialog(stringLiteral: snapshot.status + ". " + String(snapshot.count) + " sessions. Last updated " + snapshot.updated.formatted(date: .omitted, time: .shortened) + ".")) }
}
