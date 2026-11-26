# Contributing

Thank you for wanting to improve stickyflow.js. This page says how a change finds its way in.

## Before you start

Open an issue first for anything larger than a small fix, and say what you want to change and why. SFL is a language, and a new word or a
changed meaning touches every document written in it, so it is worth agreeing on the idea before the code is written. Small fixes, such as
a wrong value in a drawing or a typo, can come as a pull request right away.

## Making the change

1. Fork the repository and branch off `main`. Name the branch after what it does, such as `fix/radar-legend` or `feat/sankey-labels`.
2. Install with `npm install`.
3. Make the change. `AGENTS.md` holds the rules the code follows, and `CLEAN_CODE_GUIDELINES.md` explains them.
4. Add or change tests for what you changed. A change in rendered SVG shows in the golden files under `test/__golden__/`. Regenerate a
   golden only when the new drawing is the one you meant, and say so in the pull request.
5. Add a line under `[Unreleased]` in `CHANGELOG.md` that says what changed for someone who uses the library.
6. Run `npm run ci`. It runs the linter, the type check, both test suites and the build, the same checks the pull request has to pass.

## Commits and pull requests

Commit messages start with the kind of change and its area, such as `fix(chart): ...`, `feat(sfl): ...` or `docs(readme): ...`, and then
say in plain words what is different now.

Keep a pull request to one change. Describe what it does and why, and link its issue. A maintainer reviews every pull request before it is
merged, and may ask for changes.

## What counts as breaking

While the version is below 1.0.0, breaking changes go into the minor version. A change is breaking when a document that worked before draws
differently or stops working, when the public API changes, or when `DOM_CONTRACT_VERSION` moves. Say so in the pull request, so the release
can be named for it.

## License

stickyflow.js is licensed under the Apache License 2.0. By contributing you agree that your contribution is licensed under it as well, as
section 5 of the license says.

## Security

Do not report a security problem in a public issue. See `SECURITY.md` for how to report it privately.
