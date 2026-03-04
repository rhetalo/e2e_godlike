import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://godlike.host/");
  await page.getByRole("link", { name: "View all plans" }).nth(1).click();
  await page.getByText("Add to Cart").first().click();
  await page.getByText("Login").click();
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+м");
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).dblclick();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+a");
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+c");
  await page.getByRole("textbox", { name: "* Password" }).click();
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page
    .locator("label")
    .filter({ hasText: "Do not apply any credit from" })
    .getByRole("insertion")
    .click();
  await page
    .locator("label")
    .filter({ hasText: "Credit/Debit Card (Stripe)" })
    .getByRole("insertion")
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page.locator("#stripeCreditCard").click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page.locator("#stripeExpiryDate").click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page.locator("#stripeCvc").click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .getByRole("textbox", { name: "Enter a name for this card (" })
    .click();
  await page
    .getByText(
      "Card Number Expiry Date CVV/CVC2 Card NumberExpiry DateCVV/CVC2 Linked Account",
    )
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("4242 4242 4242 42422");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("12 / 28");
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .fill("123");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("f");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("h");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("h");
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .fill("12334");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("02 / 333");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("3333 3333 3333 33333");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("02 / 11");
});
<input class="InputElement is-empty Input Input--empty" autocomplete="cc-number" autocorrect="off" spellcheck="false" type="text" name="cardnumber" data-elements-stable-field-name="cardNumber" aria-required="true" inputmode="numeric" aria-label="Credit or debit card number" placeholder="1234 1234 1234 1234" aria-invalid="false" tabindex="0" value="">
    <input class="InputElement is-empty Input Input--empty" autocomplete = "cc-exp" autocorrect = "off" spellcheck = "false" type = "text" name = "exp-date" data - elements - stable - field - name="cardExpiry" aria - required="true" inputmode = "numeric" aria - label="Credit or debit card expiration date" placeholder = "MM / YY" aria - invalid="false" tabindex = "0" value = "" >
    <input class="InputElement is-empty Input Input--empty" autocomplete = "cc-csc" autocorrect = "off" spellcheck = "false" type = "text" name = "cvc" data - elements - stable - field - name="cardCvc" aria - required="true" inputmode = "numeric" aria - label="Credit or debit card CVC/CVV" placeholder = "CVC" aria - invalid="false" tabindex = "0" value = "" >
        <span class="LinkButton-inner" style="--halfPaymentDetailHintWidth: 66px; --halfGenericTextWidth: 52px;"><span class="LinkButton-genericText">Pay with <span role="presentation"><svg class="InlineSVG LinkButton-logoSvg" focusable="false" viewBox="0 0 72 24" fill="none"><path fill="#011E0F" d="M36.12 3.677c0-1.128.95-2.045 2.069-2.045 1.118 0 2.069.922 2.069 2.045a2.075 2.075 0 0 1-2.07 2.069 2.057 2.057 0 0 1-2.068-2.07ZM29.98 1.92h3.6v20.16h-3.6V1.92ZM40.008 7.68h-3.629v14.4h3.629V7.68ZM66.096 14.39c2.731-1.68 4.589-4.18 5.323-6.715H67.79c-.945 2.42-3.115 4.239-5.5 5.011V1.916h-3.63v20.16h3.63V16.08c2.77.691 4.958 3.086 5.707 5.995h3.653c-.557-3.053-2.645-5.909-5.554-7.685ZM46.44 9.293c.95-1.263 2.803-1.997 4.306-1.997 2.803 0 5.121 2.05 5.126 5.146v9.633h-3.629v-8.832c0-1.272-.566-2.74-2.405-2.74-2.16 0-3.403 1.915-3.403 4.156v7.426h-3.629V7.69h3.634v1.603ZM12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12Z"></path><path fill="#fff" d="M11.448 4.8h-3.7c.72 3.01 2.821 5.582 5.452 7.2-2.635 1.618-4.733 4.19-5.453 7.2h3.7c.918-2.784 3.457-5.203 6.577-5.698v-3.01c-3.125-.489-5.664-2.908-6.576-5.692Z"></path></svg></span></span><span class="LinkButton-logoHintWrapper"><span class="LinkButton-logo" role="presentation"><svg class="InlineSVG LinkButton-logoSvg" focusable="false" viewBox="0 0 72 24" fill="none"><path fill="#011E0F" d="M36.12 3.677c0-1.128.95-2.045 2.069-2.045 1.118 0 2.069.922 2.069 2.045a2.075 2.075 0 0 1-2.07 2.069 2.057 2.057 0 0 1-2.068-2.07ZM29.98 1.92h3.6v20.16h-3.6V1.92ZM40.008 7.68h-3.629v14.4h3.629V7.68ZM66.096 14.39c2.731-1.68 4.589-4.18 5.323-6.715H67.79c-.945 2.42-3.115 4.239-5.5 5.011V1.916h-3.63v20.16h3.63V16.08c2.77.691 4.958 3.086 5.707 5.995h3.653c-.557-3.053-2.645-5.909-5.554-7.685ZM46.44 9.293c.95-1.263 2.803-1.997 4.306-1.997 2.803 0 5.121 2.05 5.126 5.146v9.633h-3.629v-8.832c0-1.272-.566-2.74-2.405-2.74-2.16 0-3.403 1.915-3.403 4.156v7.426h-3.629V7.69h3.634v1.603ZM12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12Z"></path><path fill="#fff" d="M11.448 4.8h-3.7c.72 3.01 2.821 5.582 5.452 7.2-2.635 1.618-4.733 4.19-5.453 7.2h3.7c.918-2.784 3.457-5.203 6.577-5.698v-3.01c-3.125-.489-5.664-2.908-6.576-5.692Z"></path></svg></span><span class="LinkButton-logo" role="presentation" aria-hidden="true" style="position: absolute; visibility: hidden; pointer-events: none;"><svg class="InlineSVG LinkButton-logoSvg" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37257 18.6274 0 12 0C5.37259 0 0 5.37257 0 12C0 18.6274 5.37259 24 12 24Z" fill="#011E0F"></path><path d="M11.4479 4.80005H7.74707C8.46707 7.80965 10.5695 10.3824 13.1999 12C10.5647 13.6176 8.46707 16.1904 7.74707 19.2H11.4479C12.3647 16.416 14.9039 13.9968 18.0239 13.5024V10.4929C14.8991 10.0033 12.3599 7.58405 11.4479 4.80005Z" fill="white"></path></svg></span><span class="LinkButton-paymentDetailHint"><span class="LinkButton-textDivider"></span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" fill="none" viewBox="0 0 24 16" class="Logo CardBrandIcon Logo--cardVisa LinkButton-paymentIcon"><g clip-path="url(#a)"><path fill="#00579f" d="M22 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2"></path><path fill="#fff" d="M10.367 10.91H8.85l.949-5.802h1.517zm5.501-5.66a3.8 3.8 0 0 0-1.36-.247c-1.5 0-2.555.79-2.561 1.92-.013.833.755 1.296 1.33 1.574.587.284.786.469.786.722-.006.389-.474.568-.91.568-.607 0-.931-.092-1.425-.309l-.2-.092-.212 1.302c.356.16 1.012.303 1.692.309 1.593 0 2.63-.778 2.642-1.982.006-.66-.4-1.166-1.274-1.58-.53-.265-.856-.444-.856-.716.006-.247.275-.5.874-.5.493-.012.856.105 1.13.222l.138.062z"></path><path fill="#fff" fill-rule="evenodd" d="M18.584 5.108h1.174l1.224 5.802h-1.405l-.18-.87h-1.95c-.055.154-.318.87-.318.87h-1.592l2.254-5.32c.156-.377.431-.482.793-.482m-.093 2.124-.606 1.623h1.261c-.062-.29-.35-1.679-.35-1.679l-.106-.5a31 31 0 0 1-.2.556" clip-rule="evenodd"></path><path fill="#fff" d="M7.582 5.108 6.096 9.065l-.162-.803c-.275-.926-1.136-1.931-2.098-2.432l1.361 5.074h1.605l2.385-5.796z"></path><path fill="#fff" d="M4.716 5.108H2.275l-.025.118c1.904.481 3.166 1.641 3.684 3.036l-.53-2.666c-.088-.37-.357-.475-.688-.488"></path></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h24v16H0z"></path></clipPath></defs></svg><div class="AnimateSinglePresence LinkButton-paymentDetailHintText-animationWrapper"><div class="AnimateSinglePresenceItem LinkButton-paymentDetailHintText-animationItem"><span class="LinkButton-paymentDetailHintText">0000</span></div></div></span></span></span>
