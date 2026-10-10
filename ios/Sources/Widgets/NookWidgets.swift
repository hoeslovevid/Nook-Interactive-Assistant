import WidgetKit
import SwiftUI
import ActivityKit
import AppIntents

struct NookEntry: TimelineEntry { var date: Date; var snapshot: WidgetSnapshot }
struct NookProvider: TimelineProvider {
    func placeholder(in context: Context) -> NookEntry { NookEntry(date: Date(), snapshot: WidgetSnapshot(status: "Working", agent: "Nook", waiting: false, count: 2, updated: Date())) }
    func getSnapshot(in context: Context, completion: @escaping (NookEntry) -> Void) { completion(NookEntry(date: Date(), snapshot: NookShared.cached())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<NookEntry>) -> Void) { completion(Timeline(entries: [NookEntry(date: Date(), snapshot: NookShared.cached())], policy: .after(Date().addingTimeInterval(900)))) }
}
struct NookStatusWidget: Widget {
    let kind = "NookStatus"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NookProvider()) { entry in
            VStack(alignment: .leading, spacing: 8) { HStack { NookMark().frame(width: 28, height: 28); Text("Nook").font(.headline) }; Text(entry.snapshot.status).font(.subheadline); Text("\(entry.snapshot.count) sessions · \(entry.snapshot.agent)").font(.caption).foregroundStyle(.secondary); Text(entry.snapshot.updated, style: .relative).font(.caption2).foregroundStyle(.secondary) }.frame(maxWidth: .infinity, alignment: .leading).containerBackground(NookShared.slate, for: .widget).widgetURL(URL(string: "nook://agents"))
        }.configurationDisplayName("Nook agents").description("The last status from your paired PC.").supportedFamilies([.systemSmall, .systemMedium])
    }
}
struct NookLiveWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NookActivity.self) { context in
            HStack(spacing: 14) { NookPetFace(waiting: context.state.waiting, happy: context.state.status == "Finished").frame(width: 42, height: 42); VStack(alignment: .leading) { Text(context.state.status).font(.headline); Text(context.state.agent).font(.caption).foregroundStyle(.secondary); Text(Date(timeIntervalSince1970: Double(context.state.updated)), style: .relative).font(.caption2).foregroundStyle(.secondary) }; Spacer(); Link(context.state.waiting ? "Review" : "Open", destination: reviewURL(context.state.requestId)).buttonStyle(.bordered) }.padding().activityBackgroundTint(NookShared.slate).activitySystemActionForegroundColor(NookShared.accent)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { NookMark().frame(width: 36, height: 36) }
                DynamicIslandExpandedRegion(.trailing) { Text(context.state.agent).font(.caption) }
                DynamicIslandExpandedRegion(.bottom) { HStack { Text(context.state.status); Spacer(); Link("Review in Nook", destination: reviewURL(context.state.requestId)) }.font(.subheadline) }
            } compactLeading: { NookMark().frame(width: 22, height: 22) } compactTrailing: { Image(systemName: context.state.waiting ? "exclamationmark.circle.fill" : "sparkles").foregroundStyle(NookShared.accent) } minimal: { NookMark().frame(width: 22, height: 22) }
            .widgetURL(reviewURL(context.state.requestId)).keylineTint(NookShared.accent)
        }
    }
    private func reviewURL(_ id: String) -> URL { var parts = URLComponents(); parts.scheme = "nook"; parts.host = "review"; parts.queryItems = [URLQueryItem(name: "id", value: id)]; return parts.url! }
}
@main struct NookWidgetBundle: WidgetBundle { var body: some Widget { NookStatusWidget(); NookLiveWidget() } }
