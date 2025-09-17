import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 5,
  duration: "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  const r = http.get(`${BASE}/healthz`);
  check(r, { 200: (res) => res.status === 200 });
  sleep(1);
}

// summary dosyası (CI artifakt)
export function handleSummary(data) {
  return { "k6-summary.json": JSON.stringify(data, null, 2) };
}
