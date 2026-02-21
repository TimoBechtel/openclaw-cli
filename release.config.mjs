export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "npm version ${nextRelease.version} --no-git-tag-version && bun run build:all",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "dist/openclaw-cli-darwin-arm64",
            name: "openclaw-cli-darwin-arm64",
            label: "macOS ARM64",
          },
          {
            path: "dist/openclaw-cli-darwin-x64",
            name: "openclaw-cli-darwin-x64",
            label: "macOS Intel x64",
          },
          {
            path: "dist/openclaw-cli-linux-x64",
            name: "openclaw-cli-linux-x64",
            label: "Linux x64",
          },
          {
            path: "dist/openclaw-cli-windows-x64.exe",
            name: "openclaw-cli-windows-x64.exe",
            label: "Windows x64",
          },
        ],
      },
    ],
  ],
};
