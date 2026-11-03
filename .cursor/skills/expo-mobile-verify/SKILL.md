---
name: expo-mobile-verify
description: >-
  Verify Expo mobile UI and behavior in a running app with Expo MCP local
  tools. Use when changing screens, navigation, auth flows, or other
  user-visible behavior under mobile/.
---

# Verify the Expo app with Expo MCP

Unit tests cover logic. Visible mobile changes also need a check in a running app. Use the local Expo MCP tools for that. Do not start an EAS Simulator session; those sessions are billed.

## Before checking

1. The Expo MCP server is registered in `.cursor/mcp.json` (`https://mcp.expo.dev/mcp`). The user signs in once in Cursor. `npx expo login` in `mobile/` must be the same Expo account. Do not store tokens in the repo.
2. From the repo root, start the dev server with `make run-mobile`. That sets `EXPO_UNSTABLE_MCP_SERVER=1`. `expo-mcp` is a dev dependency of `mobile/`.
3. Open a simulator from that Expo CLI: `i` on macOS for the iOS Simulator, or `a` for an Android emulator. Local iOS checks need a simulator on macOS. Physical iOS devices are not supported.
4. Reconnect the Expo MCP server after the dev server starts or stops. Local tools appear only after that reconnect.

## What to check

Use the local tools, with `projectRoot` set to the `mobile/` directory:

- `automation_take_screenshot` to see the screen that changed
- `automation_find_view` and `automation_tap` to exercise the interaction. Prefer a React Native `testID` over coordinates, and add a `testID` when the change needs a tap check
- `collect_app_logs` when the screen is wrong or a runtime error is likely

Confirm the behavior that changed. A screenshot of an unrelated screen is not a check.

## Pull request image

Save the screenshot of the changed screen. **work-on-issue** uploads that file on the pull request for every mobile UI change. Do not commit the image.

## When Expo MCP is unavailable

Say that Expo MCP did not check the running app. Do not call `simulator_start` or other EAS Simulator tools. Still open the local simulator, capture the changed screen with `xcrun simctl io booted screenshot screenshot.png` (or the emulator screenshot command), and upload it on the pull request. Run `npm test --workspace=mobile` as well.
