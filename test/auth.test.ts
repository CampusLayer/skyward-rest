import assert from "node:assert/strict";
import test from "node:test";
import {
  SkywardSession,
  SkywardSsoRequiredError,
  loginSms2WithPassword,
  parseSms2LoginResponse,
} from "../src/index.js";

test("parses legacy SMS 2.0 login tokens", () => {
  const body =
    "<li>319238^279419^23009402^27834052^58192^s219261^2^sfhome01.w^false^no ^no^no^^zdkNjlfkjbwanfcX^jDWadubjdaCOdEjY</li>";

  assert.deepEqual(parseSms2LoginResponse(body), {
    dwd: "319238",
    wfaacl: "27834052",
    encses: "jDWadubjdaCOdEjY",
    sessionId: "279419%1523009402",
  });
});

test("identifies likely SSO instead of guessing credentials", () => {
  assert.throws(
    () =>
      parseSms2LoginResponse(
        '<html><a href="https://login.microsoftonline.com/">Single Sign On</a></html>',
      ),
    SkywardSsoRequiredError,
  );
});

test("native login URL encodes credentials and session JSON stays redacted", async () => {
  let requestBody = "";
  const mockFetch: typeof fetch = async (_input, init) => {
    requestBody = String(init?.body || "");
    return new Response(
      "<li>1^2^3^4^5^6^7^sfhome01.w^false^no^no^no^^other^secret-session</li>",
      {
        status: 200,
        headers: {
          "Set-Cookie": "skywardSession=abc; Path=/; Secure; HttpOnly",
        },
      },
    );
  };

  const client = await loginSms2WithPassword({
    loginUrl:
      "https://skyward.example.test/scripts/wsisa.dll/WService=wsEAplus/seplog01.w",
    username: "student+test",
    password: "p@ss word",
    fetch: mockFetch,
  });

  assert.match(requestBody, /login=student%2Btest/);
  assert.match(requestBody, /password=p%40ss\+word/);

  const exported = client.exportSession();
  assert.equal(exported.sms2?.encses, "secret-session");

  const session = SkywardSession.from(exported);
  const normalJson = JSON.stringify(session);
  assert.doesNotMatch(normalJson, /secret-session/);
  assert.doesNotMatch(normalJson, /skywardSession/);
  assert.equal(session.summary().hasSms2Tokens, true);
});
