# @check/deps: JSR Dependency Checker

Simple tool to check `deno.json`, `deno.jsonc`, `jsr.json` or `jsr.jsonc` for
outdated dependencies.

Currently supports dependencies hosted at jsr, npm or deno.land/x.

## Command Line Usage

```bash
deno run -A jsr:@check/deps [options]
```

> [!IMPORTANT] 
> Replace `-A` (all permissions) with
> `--allow-read=. --allow-net=jsr.io,registry.npmjs.org` to make full use of
> Deno's security model:
>
> ```bash
> deno run --allow-read=. --allow-net=jsr.io,registry.npmjs.org jsr:@check/deps
> ```

> [!TIP] 
> This will cache the current version locally on subsequent runs. Append
> the refresh-flag `-r` to update to the latest version of @check/deps:
>
> ```bash
> deno run -rA jsr:@check/deps [options]
> ```

> [!TIP] 
> You can install check/deps as a command, below using minimum
> permissions and the cli name `check-deps`
>
> ```bash
> deno install -n check-deps -r --allow-read=. --allow-net=jsr.io,registry.npmjs.org jsr:@check/deps jsr:@check/deps
> ```
>
> Now you can run `check-deps` directly at the command line.

### Options

- `--help`: Display usage instructions.
- `--target  <dir>`: Set the target project path (defaults to current
  directory).
- `--slim`: Suppress table output for streamlined integration.
- `--allow-unused`: Don't report on unused packages.
- `--pre-release`: Treat latest (accoring to semver) pre-release as the wanted version.

### Example Output

```
➜  deno run -A jsr:@check/deps

Package                      Wanted     Latest                    
jsr:@cross/utils@^0.2.1      0.2.1      0.7.0      Outdated       
jsr:@std/path@0.220.1        0.220.1    0.220.1    Up-to-date     
jsr:@cross/env@^0.2.5        0.2.7      1.0.0      Outdated       
npm:diff@5.2.0               5.2.0      5.2.0      Up-to-date     
npm:fast-xml-parser@4.3.5    4.3.5      4.3.6      Outdated       
npm:fflate@0.8.2             0.8.2      0.8.2      Up-to-date     
npm:linkedom@0.16.9          0.16.9     0.16.10    Outdated       
npm:mrmime@2.0.0             2.0.0      2.0.0      Up-to-date   

Updates available.
```

## Usage with Deno Tasks

To check your dependencies with a Deno Task, such as `deno task check-deps`,
modify your deno.json as outlined below:

```json
"tasks": {
  "check-deps": "deno run -A jsr:@check/deps"
}
```

## Usage with GitHub Actions

To check JSR dependencies automatically using a GitHub action, add one of the
following steps to your existing Deno workflow:

Check and display a warning if dependencies are out of date, but let the
workflow complete successfully.

```yaml
- name: Check Dependencies
  continue-on-error: true
  run: deno run -A jsr:@check/deps || echo "::warning title=Dependency Check::Some of the dependencies are out of date, please check."
```

Check and make the workflow fail if dependencies are out of date.

```yaml
- name: Check Dependencies
  run: deno run -A jsr:@check/deps
```

Full example, failing on oudated dependencies:

```yaml
name: Deno CI

on: 
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Setup repo
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Run linter
        run: deno lint

      - name: Check Dependencies
        run: deno run -A jsr:@check/deps
```
