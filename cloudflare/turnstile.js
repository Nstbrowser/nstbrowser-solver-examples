import puppeteer from "puppeteer-core";
import {getBrowserWSEndpoint} from "./api.js";

const apiKey = '71184c92-fb1a-4308-94f2-07d856bc88b1'

async function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

let browser = null;

async function turnstile() {
    const {webSocketDebuggerUrl} = await getBrowserWSEndpoint(apiKey)
    browser = await puppeteer.connect({
        browserWSEndpoint: webSocketDebuggerUrl,
        defaultViewport: null,
    });

    let resolveToken = null;
    const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
    });

    const page = await browser.newPage();

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
    const getResponse = async () => {
        while (true) {
            if (page.isClosed()) return;

            const response = await page.evaluate(() => {
                const token = window?.turnstile?.getResponse()
                if (token) {
                    return {
                        data: token,
                        userAgent: navigator.userAgent,
                    }
                }
            });
            if (response) {
                resolveToken(response);
                // page.close().then()
                return;
            }
            await delay(1000)
        }
    }

    getResponse().then()
    checkbox().then()

    await page.goto('https://peet.ws/turnstile-test/managed.html');
    return tokenPromise;
}

// Test get trunstile token
turnstile().then(result => {
    console.log(result)
}).catch(err => {
    console.error(err)
}).finally(() => {
    if (browser) {
        // browser.close()
    }
})
