/**
 * AI Career Lab - email robot (version 3).
 *
 * Runs inside the aicareerlab077@gmail.com Google account (Apps Script), every 30 minutes.
 * It reads Firestore (project aicareerlab-8ba92) with the owner's own Google login and sends from that Gmail.
 *
 * Emails it sends:
 *   1. Welcome      - once, soon after a learner signs up.
 *   2. Course       - once per course, the first time a learner opens a lesson of that course.
 *   3. Study time   - the learner picked days + a time. If they don't open the site within an hour of it,
 *                     one friendly reminder for that study time, with their next lesson.
 *   4. New version  - the admin page queues it ("Emails" box); goes to every learner, ~90 a day.
 *   5. We miss you  - optional (off unless switched on in the admin page): away 7+ days, once per quiet spell.
 * Every email has an unsubscribe link. Sign-off is always "AI Career Lab team".
 *
 * Functions you can run by hand (choose in the toolbar, then click Run):
 *   setup()        - run ONCE: creates the secret key, the 30-minute timer, and checks Firestore works.
 *   previewAll()   - sends one sample of every email to this Gmail only.
 *   dryRun()       - writes to the log who WOULD get an email now. Sends nothing.
 *   tick()         - the real job (the timer calls it).
 *   stopAll()      - removes the timer (pauses everything). Run setup() again to restart.
 */

var CONFIG = {
  PROJECT_ID: 'aicareerlab-8ba92',
  SITE_URL: 'https://aicareerlab077.github.io/aicareerlab/',
  YOUTUBE: 'https://www.youtube.com/@aicareerlab077',
  INSTAGRAM: 'https://www.instagram.com/aicareerlab077.ai/',
  FROM_NAME: 'AI Career Lab team',
  EVERY_MINUTES: 30,          // how often the robot wakes up
  MAX_PER_RUN: 40,            // emails per run (Gmail allows about 100 a day for a free account)
  KEEP_FOR_ADMIN: 5,          // never use the last few emails of the day
  REMIND_AFTER_MIN: 60,       // study reminder goes out this long after the chosen time...
  REMIND_UNTIL_MIN: 300,      // ...but not later than this (then we skip that study time)
  ACTIVE_BEFORE_MIN: 30,      // opening the site up to 30 min before the study time counts as studying
  MISS_YOU_DAYS: 7,           // "we miss you" after this many days away
  MISS_YOU_MAX_DAYS: 45,
  MISS_YOU_HOUR_IST: 9        // "we miss you" is only checked in the 9 AM (India) run
};

// Courses and lesson order (copied from the website, version 3).
var COURSES = {
 "intro": {
  "name": "Python",
  "lessons": [
   [
    "s01-setup",
    "Python Environment Setup"
   ],
   [
    "s02-variables",
    "Variables and Data Types"
   ],
   [
    "s03-strings",
    "Strings and f-strings"
   ],
   [
    "s04-conditions",
    "Operators, Booleans and Conditionals"
   ],
   [
    "s05-collections",
    "Collections: Lists, Tuples, Dictionaries and Sets"
   ],
   [
    "s06-loops",
    "Loops and Comprehensions"
   ],
   [
    "s07-functions",
    "Functions"
   ],
   [
    "p1-expense-tracker",
    "Project 1: Expense Tracker"
   ],
   [
    "s08-typehints",
    "Type Hints"
   ],
   [
    "s09-errors",
    "Errors and Debugging"
   ],
   [
    "s10-files",
    "Files, JSON and Paths"
   ],
   [
    "s11-stdlib",
    "The Standard Library"
   ],
   [
    "s12-modules",
    "Modules, Packages and Virtual Environments"
   ],
   [
    "s13-classes",
    "Classes and Objects"
   ],
   [
    "p2-expense-tracker-pro",
    "Project 2: Expense Tracker Pro"
   ]
  ],
  "emoji": "🐍",
  "blurb": "You go from zero to writing real Python programs, with two Expense Tracker projects.",
  "cert": true
 },
 "data": {
  "name": "Pandas and Machine Learning",
  "lessons": [
   [
    "pd-create",
    "Creating, Reading and Writing"
   ],
   [
    "pd-select",
    "Indexing, Selecting and Assigning"
   ],
   [
    "pd-summary",
    "Summary Functions and Maps"
   ],
   [
    "pd-group",
    "Grouping and Sorting"
   ],
   [
    "pd-missing",
    "Data Types and Missing Values"
   ],
   [
    "pd-combine",
    "Renaming and Combining"
   ],
   [
    "ml-how",
    "How Models Work"
   ],
   [
    "ml-explore",
    "Basic Data Exploration"
   ],
   [
    "ml-first",
    "Your First Machine Learning Model"
   ],
   [
    "ml-validate",
    "Model Validation"
   ],
   [
    "ml-fit",
    "Underfitting and Overfitting"
   ],
   [
    "ml-forest",
    "Random Forests"
   ]
  ],
  "emoji": "📊",
  "blurb": "You learn Pandas for working with tables of data, then build your first machine learning models.",
  "cert": true
 },
 "sql": {
  "name": "SQL and Data Analytics",
  "lessons": [
   [
    "q01-basics",
    "Data and Database Basics"
   ],
   [
    "q02-queries",
    "Your First SQL Queries"
   ],
   [
    "q03-groupby",
    "Summaries with GROUP BY and HAVING"
   ],
   [
    "q04-ddl-dml",
    "Creating and Changing Data"
   ],
   [
    "q05-filters",
    "Filtering Data Like a Pro"
   ],
   [
    "q06-joins",
    "Joins and Set Operators"
   ],
   [
    "q07-text-numbers",
    "Text and Number Functions"
   ],
   [
    "q08-dates-nulls-case",
    "Dates, NULLs and CASE"
   ],
   [
    "q09-window",
    "Window Functions"
   ],
   [
    "q10-subqueries-ctes",
    "Subqueries and CTEs"
   ],
   [
    "q11-views-procs",
    "Views, Temp Tables, Procedures and Triggers"
   ],
   [
    "q12-performance",
    "Indexes and SQL Performance"
   ],
   [
    "q13-ai-copilot",
    "AI as Your SQL Co-Pilot"
   ],
   [
    "qp1-data-audit",
    "Project 1: Sagar Traders Data Audit"
   ],
   [
    "qp2-electronics",
    "Project 2: VoltKart Electronics Analytics"
   ],
   [
    "qp3-warehouse",
    "Project 3: A Mini Data Warehouse (Bronze, Silver, Gold)"
   ]
  ],
  "emoji": "🗃️",
  "blurb": "You learn to ask a database questions with SQL, using a DMart-style supermarket as the example.",
  "cert": false
 },
 "viz": {
  "name": "Data Visualization Basics",
  "lessons": [
   [
    "v01-why-data-stories",
    "Why Data Stories Matter"
   ],
   [
    "v02-how-eyes-read-charts",
    "How Our Eyes Read Charts"
   ],
   [
    "v03-context-first",
    "Context First: Audience, Big Idea, Right Metric"
   ],
   [
    "v04-pick-and-build-charts",
    "Pick and Build the Right Chart"
   ],
   [
    "v05-declutter-format",
    "Declutter and Format"
   ],
   [
    "v06-focus-with-colour",
    "Focus Attention with Colour"
   ],
   [
    "v07-build-the-story",
    "Build the Story"
   ],
   [
    "v08-case-studies-final",
    "Case Studies and Final Assignment"
   ]
  ],
  "emoji": "📈",
  "blurb": "You learn to pick the right chart and tell a clear story with data.",
  "cert": false
 },
 "charts": {
  "name": "Python Charts, Next Level",
  "lessons": [
   [
    "pc01-three-tools",
    "Three Chart Tools, One Table"
   ],
   [
    "pc02-seaborn-one-line",
    "Seaborn in One Line"
   ],
   [
    "pc03-compare-groups",
    "Compare Groups: Box and Violin Plots"
   ],
   [
    "pc04-relationships",
    "Relationships: Scatter, Trend Lines and Pair Plots"
   ],
   [
    "pc05-heatmaps",
    "Heatmaps: Patterns in a Grid"
   ],
   [
    "pc06-small-multiples",
    "Small Multiples: Many Small Charts"
   ],
   [
    "pc07-plotly-basics",
    "Plotly Basics: Charts You Can Hover"
   ],
   [
    "pc08-plotly-extras",
    "Plotly Extras: Sliders, Animation and Dropdowns"
   ],
   [
    "pc09-part-to-whole",
    "Part of a Whole: Donuts, Treemaps and Sunbursts"
   ],
   [
    "pc10-style-and-export",
    "Style and Share: Themes, Brand Colours and Export"
   ],
   [
    "pc11-supermart-explorer",
    "Project: Supermart Sales Explorer"
   ]
  ],
  "emoji": "🎨",
  "blurb": "You make beautiful and interactive charts with Seaborn and Plotly.",
  "cert": false
 },
 "bi": {
  "name": "Dashboards Without Code (Power BI)",
  "lessons": [
   [
    "bi01-what-is-power-bi",
    "What Power BI Is, and Getting Set Up"
   ],
   [
    "bi02-load-data",
    "Load Your Data"
   ],
   [
    "bi03-clean-power-query",
    "Clean Messy Data in Power Query"
   ],
   [
    "bi04-first-visuals",
    "Your First Visuals"
   ],
   [
    "bi05-slicers-filters",
    "Slicers, Filters and Clicking to Explore"
   ],
   [
    "bi06-measures",
    "Your First Measures (Beginner DAX)"
   ],
   [
    "bi07-relationships",
    "Join Two Tables (Relationships)"
   ],
   [
    "bi08-maps-kpis",
    "Maps and Target vs Actual"
   ],
   [
    "bi09-design-dashboard",
    "Design a Clean Dashboard"
   ],
   [
    "bi10-share-reports",
    "Save, Share and Show Your Work"
   ],
   [
    "bi11-metro-dashboard",
    "Project: Metro Ridership Dashboard"
   ]
  ],
  "emoji": "📊",
  "blurb": "You build real dashboards in Power BI without writing code.",
  "cert": false
 },
 "ml": {
  "name": "Machine Learning Basics",
  "lessons": [
   [
    "m01-what-is-ml",
    "Machine Learning in Plain Words"
   ],
   [
    "m02-linear-regression",
    "Regression: Predict Flat Rent"
   ],
   [
    "m03-measure-regression",
    "How Good Is My Number Guess?"
   ],
   [
    "m04-classification",
    "Classification: Will the Bank Approve the Loan?"
   ],
   [
    "m05-measure-classification",
    "Catching UPI Fraud: Accuracy Is Not Enough"
   ],
   [
    "m06-more-classifiers",
    "Which Crop Should a Farmer Grow?"
   ],
   [
    "m07-clustering",
    "Clustering: Find the Kirana Shop's Customer Types"
   ],
   [
    "m08-which-ml-type",
    "Regression, Classification or Clustering?"
   ],
   [
    "m09-choose-a-model",
    "How to Choose a Model (Not Blindly)"
   ]
  ],
  "emoji": "🧠",
  "blurb": "You learn what machine learning is, with everyday examples like rent prices and UPI fraud.",
  "cert": false
 },
 "models": {
  "name": "Machine Learning Models, One by One",
  "lessons": [
   [
    "mm01-recap",
    "The 5 Models You Already Know"
   ],
   [
    "mm02-multiple-polynomial",
    "Used Car Prices: Many Clues and Curved Lines"
   ],
   [
    "mm03-naive-bayes",
    "Naive Bayes: Is This SMS a Scam?"
   ],
   [
    "mm04-svm",
    "SVM: Ripe Mango or Not?"
   ],
   [
    "mm05-random-forest",
    "Random Forest: Will This Student Get Placed?"
   ],
   [
    "mm06-gradient-boosting",
    "Gradient Boosting: Which Loans Will Go Bad?"
   ],
   [
    "mm07-pca",
    "PCA: 10 Phone Specs Squeezed into 2"
   ],
   [
    "mm08-dbscan-anomaly",
    "DBSCAN and Anomalies: Busy Areas and Strange Payments"
   ],
   [
    "mm09-recommendations",
    "Recommendations: People Who Bought Atta Also Bought..."
   ],
   [
    "mm10-time-series",
    "Time Series: Forecast Next Summer's Electricity Bill"
   ],
   [
    "mm11-cheat-sheet",
    "The Model Cheat Sheet: Which One, When?"
   ],
   [
    "mm12-model-showdown",
    "Project: Model Showdown"
   ]
  ],
  "emoji": "🧩",
  "blurb": "You meet the most-used machine learning models one by one, and when to use each.",
  "cert": false
 },
 "genai": {
  "name": "Generative AI with Python",
  "lessons": [
   [
    "g01-how-llms-work",
    "How Generative AI and LLMs Work"
   ],
   [
    "g02-prompting",
    "Prompt Engineering"
   ],
   [
    "g03-apis-json",
    "AI APIs and Structured Output"
   ],
   [
    "g04-embeddings",
    "Embeddings and Semantic Search"
   ],
   [
    "g05-rag",
    "RAG: Chat With Your Own Documents"
   ],
   [
    "g06-agents",
    "AI Agents and Tool Calling"
   ],
   [
    "g07-evaluation",
    "Evaluating AI and Using It Responsibly"
   ],
   [
    "gp1-help-desk",
    "Project: Build the Nukkad Mart AI Help Desk"
   ]
  ],
  "emoji": "🤖",
  "blurb": "You learn how ChatGPT-style AI works and build your own AI help desk with Python.",
  "cert": false
 }
};

// Lesson videos (same list as "section-videos" in index.html). Add new ones here too, so emails show the video picture.
var VIDEOS = {
 "intro": "https://youtu.be/ZkmuUFBV-Dg",
 "s01-setup": "https://youtu.be/QVaQGHav8nk",
 "s02-variables": "https://youtu.be/tEvl5AhqlsE",
 "s03-strings": "https://youtu.be/9evd8eXdm8k",
 "s04-conditions": "https://youtu.be/9KGdbGqlk2w",
 "s05-collections": "https://youtu.be/aRAT1nR_st0",
 "s06-loops": "https://youtu.be/ngbOBcRlJf4",
 "s07-functions": "https://youtu.be/8If19mRFUcM",
 "p1-expense-tracker": "https://youtu.be/PhyZ00nuFLo",
 "s08-typehints": "https://youtu.be/cvOUv1pqdU0",
 "s09-errors": "https://youtu.be/chlG8H8ogbA",
 "s10-files": "https://youtu.be/ksk3A7E-82o",
 "s11-stdlib": "https://youtu.be/dBO9KxGMfu8",
 "s12-modules": "https://youtu.be/SpragL0kPfQ",
 "s13-classes": "https://youtu.be/qnWTi9tJGlI",
 "p2-expense-tracker-pro": "https://youtu.be/aeuPJB6X1RI",
 "pd-create": "https://youtu.be/umHjF9jUHh8",
 "pd-select": "https://youtu.be/Gr-3xb3wIOw",
 "pd-summary": "https://youtu.be/xdj35Vy02Eo",
 "pd-group": "https://youtu.be/3dvFjRxs6PM",
 "pd-missing": "https://youtu.be/CtPQjoTeQcc",
 "pd-combine": "https://youtu.be/EbqY_OlBV2Y",
 "ml-how": "https://youtu.be/lGG7r8YlWxk",
 "ml-explore": "https://youtu.be/wmlLIhefN04",
 "ml-first": "https://youtu.be/iI005sF8oZI",
 "ml-validate": "https://youtu.be/Gd-VnU4OX9k",
 "ml-fit": "https://youtu.be/ZdZAGyLgtDo",
 "ml-forest": "https://youtu.be/tz_SMtNTrzY",
 "q01-basics": "https://youtu.be/d7qlxw_VmZU",
 "q02-queries": "https://youtu.be/duxqjf2ywRo",
 "q03-groupby": "https://youtu.be/tlTF93yFSTE"
};

var DOCS = 'projects/' + CONFIG.PROJECT_ID + '/databases/(default)/documents';
var BASE = 'https://firestore.googleapis.com/v1/' + DOCS;
var DAY_MS = 864e5, MIN_MS = 6e4;
var DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* =====================================================================
   main job
   ===================================================================== */

function tick() { return run_(false); }
function dryRun() { return run_(true); }

function run_(dry) {
  var now = new Date(), props = PropertiesService.getScriptProperties();
  var start = props.getProperty('START_ISO');
  if (!start) throw new Error('Run setup() first.');
  var settings = Object.assign({ welcome: true, course: true, study: true, missYou: false, version: true, paused: false },
                               (getDoc_('emailSettings/main') || {}));
  var quota = MailApp.getRemainingDailyQuota();
  var budget = Math.max(0, Math.min(CONFIG.MAX_PER_RUN, quota - CONFIG.KEEP_FOR_ADMIN));
  var status = { lastRun: now.toISOString(), quotaLeft: quota, sent: 0, due: 0, note: '' };
  if (settings.paused) { status.note = 'Paused from the admin page.'; writeStatus_(status); return []; }

  // 1. What we need to look at (kept small, so Firestore stays inside the free plan).
  var newUsers = settings.welcome ? queryRange_('users', 'createdAt', new Date(Math.max(Date.parse(start), now - 3 * DAY_MS)), null) : [];
  var plans = listCollection_('studyPlans');
  var broadcasts = queryEq_('broadcasts', 'status', ['queued', 'sending']);
  var awayUsers = [];
  if (settings.missYou && Number(Utilities.formatDate(now, 'Asia/Kolkata', 'H')) === CONFIG.MISS_YOU_HOUR_IST) {
    awayUsers = queryRange_('users', 'lastSeen', new Date(now - CONFIG.MISS_YOU_MAX_DAYS * DAY_MS), new Date(now - CONFIG.MISS_YOU_DAYS * DAY_MS));
  }
  var allUsers = broadcasts.some(function (b) { return !b.data.testTo; }) ? listCollection_('users', ['email', 'firstName', 'name']) : [];

  // learners we may email in this run: get their user doc + email history in one go
  var ids = {};
  newUsers.concat(awayUsers, allUsers).forEach(function (u) { ids[u.id] = 1; });
  var planIds = plans.filter(function (p) { return planMayNeedEmail_(p.data, now); }).map(function (p) { return p.id; });
  planIds.forEach(function (id) { ids[id] = 1; });
  var users = indexById_(newUsers.concat(awayUsers));            // full learner docs
  Object.assign(users, indexById_(batchGet_('users', planIds.filter(function (id) { return !users[id]; }))));
  var lite = indexById_(allUsers);                               // name + email only (for the new version email)
  var state = indexById_(batchGet_('emailState', Object.keys(ids)));

  // 2. Decide (pure logic, tested separately).
  var jobs = planJobs_({
    now: now, start: start, settings: settings,
    users: users, lite: lite, plans: indexById_(plans), state: state, broadcasts: broadcasts,
    newIds: newUsers.map(function (u) { return u.id; }),
    awayIds: awayUsers.map(function (u) { return u.id; }),
    allIds: allUsers.map(function (u) { return u.id; }),
    tzParts: tzParts_
  }, budget);
  status.due = jobs.length;
  if (dry) {
    jobs.forEach(function (j) { Logger.log('Would send %s to %s %s', j.type, j.email, j.course || j.bcId || ''); });
    Logger.log('%s email(s) due now. Gmail emails left today: %s', jobs.length, quota);
    return jobs;
  }

  // 3. Send.
  var bcCount = {};
  jobs.forEach(function (j) {
    try {
      var mail = buildEmail_(j);
      MailApp.sendEmail({ to: j.email, subject: mail.subject, body: mail.text, htmlBody: mail.html, name: CONFIG.FROM_NAME });
      status.sent++;
      markSent_(j, now);
      if (j.bcId) bcCount[j.bcId] = (bcCount[j.bcId] || 0) + 1;
    } catch (e) {
      Logger.log('Could not email %s (%s): %s', j.email, j.type, e);
      status.note = 'Last error: ' + String(e).slice(0, 150);
    }
  });

  // 4. Broadcast progress: "sending" while learners remain, "done" when everyone got it.
  broadcasts.forEach(function (b) {
    var left = b.data.testTo ? 0 : jobsLeftForBroadcast_(b, allUsers, state, lite, bcCount, jobs);
    var fields = { status: { stringValue: left > 0 ? 'sending' : 'done' },
                   sentCount: { integerValue: String((b.data.sentCount || 0) + (bcCount[b.id] || 0)) } };
    if (left <= 0) fields.doneAt = { timestampValue: now.toISOString() };
    patch_('broadcasts/' + b.id, fields);
  });
  writeStatus_(status);
  return jobs;
}

/* Which plans could need an email right now (so we only fetch those learners). */
function planMayNeedEmail_(p, now) {
  p = p || {};
  var courses = p.courses || {};
  return Object.keys(courses).some(function (c) {
    var e = courses[c] || {};
    if (e.startedAt && now - Date.parse(e.startedAt) < 10 * DAY_MS) return true;   // course email may be due
    return !!(e.days && e.days.length && !e.skip && p.emails !== false);          // study reminder may be due
  });
}

/* =====================================================================
   decisions (no Google calls in here, so it can be tested)
   ===================================================================== */

function planJobs_(x, budget) {
  var jobs = [], now = x.now, s = x.settings, taken = {};
  function st(id) { return x.state[id] ? x.state[id].data : {}; }
  function usr(id) { var d = x.users[id] || (x.lite || {})[id]; return d ? d.data : null; }
  function full(id) { return x.users[id] ? x.users[id].data : null; }
  function ok(id) {
    var u = usr(id);
    return u && validEmail_(u.email) && !st(id).optOut;
  }
  function add(j) { if (jobs.length < budget) jobs.push(j); }
  function base(id) { var u = usr(id); return { uid: id, email: String(u.email).trim(), first: firstName_(u) }; }

  // test emails from the admin page first
  x.broadcasts.forEach(function (b) {
    if (b.data.testTo && validEmail_(b.data.testTo)) add({ type: 'version', bcId: b.id, test: true, uid: '', email: b.data.testTo, first: 'there', subject: b.data.subject, body: b.data.body });
  });

  // 1. welcome
  if (s.welcome) x.newIds.forEach(function (id) {
    var u = usr(id);
    if (!ok(id) || st(id).welcomeAt || !u.createdAt) return;
    if (Date.parse(u.createdAt) < Date.parse(x.start)) return;    // only people who join after the robot started
    add(Object.assign(base(id), { type: 'welcome' }));
    taken[id] = 'welcome';
  });

  // 2. course + 3. study time
  Object.keys(x.plans).forEach(function (id) {
    if (!ok(id) || !full(id)) return;
    var p = x.plans[id].data || {}, sd = st(id), courses = p.courses || {}, u = full(id);
    Object.keys(courses).forEach(function (c) {
      var e = courses[c] || {};
      if (!COURSES[c]) return;
      // course email: once per course, not in the same run as the welcome email
      if (s.course && e.startedAt && !(sd.course || {})[c] && taken[id] !== 'welcome' && now - Date.parse(e.startedAt) < 10 * DAY_MS) {
        add(Object.assign(base(id), { type: 'course', course: c, lesson: nextLesson_(c, u.done), plan: e }));
        taken[id] = taken[id] || 'course';
        return;
      }
      if (!s.study || p.emails === false || e.skip || !e.days || !e.days.length) return;
      var slot = dueSlot_(now, p.tz || 'Asia/Kolkata', e.days, e.time || '19:00', x.tzParts);
      if (!slot) return;
      var slotIso = slot.toISOString();
      if ((sd.slot || {})[c] === slotIso) return;                   // already reminded for this study time
      var lastActive = Math.max(Date.parse(u.lastSeen || 0) || 0, Date.parse(p.lastOpen || 0) || 0);
      if (lastActive >= slot - CONFIG.ACTIVE_BEFORE_MIN * MIN_MS) return;   // they studied, no email
      var lesson = nextLesson_(c, u.done);
      if (!lesson) return;                                          // finished the course
      if (taken[id]) return;                                        // max one email per learner per run
      add(Object.assign(base(id), { type: 'study', course: c, lesson: lesson, slotIso: slotIso, plan: e, tz: p.tz }));
      taken[id] = 'study';
    });
  });

  // 5. we miss you (optional)
  if (s.missYou) x.awayIds.forEach(function (id) {
    var u = usr(id);
    if (!ok(id) || taken[id] || !u.lastSeen) return;
    if (st(id).missFor === u.lastSeen) return;
    var plan = x.plans[id] ? x.plans[id].data : null;
    if (plan && plan.emails === false) return;
    var days = Math.floor((now - Date.parse(u.lastSeen)) / DAY_MS);
    add(Object.assign(base(id), { type: 'missyou', days: days, lastSeen: u.lastSeen, topics: Object.keys(u.done || {}).length }));
    taken[id] = 'missyou';
  });

  // 4. new version email (uses what's left of today's budget, continues next run)
  if (s.version !== false) x.broadcasts.forEach(function (b) {
    if (b.data.testTo) return;
    x.allIds.forEach(function (id) {
      if (!ok(id) || taken[id] || (st(id).bc || {})[b.id]) return;
      add(Object.assign(base(id), { type: 'version', bcId: b.id, subject: b.data.subject, body: b.data.body }));
      taken[id] = 'version';
    });
  });
  return jobs;
}

function jobsLeftForBroadcast_(b, allUsers, state, users, bcCount, jobs) {
  var sentNow = {};
  jobs.forEach(function (j) { if (j.bcId === b.id) sentNow[j.uid] = 1; });
  return allUsers.filter(function (u) {
    var d = users[u.id] ? users[u.id].data : u.data, sd = state[u.id] ? state[u.id].data : {};
    return validEmail_(d.email) && !sd.optOut && !(sd.bc || {})[b.id] && !sentNow[u.id];
  }).length;
}

/* The most recent study time that is 60 to 300 minutes old, or null. days: 1 = Monday ... 7 = Sunday. */
function dueSlot_(now, tz, days, time, tzParts) {
  var hm = String(time).split(':'), H = Number(hm[0]), M = Number(hm[1] || 0);
  if (!(H >= 0 && H < 24 && M >= 0 && M < 60)) return null;
  var best = null;
  for (var back = 0; back <= 1; back++) {
    var p = tzParts(new Date(now - back * DAY_MS), tz);
    if (days.indexOf(p.dow) < 0) continue;
    var slot = zonedToDate_(p.y, p.mo, p.d, H, M, tz, tzParts);
    var age = (now - slot) / MIN_MS;
    if (age >= CONFIG.REMIND_AFTER_MIN && age <= CONFIG.REMIND_UNTIL_MIN && (!best || slot > best)) best = slot;
  }
  return best;
}

/* local date + time in a time zone -> real moment */
function zonedToDate_(y, mo, d, H, M, tz, tzParts) {
  var guess = Date.UTC(y, mo - 1, d, H, M);
  for (var i = 0; i < 2; i++) {
    var p = tzParts(new Date(guess), tz);
    var shown = Date.UTC(p.y, p.mo - 1, p.d, p.H, p.M);
    guess += Date.UTC(y, mo - 1, d, H, M) - shown;
  }
  return new Date(guess);
}

function tzParts_(date, tz) {
  var f;
  try { f = Utilities.formatDate(date, tz, 'yyyy-MM-dd-u-HH-mm'); }
  catch (e) { f = Utilities.formatDate(date, 'Asia/Kolkata', 'yyyy-MM-dd-u-HH-mm'); }
  var a = f.split('-').map(Number);
  return { y: a[0], mo: a[1], d: a[2], dow: a[3], H: a[4], M: a[5] };
}

function nextLesson_(c, done) {
  done = done || {};
  var list = (COURSES[c] || {}).lessons || [];
  for (var i = 0; i < list.length; i++) if (!done[list[i][0]]) return { id: list[i][0], title: list[i][1], n: i + 1, of: list.length };
  return null;
}

function validEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }

function firstName_(d) {
  d = d || {};
  var f = String(d.firstName || '').trim() || String(d.name || '').trim().split(/\s+/)[0] || '';
  f = f.replace(/[<>&"']/g, '').slice(0, 40);
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'there';
}

/* =====================================================================
   the emails
   ===================================================================== */

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function link_(hash, tag) { return CONFIG.SITE_URL + '?utm_source=email&utm_medium=email&utm_campaign=' + tag + (hash ? '#' + hash : ''); }
function vidId_(u) { var m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/); return m ? m[1] : ''; }
function niceTime_(t) { var p = String(t || '19:00').split(':'), h = Number(p[0]); return (h % 12 || 12) + ':' + (p[1] || '00') + ' ' + (h < 12 ? 'AM' : 'PM'); }
function dayList_(days) {
  var n = (days || []).map(function (d) { return DAY_NAMES[d]; }).filter(Boolean);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : (n[0] || '');
}

/* "New version" email extras. Put each one on its own paragraph (empty line before and after):
     [video: s01-setup | Watch: Python setup]   -> clickable video picture that opens that lesson
     [button: Start SQL | q01-basics]           -> yellow button to a lesson, a course (sql) or home
     [image: email-banner-v3.jpg | alt text | sql] -> picture from the site's img/ folder (link optional)
     **bold text**                              -> bold
   Anything else is shown as normal text. */
function richPara_(p) {
  p = String(p || '').trim();
  if (!p) return '';
  var m = p.match(/^\[video:\s*([a-z0-9-]+)\s*(?:\|\s*([^\]]*))?\]$/i);
  if (m) {
    var vid = vidId_(VIDEOS[m[1]]);
    if (!vid) return '';
    var cap = esc_(m[2] || 'Watch the video lesson'), href = link_(m[1], 'version');
    return '<!--txt:' + (m[2] || 'Watch the video lesson').replace(/-->/g, '') + ': ' + href + '-->' +
      '<a href="' + href + '" style="text-decoration:none;color:#f5c518"><img src="https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg" width="488" alt="' + cap + '" style="display:block;width:100%;max-width:488px;border-radius:10px;border:2px solid #f5c518">' +
      '<span style="display:block;padding-top:8px;font-weight:bold;font-size:15px">▶ ' + cap + '</span></a>';
  }
  m = p.match(/^\[image:\s*([\w.-]+\.(?:png|jpe?g|gif))\s*(?:\|\s*([^|\]]*))?(?:\|\s*([a-z0-9-]+))?\s*\]$/i);
  if (m) {
    var ih = m[3] ? link_(m[3], 'version') : CONFIG.SITE_URL, alt = esc_(m[2] || 'AI Career Lab');
    return '<!--txt:' + (m[2] || '').replace(/-->/g, '') + '-->' +
      '<a href="' + ih + '"><img src="' + CONFIG.SITE_URL + 'img/' + m[1] + '" width="488" alt="' + alt + '" style="display:block;width:100%;max-width:488px;height:auto;border-radius:10px;border:0"></a>';
  }
  m = p.match(/^\[button:\s*([^|\]]+)\|\s*([a-z0-9-]+)\s*\]$/i);
  if (m) {
    var bl = link_(m[2], 'version');
    return '<!--txt:' + m[1].trim().replace(/-->/g, '') + ': ' + bl + '-->' +
      '<a href="' + bl + '" style="display:inline-block;background:#f5c518;color:#0d1f17;text-decoration:none;font-weight:bold;font-size:15px;padding:11px 20px;border-radius:10px">' + esc_(m[1].trim()) + ' →</a>';
  }
  return esc_(p).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}

function buildEmail_(j) {
  var c = j.course ? COURSES[j.course] : null, subject, title, paras = [], btn, btnLink, video = '', small = '';
  var first = j.first === 'there' ? '' : j.first;
  if (j.type === 'welcome') {
    subject = (first ? first + ', welcome' : 'Welcome') + ' to AI Career Lab 🎉';
    title = 'Welcome' + (first ? ', ' + first : '') + '!';
    paras = [
      'You just joined a free place to learn Python, SQL, data analytics, machine learning and AI, explained from zero, in small steps.',
      '<b>Where to start:</b> Python lesson 1. It takes about 10 minutes, you run real code right in your browser, and many lessons have a short video.',
      '<b>9 courses</b> are waiting: Python, Pandas &amp; ML, SQL, Data Visualization, Python Charts, Power BI, ML Basics, ML Models and Generative AI. Finish Python or Pandas &amp; ML and the exam, and you get a free certificate.',
      'Tip: when you start a course, pick your study days and time. We\'ll nudge you if you miss one.'
    ];
    btn = 'Start Python lesson 1'; btnLink = link_('s01-setup', 'welcome');
    video = VIDEOS.intro || '';
  } else if (j.type === 'course') {
    var L = j.lesson || { id: c.lessons[0][0], title: c.lessons[0][1], n: 1, of: c.lessons.length };
    subject = 'You started ' + c.name + ' ' + (c.emoji || '🚀');
    title = 'Great start' + (first ? ', ' + first : '') + '!';
    paras = [
      'You opened <b>' + esc_(c.name) + '</b>. ' + esc_(c.blurb || ''),
      'It has <b>' + c.lessons.length + ' lessons</b>' + (c.cert ? ', a final exam and a free certificate at the end' : '') + '. Each lesson unlocks after the one before it.'
    ];
    if (j.plan && j.plan.days && j.plan.days.length && !j.plan.skip) paras.push('Your study plan: <b>' + dayList_(j.plan.days) + ' at ' + niceTime_(j.plan.time) + '</b>. If you miss it, we\'ll send you one reminder.');
    else paras.push('Want a nudge? Open any lesson and press <b>Set a study time</b>.');
    btn = (L.n > 1 ? 'Continue: ' : 'Start: ') + L.title; btnLink = link_(L.id, 'course');
    video = VIDEOS[L.id] || VIDEOS[j.course] || '';
  } else if (j.type === 'study') {
    var S = j.lesson;
    subject = (first ? first + ', it' : 'It') + '\'s your study time ⏰';
    title = 'Your ' + c.name + ' time' + (first ? ', ' + first : '') + '!';
    paras = [
      'You planned to study <b>' + esc_(c.name) + '</b> at <b>' + niceTime_(j.plan.time) + '</b> today. There\'s still time, and even 10 minutes keeps your streak alive.',
      'Next up: <b>Lesson ' + S.n + ' of ' + S.of + ': ' + esc_(S.title) + '</b>.'
    ];
    btn = 'Open lesson ' + S.n; btnLink = link_(S.id, 'study');
    video = VIDEOS[S.id] || '';
    small = 'Your plan: ' + dayList_(j.plan.days) + ' at ' + niceTime_(j.plan.time) + '. To change it, press Change at the top of any lesson.';
  } else if (j.type === 'missyou') {
    subject = (first ? first + ', your' : 'Your') + ' next lesson is waiting 👋';
    title = 'We miss you' + (first ? ', ' + first : '') + '!';
    paras = [
      'It has been ' + j.days + ' days since your last visit. ' + (j.topics ? 'You already finished <b>' + j.topics + ' lesson' + (j.topics === 1 ? '' : 's') + '</b>, so don\'t let that go cold.' : 'Your first lesson takes about 10 minutes.'),
      'Just 10 minutes today keeps your learning going.'
    ];
    btn = 'Continue learning'; btnLink = link_('home', 'missyou');
  } else {
    subject = String(j.subject || 'New on AI Career Lab').replace(/\{first\}/g, first || 'there');
    if (j.test) subject = '[TEST] ' + subject;
    title = 'Hi ' + (first || 'there') + ',';
    paras = String(j.body || '').replace(/\{first\}/g, first || 'there').split(/\n\s*\n/).map(richPara_).filter(Boolean);
    btn = 'See what\'s new'; btnLink = link_('home', 'version');
  }
  var unsub = j.test || !j.uid ? CONFIG.SITE_URL : unsubUrl_(j.uid);
  var vid = vidId_(video);
  var html =
    '<div style="background:#0d1f17;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#12291f;border-radius:14px;border:1px solid #1f4434">' +
    '<tr><td style="padding:20px 26px 6px"><a href="' + CONFIG.SITE_URL + '"><img src="' + CONFIG.SITE_URL + 'img/email-logo.png" width="160" alt="AI Career Lab" style="display:block;width:160px;height:auto;border:0"></a></td></tr>' +
    '<tr><td style="padding:6px 26px 4px;color:#ffffff;font-size:23px;font-weight:bold;line-height:1.3">' + esc_(title) + '</td></tr>' +
    paras.map(function (p) { return '<tr><td style="padding:8px 26px;color:#d5e6dc;font-size:15px;line-height:1.6">' + p + '</td></tr>'; }).join('') +
    (vid ? '<tr><td style="padding:12px 26px 4px"><a href="' + btnLink + '"><img src="https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg" width="488" alt="Watch the video lesson" style="display:block;width:100%;max-width:488px;border-radius:10px;border:2px solid #f5c518"></a></td></tr>' : '') +
    '<tr><td style="padding:18px 26px 8px"><a href="' + btnLink + '" style="display:inline-block;background:#f5c518;color:#0d1f17;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 24px;border-radius:10px">' + esc_(btn) + ' →</a></td></tr>' +
    (small ? '<tr><td style="padding:6px 26px;color:#9fb5a7;font-size:13px;line-height:1.5">' + esc_(small) + '</td></tr>' : '') +
    '<tr><td style="padding:14px 26px 22px;color:#d5e6dc;font-size:14px;line-height:1.6">Happy learning,<br>AI Career Lab team<br>' +
      '<a href="' + CONFIG.YOUTUBE + '" style="color:#f5c518">YouTube</a> · <a href="' + CONFIG.INSTAGRAM + '" style="color:#f5c518">Instagram</a></td></tr>' +
    '</table>' +
    '<p style="max-width:540px;margin:14px auto 0;color:#7f9c8d;font-size:12px;line-height:1.5;text-align:center">You get this because you have an account at AI Career Lab.<br>' +
      'Don\'t want these emails? <a href="' + unsub + '" style="color:#a9c7b8">Unsubscribe</a></p></div>';
  var text = title + '\n\n' + paras.map(function (p) { var t = p.match(/^<!--txt:([\s\S]*?)-->/); if (t) return t[1]; return p.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }).join('\n\n') +
    '\n\n' + btn + ': ' + btnLink + (small ? '\n\n' + small : '') + '\n\nHappy learning,\nAI Career Lab team\n\nUnsubscribe: ' + unsub + '\n';
  return { subject: subject, html: html, text: text };
}

function previewAll() {
  var me = Session.getEffectiveUser().getEmail(), samples = [
    { type: 'welcome' },
    { type: 'course', course: 'sql', lesson: nextLesson_('sql', {}), plan: { days: [1, 3, 6], time: '19:00' } },
    { type: 'study', course: 'intro', lesson: nextLesson_('intro', { 's01-setup': 1, 's02-variables': 1, 's03-strings': 1, 's04-conditions': 1, 's05-collections': 1 }), plan: { days: [2, 4], time: '20:30' } },
    { type: 'missyou', days: 9, topics: 4 },
    { type: 'version', subject: 'New this week at AI Career Lab', body: 'Hi {first}, this week we added study plans and reminder emails.\n\nOpen any lesson and pick your study time!' }
  ];
  samples.forEach(function (j) {
    j.uid = 'preview'; j.email = me; j.first = 'Ravi';
    var m = buildEmail_(j);
    MailApp.sendEmail({ to: me, subject: '[PREVIEW] ' + m.subject, body: m.text, htmlBody: m.html, name: CONFIG.FROM_NAME });
  });
  Logger.log('Sent %s preview emails to %s', samples.length, me);
}

/* =====================================================================
   saving what was sent
   ===================================================================== */

function markSent_(j, now) {
  var t = { timestampValue: now.toISOString() }, f = {}, mask = [];
  if (j.uid && !j.test) {
    if (j.type === 'welcome') { f.welcomeAt = t; mask.push('welcomeAt'); }
    if (j.type === 'course') { f.course = mapOf_(j.course, t); mask.push('course.' + j.course); }
    if (j.type === 'study') { f.slot = mapOf_(j.course, { stringValue: j.slotIso }); mask.push('slot.' + j.course); }
    if (j.type === 'missyou') { f.missFor = { stringValue: j.lastSeen }; mask.push('missFor'); }
    if (j.type === 'version') { f.bc = mapOf_(j.bcId, { booleanValue: true }); mask.push('bc.' + j.bcId); }
    f.lastEmailAt = t; mask.push('lastEmailAt');
    patch_('emailState/' + j.uid, f, mask);
  }
  // log for the admin page
  create_('emailLog', {
    uid: { stringValue: j.uid || '' }, email: { stringValue: j.email }, type: { stringValue: j.type + (j.test ? '-test' : '') },
    course: { stringValue: j.course || '' }, at: t, by: { stringValue: 'robot' }
  });
}

function mapOf_(k, v) { var o = {}; o[k] = v; return { mapValue: { fields: o } }; }

function writeStatus_(s) {
  patch_('emailSettings/status', {
    lastRun: { timestampValue: s.lastRun }, quotaLeft: { integerValue: String(s.quotaLeft) },
    sentLastRun: { integerValue: String(s.sent) }, dueLastRun: { integerValue: String(s.due) }, note: { stringValue: s.note || '' }
  });
}

/* =====================================================================
   unsubscribe page (web app)
   ===================================================================== */

function unsubUrl_(uid) {
  var base = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || ScriptApp.getService().getUrl() || CONFIG.SITE_URL;
  return base + '?u=' + encodeURIComponent(uid) + '&s=' + sign_(uid);
}

function sign_(uid) {
  var secret = PropertiesService.getScriptProperties().getProperty('UNSUB_SECRET');
  if (!secret) throw new Error('Run setup() first.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(uid, secret)).replace(/=+$/, '').slice(0, 22);
}

function doGet(e) {
  var uid = (e && e.parameter && e.parameter.u) || '', sig = (e && e.parameter && e.parameter.s) || '';
  var ok = uid && uid !== 'preview' && /^[A-Za-z0-9_-]{1,128}$/.test(uid) && sig === sign_(uid);
  if (ok) patch_('emailState/' + uid, { optOut: { booleanValue: true }, optOutAt: { timestampValue: new Date().toISOString() } });
  var msg = ok ? 'Done. You won\'t get any more emails from AI Career Lab.'
    : (uid === 'preview' ? 'This is a preview link, so nothing changed.' : 'This link is not valid. Reply to any of our emails and we will remove you.');
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;max-width:460px;margin:60px auto;padding:28px;border-radius:14px;background:#12291f;color:#fff;text-align:center">' +
    '<div style="color:#f5c518;font-weight:bold;margin-bottom:12px">⬢ AI CAREER LAB</div><p style="font-size:17px;line-height:1.5">' + msg + '</p>' +
    '<a href="' + CONFIG.SITE_URL + '" style="color:#f5c518">Back to the site</a></div>').setTitle('AI Career Lab emails');
}

/* =====================================================================
   setup
   ===================================================================== */

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('UNSUB_SECRET')) props.setProperty('UNSUB_SECRET', Utilities.getUuid() + Utilities.getUuid());
  if (!props.getProperty('START_ISO')) props.setProperty('START_ISO', new Date().toISOString());
  stopAll();
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(CONFIG.EVERY_MINUTES).create();
  var n = listCollection_('users', ['email']).length;
  writeStatus_({ lastRun: new Date().toISOString(), quotaLeft: MailApp.getRemainingDailyQuota(), sent: 0, due: 0, note: 'Set up. ' + n + ' learners found.' });
  Logger.log('Setup done. Runs every %s minutes. Firestore OK, %s learners found. Welcome emails go to people who join from now on.', CONFIG.EVERY_MINUTES, n);
}

function setWebAppUrl(url) { PropertiesService.getScriptProperties().setProperty('WEBAPP_URL', url); }

function stopAll() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
}

/* =====================================================================
   Firestore REST helpers
   ===================================================================== */

function fsFetch_(url, opts) {
  opts = opts || {};
  opts.headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': CONFIG.PROJECT_ID };
  opts.muteHttpExceptions = true;
  opts.contentType = 'application/json';
  var res = UrlFetchApp.fetch(url, opts), code = res.getResponseCode();
  if (code === 404 && opts.method === 'get') return null;
  if (code >= 300) throw new Error('Firestore ' + code + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText() || '{}');
}

function docOut_(doc) { return { id: doc.name.split('/').pop(), data: fromFields_(doc.fields || {}) }; }

function getDoc_(path) {
  var d = fsFetch_(BASE + '/' + path, { method: 'get' });
  return d ? fromFields_(d.fields || {}) : null;
}

function listCollection_(name, fields) {
  var out = [], token = '';
  do {
    var url = BASE + '/' + name + '?pageSize=300';
    (fields || []).forEach(function (f) { url += '&mask.fieldPaths=' + encodeURIComponent(f); });
    if (token) url += '&pageToken=' + encodeURIComponent(token);
    var page = fsFetch_(url, { method: 'get' }) || {};
    (page.documents || []).forEach(function (doc) { out.push(docOut_(doc)); });
    token = page.nextPageToken || '';
  } while (token);
  return out;
}

function runQuery_(where, coll) {
  var res = fsFetch_(BASE + ':runQuery', { method: 'post', payload: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: where, limit: 1000 } }) }) || [];
  return res.filter(function (r) { return r.document; }).map(function (r) { return docOut_(r.document); });
}

function queryRange_(coll, field, from, to) {
  var f = [{ fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: from.toISOString() } } }];
  if (to) f.push({ fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN', value: { timestampValue: to.toISOString() } } });
  return runQuery_(f.length > 1 ? { compositeFilter: { op: 'AND', filters: f } } : f[0], coll);
}

function queryEq_(coll, field, values) {
  return runQuery_({ fieldFilter: { field: { fieldPath: field }, op: 'IN', value: { arrayValue: { values: values.map(function (v) { return { stringValue: v }; }) } } } }, coll);
}

function batchGet_(coll, ids) {
  var out = [];
  for (var i = 0; i < ids.length; i += 100) {
    var names = ids.slice(i, i + 100).map(function (id) { return DOCS + '/' + coll + '/' + id; });
    var res = fsFetch_(BASE + ':batchGet', { method: 'post', payload: JSON.stringify({ documents: names }) }) || [];
    res.forEach(function (r) { if (r.found) out.push(docOut_(r.found)); });
  }
  return out;
}

function indexById_(list) { var o = {}; list.forEach(function (d) { o[d.id] = d; }); return o; }

function patch_(path, fields, mask) {
  mask = mask || Object.keys(fields);
  var url = BASE + '/' + path + '?' + mask.map(function (k) {
    return 'updateMask.fieldPaths=' + k.split('.').map(function (p) { return /^[A-Za-z_][A-Za-z_0-9]*$/.test(p) ? p : '`' + p + '`'; }).join('.');
  }).join('&');
  return fsFetch_(url, { method: 'patch', payload: JSON.stringify({ fields: fields }) });
}

function create_(coll, fields) {
  return fsFetch_(BASE + '/' + coll, { method: 'post', payload: JSON.stringify({ fields: fields }) });
}

function fromFields_(fields) { var o = {}; Object.keys(fields).forEach(function (k) { o[k] = fromValue_(fields[k]); }); return o; }

function fromValue_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromFields_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue_);
  return null;
}
