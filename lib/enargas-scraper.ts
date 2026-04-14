const ENARGAS_URL =
  "https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php";

const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

export type EnargasScrapeResult = {
  domain: string;
  lastOperationDate: string | null;
  source: "ENARGAS";
  error?: string;
};

type BrowserInstance = {
  newPage: (options?: Record<string, unknown>) => Promise<any>;
  close: () => Promise<void>;
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

async function launchBrowser(): Promise<BrowserInstance> {
  const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_EXECUTION_ENV);

  if (isServerlessRuntime) {
    const [{ chromium: playwrightChromium }, chromiumModule] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium"),
    ]);

    const chromium = (chromiumModule as any).default ?? chromiumModule;
    const executablePath = await chromium.executablePath();

    return playwrightChromium.launch({
      headless: chromium.headless,
      executablePath,
      args: chromium.args,
    });
  }

  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
}

export async function fetchEnargasLastOperationDate(
  domain: string,
): Promise<EnargasScrapeResult> {
  const normalizedDomain = normalizeDomain(domain);
  let browser: BrowserInstance | null = null;

  try {
    browser = await launchBrowser();
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
    await page.waitForTimeout(2000);

    // The date is inside span.tablesaw-cell-content within each td, not directly in td text
    const cellTexts: string[] = await page.$$eval(
      "tbody tr td span.tablesaw-cell-content",
      (nodes: Element[]) => nodes.map((node: Element) => (node as HTMLElement).innerText?.trim() ?? node.textContent?.trim() ?? ""),
    ).catch(() => []);

    const extractedFromCells = cellTexts.flatMap((value: string) => extractDateMatches(value));
    const parsedDates = extractedFromCells
      .filter((value: string) => DATE_REGEX.test(value))
      .map((value: string) => ({ value, date: parseDateValue(value) }));

    if (parsedDates.length === 0) {
      // Fallback: try td text content directly (in case tablesaw is not used)
      const tdTexts: string[] = await page.$$eval(
        "tbody tr td",
        (nodes: Element[]) => nodes.map((node: Element) => (node as HTMLElement).innerText?.trim() ?? node.textContent?.trim() ?? ""),
      ).catch(() => []);

      const fallbackDates = tdTexts
        .flatMap((value: string) => extractDateMatches(value))
        .filter((value: string) => DATE_REGEX.test(value))
        .map((value: string) => ({ value, date: parseDateValue(value) }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      if (fallbackDates.length > 0) {
        console.log(`[ENARGAS] dominio=${normalizedDomain} fecha=${fallbackDates[0].value} fuente=td-fallback`);
        return {
          domain: normalizedDomain,
          lastOperationDate: fallbackDates[0].value,
          source: "ENARGAS",
        };
      }

      const tableRowsText = await page.$$eval("tbody tr", (rows: Element[]) =>
        rows
          .map((row: Element) => (row as HTMLElement).innerText?.replace(/\s+/g, " ").trim() ?? "")
          .filter(Boolean)
          .slice(0, 6),
      ).catch(() => []);

      console.log(
        `[ENARGAS] dominio=${normalizedDomain} fecha=NO_ENCONTRADA spans=${cellTexts.length} tds=${tdTexts.length}`,
      );
      if (tableRowsText.length > 0) {
        console.log(`[ENARGAS] dominio=${normalizedDomain} filasTexto=${JSON.stringify(tableRowsText)}`);
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
