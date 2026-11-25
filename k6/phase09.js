import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    health: { executor: "constant-arrival-rate", rate: 20, timeUnit: "1s", duration: "30s", preAllocatedVUs: 5, maxVUs: 20 },
  },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500", "p(99)<1000"] },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL || "http://127.0.0.1:8000"}/health/live`);
  check(response, { "liveness is healthy": (r) => r.status === 200 });
  sleep(0.1);
}
