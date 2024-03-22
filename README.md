# @check/deps: JSR Dependency Checker

**Usage**

```bash
deno run -A jsr:@check/deps [options]
```

**Options**

- `--help`: Display usage instructions.
- `--cwd  <dir>`: Set the working directory (defaults to current directory).
- `--slim`: Suppress table output for streamlined integration.
- `--ignore-unused`: Don't report on unused packages.

**Example Output**

```
Package         Specifier    Wanted     Latest               
@cross/test     ^0.0.8       0.0.8      0.0.8      Unused    
@cross/utils    ^0.7.0       0.7.0      0.7.0      OK        
@std/jsonc      ^0.220.1     0.220.1    0.220.1    OK        
@std/path       ^0.220.1     0.220.1    0.220.1    OK        
@std/semver     ^0.220.1     0.220.1    0.220.1    OK        

Unused packages found.
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
