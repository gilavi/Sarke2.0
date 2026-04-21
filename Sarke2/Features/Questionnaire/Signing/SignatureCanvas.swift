import SwiftUI
import PencilKit

struct SignatureCanvasSheet: View {
    @Environment(\.dismiss) private var dismiss
    var onDone: (UIImage) -> Void

    @State private var canvas = PKCanvasView()

    var body: some View {
        NavigationStack {
            VStack {
                Text("მოაწერე ხელი ქვემოთ").foregroundStyle(.secondary)
                CanvasRepresentable(canvas: canvas)
                    .frame(maxWidth: .infinity, minHeight: 260)
                    .background(Color.white)
                    .overlay(Rectangle().stroke(.gray.opacity(0.3)))
                    .padding()
            }
            .navigationTitle("ხელმოწერა")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .topBarLeading) {
                    Button("გასუფთავება") { canvas.drawing = PKDrawing() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") {
                        guard !canvas.drawing.bounds.isEmpty else { return }
                        onDone(renderImage())
                        dismiss()
                    }
                }
            }
        }
    }

    private func renderImage() -> UIImage {
        let bounds = canvas.drawing.bounds.insetBy(dx: -10, dy: -10)
        return canvas.drawing.image(from: bounds, scale: UIScreen.main.scale)
    }
}

private struct CanvasRepresentable: UIViewRepresentable {
    let canvas: PKCanvasView

    func makeUIView(context: Context) -> PKCanvasView {
        canvas.drawingPolicy = .anyInput
        canvas.tool = PKInkingTool(.pen, color: .black, width: 3)
        canvas.backgroundColor = .white
        return canvas
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
