import Foundation
import SwiftUI
import LocalAuthentication
import ActivityKit
import WidgetKit
import UserNotifications
import UIKit

final class NookNoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

@MainActor final class NookStore: ObservableObject {
    static let shared = NookStore()
    @Published var connection = ConnectionKeychain.load()
    @Published var state: PhoneState?
    @Published var message = ""
    @Published var focusRequests = false
    @Published var busy = false
    @Published var isReachable = false
    @Published var reviewRequestID: String?
    var deviceToken = ""
    private var polling: Task<Void, Never>?
    private var activityTask: Task<Void, Never>?
    private var widgetSignature = "", widgetUpdated = Date.distantPast, activitySignature = "", activityUpdated = Date.distantPast
    private let session = URLSession(configuration: .ephemeral, delegate: NookNoRedirects(), delegateQueue: nil)
    private let deviceID: String = {
        if let value = UserDefaults.standard.string(forKey: "deviceID") { return value }
        let value = UUID().uuidString; UserDefaults.standard.set(value, forKey: "deviceID"); return value
    }()
    func checkedAddress(_ input: String) throws -> URL {
        guard let url = URL(string: input.trimmingCharacters(in: .whitespacesAndNewlines)), let host = url.host, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil, url.path.isEmpty || url.path == "/" else { throw failure("Enter the PC address shown in Nook.") }
        let octets = host.split(separator: ".").compactMap { Int($0) }
        let local = host == "localhost" || host.hasSuffix(".local") || (octets.count == 4 && octets.allSatisfy { (0...255).contains($0) } && (octets[0] == 10 || (octets[0] == 192 && octets[1] == 168) || (octets[0] == 172 && (16...31).contains(octets[1])) || octets[0] == 127 || (octets[0] == 169 && octets[1] == 254)))
        guard local && ["http", "https"].contains(url.scheme ?? "") else { throw failure("Use the local address of your PC on trusted Wi-Fi.") }
        return url
    }
    private func failure(_ text: String) -> NSError { NSError(domain: "Nook", code: 1, userInfo: [NSLocalizedDescriptionKey: text]) }
    func request<T: Decodable>(_ route: String, body: [String: Any]? = nil, using override: Connection? = nil) async throws -> T {
        guard let connection = override ?? connection else { throw failure("Pair with your PC first.") }
        let base = try checkedAddress(connection.address)
        guard let url = URL(string: route, relativeTo: base), url.host == base.host, url.port == base.port else { throw failure("Invalid request address.") }
        var request = URLRequest(url: url, timeoutInterval: 30); request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !connection.token.isEmpty { request.setValue("Bearer " + connection.token, forHTTPHeaderField: "Authorization") }
        if let body { request.httpMethod = "POST"; request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw failure("No response from the PC.") }
        if http.statusCode == 401 && route != "/pair" { disconnectLocally(); throw failure("Pairing expired or was revoked. Pair again on your PC.") }
        guard (200..<300).contains(http.statusCode) else { let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]; throw failure(json?["error"] as? String ?? "The PC could not complete this request.") }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func pair(address: String, code: String) async {
        busy = true; defer { busy = false }
        do { _ = try checkedAddress(address); let result: PairResponse = try await request("/pair", body: ["code": code], using: Connection(address: address, token: "")); let saved = Connection(address: address, token: result.token); try ConnectionKeychain.save(saved); connection = saved; message = "Paired. Keep both devices on trusted Wi-Fi."; await refresh(); await registerDevice(); startPolling() } catch { message = error.localizedDescription }
    }
    func startPolling() { polling?.cancel(); guard connection != nil else { return }; polling = Task { while !Task.isCancelled { await refresh(); try? await Task.sleep(for: .seconds(3)) } } }
    func stopPolling() { polling?.cancel(); polling = nil }
    func refresh() async {
        guard connection != nil else { return }
        do {
            let next: PhoneState = try await request("/state"); state = next; isReachable = true
            if let id = reviewRequestID, !id.isEmpty, id != next.pending?.id { message = "That request is no longer waiting. Review the current requests below."; reviewRequestID = nil }
            let snapshot = WidgetSnapshot(status: next.status, agent: next.sessions.first?.agent ?? "Nook", waiting: next.pending != nil, count: next.sessions.count, updated: Date())
            let signature = snapshot.status + snapshot.agent + String(snapshot.waiting) + String(snapshot.count)
            if signature != widgetSignature || Date().timeIntervalSince(widgetUpdated) >= 60 { UserDefaults(suiteName: NookShared.group)?.set(try JSONEncoder().encode(snapshot), forKey: "snapshot"); WidgetCenter.shared.reloadAllTimelines(); widgetSignature = signature; widgetUpdated = Date() }
            let content = activityState(next)
            if signature + content.requestId != activitySignature || Date().timeIntervalSince(activityUpdated) >= 60 { for activity in Activity<NookActivity>.activities { await activity.update(ActivityContent(state: content, staleDate: Date().addingTimeInterval(120))) }; activitySignature = signature + content.requestId; activityUpdated = Date() }
        } catch { isReachable = false; message = error.localizedDescription }
    }
    func decision(id: String, action: String, answers: [String: String] = [:]) async {
        guard !busy else { return }; busy = true; defer { busy = false }
        do {
            if action == "allow" || action == "always" {
                let context = LAContext(); guard try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Approve this agent request on your PC") else { throw failure("Authentication was cancelled.") }
            }
            let latest: PhoneState = try await request("/state")
            guard latest.pending?.id == id else { throw failure("This request is no longer waiting. Nothing was approved.") }
            let result: ResultResponse = try await request("/decide", body: ["id": id, "action": action, "answers": answers])
            guard result.ok else { throw failure(result.error ?? "The request was not applied.") }
            reviewRequestID = nil; message = action == "deny" ? "Denied." : "Answer sent."; await refresh()
        } catch { message = error.localizedDescription }
    }
    func draft(id: String, text: String) async { do { let result: ResultResponse = try await request("/instruction", body: ["id": id, "text": text]); message = result.ok ? "Draft sent to your PC for review." : result.error ?? "Draft not sent." } catch { message = error.localizedDescription } }
    func enableNotifications() async { do { let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]); if allowed { UIApplication.shared.registerForRemoteNotifications() } } catch { message = error.localizedDescription } }
    func registerDevice(activityToken: String = "") async { guard connection != nil && (!deviceToken.isEmpty || !activityToken.isEmpty) else { return }; do { let result: ResultResponse = try await request("/device", body: ["id": deviceID, "token": deviceToken, "activityToken": activityToken]); if !result.ok { message = result.error ?? "Push registration failed." } } catch { message = error.localizedDescription } }
    private func activityState(_ state: PhoneState) -> NookActivity.ContentState { NookActivity.ContentState(status: state.pending != nil ? "Needs review" : state.sessions.contains(where: { !$0.finished }) ? "Working" : "Quiet", agent: state.sessions.first?.agent ?? "Nook", waiting: state.pending != nil, requestId: state.pending?.id ?? "", updated: Int(Date().timeIntervalSince1970), locked: false) }
    func startActivity() async {
        guard let state, ActivityAuthorizationInfo().areActivitiesEnabled else { message = "Enable Live Activities in iPhone Settings and connect to the PC first."; return }
        if !Activity<NookActivity>.activities.isEmpty { return }
        do { let activity = try Activity.request(attributes: NookActivity(name: "Nook"), content: ActivityContent(state: activityState(state), staleDate: Date().addingTimeInterval(120)), pushType: .token)
            activityTask = Task { for await token in activity.pushTokenUpdates { await registerDevice(activityToken: token.map { String(format: "%02x", $0) }.joined()) } }
        } catch { message = error.localizedDescription }
    }
    func stopActivities() async { activityTask?.cancel(); for activity in Activity<NookActivity>.activities { await activity.end(nil, dismissalPolicy: .immediate) }; let _: ResultResponse? = try? await request("/device", body: ["id": deviceID, "activityEnded": true]) }
    func disconnect() async { await stopActivities(); let _: ResultResponse? = try? await request("/device", body: ["id": deviceID, "remove": true]); let _: ResultResponse? = try? await request("/logout", body: [:]); disconnectLocally() }
    private func disconnectLocally() { stopPolling(); ConnectionKeychain.clear(); connection = nil; state = nil; isReachable = false; UserDefaults(suiteName: NookShared.group)?.removeObject(forKey: "snapshot"); WidgetCenter.shared.reloadAllTimelines() }
    func open(_ url: URL) { guard url.scheme == "nook" else { return }; reviewRequestID = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "id" })?.value; Task { await refresh() } }
}
