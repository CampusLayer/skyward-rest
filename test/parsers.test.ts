import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAcademicHistory,
  parseGradebook,
  parseReportCard,
  parseSkywardGridObjects,
} from "../src/index.js";

test("parses grid objects without executing returned JavaScript", () => {
  const html = `
    <script data-rel="sff">
      $.extend((sff.getValue('sf_gridObjects') || {}), {
        safeGrid: { tb: { r: [] } },
        text: 'not executable'
      });
    </script>
  `;

  assert.deepEqual(parseSkywardGridObjects(html), {
    safeGrid: { tb: { r: [] } },
    text: "not executable",
  });
});

test("parses a report card grid", () => {
  const html = `
    <script data-rel="sff">
      $.extend((sff.getValue('sf_gridObjects') || {}), {
        stuGradesGrid_74477_004: {
          tb: {
            r: [{
              c: [
                { cId: 'header', h: '<div>Course</div>' },
                { h: '<a data-cni="97776" data-bkt="TERM 1">98</a>' },
                { h: '<a data-cni="97776" data-bkt="TERM 2">95</a>' }
              ]
            }]
          }
        }
      });
    </script>
  `;

  assert.deepEqual(parseReportCard(html), [
    {
      courseId: 97776,
      scores: [
        { bucket: "TERM 1", score: 98 },
        { bucket: "TERM 2", score: 95 },
      ],
    },
  ]);
});

test("parses academic history safely", () => {
  const html = `
    <script data-rel="sff">
      $.extend((sff.getValue('sf_gridObjects') || {}), {
        gradeGrid_12345_001_2025: {
          tb: {
            r: [
              { c: [{ h: '<div>2024 - 2025 Grade 9</div>' }] },
              { c: [{ h: '' }, { h: '' }, { h: 'S1' }, { h: 'S2' }] },
              { c: [{ h: 'BIOLOGY 1' }, { h: '' }, { h: '93' }, { h: 'A' }] }
            ]
          }
        }
      });
    </script>
  `;

  assert.deepEqual(parseAcademicHistory(html), [
    {
      dates: { begin: "2024", end: "2025" },
      grade: 9,
      courses: [
        {
          course: "BIOLOGY 1",
          scores: [
            { lit: "S1", grade: 93 },
            { lit: "S2", grade: "A" },
          ],
        },
      ],
    },
  ]);
});

test("parses a basic gradebook page", () => {
  const html = `
    <h2 class="gb_heading">
      <span>
        <a>CHEMISTRY</a>
        <a>Teacher Name</a>
        <span>(Period 3)</span>
      </span>
    </h2>

    <table id="grid_stuTermSummaryGrid_1">
      <thead>
        <tr><th>Q1 (08/12/2026 - 10/09/2026)</th></tr>
      </thead>
      <tbody>
        <tr><td>92</td><td>91.5</td></tr>
      </tbody>
    </table>

    <table id="grid_stuAssignmentSummaryGrid_1">
      <tbody>
        <tr class="sf_Section cat">
          <td></td>
          <td>Major <span>(60%)</span></td>
          <td>90</td>
          <td>89.5</td>
          <td>179 / 200</td>
        </tr>
        <tr>
          <td>09/01/26</td>
          <td>Atomic Structure Test</td>
          <td>90</td>
          <td>89.5</td>
          <td>89.5 / 100</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;

  const result = parseGradebook(html);
  assert.equal(result.course, "CHEMISTRY");
  assert.equal(result.instructor, "Teacher Name");
  assert.equal(result.period, 3);
  assert.equal(result.grade, 92);
  assert.equal(result.score, 91.5);
  assert.equal(result.lit.name, "Q1");
  assert.equal(result.gradebook[0]?.category, "Major");
  assert.equal(
    result.gradebook[0]?.assignments[0]?.title,
    "Atomic Structure Test",
  );
});
