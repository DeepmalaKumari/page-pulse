import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Page Pulse API", () => {
  it("should return health status", async () => {
    const response = await request(app)
      .get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("should reject an invalid URL", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "not-a-url",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_URL");
  });

  it("should audit a valid URL", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "https://example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.url).toBe("https://example.com");
    expect(response.body.data.statusCode).toBeDefined();
  });
});