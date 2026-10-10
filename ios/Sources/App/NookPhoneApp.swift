import SwiftUI
import UIKit
import UserNotifications

@MainActor final class NookAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let center = UNUserNotificationCenter.current(); center.delegate = self
        let actions = [UNNotificationAction(identifier: "ALLOW", title: "Allow", options: [.foreground, .authenticationRequired]), UNNotificationAction(identifier: "REVIEW", title: "Review", options: [.foreground]), UNNotificationAction(identifier: "DENY", title: "Deny", options: [.foreground, .destructive])]
        center.setNotificationCategories([UNNotificationCategory(identifier: "NOOK_REVIEW", actions: actions, intentIdentifiers: [])])
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken token: Data) { NookStore.shared.deviceToken = token.map { String(format: "%02x", $0) }.joined(); Task { await NookStore.shared.registerDevice() } }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) { NookStore.shared.message = "Apple push registration failed. Check signing and Push Notifications capability." }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completion: @escaping (UNNotificationPresentationOptions) -> Void) { completion([.banner, .sound]) }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completion: @escaping () -> Void) {
        let id = response.notification.request.content.userInfo["requestId"] as? String, action = response.actionIdentifier
        Task { @MainActor in
            let store = NookStore.shared; store.reviewRequestID = id; await store.refresh()
            if let id, store.isReachable, store.state?.pending?.id == id, store.state?.pending?.kind != "question" {
                if action == "ALLOW" { await store.decision(id: id, action: "allow") }
                if action == "DENY" { await store.decision(id: id, action: "deny") }
            }
        }
        completion()
    }
}
@main struct NookPhoneApp: App {
    @UIApplicationDelegateAdaptor(NookAppDelegate.self) var delegate
    @StateObject private var store = NookStore.shared
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            NookRootView().environmentObject(store).tint(NookShared.accent).preferredColorScheme(.dark)
                .onOpenURL { store.open($0) }
                .onChange(of: phase) { _, next in if next == .active { store.startPolling() } else { store.stopPolling() } }
                .task { store.startPolling() }
        }
    }
}
