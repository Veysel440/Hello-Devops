import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.API_BASE_URL || "http://localhost:8080";

export default function () {
  let res = http.get(`${BASE}/healthz`);
  check(res, { "health 200": (r) => r.status === 200 });

  res = http.get(`${BASE}/v1/notes`);
  check(res, { "notes 200": (r) => r.status === 200 });

  sleep(0.2);
}
