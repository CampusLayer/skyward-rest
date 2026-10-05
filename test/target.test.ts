import assert from "node:assert/strict";
import test from "node:test";
import {
  createSkywardClient,
  normalizeSkywardTarget,
  SkywardSession,
} from "../src/index.js";

test("normalizes an SMS 2.0 WService URL", () => {
  const target = normalizeSkywardTarget(
    "https://skyward.example.test/scripts/wsisa.dll/WService=wsEAplus/seplog01.w",
  );

  assert.equal(target.generation, "sms2");
  assert.equal(
    target.serviceRoot.toString(),
    "https://skyward.example.test/scripts/wsisa.dll/WService=wsEAplus/",
  );
});

test("SkywardSession export is explicit", () => {
  const session = new SkywardSession({
    version: 1,
    generation: "sms2",
    baseUrl:
      "https://skyward.example.test/scripts/wsisa.dll/WService=wsEAplus/",
    role: "teacher",
    cookies: [{ name: "secretCookie", value: "secretValue" }],
    sms2: {
      dwd: "1",
      wfaacl: "2",
      encses: "3",
      sessionId: "4",
    },
  });

  assert.equal(session.summary().role, "teacher");
  assert.doesNotMatch(JSON.stringify(session), /secretValue/);
  assert.equal(session.export().cookies?.[0]?.value, "secretValue");
});


test("normalizes a modern SMS Student web URL", () => {
  const target = normalizeSkywardTarget(
    "https://skyward.example.test/Student/web/sfhome01.w",
  );

  assert.equal(target.generation, "sms2");
  assert.equal(
    target.serviceRoot.toString(),
    "https://skyward.example.test/Student/web/",
  );
});


test("modern Student web page requests use sessionid and encses", async () => {
  let requestedUrl = "";
  let requestedBody = "";

  const mockFetch: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedBody = String(init?.body || "");
    return new Response("<html></html>", {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  };

  const client = createSkywardClient({
    session: {
      version: 1,
      generation: "sms2",
      baseUrl: "https://skyward.example.test/Student/web/",
      role: "student",
      sms2: {
        dwd: "legacy-dwd",
        wfaacl: "legacy-wfaacl",
        encses: "modern-encses",
        sessionId: "modern-session",
      },
    },
    fetch: mockFetch,
  });

  await assert.rejects(
    client.getAcademicHistory(),
    /did not contain the expected data grids/,
  );

  assert.equal(
    requestedUrl,
    "https://skyward.example.test/Student/web/sfacademichistory001.w",
  );
  assert.match(requestedBody, /sessionid=modern-session/);
  assert.match(requestedBody, /encses=modern-encses/);
  assert.doesNotMatch(requestedBody, /legacy-dwd/);
  assert.doesNotMatch(requestedBody, /legacy-wfaacl/);
});


test("imported browser cookies with leading dot domains are sent to Skyward", async () => {
  const { CookieJar } = await import("../src/cookies.js");

  const jar = new CookieJar([
    {
      name: "skywardSession",
      value: "secret",
      domain: ".scps.k12.fl.us",
      path: "/Student/web/",
      secure: true,
      httpOnly: true,
    },
  ]);

  assert.equal(
    jar.headerFor(
      new URL(
        "https://skyward.scps.k12.fl.us/Student/web/sfschedule001.w",
      ),
    ),
    "skywardSession=secret",
  );

  assert.equal(
    jar.headerFor(
      new URL(
        "https://skyward.scps.k12.fl.us/Teacher/web/sfschedule001.w",
      ),
    ),
    "",
  );
});


test("session health reports authenticated and invalid SMS sessions without exposing page text", async () => {
  const makeClient = (html: string) =>
    createSkywardClient({
      session: {
        version: 1,
        generation: "sms2",
        baseUrl: "https://skyward.example.test/Student/web/",
        role: "student",
        sms2: {
          dwd: "dwd",
          wfaacl: "wfaacl",
          encses: "encses",
          sessionId: "session",
        },
      },
      fetch: async () =>
        new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        }),
    });

  const healthy = await makeClient(
    '<html><body><div id="sf_ContentWrap"></div><form id="sf_navForm"><input name="sessionid"><input name="encses"></form></body></html>',
  ).checkSession();

  assert.deepEqual(healthy, {
    valid: true,
    state: "authenticated_shell",
    htmlBytes: 139,
  });

  const expired = await makeClient(
    "<html><body>Your session has expired. Please sign in again.</body></html>",
  ).checkSession();

  assert.equal(expired.valid, false);
  assert.equal(expired.state, "session_invalid");
  assert.equal(
    JSON.stringify(expired).includes("Your session has expired"),
    false,
  );
});
