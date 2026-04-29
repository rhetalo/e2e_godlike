import { test, expect } from "@playwright/test";
import fs from "fs";

const BASE_URL = "https://www.leapers.com";

// список MPN
const mpns = [
  "PVC-KIS38B2",
  "PVC-PC01B",
  "PVC-PC02B",
  "PVC-H178B",
  "PVC-H270B",
  "PVC-H178BL",
  "PVC-H288B",
  "TL-BP69S",
  "MNT-P501",
  "MNT-P503",
  "MNT-P505",
  "RGPM-25H4",
  "RGPM-25M4",
  "RGPM-30H4",
  "RGPM2PA-25H4",
  "RGPM2PA-25M4",
  "RGPM2PA-30M4",
  "RGPMOFS38-25H4",
  "RGWM-25H4",
  "RGWM-25L2",
  "RGWM-25M4",
  "RGWM-30H4",
  "RGWM-30M4",
  "SCP-RD40RGW-A",
  "TL-QDSW18",
  "TL-EX223",
  "MNT-RM700",
  "RGWM-30L4",
  "SCP-LS268",
  "TL-BP28S",
  "MNT-RM700S",
  "TL-BP78",
  "TL-BP88",
  "TL-SWMTP01",
  "RGPM-30M4",
  "TL-QDSW08A",
  "MNT-RS08S3",
  "PVC-B950-A",
  "RG2W1104",
  "RG2W1154",
  "RG2W1204",
  "RG2W3104",
  "RG2W3154",
  "RG2W3224",
  "RQ2W1154",
  "RQ2W1204",
  "MTU009",
  "SCP-DS3039W",
  "SCP-DS3840W",
  "TL-QDSW08B",
  "TL-QDSW08C",
  "PVC-DC42B-A",
  "TL-BPAD1",
  "SCP3-U416AOIEW",
  "SCP-M4CR5WQ",
  "SCP-LS279",
  "PVC-PC380",
  "PVC-PSP30BN",
  "PVC-PSP34BG",
  "PVC-PSP34BN",
  "MTU016",
  "TL-BP98Q",
  "TL-BP99Q",
  "SCP-LS200",
  "TL-BP78Q",
  "TL-BP08S-A",
  "TL-BP88Q",
  "LT-ELP28R",
  "MTU020SSA",
  "RB-HP12B-B",
  "MTURS04M",
  "MTURS04S",
  "SCP-MF3WEQS",
  "TLURS001",
  "RG-MF30QS",
  "TL-SWPK01",
  "SCP-LS289S",
  "TL-SWPM01",
  "TL-HS02B",
  "LT-EL700",
  "LT-ELP38Q-A",
  "PVC-PC05B",
  "TLUSW001",
  "RBUS2BM",
  "RBUS2DM",
  "RBUS2BMS",
  "MT-RSX1L",
  "MT-RSX1S",
  "MT-RSX5L",
  "MT-RSX7S",
  "MT-RSX8S",
  "LT-ELP123R-A",
  "TL-EX308",
  "RWU012510",
  "RWU012515",
  "RWU012520",
  "RWU013015",
  "RWU013022",
  "RWU013415",
  "PVC-P365B",
  "RWU013010",
  "RWU013420",
  "TLUSW002",
  "MT-RSX20MOA",
  "LT-ELP39Q-A",
  "MNT-EL228GPQ-A",
  "MT-RSX5S",
  "MT-RSX7L",
  "MT-RSX8L",
  "TL-BP20Q-A",
  "TLU006",
  "LT-EL223HL-A",
  "TL-BPDM01",
  "RG-FL27KC",
  "RG-FL27MC",
  "TLU008",
  "SCP-M312AOWQ",
  "MT-RMRXS",
  "AIR11834",
  "AIR11850",
  "AIR32234",
  "AIR42250",
  "AIR31834",
  "AIR31850",
  "AIR12250",
  "AIR32250",
  "TLU008-KIT",
  "TLU009-KIT",
  "RDU012520",
  "RDU012515",
  "RDU013022",
  "RDU013010",
  "RDU013015",
  "AIR11834AB",
  "AIR11834AR",
  "AIR11850AR",
  "AIR12234AR",
  "AIR12250AB",
  "AIR31834AB",
  "AIR31834AR",
  "AIR31850AB",
  "AIR31850AR",
  "AIR32234AR",
  "AIR32250AB",
  "AIR322SAR",
  "AIR42250AB",
  "MT-750X",
  "MT-754X",
  "PUBGL01",
  "PUBGL01B",
  "PUBGL02",
  "PUBGL02B",
  "PUBGL02Z",
  "PUBHK01Z",
  "PUBSI01B",
  "PUBSI01R",
  "PUBSI01Z",
  "RB-T6BFH3",
  "RDM-20AC",
  "SCP-M312AOD",
  "TL-HSK01",
  "TL-HSK01B",
  "TL-HSK01R",
  "TL-HSM01",
  "TL-HSM01B",
  "MT-T1AC",
  "MT-AFGK01",
  "MT-AFGK01B",
  "MT-AFGK01R",
  "MT-AFGM01",
  "MT-AFGM01B",
  "MT-AFGM01R",
  "TL-TRK01B",
  "TL-TRK01R",
  "TL-TRM01",
  "TL-TRM01B",
  "TL-TRM01R",
  "PVC-PSP34B",
  "MT-FGK01",
  "MT-FGM01",
  "MNT-DG02Q",
  "MT-RMR45",
  "RDM-2045",
  "MT-T113C",
  "RB-HP30M",
  "TL-ARDR01",
  "LT-ELP120R",
  "MT-AFGP01",
  "MT-FGP01",
  "LT-ELEDC01",
  "MT-EL223GX",
  "OP3-GM3124UMOA",
  "OP3-GM4164UMOA",
  "SCP-LS279S-A",
  "RBT-TKSDC",
  "PVC-MC25B-A",
  "PVC-P836GM",
  "OP3-G1563CRWQ",
  "TL-QDSW38",
  "MT-MB590",
  "MT-MB590M",
  "TL-BPDM03",
  "MT-FGM01X",
  "TLUBP02M-A",
  "TLUBP02-A",
  "MT-FGP01X",
  "TL-BPDM04",
  "TL-BPOB01-A",
  "PVC-KIS28B",
  "OP-RDM20G",
  "TLUBP01M",
  "TLUBP01",
  "RB-FGM01",
  "TL-BPFS01-A",
  "TLT-CSCH01B",
  "TLT-CSSLT01B",
  "TLUFS55",
  "OP-RDM20CT",
  "TLURS55",
  "TLT-CSSLT01R",
  "TLT-CSSLT01",
  "OP-RDM20CTS",
  "TLT-CSCH01",
  "TLT-CSCH01R",
  "MT-ZAK01",
  "MT-UAK01",
  "MT-MP45",
  "TLT-A2KT",
  "MTU050SSM",
  "MTU053SSM",
  "RBUS5BMS-A",
  "RBT-APG01B",
  "TLUMD03",
  "AQR422",
  "AQR322",
  "AQR420",
  "AQR115",
  "AQR110",
  "AQR432",
  "AIR12250Q",
  "AIR11850Q",
  "AQR310",
  "AQR120",
  "AIR32250Q",
  "AIR42270Q",
  "AQR415",
  "AQR315",
  "AIR11834Q",
  "AIR32234Q",
  "OP-RMR20CTS",
  "OP-RMR20R",
  "OP-DS2521R",
  "MTU055SSM",
  "MTU055SSMK",
  "MT-950X",
  "PVC-MC34B-A",
  "TL-BP03-B",
  "FUR001",
  "TL-BPM03-B",
  "TL-BP02-B",
  "TL-BPM02-B",
  "TL-BP01-B",
  "PVC-MC32B-A",
  "OP-DS2018R",
  "TL-BPM01-B",
  "MTURS11",
  "TL-BPAD2",
  "TLUMA02",
  "TLUMA01",
  "TLUMA03",
  "TLUMA04",
  "RBU47FS01",
  "AIR340MOA",
  "AIR330MOA",
  "AIR420MOA",
  "AIR320MOA",
  "AIR440MOA",
  "AIR430MOA",
  "MTU056",
  "MTU058SSM",
  "MTU055SSME",
  "TL-BPFS03Q",
  "TL-BPFS02Q",
  "RWU013408",
  "RBU47FS02"
];

type ResultRow = {
  mpn: string;
  productUrl: string;
  accessoryUrl: string;
};

const results: ResultRow[] = [];

test("Leapers MPN parser", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  for (const mpn of mpns) {
    console.log(`\n===== MPN: ${mpn} =====`);

    try {
      // ---------------- OPEN SITE ----------------
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

      // ---------------- OPEN SEARCH ----------------
      const searchWrap = page.locator(".search-input-wrap");
      await searchWrap.click();

      const searchInput = page.locator("#search");
      await searchInput.fill(mpn);
      await searchInput.press("Enter");

      // ---------------- WAIT RESULTS ----------------
      await page.waitForLoadState("domcontentloaded");

      const productCard = page
        .locator(".product-item")
        .filter({ hasText: mpn })
        .first();

      await expect(productCard).toBeVisible({ timeout: 30000 });

      const sku = await productCard.locator(".product-item-sku span").textContent();
      console.log(`[FOUND SKU] ${sku}`);

      const productUrl =
        (await productCard.locator("a.product-item-link").first().getAttribute("href")) ||
        "";

      console.log(`[PRODUCT URL] ${productUrl}`);

      // ---------------- OPEN PRODUCT ----------------
      await page.goto(productUrl, { waitUntil: "domcontentloaded" });

      // ---------------- ACCESSORIES ----------------
      const accessoryItems = page.locator(
        "ol.products.list.items.product-items li.item.product"
      );

      const count = await accessoryItems.count();
      console.log(`[ACCESSORIES FOUND] ${count}`);

      for (let i = 0; i < count; i++) {
        try {
          const item = accessoryItems.nth(i);
          const link = await item.locator("a").first().getAttribute("href", { timeout: 5000 });
          if (!link) continue;

          results.push({ mpn, productUrl, accessoryUrl: link });
          console.log(`[ACCESSORY] ${link}`);
        } catch (e) {
          console.log(`[ACCESSORY SKIPPED] item ${i} — ${(e as Error).message}`);
        }
      }
    } catch (e) {
      console.log(`[SKIPPED] ${mpn} — not found or error: ${(e as Error).message}`);
    }
  }

  // ---------------- SAVE FILE ----------------
  const csv = [
    "MPN,Product URL,Accessory URL",
    ...results.map(
      (r) => `${r.mpn},${r.productUrl},${r.accessoryUrl}`
    ),
  ].join("\n");

  fs.writeFileSync("leapers-results.csv", csv);

  console.log("\n===== DONE. FILE SAVED =====");
});