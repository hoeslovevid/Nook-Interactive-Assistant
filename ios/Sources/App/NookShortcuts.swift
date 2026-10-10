import AppIntents

struct OpenNookIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Nook agents"
    static var openAppWhenRun = true
    func perform() async throws -> some IntentResult { .result() }
}
struct NookShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenNookIntent(), phrases: ["Open my agents in \(.applicationName)"], shortTitle: "Open agents", systemImageName: "sparkles")
        AppShortcut(intent: AgentStatusIntent(), phrases: ["What are my agents doing in \(.applicationName)"], shortTitle: "Agent status", systemImageName: "clock")
    }
}
