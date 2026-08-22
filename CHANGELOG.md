# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Configurable recording destination folder in settings (defaults to the system Videos folder)
- Full screen camera mode (size index 5) showing the video without cropping, with the `5` key shortcut, tray radio item and settings entry

### Fixed

- Webcams connected after the app is already running are now detected automatically (hotplug retries plus polling while the camera is missing); "Try again" re-scans devices in place instead of requiring an app restart
- AudioContext is now closed when a recording fails to start, preventing leaked audio render threads
- A second concurrent start attempt no longer orphans the active MediaRecorder; an in-flight recording is stopped if its page unloads
- A recording whose renderer crashes or reloads is now detected by the main process and the file is finalized instead of leaving ffmpeg waiting forever
- Recording start failures (unwritable destination folder, ffmpeg spawn error) are now reported back to the UI instead of showing a ghost recording session
- If ffmpeg dies mid-recording (e.g. disk full), the camera window stops the session instead of silently dropping chunks
- Guard against IPC chunks arriving after the recording stream has ended (potential main-process crash)

## [1.0.3] - 2026-08-21

### Added

- Full Linux support: AppImage, deb and snap packaging with proper snap permissions (camera, audio-record, network)
- System audio capture on Linux via PulseAudio/PipeWire monitor sources
- Recording settings tab: resolution, FPS, hardware encoder, system/microphone volume and microphone selection
- GitHub Actions CI (typecheck, tests, lint) and tag-triggered release workflows for macOS, Windows and Linux
- IPC allow-lists for settings updates and tray sync; stricter production CSP

### Changed

- Video bitrate now scales with the selected recording resolution (5–24 Mbps)
- Auto-update checks are limited to packaged builds (AppImage on Linux); snap updates via snapd and deb requires manual download
- Permission error overlay uses self-contained styles and respects the app language

### Fixed

- Countdown window now opens in packaged builds
- Language changes from the tray menu propagate to the camera window
- Recording can no longer start twice concurrently (prevents orphan ffmpeg processes)
- Settings writes are debounced on window move; write failures are logged instead of crashing
- Stale device list is no longer persisted across sessions
- Escape cancels shortcut capture in the settings window

## [1.0.2] - 2026-08-16

### Added

- Configurable video encoders with hardware acceleration detection (VideoToolbox, NVENC, AMF, QSV)
- Audio mixing with independent system/microphone volume controls
- Microphone selection for recordings
- Sidebar window layout

### Fixed

- Login item settings disabled on macOS startup

## [1.0.1] - 2026-08-12

### Added

- Visual customization: shape, rounding, gradient border with cross-fade animation
- Border width adjustment

## [1.0.0]

### Added

- Initial release: picture-in-picture camera overlay, screen recording, tray menu, global shortcuts and auto-update
