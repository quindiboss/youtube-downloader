const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { buildYtDlpArguments, YT_REGEX } = require("./utils.js");

describe("buildYtDlpArguments", () => {
  it("should build MP3 extraction arguments", () => {
    const args = buildYtDlpArguments("mp3", "downloads/test.mp3");
    assert.ok(args.includes("-x"));
    assert.ok(args.includes("--audio-format"));
    assert.ok(args.includes("mp3"));
    assert.ok(args.includes("--audio-quality"));
    assert.ok(args.includes("192K"));
  });

  it("should build MP4 720p arguments", () => {
    const args = buildYtDlpArguments("mp4-720", "downloads/test.mp4");
    assert.ok(args.includes("--merge-output-format"));
    assert.ok(args.includes("mp4"));
    assert.ok(args.includes("bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]"));
  });

  it("should build MP4 best quality arguments by default", () => {
    const args = buildYtDlpArguments("mp4-best", "downloads/test.mp4");
    assert.ok(args.includes("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"));
  });
});

describe("YT_REGEX", () => {
  it("should accept standard YouTube watch URLs", () => {
    assert.equal(YT_REGEX.test("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  });

  it("should accept short youtu.be URLs", () => {
    assert.equal(YT_REGEX.test("https://youtu.be/dQw4w9WgXcQ"), true);
  });

  it("should reject invalid URLs", () => {
    assert.equal(YT_REGEX.test("https://example.com/video"), false);
  });
});
