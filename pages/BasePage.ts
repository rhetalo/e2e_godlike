import { Page, expect } from '@playwright/test';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PromoModal } from '../components/PromoModal';

export abstract class BasePage {
  readonly page: Page;
  readonly header: Header;
  readonly footer: Footer;
  readonly promoModal: PromoModal;

  protected abstract path: string;

  constructor(page: Page) {
    this.page = page;
    this.header = new Header(page);
    this.footer = new Footer(page);
    this.promoModal = new PromoModal(page);
  }

  async open(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.promoModal.dismissIfVisible();
  }

  async assertLoaded(titleRegex: RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(titleRegex);
    await this.header.assertVisible();
  }
}
