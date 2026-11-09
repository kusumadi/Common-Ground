"use strict";
const byId = id => document.getElementById(id);
const storageKey = "teach-ai-demo-submissions-v1";
const feedback = {
  perimeter: {
    title: "The apprentice now adds the edges",
    action: "For a 7 m by 3 m garden, I add 7 + 3 + 7 + 3. That is 20 m of fence.",
    english: "Perimeter is the distance around the outside. Add the lengths of all four sides."
  },
  area: {
    title: "See where multiplication takes the apprentice",
    action: "Using length × width on a 7 m by 3 m garden gives 21 m². That measures the space inside. A fence follows the four edges.",
    english: "Area measures the space inside a shape. Perimeter measures the distance around it."
  },
  unclear: {
    title: "The apprentice needs one more detail",
    action: "Which sides would you measure for the fence? Tell me whether to add or multiply and why, then teach me again.",
    english: "The course term for the distance around the garden is perimeter."
  }
};
let attempt;
let checked;
let submissions = readSubmissions();
function readSubmissions() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
function saveSubmissions() {
  try { localStorage.setItem(storageKey, JSON.stringify(submissions)); return true; }
  catch { return false; }
}
function paragraph(parent, text) {
  const item = document.createElement("p");
  item.textContent = text;
  parent.append(item);
}
function compare(parent, original, english) {
  const group = document.createElement("div");
  group.className = "compare";
  for (const [label, content] of [["Your explanation", original], ["English lesson wording", english]]) {
    const cell = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = label;
    cell.append(heading);
    paragraph(cell, content);
    group.append(cell);
  }
  parent.append(group);
}
function fallback(text) {
  const normalized = text.toLowerCase();
  const add = /\b(add|sum|plus|tambah|jumlahkan)\b|\d\s*\+\s*\d/.test(normalized);
  const edges = /\b(sides?|edges?|around|perimeter|sisi|keliling|tepi)\b/.test(normalized) ||
    /\d\s*\+\s*\d\s*\+\s*\d\s*\+\s*\d/.test(normalized);
  const multiply = /\b(multiply|times|darab|kali)\b|\d\s*[x×*]\s*\d/.test(normalized);
  if (add && edges && !multiply) return "perimeter";
  if (multiply && !add) return "area";
  return "unclear";
}
async function classify(text) {
  if (location.protocol === "http:" || location.protocol === "https:") {
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({explanation:text}),
        signal: AbortSignal.timeout(20000)
      });
      if (response.ok) {
        const result = await response.json();
        if (Object.hasOwn(feedback, result.label)) return {label:result.label, model:true};
      }
    } catch { /* Use the built-in demonstration rules when the model is unavailable. */ }
  }
  return {label:fallback(text), model:false};
}
function resetAttempt() {
  attempt = undefined;
  checked = undefined;
  for (const id of ["replay","transfer","result"]) byId(id).hidden = true;
  const form = byId("transfer-form");
  form.reset();
  for (const control of form.elements) control.disabled = false;
  byId("mode").textContent = "";
}
byId("explanation").addEventListener("input", resetAttempt);
byId("sample-good").onclick = () => {
  byId("explanation").value = "Kena tambah semua sisi sebab pagar ikut keliling: 6 + 4 + 6 + 4.";
  resetAttempt();
  byId("explanation").focus();
};
byId("sample-area").onclick = () => {
  byId("explanation").value = "Darab panjang dengan lebar. 6 kali 4 dapat 24 meter pagar.";
  resetAttempt();
  byId("explanation").focus();
};
byId("teach-form").onsubmit = async event => {
  event.preventDefault();
  const input = byId("explanation");
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  resetAttempt();
  byId("teach").disabled = true;
  byId("mode").textContent = "Reading your explanation…";
  const result = await classify(text);
  byId("teach").disabled = false;
  if (input.value.trim() !== text) {
    byId("mode").textContent = "Your explanation changed. Teach the apprentice again.";
    return;
  }
  attempt = {text, label:result.label};
  byId("mode").textContent = result.model ? "Explanation interpreted by a local model." : "Demo mode · English and Malay phrase matching.";
  const card = byId("replay");
  const item = feedback[result.label];
  card.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = item.title;
  card.append(heading);
  paragraph(card, item.action);
  compare(card, text, item.english);
  card.hidden = false;
  byId("transfer").hidden = result.label === "unclear";
  card.scrollIntoView({behavior:"smooth", block:"nearest"});
};
byId("transfer-form").onsubmit = event => {
  event.preventDefault();
  if (!attempt || attempt.label === "unclear") return;
  const metres = Number(byId("answer").value);
  const term = new FormData(event.currentTarget).get("term");
  for (const control of event.currentTarget.elements) control.disabled = true;
  const concept = metres !== 26 ? "Needs concept practice" :
    attempt.label === "area" ? "Correct follow-up after feedback" : "Applied the concept";
  const vocabulary = term === "perimeter" ? "Recognised perimeter" : "Needs terminology practice";
  checked = {...attempt, metres, term, concept, vocabulary};
  const card = byId("result");
  card.replaceChildren();
  paragraph(card, concept + " · " + vocabulary);
  paragraph(card, "The fence needs 9 + 4 + 9 + 4 = 26 metres. The English term is perimeter.");
  paragraph(card, "Sharing sends this explanation and follow-up result to the lecturer view. Practice remains private until you submit.");
  const share = document.createElement("button");
  share.className = "primary";
  share.textContent = "Submit to lecturer";
  share.onclick = () => {
    if (!checked) return;
    submissions.unshift(checked);
    const saved = saveSubmissions();
    checked = undefined;
    share.remove();
    paragraph(card, saved ? "Submitted to the lecturer demo view." : "Submitted for this open page. Browser storage is unavailable.");
    renderLecturer();
  };
  card.append(share);
  card.hidden = false;
  card.scrollIntoView({behavior:"smooth", block:"nearest"});
};
function renderLecturer() {
  const summary = byId("summary");
  const list = byId("submissions");
  summary.replaceChildren();
  list.replaceChildren();
  const counts = document.createElement("div");
  counts.className = "stats";
  for (const [label, number] of [
    ["Submitted responses", submissions.length],
    ["Concept follow-up needed", submissions.filter(item => item.metres !== 26).length],
    ["English terminology follow-up needed", submissions.filter(item => item.term !== "perimeter").length]
  ]) {
    const cell = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = number;
    cell.append(strong, label);
    counts.append(cell);
  }
  summary.append(counts);
  if (!submissions.length) paragraph(summary, "No submissions yet. Complete a student attempt and choose Submit to lecturer.");
  else if (submissions.some(item => item.metres !== 26)) paragraph(summary, "Suggested opening activity: use the same garden to compare how much fence and how much grass it needs.");
  else if (submissions.some(item => item.term !== "perimeter")) paragraph(summary, "Suggested opening activity: label the garden’s perimeter and area, then ask students to match each term to its measurement.");
  else paragraph(summary, "Suggested opening activity: try a garden with an irregular outline.");
  submissions.forEach((item, index) => {
    const details = document.createElement("details");
    const title = document.createElement("summary");
    title.textContent = "Response " + (submissions.length - index) + " · " + item.concept + " · " + item.vocabulary;
    details.append(title);
    paragraph(details, "Student explanation: " + item.text);
    paragraph(details, "Independent check: " + item.metres + " m · English term selected: " + item.term);
    list.append(details);
  });
  byId("clear").hidden = !submissions.length;
}
function showRole(lecturer) {
  byId("student").hidden = lecturer;
  byId("lecturer").hidden = !lecturer;
  byId("student-tab").setAttribute("aria-pressed", String(!lecturer));
  byId("lecturer-tab").setAttribute("aria-pressed", String(lecturer));
  if (lecturer) renderLecturer();
}
byId("student-tab").onclick = () => showRole(false);
byId("lecturer-tab").onclick = () => showRole(true);
byId("clear").onclick = () => {
  submissions = [];
  saveSubmissions();
  renderLecturer();
};
