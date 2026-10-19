/**
 * fixtures/diagnostics.ts
 * ───────────────────────
 * N1 (RESEARCH_2026-10-16 §3, D-024): auto-фикстура диагностики браузера, REPORT-ONLY.
 *
 * ЧТО ДЕЛАЕТ:
 *   На время теста слушает ВСЕ контексты браузера воркера: console error/warning, необработанные
 *   ошибки страницы (weberror = pageerror), неуспешные запросы (requestfailed) и ответы HTTP >= 400.
 *   Если тест упал (status !== expectedStatus) - прикладывает сводку `browser-diagnostics` в отчёт.
 *   Зелёный тест ничего не прикладывает. Тест фикстура НЕ валит: на проде шумят CookieYes/GTM/Amplitude.
 *
 * ЗАЧЕМ:
 *   Быстро отличить «упал прод» (500 от API, JS-ошибка бандла) от «упал тест» (локатор, гонка).
 *
 * КАК ПОКРЫВАЕТ SERIAL SHARED CONTEXT:
 *   beforeAll выполняется ДО фикстур теста, поэтому общий контекст из beforeAll уже есть в
 *   browser.contexts() - подписываемся на него. Контексты, созданные в теле теста, ловим обёрткой
 *   browser.newContext (снимается в teardown). Дефолтный контекст фикстуры `page` тоже создаётся
 *   через browser.newContext.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   Витрина - уже включено через fixtures/base.ts.
 *   Панели (сейчас `@playwright/test`) - постепенно: `import { test, expect } from "../../../fixtures/diagnostics";`
 *   в новых и правленых спеках (без массовой миграции).
 */
import { test as base, expect, type Browser, type BrowserContext, type ConsoleMessage, type Request, type Response, type WebError } from "@playwright/test";

/** Сколько записей держать: длинный serial-прогон панели не должен раздувать отчёт. */
const MAX_ENTRIES = 200;

type DiagKind = "console" | "pageerror" | "requestfailed" | "http";

interface DiagEntry {
  kind: DiagKind;
  /** мс от старта теста */
  t: number;
  text: string;
}

/** Хост из URL без query: query может нести токены и параметры Amplitude - в отчёт не нужны. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}

class DiagnosticsCollector {
  readonly entries: DiagEntry[] = [];
  private dropped = 0;
  private readonly started = Date.now();
  private readonly detachers: Array<() => void> = [];
  private readonly watched = new Set<BrowserContext>();

  private push(kind: DiagKind, text: string): void {
    if (this.entries.length >= MAX_ENTRIES) {
      this.dropped++;
      return;
    }
    this.entries.push({ kind, t: Date.now() - this.started, text });
  }

  watch(context: BrowserContext): void {
    if (this.watched.has(context)) return;
    this.watched.add(context);

    const onConsole = (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type !== "error" && type !== "warning") return;
      this.push("console", `${type}: ${msg.text()} (${shortUrl(msg.location().url)})`);
    };
    const onWebError = (err: WebError) => {
      const e = err.error();
      this.push("pageerror", `${e.name}: ${e.message}`);
    };
    const onRequestFailed = (req: Request) => {
      this.push("requestfailed", `${req.method()} ${shortUrl(req.url())} - ${req.failure()?.errorText ?? "unknown"}`);
    };
    const onResponse = (resp: Response) => {
      if (resp.status() < 400) return;
      this.push("http", `${resp.status()} ${resp.request().method()} ${shortUrl(resp.url())}`);
    };

    context.on("console", onConsole);
    context.on("weberror", onWebError);
    context.on("requestfailed", onRequestFailed);
    context.on("response", onResponse);
    this.detachers.push(() => {
      context.off("console", onConsole);
      context.off("weberror", onWebError);
      context.off("requestfailed", onRequestFailed);
      context.off("response", onResponse);
    });
  }

  dispose(): void {
    for (const detach of this.detachers) detach();
  }

  /** Текст вложения: счётчики по видам, затем хронология. */
  report(): string {
    const counts = (["pageerror", "http", "requestfailed", "console"] as DiagKind[])
      .map((k) => `${k}=${this.entries.filter((e) => e.kind === k).length}`)
      .join(" ");
    const lines = this.entries.map((e) => `+${(e.t / 1000).toFixed(1)}s [${e.kind}] ${e.text}`);
    const tail = this.dropped ? [`... ещё ${this.dropped} записей отброшено (лимит ${MAX_ENTRIES})`] : [];
    return [
      "REPORT-ONLY (N1): шум сторонних скриптов на проде ожидаем - смотреть на pageerror и http 5xx/4xx своих хостов.",
      counts,
      "",
      ...lines,
      ...tail,
    ].join("\n");
  }
}

export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [
    async ({ browser }: { browser: Browser }, use, testInfo) => {
      const collector = new DiagnosticsCollector();
      for (const ctx of browser.contexts()) collector.watch(ctx);

      // Контексты, созданные во время теста (дефолтный `page`, свои newContext в теле теста).
      const origNewContext = browser.newContext.bind(browser);
      (browser as { newContext: Browser["newContext"] }).newContext = async (...args: Parameters<Browser["newContext"]>) => {
        const ctx = await origNewContext(...args);
        collector.watch(ctx);
        return ctx;
      };

      try {
        await use();
      } finally {
        (browser as { newContext: Browser["newContext"] }).newContext = origNewContext;
        collector.dispose();
      }

      if (testInfo.status !== testInfo.expectedStatus && collector.entries.length > 0) {
        await testInfo.attach("browser-diagnostics", { body: collector.report(), contentType: "text/plain" });
      }
    },
    { auto: true, box: true },
  ],
});

export { expect };
