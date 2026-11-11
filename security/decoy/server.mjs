// Standalone deception service. It has no application imports, database client,
// storage volumes, production secrets, or outbound network dependency.
import { createServer } from "node:http";
const synthetic = Object.freeze({
  environment: "finance-archive",
  records: [
    {
      id: "archive-001",
      account: "SYNTHETIC-ACCOUNT-001",
      merchant: "Example Office Supplies",
      amount: 875,
      currency: "INR",
    },
    {
      id: "archive-002",
      account: "SYNTHETIC-ACCOUNT-002",
      merchant: "Example Travel Desk",
      amount: 1250,
      currency: "INR",
    },
  ],
});
const server = createServer((request, response) => {
  // No request bodies, credentials, personal information or arbitrary paths are logged.
  process.stdout.write(
    JSON.stringify({
      event: "decoy_hit",
      at: new Date().toISOString(),
      method: request.method,
    }) + "\n",
  );
  request.resume();
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  });
  response.end(JSON.stringify(synthetic));
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.maxHeadersCount = 20;
server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
