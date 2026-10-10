import SwiftUI

struct NookPetFace: View {
    var waiting = false
    var happy = false
    var blink = false
    var body: some View {
        GeometryReader { geometry in
            let scale = min(geometry.size.width, geometry.size.height) / 48
            ZStack {
                Path { path in
                    path.move(to: CGPoint(x: 24, y: 5))
                    path.addCurve(to: CGPoint(x: 40, y: 29), control1: CGPoint(x: 29, y: 12), control2: CGPoint(x: 40, y: 16))
                    path.addCurve(to: CGPoint(x: 24, y: 44), control1: CGPoint(x: 40, y: 40), control2: CGPoint(x: 33, y: 44))
                    path.addCurve(to: CGPoint(x: 8, y: 29), control1: CGPoint(x: 15, y: 44), control2: CGPoint(x: 8, y: 40))
                    path.addCurve(to: CGPoint(x: 24, y: 5), control1: CGPoint(x: 8, y: 18), control2: CGPoint(x: 17, y: 12))
                }.fill(LinearGradient(colors: [.white, Color(red: 237/255, green: 240/255, blue: 246/255)], startPoint: .top, endPoint: .bottom))
                ForEach([18.0, 30.0], id: \.self) { x in
                    Ellipse().fill(NookShared.slate).frame(width: waiting ? 8 : 6.6, height: blink ? 1.3 : 8.6).position(x: x, y: 27)
                    if !blink { Circle().fill(NookShared.accent).frame(width: 3.2, height: 3.2).position(x: x + .4, y: 27.5); Circle().fill(.white).frame(width: 1.4, height: 1.4).position(x: x - .9, y: 25.4) }
                }
                Path { path in path.move(to: CGPoint(x: 21.5, y: 33)); path.addQuadCurve(to: CGPoint(x: 26.5, y: 33), control: CGPoint(x: 24, y: happy ? 38 : 35)) }.stroke(NookShared.slate, style: StrokeStyle(lineWidth: 1.1, lineCap: .round))
            }.frame(width: 48, height: 48).scaleEffect(scale, anchor: .topLeading)
        }.accessibilityHidden(true)
    }
}
struct NookAnimatedPet: View {
    var waiting = false
    @Environment(\.accessibilityReduceMotion) private var reduced
    var body: some View {
        TimelineView(.animation(minimumInterval: 1/30, paused: reduced)) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate
            NookPetFace(waiting: waiting, blink: !reduced && phase.truncatingRemainder(dividingBy: 5.7) > 5.4)
                .scaleEffect(reduced ? 1 : 1 + sin(phase * 1.1) * .015)
        }
    }
}
