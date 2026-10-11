import CoreSpotlight
import UniformTypeIdentifiers
import Foundation
import CryptoKit

struct IndexedSession: Codable, Identifiable {
    let sessionID: String
    let archived: Bool
    var scope: String? = nil
    var id: String { (archived ? "archive:" : "live:") + sessionID }
    var identifier: String { "nook.session." + ((try? JSONEncoder().encode(self)) ?? Data()).base64EncodedString() }
    static func pcScope(_ address: String) -> String { SHA256.hash(data: Data(address.utf8)).map { String(format: "%02x", $0) }.joined() }
    static func decode(_ identifier: String) -> IndexedSession? {
        guard identifier.hasPrefix("nook.session."), identifier.count <= 1000,
              let data = Data(base64Encoded: String(identifier.dropFirst("nook.session.".count))),
              let session = try? JSONDecoder().decode(Self.self, from: data), !session.sessionID.isEmpty, session.sessionID.count <= 200 else { return nil }
        return session
    }
}
@MainActor final class NookSearchIndex {
    private let index = CSSearchableIndex(name: "NookSessions")
    private let domain = "nook.sessions"
    private var desired = "", revision = 0, updated = Date.distantPast
    private var work: Task<Void, Never>?
    func clear() async {
        guard desired != "disabled" else { return }
        revision += 1; desired = "disabled"; let expected = revision, previous = work
        let task = Task { await previous?.value; guard expected == revision else { return }; do { try await index.deleteSearchableItems(withDomainIdentifiers: [domain]) } catch { if expected == revision { desired = "" } } }
        work = task; await task.value
    }
    func update(sessions: [AgentSession], history: [HistoryItem], enabled: Bool, scope: String) async {
        guard enabled else { await clear(); return }
        var entries: [(IndexedSession, String, String)] = sessions.prefix(20).map { (IndexedSession(sessionID: $0.id, archived: false, scope: scope), $0.label ?? $0.agent, $0.agent) }
        entries += history.prefix(100).map { (IndexedSession(sessionID: $0.id, archived: true, scope: scope), $0.label, [$0.agent, $0.project].filter { !$0.isEmpty }.joined(separator: " · ")) }
        let signature = entries.map { $0.0.identifier + $0.1 + $0.2 }.joined(separator: "\n")
        guard signature != desired || Date().timeIntervalSince(updated) > 43200 else { return }
        revision += 1; desired = signature; let expected = revision, previous = work
        let items = entries.map { entry -> CSSearchableItem in
            let attributes = CSSearchableItemAttributeSet(contentType: UTType.text)
            attributes.title = entry.1; attributes.contentDescription = entry.2
            attributes.keywords = ["Nook", "agent", entry.2]
            let item = CSSearchableItem(uniqueIdentifier: entry.0.identifier, domainIdentifier: domain, attributeSet: attributes)
            item.expirationDate = Date().addingTimeInterval(86400); return item
        }
        let task = Task {
            await previous?.value; guard expected == revision else { return }
            do {
                try await index.deleteSearchableItems(withDomainIdentifiers: [domain])
                guard expected == revision else { return }
                try await index.indexSearchableItems(items); updated = Date()
            } catch { if expected == revision { desired = "" } }
        }
        work = task; await task.value
    }
}
