import puppeteer from "puppeteer-core";
import {getBrowserWSEndpoint} from "./api.js";

const apiKey = 'API Key'

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let browser = null;
async function getTurnstileToken() {
  const {webSocketDebuggerUrl} = await getBrowserWSEndpoint(apiKey)
  browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  let resolveToken = null;
  const tokenPromise = new Promise(resolve => resolveToken = resolve);

  // This method is used to monitor whether the Checkbox exists on the page and click it
  const checkbox = async () => {
    while (true) {
      try {
        if (page.isClosed()) return;
        const targetFrameUrl = 'cdn-cgi/challenge-platform/';
        const iframe = page.frames().find((frame) => frame.url().includes(targetFrameUrl));
        if (iframe) {
          const box_element = await iframe.waitForSelector('input[type="checkbox"]', {
            timeout: 1000,
            visible: true,
          });
          await box_element.click();
        }
      } catch (e) {
      } finally {
        await delay(1000)
      }
    }
  }

  // This method is used to monitor whether the token is returned
  const findToken = async () => {
    while (true) {
      if (page.isClosed()) return;
      const response = await page.evaluate(() => {
        const token = window?.turnstile?.getResponse()
        if (token) {
          return {token: token}
        }
      });
      if (response) {
        resolveToken(response);
        return;
      }
      await delay(1000)
    }
  }

  findToken().then()
  checkbox().then()

  await page.goto('https://xxx.com/login.html');
  return tokenPromise;
}

// Test get trunstile token
getTurnstileToken()
  .then(result => console.log(result))
  .catch(err => console.error(err))
