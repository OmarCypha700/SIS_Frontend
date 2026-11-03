// A stand-in for api.paystack.co used only by the end-to-end tests: no money, no network.
// Initialising a payment sends the "customer" straight back to the portal as if they had paid;
// verifying reports success for the exact amount that was initialised.
import http from "node:http";

const port = Number(process.env.FAKE_PAYSTACK_PORT || 8199);
const frontend = process.env.FAKE_PAYSTACK_FRONTEND || "http://localhost:3100";
const payments = new Map();

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.headers.authorization !== "Bearer sk_test_e2e") return send(res, 401, { status: false, message: "Invalid key" });
  if (req.method === "POST" && req.url === "/transaction/initialize") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      payments.set(body.reference, body);
      const back = `${frontend}/fees/return?trxref=${body.reference}&reference=${body.reference}`;
      send(res, 200, { status: true, message: "Authorization URL created", data: { authorization_url: back, reference: body.reference } });
    });
    return undefined;
  }
  const match = req.method === "GET" && req.url.match(/^\/transaction\/verify\/([\w-]+)$/);
  if (match) {
    const payment = payments.get(match[1]);
    if (!payment) return send(res, 404, { status: false, message: "Transaction reference not found" });
    return send(res, 200, {
      status: true,
      data: { status: "success", reference: match[1], amount: payment.amount, currency: payment.currency, channel: "mobile_money",
              paid_at: new Date().toISOString(), gateway_response: "Approved", authorization: { bank: "MTN", brand: "mtn" } },
    });
  }
  return send(res, 404, { status: false, message: "Not found" });
});

server.listen(port, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
