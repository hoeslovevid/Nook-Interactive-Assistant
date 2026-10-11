import SwiftUI
import LocalAuthentication
import UIKit

struct NookRootView: View {
    @EnvironmentObject var store: NookStore
    @State private var tab = 0
    var body: some View {
        Group {
            if store.connection == nil { PairView() }
            else {
                TabView(selection: $tab) {
                    SessionsView().tabItem { Label("Agents", systemImage: "sparkles") }.tag(0)
                    ServicesView().tabItem { Label("Services", systemImage: "square.stack.3d.up") }.tag(1)
                    HistoryView().tabItem { Label("History", systemImage: "clock") }.tag(2)
                    PhoneSettingsView().tabItem { Label("Settings", systemImage: "gearshape") }.tag(3)
                }
            }
        }.sheet(item: $store.openSession) { selected in NavigationStack { SessionView(id: selected.sessionID, archived: selected.archived).toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { store.openSession = nil } } } }.environmentObject(store) }.onChange(of: store.reviewRequestID) { _, id in if id != nil { tab = 0 } }.safeAreaInset(edge: .bottom) { if !store.message.isEmpty { Text(store.message).font(.caption).foregroundStyle(.secondary).padding(12).frame(maxWidth: .infinity).background(.ultraThinMaterial).accessibilityAddTraits(.updatesFrequently) } }
    }
}
struct PairView: View {
    @EnvironmentObject var store: NookStore
    @State private var address = ""
    @State private var code = ""
    var body: some View {
        NavigationStack {
            Form {
                Section { HStack(spacing: 18) { NookMark().frame(width: 58, height: 58); VStack(alignment: .leading) { Text("Nook").font(.largeTitle.weight(.semibold)); Text("Your workspace, nearby.").foregroundStyle(.secondary) } }.padding(.vertical, 18) }
                Section("Pair with your PC") { TextField("http://192.168.1.10:45821", text: $address).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled(); TextField("Six-digit pairing code", text: $code).keyboardType(.numberPad); Button("Connect to Nook") { Task { await store.pair(address: address, code: code) } }.disabled(store.busy || code.count != 6) }
                Section { Text("Enable phone access in Nook on your PC, then enter its address and code. Both devices need trusted Wi-Fi. Allow uses Face ID, Touch ID, or your device passcode.").font(.footnote).foregroundStyle(.secondary) }
            }.navigationTitle("Welcome")
        }
    }
}
struct SessionsView: View {
    @EnvironmentObject var store: NookStore
    var body: some View {
        NavigationStack {
            List {
                Section { HStack { NookAnimatedPet(waiting: store.state?.pending != nil).frame(width: 48, height: 48); VStack(alignment: .leading) { Text(store.state?.status ?? "Connecting…").font(.headline); Text(store.isReachable ? "Connected to your PC" : "PC unreachable · reconnecting").font(.caption).foregroundStyle(.secondary) } }; Toggle("Only requests that need me", isOn: $store.focusRequests) }
                if store.systemFocusRequests { Section { Label("Filtered by your iPhone Focus", systemImage: "moon.fill").font(.caption).foregroundStyle(.secondary) } }
                if let request = store.state?.pending { Section("Needs your review") { RequestView(request: request) } }
                else if store.showingOnlyRequests { ContentUnavailableView("Nothing needs you", systemImage: "checkmark.circle", description: Text("Nook will show the next waiting request here.")) }
                if !store.showingOnlyRequests {
                    Section("Sessions") { ForEach((store.state?.sessions ?? []).sorted { store.pinnedIDs.contains($0.id) && !store.pinnedIDs.contains($1.id) }) { session in NavigationLink { SessionView(id: session.id, archived: false) } label: { VStack(alignment: .leading, spacing: 6) { HStack { Text(session.label ?? session.agent).font(.headline); if store.pinnedIDs.contains(session.id) { Image(systemName: "pin.fill").font(.caption).foregroundStyle(.secondary) } }; Text(session.finished ? "Finished" : session.task ?? "Working").font(.caption).foregroundStyle(.secondary) } }.swipeActions(edge: .leading) { Button(store.pinnedIDs.contains(session.id) ? "Unpin" : "Pin", systemImage: "pin") { store.togglePin(session.id) }.tint(.indigo) }.contextMenu { Button("Open session", systemImage: "arrow.up.right") { store.openSession = IndexedSession(sessionID: session.id, archived: false) }; Button("Copy name", systemImage: "doc.on.doc") { UIPasteboard.general.string = session.label ?? session.agent }; Button(store.pinnedIDs.contains(session.id) ? "Unpin" : "Pin", systemImage: "pin") { store.togglePin(session.id) } } } }
                    Section("Recent activity") { ForEach(Array((store.state?.activity ?? []).enumerated()), id: \.offset) { _, item in VStack(alignment: .leading, spacing: 5) { Text(item.title); Text(item.detail ?? "").font(.caption).foregroundStyle(.secondary) } } }
                }
            }.navigationTitle("Your agents").refreshable { await store.refresh() }
        }
    }
}
struct RequestView: View {
    @EnvironmentObject var store: NookStore
    let request: AgentRequest
    @State private var selections: [String: Set<String>] = [:]
    @State private var typed: [String: String] = [:]
    private var answers: [String: String] { Dictionary(uniqueKeysWithValues: request.questions.map { question in (question.question, typed[question.question]?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? typed[question.question]! : (selections[question.question] ?? []).sorted().joined(separator: ", ")) }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(request.title).font(.headline); Text(request.detail).font(.callout).textSelection(.enabled)
            ForEach(request.questions) { question in
                Text(question.question).font(.subheadline.weight(.semibold))
                ForEach(question.options) { option in
                    Button {
                        var selected = selections[question.question] ?? []
                        if question.multi == true { if selected.contains(option.label) { selected.remove(option.label) } else { selected.insert(option.label) } } else { selected = [option.label] }
                        selections[question.question] = selected
                    } label: { HStack { Image(systemName: selections[question.question]?.contains(option.label) == true ? "checkmark.circle.fill" : "circle"); VStack(alignment: .leading) { Text(option.label); if let copy = option.description { Text(copy).font(.caption).foregroundStyle(.secondary) } } } }.buttonStyle(.plain)
                }
                TextField("Or type your answer", text: Binding(get: { typed[question.question] ?? "" }, set: { typed[question.question] = $0 }))
            }
            HStack {
                if request.kind == "question" { Button("Send answers") { Task { await store.decision(id: request.id, action: "allow", answers: answers) } }.disabled(answers.values.contains(where: { $0.isEmpty })) }
                else { Button("Allow", systemImage: "checkmark.shield") { Task { await store.decision(id: request.id, action: "allow") } }; Spacer(); Button("Deny", role: .destructive) { Task { await store.decision(id: request.id, action: "deny") } } }
            }.buttonStyle(.bordered).disabled(store.busy || !store.isReachable)
            Text("Applies only to this exact waiting request. Approval requires device authentication.").font(.caption2).foregroundStyle(.secondary)
        }.padding(.vertical, 8).id(request.id)
    }
}
struct SessionView: View {
    @EnvironmentObject var store: NookStore
    let id: String
    let archived: Bool
    @State private var detail: SessionDetail?
    @State private var draft = ""
    @State private var error = ""
    var body: some View {
        List {
            if !error.isEmpty { Text(error).foregroundStyle(.secondary) }
            if let detail {
                if !detail.final.isEmpty { Section("Completed answer") { Text(detail.final).textSelection(.enabled) } }
                ForEach(Array(detail.steps.enumerated()), id: \.offset) { _, step in
                    Section(step.title.isEmpty ? step.task : step.title) { Text(step.detail).font(.callout).textSelection(.enabled); if !step.diff.isEmpty { DisclosureGroup("Diff · +\(step.added) −\(step.removed)") { ScrollView(.horizontal) { Text(step.diff).font(.system(.caption, design: .monospaced)).textSelection(.enabled) } } } }
                }
                ForEach(Array((detail.decisions ?? []).enumerated()), id: \.offset) { _, decision in Section(decision.action) { Text(decision.detail).textSelection(.enabled) } }
            }
            if !archived && store.state?.instructionsEnabled == true { Section("Follow-up draft") { TextField("What should the agent do next?", text: $draft, axis: .vertical); Button("Send draft to PC") { let copy = draft; draft = ""; Task { await store.draft(id: id, text: copy) } }.disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty); Text("Review and paste the draft on your PC. Nothing runs automatically.").font(.caption).foregroundStyle(.secondary) } }
        }.navigationTitle(detail?.label ?? "Session").onChange(of: store.state?.detailsEnabled) { _, enabled in if enabled != true { detail = nil; error = "Session detail sharing is disabled on your PC." } }.task { await load() }.refreshable { await load() }
    }
    func load() async { do { detail = try await store.request(NookQuery.route(archived ? "/history" : "/session", name: "id", value: id)); error = "" } catch { self.error = error.localizedDescription } }
}
struct ServicesView: View {
    @EnvironmentObject var store: NookStore
    var body: some View { NavigationStack { List { ForEach(store.state?.services ?? []) { service in if ["github", "vercel", "n8n", "stripe", "resend", "notion", "cal"].contains(service.id) { NavigationLink { ServiceView(id: service.id) } label: { VStack(alignment: .leading) { Text(service.title); Text(service.detail).font(.caption).foregroundStyle(.secondary) } } } else { VStack(alignment: .leading) { Text(service.title); Text(service.detail).font(.caption).foregroundStyle(.secondary) } } } }.navigationTitle("Services").refreshable { await store.refresh() } } }
}
struct ServiceView: View {
    @EnvironmentObject var store: NookStore
    let id: String
    @State private var detail: ServiceDetail?
    @State private var error = ""
    @State private var action: ServiceAction?
    @State private var review: ServiceAction?
    @State private var reviewText = ""
    var body: some View {
        List { if !error.isEmpty { Text(error).foregroundStyle(.secondary) }; ForEach(detail?.items ?? []) { item in VStack(alignment: .leading, spacing: 10) { Text(item.title).font(.headline); Text(item.detail).font(.caption).foregroundStyle(.secondary); if let url = URL(string: item.url), url.scheme == "https" { Link("Open in browser", destination: url) }; ForEach(item.actions) { action in Button(action.label) { if action.needsText == true { reviewText = ""; self.review = action } else { self.action = action } } } } } }
            .navigationTitle(id.capitalized).task { await load() }.refreshable { await load() }
            .sheet(item: $review) { selected in NavigationStack { Form { Section { Text(selected.summary ?? selected.label).font(.caption); TextField("Review comment", text: $reviewText, axis: .vertical).lineLimit(5...12) }; Button("Submit for PC confirmation") { let copy = reviewText; review = nil; Task { await perform(selected, text: copy) } }.disabled(reviewText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || reviewText.count > 4000) }.navigationTitle(selected.label).toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { review = nil } } } } }
            .confirmationDialog("Confirm service action", isPresented: Binding(get: { action != nil }, set: { if !$0 { action = nil } }), presenting: action) { selected in Button(selected.label) { Task { await perform(selected) } } } message: { selected in Text((selected.summary ?? selected.label) + "\nDevice authentication and confirmation on your PC are required.") }
    }
    func load() async { do { detail = try await store.request("/service?id=" + id); error = "" } catch { self.error = error.localizedDescription } }
    func perform(_ action: ServiceAction, text: String = "") async { do { guard try await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Confirm this service action") else { return }; let result: ResultResponse = try await store.request("/service-action", body: ["id": action.id, "input": ["text": text]]); error = result.cancelled == true ? "Cancelled on the PC." : result.ok ? "Completed. Pull to refresh." : result.error ?? "Action failed." } catch { self.error = error.localizedDescription } }
}
struct HistoryView: View {
    @EnvironmentObject var store: NookStore
    @State private var query = ""
    @State private var items: [HistoryItem] = []
    @State private var error = ""
    var body: some View { NavigationStack { List { if !error.isEmpty { Text(error).foregroundStyle(.secondary) }; ForEach(items) { item in NavigationLink { SessionView(id: item.id, archived: true) } label: { VStack(alignment: .leading, spacing: 5) { Text(item.label); Text([item.agent, item.project].filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary) } }.swipeActions(edge: .leading) { Button("Open", systemImage: "arrow.up.right") { store.openSession = IndexedSession(sessionID: item.id, archived: true) }.tint(.indigo) }.contextMenu { Button("Copy summary", systemImage: "doc.on.doc") { UIPasteboard.general.string = item.label + " · " + item.project }; Button("Open session", systemImage: "arrow.up.right") { store.openSession = IndexedSession(sessionID: item.id, archived: true) } } } }.navigationTitle("History").onChange(of: store.state?.detailsEnabled) { _, enabled in if enabled != true { items = []; error = "Enable detail sharing on your PC to view history." } }.searchable(text: $query).task(id: query) { do { try await Task.sleep(for: .milliseconds(250)); let response: HistoryResponse = try await store.request(NookQuery.route("/history", name: "q", value: query)); try Task.checkCancellation(); items = response.items; error = ""; if query.isEmpty { await store.indexHistory(response.items) } } catch is CancellationError {} catch { self.error = error.localizedDescription } } } }
}
struct PhoneSettingsView: View {
    @EnvironmentObject var store: NookStore
    @AppStorage("phoneTheme") private var theme = "dark"
    var body: some View { NavigationStack { Form {
        Section("Connected PC") { Text(store.connection?.address ?? ""); Button("Disconnect", role: .destructive) { Task { await store.disconnect() } } }
        Section("Appearance") { Picker("Theme", selection: $theme) { Text("Dark").tag("dark"); Text("Light").tag("light"); Text("iPhone setting").tag("system") } }
        Section("Search & Focus") { Toggle("Find sessions in Spotlight", isOn: Binding(get: { store.spotlightEnabled }, set: { enabled in Task { await store.setSpotlight(enabled) } })); Text("Indexes names, agent names, and project names on this iPhone. Requires detail sharing on the PC. Code, commands, and answers are excluded. Entries expire after a day and are removed when you disconnect or disable search.").font(.caption).foregroundStyle(.secondary); Text("In iPhone Settings → Focus → Add Filter, choose Nook to show only waiting approvals.").font(.caption) }
        Section("Stay in the loop") { Toggle("Automatic Lock Screen handoff", isOn: Binding(get: { store.autoHandoff }, set: { enabled in Task { await store.setAutoHandoff(enabled) } })); Text("Starts after your PC stays locked for 20 seconds while agents work. Waiting approvals start immediately; unlocking gets a 30-second grace period. Requires the Apple push relay and Live Activities permission.").font(.caption).foregroundStyle(.secondary); Button("Enable push notifications") { Task { await store.enableNotifications() } }; Button("Start Live Activity") { Task { await store.startActivity() } }; Button("End Live Activity") { Task { await store.stopActivities() } }; Text("Configure your Apple push relay in Nook on the PC. Live Activities are subject to iOS update limits. Widgets show the last snapshot and its time.").font(.caption).foregroundStyle(.secondary) }
        Section("Privacy") { Text("Pairing stays in this iPhone’s Keychain. Widgets cache only status. Approvals re-check the exact request after device authentication. Session details and history require sharing to be enabled on your PC.").font(.footnote); Text("Session details and actions use trusted local Wi-Fi. Push alerts can arrive elsewhere; reconnect to the PC’s network to review and act.").font(.footnote).foregroundStyle(.secondary) }
    }.navigationTitle("Settings") } }
}
