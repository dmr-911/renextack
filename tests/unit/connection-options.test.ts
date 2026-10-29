import { describe, expect, it } from "vitest";
import { isNeonHost, postgresConnectionOptions } from "@/server/db/connection-options";

const neonPooled =
  "postgresql://neondb_owner:secret@ep-cool-name-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("postgresConnectionOptions", () => {
  it("turns Neon's URL parameters into explicit TLS and channel binding options", () => {
    const options = postgresConnectionOptions(neonPooled);
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(options.enableChannelBinding).toBe(true);
    expect(options.connectionString).toBe(
      "postgresql://neondb_owner:secret@ep-cool-name-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb",
    );
  });

  it("requires TLS for Neon hosts even without sslmode", () => {
    const options = postgresConnectionOptions("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb");
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(options.enableChannelBinding).toBeUndefined();
  });

  it("leaves local URLs without TLS and keeps other parameters", () => {
    const options = postgresConnectionOptions("postgres://u:p@localhost:5432/app?application_name=web");
    expect(options.ssl).toBeUndefined();
    expect(options.connectionString).toBe("postgres://u:p@localhost:5432/app?application_name=web");
  });

  it("honors DATABASE_SSL and sslmode for other providers", () => {
    expect(postgresConnectionOptions("postgres://u:p@db.example.com/app", { ssl: true }).ssl).toEqual({
      rejectUnauthorized: true,
    });
    expect(postgresConnectionOptions("postgres://u:p@db.example.com/app?sslmode=verify-full").ssl).toEqual({
      rejectUnauthorized: true,
    });
    expect(postgresConnectionOptions("postgres://u:p@db.example.com/app?sslmode=disable").ssl).toBeUndefined();
  });

  it("matches neon.tech hosts only", () => {
    expect(isNeonHost("ep-x-pooler.us-east-2.aws.neon.tech")).toBe(true);
    expect(isNeonHost("neon.tech.attacker.example")).toBe(false);
    expect(isNeonHost("notneon.tech")).toBe(false);
  });
});
