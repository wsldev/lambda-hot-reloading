### Debug vscode
```js
## .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "pwa-node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/build/index.js",
      "outFiles": ["${workspaceFolder}/build/**/*.js"],
      "env": { "NODE_ENV": "development" },
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**"
      ],
      "preLaunchTask": "prepare app to debug",
      "postDebugTask": "clean app after debug"
    }
  ]
}

## .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "group": "build",
      "label": "npm: build - app",
      "detail": "NODE_ENV=development tsc -p ."
    },
    {
      "label": "start db",
      "type": "shell",
      "command": "docker compose up -d"
    },
    {
      "label": "stop db",
      "type": "shell",
      "command": "docker compose down"
    },
    {
      "type": "shell",
      "label": "clean app",
      "command": "rm -rf ./build"
    },
    {
      "label": "prepare app to debug",
      "type": "shell",
      "command": "echo prepare app to debug",
      "dependsOrder": "sequence",
      "dependsOn": ["start db", "npm: build - app"]
    },
    {
      "label": "clean app after debug",
      "type": "shell",
      "command": "echo clean app after debug",
      "dependsOrder": "sequence",
      "dependsOn": ["stop db", "clean app"]
    }
  ]
}
```