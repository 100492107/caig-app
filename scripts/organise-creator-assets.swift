#!/usr/bin/env swift

import Foundation
import Vision
import ImageIO

let fm = FileManager.default
let home = fm.homeDirectoryForCurrentUser
let downloads = home.appendingPathComponent("Downloads", isDirectory: true)
let documents = home.appendingPathComponent("Documents", isDirectory: true)
let assetsRoot = home.appendingPathComponent("Business/CornerstoneAIAssets", isDirectory: true)
let logURL = home.appendingPathComponent("Desktop/creator-asset-organiser-report.csv")
let apply = CommandLine.arguments.contains("--apply")
let threshold = Float(0.55)
let duoThreshold = Float(0.62)

let imageExtensions = Set(["jpg", "jpeg", "png", "webp", "heic", "heif"])

func isImage(_ url: URL) -> Bool {
    imageExtensions.contains(url.pathExtension.lowercased())
}

func allImages(in root: URL) -> [URL] {
    guard let e = fm.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles]) else { return [] }
    return e.compactMap { item in
        guard let u = item as? URL,
              (try? u.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true,
              isImage(u) else { return nil }
        return u
    }
}

func featurePrint(for url: URL) -> VNFeaturePrintObservation? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }

    let request = VNGenerateFaceFeaturePrintRequest()
    let handler = VNImageRequestHandler(cgImage: image, orientation: .up, options: [:])
    do {
        try handler.perform([request])
        return request.results?.first as? VNFeaturePrintObservation
    } catch {
        return nil
    }
}

struct Reference {
    let url: URL
    let feature: VNFeaturePrintObservation
}

func references(in folder: URL) -> [Reference] {
    allImages(in: folder).compactMap { url in
        guard let f = featurePrint(for: url) else { return nil }
        return Reference(url: url, feature: f)
    }
}

let caraReferenceFolder = assetsRoot.appendingPathComponent("01_CARA/01_References", isDirectory: true)
let lilaReferenceFolder = assetsRoot.appendingPathComponent("02_LILA/01_References", isDirectory: true)

let caraRefs = references(in: caraReferenceFolder)
let lilaRefs = references(in: lilaReferenceFolder)

if caraRefs.isEmpty || lilaRefs.isEmpty {
    print("ERROR: I could not build both Cara and Lila reference sets.")
    print("Cara references: \(caraRefs.count) in \(caraReferenceFolder.path)")
    print("Lila references: \(lilaRefs.count) in \(lilaReferenceFolder.path)")
    print("Put the canonical reference images in those folders, then rerun.")
    exit(1)
}

func bestDistance(_ image: URL, refs: [Reference]) -> Float? {
    guard let f = featurePrint(for: image) else { return nil }
    var best: Float?
    for r in refs {
        var d: Float = 0
        do {
            try f.computeDistance(&d, to: r.feature)
            if best == nil || d < best! { best = d }
        } catch {}
    }
    return best
}

func hintedMode(for url: URL) -> String {
    let s = url.path.lowercased()
    if s.contains("fanvue") || s.contains("fanvue page") { return "03_Fanvue" }
    if s.contains("carousel") || s.contains("slide") { return "04_Carousels" }
    if s.contains("reel") || s.contains("video") || s.contains("tiktok") || s.contains("short") { return "05_Simple_Reels" }
    if s.contains("reference") || s.contains("facecard") || s.contains("identity") || s.contains("character") || s.contains("model sheet") { return "01_References" }
    return "02_Social"
}

func targetFolder(person: String, mode: String) -> URL {
    let base: URL
    switch person {
    case "cara": base = assetsRoot.appendingPathComponent("01_CARA", isDirectory: true)
    case "lila": base = assetsRoot.appendingPathComponent("02_LILA", isDirectory: true)
    case "duo": base = assetsRoot.appendingPathComponent("03_CARA_LILA", isDirectory: true)
    default: base = assetsRoot.appendingPathComponent("99_UNCERTAIN", isDirectory: true)
    }
    return base.appendingPathComponent(mode, isDirectory: true)
}

func ensure(_ url: URL) {
    try? fm.createDirectory(at: url, withIntermediateDirectories: true)
}

func uniqueDestination(_ url: URL) -> URL {
    guard fm.fileExists(atPath: url.path) else { return url }
    let ext = url.pathExtension
    let stem = url.deletingPathExtension().lastPathComponent
    let dir = url.deletingLastPathComponent()
    var i = 2
    while true {
        let candidate = dir.appendingPathComponent("\(stem) (\(i)).\(ext)")
        if !fm.fileExists(atPath: candidate.path) { return candidate }
        i += 1
    }
}

let sources = [downloads, documents].filter { fm.fileExists(atPath: $0.path) }
let candidates = sources.flatMap(allImages)

var csv = "source,new_path,class,confidence,reason\n"
var moves = 0
var uncertain = 0
var ignored = 0

for url in candidates {
    let lower = url.path.lowercased()
    if lower.contains("/cornerstoneaiassets/") { ignored += 1; continue }
    if url.path == logURL.path { continue }

    let cara = bestDistance(url, refs: caraRefs)
    let lila = bestDistance(url, refs: lilaRefs)
    let caraScore = cara.map { max(0, min(1, 1 - $0)) }
    let lilaScore = lila.map { max(0, min(1, 1 - $0)) }

    var person = "uncertain"
    var confidence: Float = 0
    var reason = "no confident face match"

    if let c = caraScore, let l = lilaScore {
        let sorted = [("cara", c), ("lila", l)].sorted { $0.1 > $1.1 }
        if sorted[0].1 >= duoThreshold && sorted[1].1 >= duoThreshold {
            person = "duo"
            confidence = (sorted[0].1 + sorted[1].1) / 2
            reason = "both creator identities matched"
        } else if sorted[0].1 >= threshold {
            person = sorted[0].0
            confidence = sorted[0].1
            reason = "best creator identity match"
        }
    } else if let c = caraScore, c >= threshold {
        person = "cara"
        confidence = c
        reason = "Cara face match"
    } else if let l = lilaScore, l >= threshold {
        person = "lila"
        confidence = l
        reason = "Lila face match"
    }

    if person == "uncertain" {
        uncertain += 1
        let folder = assetsRoot.appendingPathComponent("99_UNCERTAIN", isDirectory: true)
        ensure(folder)
        let dest = uniqueDestination(folder.appendingPathComponent(url.lastPathComponent))
        csv += "\"\(url.path.replacingOccurrences(of: \"\"\", with: \"\"\"\"))\",\"\(dest.path.replacingOccurrences(of: \"\"\", with: \"\"\"\"))\",uncertain,\(confidence),\"\(reason)\"\n"
        if apply { try? fm.moveItem(at: url, to: dest) }
        continue
    }

    let mode = hintedMode(for: url)
    let folder = targetFolder(person: person, mode: mode)
    ensure(folder)
    let dest = uniqueDestination(folder.appendingPathComponent(url.lastPathComponent))
    csv += "\"\(url.path.replacingOccurrences(of: \"\"\", with: \"\"\"\"))\",\"\(dest.path.replacingOccurrences(of: \"\"\", with: \"\"\"\"))\",\(person),\(confidence),\"\(reason)\"\n"
    if apply { try? fm.moveItem(at: url, to: dest); moves += 1 }
}

try? csv.write(to: logURL, atomically: true, encoding: .utf8)

print(apply ? "APPLY COMPLETE" : "DRY RUN COMPLETE")
print("Images scanned: \(candidates.count)")
print("Moved: \(moves)")
print("Uncertain: \(uncertain)")
print("Ignored: \(ignored)")
print("Report: \(logURL.path)")
print(apply ? "Nothing was deleted." : "Nothing was moved. Run again with --apply only after reviewing the report.")
