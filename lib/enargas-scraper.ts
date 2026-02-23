import { chromium } from "playwright";

const ENARGAS_URL =
  "https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php";

const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

export type EnargasScrapeResult = {
  domain: string;
  lastOperationDate: string | null;
  source: "ENARGAS";
  error?: string;
};

function normalizeDomain(domain: string) {
  return domain.toUpperCase().replace(/\s+/g, "");
}

function parseDateValue(value: string) {
  const [day, month, year] = value.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function extractDateMatches(text: string) {
  return text.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
}

export async function fetchEnargasLastOperationDate(
  domain: string,
): Promise<EnargasScrapeResult> {
  const normalizedDomain = normalizeDomain(domain);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "es-AR",
    });
    await page.goto(ENARGAS_URL, { waitUntil: "domcontentloaded", timeout: 40000 });

    await page.waitForSelector("#dominio", { timeout: 12000 });
    await page.fill("#dominio", normalizedDomain);
    await page.click("#consulta-op");
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => null);
    await page.waitForTimeout(1200);
    await page.waitForSelector("tbody tr", { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(700);

    const dates = await page.$$eval("tbody tr td", (nodes) =>
      nodes.map((node) => (node.textContent || "").trim()),
    );

    const extractedFromCells = dates.flatMap((value) => extractDateMatches(value));
    const parsedDates = extractedFromCells
      .filter((value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value))
      .map((value) => ({ value, date: (() => {
        const [d, m, y] = value.split("/");
        return new Date(Number(y), Number(m) - 1, Number(d));
      })() }));

    if (parsedDates.length === 0) {
      const bodyText = await page.textContent("body").catch(() => "");
      const fallbackMatches = extractDateMatches(bodyText || "");
      const fallbackDates = fallbackMatches
        .map((value) => ({ value, date: parseDateValue(value) }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      if (fallbackDates.length > 0) {
        console.log(
          `[ENARGAS] dominio=${normalizedDomain} fecha=${fallbackDates[0].value} fuente=fallback`,
        );
        return {
          domain: normalizedDomain,
          lastOperationDate: fallbackDates[0].value,
          source: "ENARGAS",
        };
      }

      const tableRowsText = await page.$$eval("tbody tr", (rows) =>
        rows
          .map((row) => (row.textContent || "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .slice(0, 6),
      ).catch(() => []);
      const visibleAlerts = await page.$$eval(
        ".alert, .error, .mensaje, .message, #mensaje, #msg, .text-danger",
        (nodes) =>
          nodes
            .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .slice(0, 6),
      ).catch(() => []);

      console.log(
        `[ENARGAS] dominio=${normalizedDomain} fecha=NO_ENCONTRADA celdas=${dates.length} filas=${tableRowsText.length} fallbackMatches=${fallbackMatches.length}`,
      );
      if (tableRowsText.length > 0) {
        console.log(`[ENARGAS] dominio=${normalizedDomain} filasTexto=${JSON.stringify(tableRowsText)}`);
      }
      if (visibleAlerts.length > 0) {
        console.log(`[ENARGAS] dominio=${normalizedDomain} mensajes=${JSON.stringify(visibleAlerts)}`);
      }
      return {
        domain: normalizedDomain,
        lastOperationDate: null,
        source: "ENARGAS",
      };
    }

    parsedDates.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log(
        `[ENARGAS] dominio=${normalizedDomain} fecha=${parsedDates[0].value} coincidencias=${parsedDates.length}`,
      );
    return {
      domain: normalizedDomain,
      lastOperationDate: parsedDates[0].value,
      source: "ENARGAS",
    };
  } catch (error) {
    console.log(
      `[ENARGAS] dominio=${normalizedDomain} error=${
        error instanceof Error ? error.message : "Error de scraping ENARGAS"
      }`,
    );
    return {
      domain: normalizedDomain,
      lastOperationDate: null,
      source: "ENARGAS",
      error: error instanceof Error ? error.message : "Error de scraping ENARGAS",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export function sameMonthYearFromStrings(
  enargasDate: string | null,
  internalIsoDate: string | null | undefined,
) {
  if (!enargasDate || !internalIsoDate || !DATE_REGEX.test(enargasDate)) return false;
  const enargas = parseDateValue(enargasDate);
  const internal = new Date(internalIsoDate);
  return (
    enargas.getMonth() === internal.getMonth() &&
    enargas.getFullYear() === internal.getFullYear()
  );
}
