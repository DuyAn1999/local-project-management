# UI/UX specification

Working product name: **Local Projects**. Goal: get from a folder of repositories to a running project with clear commands and useful feedback. The design direction is approved; CP01 provides the desktop foundation, while the full interface below begins in CP02. Delivery is tracked in [Implementation checkpoints](IMPLEMENTATION_CHECKPOINTS.md).

## Information architecture

Use a desktop master/detail layout with three regions:

1. Folder sidebar: All projects, Running, saved scan roots, Add folder, scan status.
2. Project browser: project count, search by name/path, language filter, project rows with language, relative path and explicit process state.
3. Project detail: full path, language/runtime evidence, commands, selected run output and stop action.

Avoid unrelated metrics, activity charts or a separate dashboard. The home view is the project browser. Keep discovery status, runtime availability and process state distinct: a detected project is not necessarily runnable, and a live process is not necessarily a ready web server.

## Primary flows

### First use and scanning

Show “Your projects, in one place” with “Choose a folder to find projects and their run commands” and a primary Add folder action. The native folder picker opens only from that action. Cancellation returns to the same view. After selection, scan and reveal results progressively; show “Scanning · 124 folders checked · 6 projects found” with Cancel. Do not show a percentage without a known total.

On completion show the result count and last scanned time. Warnings open an inline list of affected paths and reasons. Rescan preserves the current selection and cached list. Root removal only removes the folder from this app; it never deletes files. If it owns active runs, require those runs to be stopped or keep them visible until they end.

### Find a project

Search matches project names and paths. A language selector and Running navigation refine the list; counts reflect the current scope. Each row shows a name, relative path, language labels and text status. Use native buttons for selection with an accessible selected state. Preserve selection while filtering when visible; otherwise select the first match and clearly update the details. Zero matches has a Clear filters action.

### Inspect and run

Selecting a project shows its full path and available scripts. Each script row contains its original name, actual invocation and Run button. Expansion reveals the script body and any pre/post hooks. Avoid putting a Run icon on project rows: the user should see what will execute.

First Run opens an inline review panel with the command, directory, body and hooks. Copy: “Run scripts from this project? Scripts can change files and start other programs.” Actions: Cancel / Allow and run. Remember this decision for the unchanged project/runtime configuration. Later runs start directly. Changed manifest content returns to review.

While starting, show Starting and disable duplicate launches. Once the process exists show Running and Stop in the output header; keep the relevant project row in sync. Disable other scripts in this project while its run is active, with “Stop the current run first.” Other projects may run independently.

### Read output and stop

Output sits below commands, labeled by script and state. Include timestamp/duration, stdout/stderr, exit code on completion and a bounded output buffer. Use monospace text and preserve whitespace; wrap long lines by default. In the implemented desktop app, use a scrollable log pane with auto-follow that pauses when the user scrolls upward and a Jump to latest action.

Stop changes to Stopping, then Stopped after child-process cleanup. A normal exit shows Completed; an error shows Failed with the actual exit code and output. Keep previous output until the next run. Closing the app with active runs offers Cancel / Stop and quit.

## States and recovery

| State | Message or visual | Recovery |
| --- | --- | --- |
| No saved folder | “Your projects, in one place” | Add folder |
| Scanning | Counts, incremental rows, scanning label | Cancel |
| Scan cancelled | “Scan stopped. Results may be incomplete.” | Rescan |
| No projects | “No supported projects found in this folder.” | Choose another folder / adjust exclusions |
| Partial scan | “Some folders could not be read.” | Show paths and retry |
| Removed root | “This folder is no longer available.” | Locate folder / remove from list |
| Invalid manifest | “Could not read package.json.” | Show parse reason; rescan after correction |
| No scripts | “No scripts defined in package.json.” | Explain scripts discovery; do not invent Run |
| Detection-only ecosystem | “Python project detected. Run support is coming later.” | Show detection evidence |
| Missing executable | “pnpm was not found.” | Configure runtime path / recheck |
| Manager conflict | “Choose a package manager for this project.” | Show evidence and explicit choices |
| Run failed | Failed label, exit code, retained output | Retry after correction |
| High-volume output | “Earlier output was omitted.” | Keep newest bounded lines |

## Visual direction

Calm desktop utility: neutral surfaces, a restrained blue accent, strong content alignment and compact controls. Use text labels alongside status dots. Language labels stay neutral rather than giving every project a competing color. Avoid gradients, large decorative cards and marketing-style spacing.

| Token | Specification |
| --- | --- |
| Font | System sans for navigation/content; system monospace for commands, paths and output |
| Type | Body 14 px, supporting text 12 px, view title 24 px, project title 20 px |
| Spacing | 4 px base; 8, 12, 16, 24, 32 px increments |
| Radius | 8 px controls; 10 px selected project row |
| Light surfaces | Canvas #ffffff, sidebar #f5f6f8, inset #f8f9fb |
| Dark surfaces | Canvas #181b21, sidebar #14171c, inset #20242c |
| Text | Light #20242c / secondary #606977; dark #eef1f5 / secondary #aeb6c4 |
| Accent | Light #2859c5, dark #9ab8ff; subtle selected surface with clear text |
| Status | Green Running, red Failed, neutral Idle/Stopped; every status also has text |
| Borders | Light #dfe3e9; dark #353c47, 1 px dividers |

Follow system light/dark appearance. The interactive concept offers comfortable/compact density and blue/violet accent alternatives; these are design exploration controls, not proposed MVP settings.

## Layout and accessibility

- At 1,200 px and wider: roughly 200 px folder navigation, 340 px project browser, remaining width for details. At 900–1,199 px: approximately 164 / 280 / remaining.
- Below 900 px collapse folder navigation to a wrapping strip. Below 700 px stack project browser and details; keep actions usable at 320 px. A production desktop build can set a practical minimum window size after usability testing.
- Use native labels, inputs and buttons, visible keyboard focus, semantic regions and headings. All actions work without hover. Avoid clickable nonsemantic rows.
- Minimum 44 px touch targets where relevant; preserve usable keyboard and pointer targets in compact mode. Verify WCAG AA contrast in both themes during implementation.
- Cmd/Ctrl+F focuses project search. Escape closes a review panel and restores focus to its trigger. Do not bind a global key to run code accidentally.
- Announce scan completion and run state changes with polite live regions, not every log line. Errors that block a requested action are alerts. Move focus into command review and back predictably.
- Long names/paths wrap or expose their complete text through selectable details. Never hide the only distinguishing part of similarly named projects.
- Respect reduced motion. Use no animation for initial loading; brief state transitions are optional.

## Prototype scope

The interactive concept in the conversation uses fictional sample projects. It demonstrates selecting projects, name/path search, language and running filters, a simulated folder scan, first-run command review, running/stopping a development command, completion of short scripts, and the detection-only state for Python/Rust.

It reads no local projects and executes no commands. Native dialogs, actual streaming output, runtime configuration, packaging and filesystem integration belong to implementation. The written states above cover the remaining screens needed for the product.

## Usability acceptance

With only keyboard input, a first-time user can add a folder, find a project, identify the command and directory, approve its first run, read output and stop it. A user should be able to explain why a project cannot run from the visible state without consulting documentation.
