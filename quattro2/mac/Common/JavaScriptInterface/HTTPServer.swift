//
//  HTTPServer.swift
//
//  Copyright 2026 Roland Corporation. All rights reserved.
//

import Foundation
import Network
import UniformTypeIdentifiers

@MainActor
@objc class HTTPServer: NSObject {

	private var listener: NWListener?
	private let queue = DispatchQueue(label: "jp.co.roland.quattro.httpserver")

	@objc func start(_ portNo: UInt16) -> UInt16 {
		let port = NWEndpoint.Port(rawValue: portNo) ?? .any
		let params = NWParameters.tcp
		params.allowLocalEndpointReuse = true
		listener = try? NWListener(using: params, on: port);
		guard let listener else { return 0 }

		let semaphore = DispatchSemaphore(value: 0)

		listener.stateUpdateHandler = { state in
			switch state {
			case .ready, .failed(_), .cancelled:
				semaphore.signal()
			default:
				break
			}
		}
		listener.newConnectionHandler = { [weak self] connection in
			Task {
				await self?.handleConnection(connection)
			}
		}
		listener.start(queue: queue)

		semaphore.wait()

		return if let port = listener.port?.rawValue { port } else { 0 }
	}

	@objc func stop() {
		listener?.cancel()
		listener = nil
	}

	@objc func isAlive() -> Bool {
		return listener != nil
	}

	private func handleConnection(_ connection: NWConnection) {
		connection.start(queue: queue)
		connection.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1024) { [weak self] data, _, isComplete, error in
			guard let data, !data.isEmpty, !isComplete, error == nil else {
				connection.cancel()
				return
			}
			if let request = String(data: data, encoding: .utf8) {
				Task {
					await self?.handleRequest(request, connection)
				}
			}
		}
	}

	private func handleRequest(_ request: String, _ connection: NWConnection) {
		guard let path = parsePathComponent(from: request) else {
			let body = "<h1>404 Not Found</h1>"
			sendResponse("404 Not Found", "text/html", body.data(using: .utf8)!, connection)
			return
		}
		let fileURL = Bundle.main.resourceURL!.appendingPathComponent(path)
		guard FileManager.default.fileExists(atPath: fileURL.path) else {
			let body = "<h1>404 Not Found</h1>"
			sendResponse("404 Not Found", "text/html", body.data(using: .utf8)!, connection)
			return
		}
		do {
			var contentType = "application/octet-stream"
			let ext = fileURL.pathExtension
			if let ut = UTType(filenameExtension: ext),
			   let mime = ut.preferredMIMEType {
				contentType = mime
			}
			let data = try Data(contentsOf: fileURL)
			sendResponse("200 OK", contentType, data, connection)
		} catch {
			let body = "<h1>500 Internal Server Error</h1>"
			sendResponse("500 Internal Server Error", "text/html", body.data(using: .utf8)!, connection)
		}
	}

	private func parsePathComponent(from request: String) -> String? {
		// GET /path/... HTTP/1.1
		let lines = request.split(separator: "\r\n")
		guard let first = lines.first else { return nil }
		let parts = first.split(separator: " ")
		guard parts.count >= 2 else { return nil }

		var path = String(parts[1])
		if path.hasPrefix("/") {
			path.removeFirst()
		}
		if (path.isEmpty || path.last == "/") {
			path += "index.html"
		}
		return path
	}

	private func sendResponse(_ status: String, _ contentType: String, _ data: Data, _ connection: NWConnection) {
		let header =
			"HTTP/1.1 \(status)\r\n" +
			"Content-Type: \(contentType)\r\n" +
			"Content-Length: \(data.count)\r\n" +
			"Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n" +
			"Access-Control-Allow-Origin: *\r\n" +
			"Connection: close\r\n" +
			"\r\n"
		let headerData = header.data(using: .utf8)!
		connection.send(content: headerData + data, completion: .contentProcessed { _ in
			connection.cancel()
		})
	}
}
