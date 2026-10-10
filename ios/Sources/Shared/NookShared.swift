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
// Shares the notch companion's seed silhouette and neutral face with desktop branding.
struct NookPetSilhouette: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 128, y: 38.5))
        path.addCurve(to: CGPoint(x: 200, y: 146.5), control1: CGPoint(x: 150.5, y: 70), control2: CGPoint(x: 200, y: 88))
        path.addCurve(to: CGPoint(x: 128, y: 214), control1: CGPoint(x: 200, y: 196), control2: CGPoint(x: 168.5, y: 214))
        path.addCurve(to: CGPoint(x: 56, y: 146.5), control1: CGPoint(x: 87.5, y: 214), control2: CGPoint(x: 56, y: 196))
        path.addCurve(to: CGPoint(x: 128, y: 38.5), control1: CGPoint(x: 56, y: 97), control2: CGPoint(x: 96.5, y: 70))
        path.closeSubpath()
        return path.applying(CGAffineTransform(a: rect.width / 256, b: 0, c: 0, d: rect.height / 256, tx: rect.minX, ty: rect.minY))
    }
}
struct NookPetSmile: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 116.75, y: 164.5))
        path.addQuadCurve(to: CGPoint(x: 139.25, y: 164.5), control: CGPoint(x: 128, y: 173.5))
        return path.applying(CGAffineTransform(a: rect.width / 256, b: 0, c: 0, d: rect.height / 256, tx: rect.minX, ty: rect.minY))
    }
}
struct NookMark: View {
    var body: some View {
        GeometryReader { geometry in
            let side = min(geometry.size.width, geometry.size.height)
            let ink = Color(red: 0.075, green: 0.086, blue: 0.110)
            ZStack {
                RoundedRectangle(cornerRadius: side * 0.22).fill(Color.black)
                NookPetSilhouette().fill(LinearGradient(colors: [.white, Color(red: 0.867, green: 0.898, blue: 0.961)], startPoint: .topLeading, endPoint: .bottomTrailing))
                ForEach([CGFloat(18), CGFloat(30)], id: \.self) { x in
                    Ellipse().fill(ink).frame(width: side * 6.6 * 4.5 / 256, height: side * 8.6 * 4.5 / 256)
                        .offset(x: side * (20 + 4.5 * x - 128) / 256, y: side * 9.5 / 256)
                    Circle().fill(NookShared.accent).frame(width: side * 3.2 * 4.5 / 256, height: side * 3.2 * 4.5 / 256)
                        .offset(x: side * (20 + 4.5 * x - 128) / 256, y: side * 11.75 / 256)
                    Circle().fill(.white.opacity(0.9)).frame(width: side * 1.4 * 4.5 / 256, height: side * 1.4 * 4.5 / 256)
                        .offset(x: side * (20 + 4.5 * (x - 0.9) - 128) / 256, y: -side * 1.7 / 256)
                }
                NookPetSmile().stroke(ink, style: StrokeStyle(lineWidth: side * 1.1 * 4.5 / 256, lineCap: .round))
            }.frame(width: side, height: side)
        }.accessibilityHidden(true)
    }
}
struct AgentStatusIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Nook agents"
    static var description = IntentDescription("Read the last agent status from your paired PC.")
    func perform() async throws -> some IntentResult & ProvidesDialog { let snapshot = NookShared.cached(); return .result(dialog: IntentDialog(stringLiteral: snapshot.status + ". " + String(snapshot.count) + " sessions. Last updated " + snapshot.updated.formatted(date: .omitted, time: .shortened) + ".")) }
}
