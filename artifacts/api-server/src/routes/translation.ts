import { Router, type IRouter } from "express";
import {
  TranslateTextBody,
  TranslateTextResponse,
} from "@workspace/api-zod";
import {
  LIBRETRANSLATE_BASE_URL,
  waitForLibreTranslate,
} from "../lib/libretranslate";

const router: IRouter = Router();

const SUPPORTED_LANGUAGES = new Set([
  "en",
  "de",
  "es",
  "vi",
  "zh",
  "zh-CN",
  "zh-TW",
  "tl",
]);

type LibreTranslateResponse = {
  translatedText?: unknown;
  detectedLanguage?:
    | {
        language?: unknown;
      }
    | Array<{
        language?: unknown;
      }>;
};

function toLibreTranslateLanguage(language: string): string {
  return language === "zh" || language === "zh-CN" ? "zh-Hans" : language;
}

async function translateTraditionalChinese(
  text: string[],
  sourceLanguage?: string,
): Promise<{ translatedText: string[]; detectedSourceLanguage: string | null }> {
  const { openai } = await import("@workspace/integrations-openai-ai-server");
  const response = await Promise.race([
    openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Translate each input string into natural Traditional Chinese used in Taiwan. Return JSON only in the shape {\"translations\":[\"...\"]}. Preserve the number and order of strings, punctuation, and any placeholders. Do not add explanations.",
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceLanguage: sourceLanguage ?? "auto",
            targetLanguage: "zh-TW",
            text,
          }),
        },
      ],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Traditional Chinese translation timed out.")), 30_000),
    ),
  ]);
  const content = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as { translations?: unknown };
  const translations = parsed.translations;
  if (
    !Array.isArray(translations) ||
    translations.length !== text.length ||
    translations.some((translation) => typeof translation !== "string")
  ) {
    throw new Error("Traditional Chinese translation returned an unexpected response.");
  }

  return {
    translatedText: translations,
    detectedSourceLanguage: sourceLanguage ?? null,
  };
}

function getDetectedLanguage(payload: LibreTranslateResponse): string | null {
  const detected = Array.isArray(payload.detectedLanguage)
    ? payload.detectedLanguage[0]
    : payload.detectedLanguage;

  return typeof detected?.language === "string" ? detected.language : null;
}

router.post("/translate", async (req, res) => {
  const input = TranslateTextBody.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({ error: "Invalid translation request." });
    return;
  }

  const { text, targetLanguage, sourceLanguage } = input.data;

  if (
    !SUPPORTED_LANGUAGES.has(targetLanguage) ||
    (sourceLanguage && !SUPPORTED_LANGUAGES.has(sourceLanguage))
  ) {
    res.status(400).json({ error: "Unsupported language." });
    return;
  }

  if (sourceLanguage === targetLanguage) {
    const result = TranslateTextResponse.parse({
      translatedText: text,
      detectedSourceLanguage: sourceLanguage,
    });
    res.json(result);
    return;
  }

  if (targetLanguage === "zh-TW") {
    try {
      res.json(
        TranslateTextResponse.parse(
          await translateTraditionalChinese(text, sourceLanguage),
        ),
      );
    } catch (error) {
      req.log.error(
        { err: error },
        "Traditional Chinese translation request failed",
      );
      res.status(502).json({
        error: "Traditional Chinese translation is temporarily unavailable.",
      });
    }
    return;
  }

  const isReady = await waitForLibreTranslate(5_000);

  if (!isReady) {
    req.log.error("LibreTranslate did not become ready before the request timeout");
    res.status(503).json({
      error: "Translation is still starting. Please try again shortly.",
    });
    return;
  }

  try {
    const response = await fetch(`${LIBRETRANSLATE_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage
          ? toLibreTranslateLanguage(sourceLanguage)
          : "auto",
        target: toLibreTranslateLanguage(targetLanguage),
        format: "text",
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      req.log.error(
        { providerStatus: response.status },
        "LibreTranslate request failed",
      );
      res.status(502).json({ error: "Translation service returned an error." });
      return;
    }

    const payload = (await response.json()) as LibreTranslateResponse;
    const translatedText = payload.translatedText;

    if (
      !Array.isArray(translatedText) ||
      translatedText.length !== text.length ||
      translatedText.some((translation) => typeof translation !== "string")
    ) {
      req.log.error("LibreTranslate returned an unexpected response");
      res.status(502).json({
        error: "Translation service returned an invalid response.",
      });
      return;
    }

    const result = TranslateTextResponse.parse({
      translatedText,
      detectedSourceLanguage:
        sourceLanguage ?? getDetectedLanguage(payload),
    });

    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "LibreTranslate request failed");
    res.status(502).json({ error: "Translation is temporarily unavailable." });
  }
});

export default router;