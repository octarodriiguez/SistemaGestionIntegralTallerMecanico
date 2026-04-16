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

  // Local: use real Chrome (visible) to bypass reCAPTCHA
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: false,
    channel: "chrome",   // uses the real installed Chrome with its profile/cookies
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
    slowMo: 100, // slight delay so the page JS has time to register events
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
    await page.click("#dominio");
    await page.fill("#dominio", normalizedDomain);
    // Dispatch the same events the working browser script uses
    await page.evaluate((domain: string) => {
      const campo = document.getElementById("dominio") as HTMLInputElement;
      if (!campo) return;
      campo.value = domain;
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("keyup", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    }, normalizedDomain);
    await page.waitForTimeout(300);
    await page.click("#consulta-op");
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => null);
    await page.waitForTimeout(2000);
    await page.waitForSelector("tbody tr", { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(2000);

    // Log raw HTML to diagnose what Playwright actually sees
    const tbodyHtml = await page.$eval("tbody", (el: Element) => el.innerHTML).catch(() => "NO_TBODY");
    console.log(`[ENARGAS] dominio=${normalizedDomain} tbodyHTML=${tbodyHtml.slice(0, 800)}`);

    // Log full page HTML to see what's actually there
    const allTables = await page.$$eval("table", (els: Element[]) => els.map(el => el.outerHTML.slice(0, 200))).catch(() => []);
    console.log(`[ENARGAS] dominio=${normalizedDomain} tables=${JSON.stringify(allTables)}`);
    const pageTitle = await page.title().catch(() => "");
    const pageUrl = page.url();
    console.log(`[ENARGAS] dominio=${normalizedDomain} url=${pageUrl} title=${pageTitle}`);
    // Dump visible text of the whole page (first 1000 chars)
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 1000) ?? "NO_BODY").catch(() => "ERR");
    console.log(`[ENARGAS] dominio=${normalizedDomain} bodyText=${bodyText}`);

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
