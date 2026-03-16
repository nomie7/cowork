import { Router } from "express";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getProtocolStatus } from "../services/protocols";
import { getSettings } from "../services/data";
import { callTigerBotWithTools } from "../services/tigerbot";

const router = Router();
const AGENTS_DIR = path.resolve("data/agents");

// Ensure agents directory exists
if (!fs.existsSync(AGENTS_DIR)) {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
}

// List all agent YAML configs
router.get("/", (_req, res) => {
  try {
    const files = fs.readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
      .map(f => {
        const content = fs.readFileSync(path.join(AGENTS_DIR, f), "utf8");
        let parsed: any = {};
        try { parsed = yaml.load(content) as any; } catch {}
        return {
          filename: f,
          name: parsed?.system?.name || f.replace(/\.ya?ml$/, ""),
          agentCount: parsed?.agents?.length || 0,
          updatedAt: fs.statSync(path.join(AGENTS_DIR, f)).mtime.toISOString(),
        };
      });
    res.json(files);
  } catch (err: any) {
    res.json([]);
  }
});

// Get a specific agent config
router.get("/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!filename.match(/^[\w\-. ]+\.ya?ml$/)) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const fp = path.join(AGENTS_DIR, filename);
  if (!fs.existsSync(fp)) {
    return res.status(404).json({ error: "File not found" });
  }
  const content = fs.readFileSync(fp, "utf8");
  let parsed: any = {};
  try { parsed = yaml.load(content); } catch {}
  res.json({ filename, content, parsed });
});

// Save agent config (create or update)
router.post("/", (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ error: "filename and content required" });
  }
  const safeName = filename.replace(/[^a-zA-Z0-9_\-. ]/g, "");
  const finalName = safeName.endsWith(".yaml") || safeName.endsWith(".yml")
    ? safeName
    : safeName + ".yaml";

  // Validate YAML
  try {
    yaml.load(content);
  } catch (err: any) {
    return res.status(400).json({ error: `Invalid YAML: ${err.message}` });
  }

  fs.writeFileSync(path.join(AGENTS_DIR, finalName), content, "utf8");
  res.json({ ok: true, filename: finalName });
});

// Delete agent config
router.delete("/:filename", (req, res) => {
  const filename = req.params.filename;
  const fp = path.join(AGENTS_DIR, filename);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
  }
  res.json({ ok: true });
});

// Parse YAML content (utility endpoint)
router.post("/parse", (req, res) => {
  try {
    const parsed = yaml.load(req.body.content);
    res.json({ ok: true, parsed });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Generate YAML from editor data
router.post("/generate", (req, res) => {
  try {
    const data = req.body;
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
    res.json({ ok: true, content: yamlContent });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Generate agent definition using LLM
router.post("/generate-definition", async (req, res) => {
  const { description } = req.body;
  if (!description || typeof description !== "string") {
    return res.status(400).json({ ok: false, error: "description is required" });
  }

  try {
    const result = await callTigerBotWithTools(
      [{ role: "user", content: `Based on this description, generate a JSON object for an agent definition.

Description: ${description}

Return ONLY a valid JSON object (no markdown, no code fences) with these fields:
- "name": string (short agent name)
- "role": one of ["orchestrator", "worker", "checker", "reporter", "researcher"]
- "persona": detailed persona description (2-3 sentences)
- "responsibilities": array of 3-5 responsibility strings

Example:
{"name": "Code Reviewer", "role": "checker", "persona": "You are a meticulous code reviewer who checks for bugs, security issues, and best practices.", "responsibilities": ["Review code for correctness", "Check for security vulnerabilities", "Suggest improvements"]}` }],
      "You are a helpful assistant that generates JSON agent definitions. Return ONLY valid JSON, nothing else. Do not use any tools.",
      undefined,
      undefined,
      undefined,
      [], // no tools
    );

    if (result.content) {
      let jsonStr = result.content.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      try {
        const parsed = JSON.parse(jsonStr);
        res.json({ ok: true, definition: parsed });
      } catch {
        res.json({ ok: false, error: "Failed to parse LLM response", raw: result.content });
      }
    } else {
      res.json({ ok: false, error: "No response from LLM" });
    }
  } catch (err: any) {
    res.json({ ok: false, error: err.message });
  }
});

// Validate model availability by calling the provider's /models endpoint
router.post("/validate-model", async (req, res) => {
  const { model } = req.body;
  if (!model || typeof model !== "string") {
    return res.status(400).json({ ok: false, error: "model is required" });
  }

  const settings = getSettings();
  const apiKey = settings.tigerBotApiKey;
  if (!apiKey) {
    return res.json({ ok: false, error: "API key not configured", available: false });
  }

  const rawUrl = settings.tigerBotApiUrl || "https://api.tigerbot.com/bot-chat/openai/v1/chat/completions";
  // Derive /models endpoint from the API URL
  const modelsUrl = rawUrl.replace(/\/chat\/completions\/?$/, "/models").replace(/\/$/, "");

  try {
    const response = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // If /models endpoint is not available, we can't validate — assume ok
      return res.json({ ok: true, available: true, warning: "Cannot list models from provider, model not validated" });
    }

    const data: any = await response.json();
    const models: string[] = (data.data || data.models || []).map((m: any) => typeof m === "string" ? m : m.id || m.name || "");
    const available = models.some((m: string) => m === model || m.includes(model) || model.includes(m));

    res.json({ ok: true, available, models });
  } catch (err: any) {
    // Network error — can't validate, assume ok
    res.json({ ok: true, available: true, warning: `Could not reach models endpoint: ${err.message}` });
  }
});

// Protocol status endpoint
router.get("/protocols/status", (_req, res) => {
  res.json(getProtocolStatus());
});

export const agentsRouter = router;
