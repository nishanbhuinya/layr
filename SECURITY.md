# Security

## Supported versions

| Version | Supported |
|---|---|
| 3.x (npm `latest`) | Yes: fixes are released as patch versions |
| 1.x (npm `v1`) | Stays installable for existing projects; no new features |

## Report a vulnerability

Report it privately through GitHub: **Security → Report a vulnerability** on this repository. Please do not open a public issue, discussion or pull request for it.

Include what is affected (the compiler, the runtime, the CLI, the website), the version, and the smallest input that shows the problem.

You will get a reply within a week. Fixes are released as a patch version and noted in the [changelog](CHANGELOG.md), with credit to the reporter unless you prefer otherwise.

## Releases

Packages are published from GitHub Actions through npm trusted publishing, with provenance: each version on npm links to the workflow run and the commit it was built from. No long-lived npm tokens exist for this repository.
