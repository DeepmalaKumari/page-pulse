import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Page Pulse API", () => {
  it("returns health status", async () => {
    const response = await request(app)
      .get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "page-pulse",
    });
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "not-a-valid-url",
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_URL",
        message: "A valid URL is required",
      },
    });
  });

  it("rejects a missing URL", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("INVALID_URL");
  });

  it("audits a reachable URL", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "https://example.com",
      });

    expect(response.status).toBe(200);

    expect(response.body.data).toMatchObject({
      url: "https://example.com",
      reachable: true,
    });

    expect(response.body.data.statusCode).toBe(200);
    expect(response.body.data.responseTimeMs).toEqual(
      expect.any(Number),
    );
    expect(response.body.data.auditedAt).toEqual(
      expect.any(String),
    );
  });

  it("returns 404 status for a non-existent page", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "https://example.com/non-existent-page-12345",
      });

    expect(response.status).toBe(200);

    expect(response.body.data).toMatchObject({
      url: "https://example.com/non-existent-page-12345",
      statusCode: 404,
      reachable: false,
    });
  });

  it("returns a structured result for an unreachable domain", async () => {
    const response = await request(app)
      .post("/api/v1/page-pulse")
      .send({
        url: "https://this-domain-definitely-does-not-exist-12345.com",
      });

    expect(response.status).toBe(200);

    expect(response.body.data).toMatchObject({
      url: "https://this-domain-definitely-does-not-exist-12345.com",
      reachable: false,
    });

    expect(response.body.data.responseTimeMs).toEqual(
      expect.any(Number),
    );

    expect(response.body.data.auditedAt).toEqual(
      expect.any(String),
    );
  });
});