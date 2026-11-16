# Email robot: one-time setup (about 10 minutes)

The email robot is a small Google Apps Script. It runs inside the **aicareerlab077@gmail.com** Google account, wakes up every 30 minutes, and sends the learner emails from that Gmail. Nothing runs on anyone's laptop after setup.

**Who does this:** whoever can sign in to aicareerlab077@gmail.com (your brother in India). Use a computer browser, not a phone.

**Before you start:** the version 3 `firestore.rules` should be published in Firebase (Firestore Database, then Rules, then Publish). The robot itself works without them, but the Emails box on the admin page needs them.

## Steps

1. Sign in to Chrome with **aicareerlab077@gmail.com**, then open **script.google.com**.
2. Click **New project**. Click "Untitled project" at the top and rename it **AI Career Lab emails**.
3. Click the **gear icon (Project Settings)** on the left. Tick **Show "appsscript.json" manifest file in editor**.
4. Click the **< > (Editor)** icon on the left.
   - Click **Code.gs**, select everything, delete it, and paste the whole of `emails/Code.gs`.
   - Click **appsscript.json**, select everything, delete it, and paste the whole of `emails/appsscript.json`.
   - Press **Ctrl + S** to save.
5. At the top, pick **setup** in the function list, then click **Run**.
   - Google asks for permission. Click **Review permissions**, choose aicareerlab077@gmail.com.
   - You'll see "Google hasn't verified this app". That's normal for your own script. Click **Advanced**, then **Go to AI Career Lab emails (unsafe)**, then **Allow**.
   - The log at the bottom should say **"Setup done. Runs every 30 minutes. Firestore OK, N learners found."**
6. Make the unsubscribe page:
   - Click **Deploy**, then **New deployment**. Click the gear next to "Select type" and pick **Web app**.
   - Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and copy the **Web app URL**.
   - Click the **gear icon (Project Settings)**, scroll to **Script properties**, click **Add script property**.
     Property: `WEBAPP_URL`. Value: paste the URL. Click **Save script properties**.
7. Pick **previewAll** in the function list and click **Run**. Five sample emails arrive in the aicareerlab077 inbox (welcome, course, study reminder, "we miss you", new version). Check they look right.

That's it. Within 30 minutes, the admin page's **Emails to learners** box shows a green dot: "Email robot working".

## Good to know

- **Who gets a welcome email:** only people who sign up after step 5. Existing learners don't get a sudden welcome. To tell them about version 3, use the "new version" email on the admin page.
- **Limits:** a free Gmail account can send about 100 emails a day. The robot sends up to 40 per run and always keeps 5 spare. A "new version" email to a big list goes out over a few days.
- **Switch emails on or off:** on the admin page (Emails to learners). Changes apply from the next run.
- **Pause everything:** tick "Pause all emails" on the admin page. To remove the robot completely, run **stopAll** in the script.
- **Unsubscribe:** every email has a link. After a click, that learner gets no more emails.
- **If an older "reminder" script was set up earlier** (from 13 Nov), open it and run **stopDaily** so learners don't get two reminders.
- **New YouTube videos:** the emails show a video picture when a lesson has a video. When videos are added to the site, Claude also updates the `VIDEOS` list at the top of Code.gs. Paste the new Code.gs the same way as step 4 (no need to run setup again).
- **Test without sending:** run **dryRun**. The log lists who would get an email right now, and nothing is sent.
