import os, http.server, socketserver
os.chdir("/Users/stevenwireman/Downloads/the-hidden-word")
PORT = 3000
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on port {PORT}")
    httpd.serve_forever()
