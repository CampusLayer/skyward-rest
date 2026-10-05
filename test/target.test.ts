import assert from "node:assert/strict";
import test from "node:test";
import {
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
