# @check/deps: JSR Dependency Checker

**Usage**

```bash
deno run -A jsr:@check/deps [options]
```

This will cache the current version locally on subsequent runs. Append the
refresh-flag `-r` to update to the latest version of @check/deps:

```bash
deno run -fA jsr:@check/deps [options]
```

**Options**

- `--help`: Display usage instructions.
- `--cwd  <dir>`: Set the working directory (defaults to current directory).
- `--slim`: Suppress table output for streamlined integration.
- `--ignore-unused`: Don't report on unused packages.

**Example Output**

```
➜  deno run -A jsr:@check/deps

Registry    Package            Specifier    Wanted     Latest                   
jsr         @cross/utils       ^0.2.1       0.2.1      0.7.0      Outdated      
jsr         @std/path          0.220.1      0.220.1    0.220.1    Up-to-date    
jsr         @cross/env         ^0.2.5       0.2.7      1.0.0      Outdated      
npm         diff               5.2.0        5.2.0      5.2.0      Up-to-date    
npm         fast-xml-parser    4.3.5        4.3.5      4.3.6      Outdated      
npm         fflate             0.8.2        0.8.2      0.8.2      Up-to-date    
npm         linkedom           0.16.9       0.16.9     0.16.10    Outdated      
npm         mrmime             2.0.0        2.0.0      2.0.0      Up-to-date   

Updates available.
```

**Project Integration (example)**

Add a script to your `deno.json` for convenience:

```json
"tasks": {
  "check-deps": "deno run -A jsr:@check/deps"
}
```

Then run

```
deno task check-deps
```
