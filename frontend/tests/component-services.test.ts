import test, { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

import * as attendanceApi from "../lib/attendance-api.ts";
import * as notesApi from "../lib/notes-api.ts";
import * as customFieldsApi from "../lib/custom-fields-api.ts";
import * as masterOptionsApi from "../lib/master-options-api.ts";
import * as rolesApi from "../lib/roles-api.ts";
import * as settingsApi from "../lib/settings-api.ts";
import * as filesApi from "../lib/files-api.ts";
import { parseMentionMarkup, mentionMarkup } from "../lib/mentions.ts";

// Helper for mocking fetch responses
type FetchCall = { url: string; options?: RequestInit };

let lastFetchCall: FetchCall | null = null;
let originalFetch: typeof globalThis.fetch;

function mockFetchResponse(data: unknown, status = 200) {
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    lastFetchCall = { url: url.toString(), options };
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    } as unknown as Response;
  }) as typeof globalThis.fetch;
}

describe("Component Services & API Integration Suite", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    lastFetchCall = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    lastFetchCall = null;
  });

  describe("Attendance Component Service (attendance-api)", () => {
    it("fetches today's attendance status", async () => {
      const mockResult = { checked_in: true, record: { id: "att-1", work_date: "2026-09-14" } };
      mockFetchResponse(mockResult);

      const result = await attendanceApi.fetchToday();
      assert.strictEqual(lastFetchCall?.url, "/api/attendance/today");
      assert.deepStrictEqual(result, mockResult);
    });

    it("triggers check-in via POST", async () => {
      const mockRecord = { id: "att-new", work_date: "2026-09-14", check_in_at: "09:00:00Z" };
      mockFetchResponse(mockRecord);

      const record = await attendanceApi.checkIn();
      assert.strictEqual(lastFetchCall?.url, "/api/attendance/check-in");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(record.id, "att-new");
    });

    it("triggers check-out via POST", async () => {
      const mockRecord = { id: "att-new", check_out_at: "18:00:00Z" };
      mockFetchResponse(mockRecord);

      const record = await attendanceApi.checkOut();
      assert.strictEqual(lastFetchCall?.url, "/api/attendance/check-out");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(record.check_out_at, "18:00:00Z");
    });

    it("fetches all attendance records with query filters", async () => {
      mockFetchResponse([]);

      await attendanceApi.fetchAllAttendance({
        userId: "usr-101",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-30",
      });

      assert.strictEqual(
        lastFetchCall?.url,
        "/api/attendance?user_id=usr-101&date_from=2026-09-01&date_to=2026-09-30"
      );
    });

    it("throws error with detail message on failed request", async () => {
      mockFetchResponse({ detail: "Already checked in today" }, 400);

      await assert.rejects(
        async () => await attendanceApi.checkIn(),
        /Already checked in today/
      );
    });
  });

  describe("Notes Component Service (notes-api)", () => {
    it("fetches notes list", async () => {
      const mockNotes = [{ id: "n1", title: "Note 1", body: "Content 1" }];
      mockFetchResponse(mockNotes);

      const notes = await notesApi.fetchNotes();
      assert.strictEqual(lastFetchCall?.url, "/api/notes");
      assert.strictEqual(notes.length, 1);
      assert.strictEqual(notes[0].title, "Note 1");
    });

    it("creates a note with title and body", async () => {
      const newNote = { id: "n2", title: "Follow up", body: "Call client" };
      mockFetchResponse(newNote);

      const created = await notesApi.createNote("Follow up", "Call client");
      assert.strictEqual(lastFetchCall?.url, "/api/notes");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      const parsedBody = JSON.parse(lastFetchCall?.options?.body as string);
      assert.strictEqual(parsedBody.title, "Follow up");
      assert.strictEqual(created.id, "n2");
    });

    it("updates a note via PATCH", async () => {
      const updatedNote = { id: "n1", title: "Updated", body: "Content 1" };
      mockFetchResponse(updatedNote);

      await notesApi.updateNote("n1", { title: "Updated" });
      assert.strictEqual(lastFetchCall?.url, "/api/notes/n1");
      assert.strictEqual(lastFetchCall?.options?.method, "PATCH");
    });

    it("deletes a note via DELETE", async () => {
      mockFetchResponse({}, 204);

      await notesApi.deleteNote("n1");
      assert.strictEqual(lastFetchCall?.url, "/api/notes/n1");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("Custom Fields Component Service (custom-fields-api)", () => {
    it("fetches custom fields with entityType filter query", async () => {
      mockFetchResponse([]);

      await customFieldsApi.fetchCustomFields("car_booking");
      assert.strictEqual(lastFetchCall?.url, "/api/custom-fields?entity_type=car_booking");
    });

    it("creates a custom field definition", async () => {
      const fieldDef = {
        id: "cf-1",
        entity_type: "flight_booking" as const,
        key: "frequent_flyer",
        label: "Frequent Flyer #",
        field_type: "text" as const,
        options: null,
        is_required: false,
        display_order: 1,
        created_at: "2026-09-14",
      };
      mockFetchResponse(fieldDef);

      const result = await customFieldsApi.createCustomField({
        entity_type: "flight_booking",
        key: "frequent_flyer",
        label: "Frequent Flyer #",
        field_type: "text",
      });

      assert.strictEqual(lastFetchCall?.url, "/api/admin/custom-fields");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(result.key, "frequent_flyer");
    });

    it("deletes a custom field definition", async () => {
      mockFetchResponse({}, 204);

      await customFieldsApi.deleteCustomField("cf-1");
      assert.strictEqual(lastFetchCall?.url, "/api/admin/custom-fields/cf-1");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("Master Options Component Service (master-options-api)", () => {
    it("fetches master options filtered by field_key and option_type", async () => {
      mockFetchResponse([]);

      await masterOptionsApi.fetchMasterOptions("vehicle_type", "master");
      assert.strictEqual(
        lastFetchCall?.url,
        "/api/master-options?field_key=vehicle_type&option_type=master"
      );
    });

    it("creates a master option", async () => {
      const mockOption = {
        id: "mo-1",
        field_key: "fuel_policy",
        value: "Full to Full",
        option_type: "master",
        display_order: 1,
        created_at: "2026-09-14",
      };
      mockFetchResponse(mockOption);

      const result = await masterOptionsApi.createMasterOption("fuel_policy", "Full to Full");
      assert.strictEqual(lastFetchCall?.url, "/api/admin/master-options");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(result.value, "Full to Full");
    });

    it("deletes a master option", async () => {
      mockFetchResponse({}, 204);

      await masterOptionsApi.deleteMasterOption("mo-1");
      assert.strictEqual(lastFetchCall?.url, "/api/admin/master-options/mo-1");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("Roles & RBAC Management Service (roles-api)", () => {
    it("fetches permissions and roles", async () => {
      mockFetchResponse([{ id: "p1", code: "leads.view_all" }]);
      const perms = await rolesApi.fetchPermissions();
      assert.strictEqual(lastFetchCall?.url, "/api/admin/permissions");
      assert.strictEqual(perms.length, 1);

      mockFetchResponse([{ id: "r1", name: "agent" }]);
      const roles = await rolesApi.fetchRoles();
      assert.strictEqual(lastFetchCall?.url, "/api/admin/roles");
      assert.strictEqual(roles.length, 1);
    });

    it("creates a new custom role with permissions", async () => {
      const mockRole = {
        id: "r-custom",
        name: "senior_agent",
        is_system_role: false,
        created_at: "2026-09-14",
        permissions: [],
      };
      mockFetchResponse(mockRole);

      const created = await rolesApi.createRole("senior_agent", ["leads.view_all", "leads.create"]);
      assert.strictEqual(lastFetchCall?.url, "/api/admin/roles");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(created.name, "senior_agent");
    });

    it("updates role permissions", async () => {
      const mockRole = { id: "r-custom", permissions: [] };
      mockFetchResponse(mockRole);

      await rolesApi.updateRolePermissions("r-custom", ["leads.view_all"]);
      assert.strictEqual(lastFetchCall?.url, "/api/admin/roles/r-custom/permissions");
      assert.strictEqual(lastFetchCall?.options?.method, "PATCH");
    });

    it("deletes a custom role", async () => {
      mockFetchResponse({}, 204);

      await rolesApi.deleteRole("r-custom");
      assert.strictEqual(lastFetchCall?.url, "/api/admin/roles/r-custom");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("System Settings Component Service (settings-api)", () => {
    it("fetches all application settings", async () => {
      mockFetchResponse([{ key: "security.ip_whitelist_enabled", value: true }]);
      const settings = await settingsApi.fetchSettings();
      assert.strictEqual(lastFetchCall?.url, "/api/admin/settings");
      assert.strictEqual(settings.length, 1);
    });

    it("updates setting value with URL encoded key", async () => {
      mockFetchResponse({ key: "messaging.max_file_size_mb", value: 25 });
      await settingsApi.updateSettingValue("messaging.max_file_size_mb", 25);
      assert.strictEqual(
        lastFetchCall?.url,
        "/api/admin/settings/messaging.max_file_size_mb"
      );
      assert.strictEqual(lastFetchCall?.options?.method, "PATCH");
    });

    it("deletes a custom setting", async () => {
      mockFetchResponse({}, 204);
      await settingsApi.deleteSetting("custom.feature_toggle");
      assert.strictEqual(
        lastFetchCall?.url,
        "/api/admin/settings/custom.feature_toggle"
      );
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("Files & Sharing Component Service (files-api)", () => {
    it("fetches files with filter options", async () => {
      mockFetchResponse([]);
      await filesApi.fetchFiles({ all: true, userId: "u-99" });
      assert.strictEqual(lastFetchCall?.url, "/api/files?all=true&user_id=u-99");
    });

    it("deletes a file record", async () => {
      mockFetchResponse({}, 204);
      await filesApi.deleteFile("f-123");
      assert.strictEqual(lastFetchCall?.url, "/api/files/f-123");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });

    it("creates and revokes share links", async () => {
      mockFetchResponse({ id: "share-1", token: "tok-abc" });
      const link = await filesApi.createShareLink("f-123");
      assert.strictEqual(lastFetchCall?.url, "/api/files/f-123/share");
      assert.strictEqual(lastFetchCall?.options?.method, "POST");
      assert.strictEqual(link.token, "tok-abc");

      mockFetchResponse({}, 204);
      await filesApi.revokeShareLink("share-1");
      assert.strictEqual(lastFetchCall?.url, "/api/shares/share-1");
      assert.strictEqual(lastFetchCall?.options?.method, "DELETE");
    });
  });

  describe("Messaging Mentions Markup Service (mentions.ts)", () => {
    it("parses text containing @[Name](uuid) into structured segments", () => {
      const uuid1 = "12345678-1234-1234-1234-123456789abc";
      const uuid2 = "87654321-4321-4321-4321-cba987654321";
      const message = `Hello @[John Doe](${uuid1}), please review this booking with @[Jane Specialist](${uuid2}).`;

      const segments = parseMentionMarkup(message);
      assert.strictEqual(segments.length, 5);

      assert.strictEqual(segments[0].type, "text");
      assert.strictEqual(segments[0].text, "Hello ");

      assert.strictEqual(segments[1].type, "mention");
      assert.strictEqual(segments[1].text, "John Doe");
      assert.strictEqual(segments[1].userId, uuid1);

      assert.strictEqual(segments[2].type, "text");
      assert.strictEqual(segments[2].text, ", please review this booking with ");

      assert.strictEqual(segments[3].type, "mention");
      assert.strictEqual(segments[3].text, "Jane Specialist");
      assert.strictEqual(segments[3].userId, uuid2);

      assert.strictEqual(segments[4].type, "text");
      assert.strictEqual(segments[4].text, ".");
    });

    it("returns plain text segment when no mentions exist", () => {
      const message = "Plain message without any mentions.";
      const segments = parseMentionMarkup(message);
      assert.strictEqual(segments.length, 1);
      assert.strictEqual(segments[0].type, "text");
      assert.strictEqual(segments[0].text, message);
    });

    it("generates mention markup formatted as @[Name](userId)", () => {
      const markup = mentionMarkup("Agent Smith", "usr-uuid-123");
      assert.strictEqual(markup, "@[Agent Smith](usr-uuid-123)");
    });
  });
});
