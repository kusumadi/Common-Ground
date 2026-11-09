# Common Ground

A standalone Mastertech prototype for multilingual learning by teaching. The name refers to the shared understanding students and lecturers build across languages, and to the garden in the demo. A student corrects an apprentice, observes it apply the explanation, connects the reasoning to an English course term, and solves a fresh question. The lecturer view summarises only explicitly submitted attempts.

## Run

Use Python 3. From this directory run:

```sh
python server.py
```

On systems where the executable is named `python3`, run `python3 server.py`. Open http://127.0.0.1:8000. No packages, accounts, or external services are required for the default demo.

### Optional local AI

Run Ollama locally and have a local model downloaded. Set `TEACH_AI_LOCAL_MODEL` to that model name and start the server in the same terminal. Example in PowerShell:

```powershell
$env:TEACH_AI_LOCAL_MODEL = "your-installed-model-name"
python server.py
```

The backend sends the explanation and rubric to Ollama at `127.0.0.1:11434`. A local model classifies the reasoning. Fixed apprentice examples and independent answer checks make the lesson behaviour predictable. If the model is disabled, fails, or takes too long, the demo uses English and Malay phrase matching. The student view labels which mode was used.

## Demo

1. Choose **Try a Malay example**, teach the apprentice, and watch it add the edges of a new garden.
2. Enter **26** for the fresh problem and select **Area** to demonstrate a terminology gap.
3. Open **Lecturer view** before submitting. The attempt is absent. Return to the student view and submit it.
4. Start a new explanation with **Try an area mix-up**. Choose **36** and **Perimeter** for the final question to demonstrate a different pattern. Submit and compare the lecturer results.
5. Select **Clear demo submissions** to reset the browser data.

## Data and future LMS connection

Use fictional data. The demo binds to loopback and stores submitted attempts in this browser only. The role switch is a demonstration, not authentication or a confidentiality boundary. Optional local inference processes drafts before submission. Treat the model runtime and its logs as part of the deployment environment.

The app does not depend on a specific institution or LMS. A future LMS launch can supply authenticated course, role, and user context while reusing the apprentice and lesson flow. Replace browser storage with a backend that enforces access by course, role, and ownership before a real pilot. Keep LMS launch, authorised course content import, and model hosting as separate integrations. Start content import with lecturer-selected materials and approval for each lesson rubric.
