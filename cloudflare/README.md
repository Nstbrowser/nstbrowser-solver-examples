# Getting Cloudflare Turnstile Token with Nstbrowser

![turnstile_gif](./screenshots/turnstile_gif.gif)

Welcome to this tutorial! In this tutorial, we will use Nstbrowser to complete the steps of fetching a turnstile token from a site enabled with Cloudflare Turnstile.

Go through the brief demonstration and then finish your work according to specific steps!

![turnstile_token](./screenshots/turnstile_token.gif)

### **Step 1: Install Nstbrowser**

First, download the Nstbrowser client installer from the following URL: https://www.nstbrowser.io/download

After the download is complete, open the installer and follow the prompted steps to complete the installation process. After the installation is complete, you can find and launch the Nstbrowser client on your device.

### **Step 2: Set Up Your Nstbrowser**

Register a new account on the Nstbrowser official website: https://app.nstbrowser.io/account/register

Log in to the Nstbrowser client with your registration information. After successful login, generate your own exclusive `API Key` in the API menu.

![api_key](./screenshots/api_key.png)

Make sure you have downloaded an available kernel, if not, please manually download it in the Nstbrowser client. What you need to do is: **Click on the avatar in the upper right corner → Settings → Version**

![kernel_download](./screenshots/kernel_download.png)

### **Step 3: Write the token acquisition code**

Now, create a node project, create an `api.js` file in the project directory, and insert the following code to create and launch a random fingerprint browser instance.

```javascript
// Api Docs: https://apidocs.nstbrowser.io/api-5418530
export async function getBrowserWSEndpoint(apiKey) {
  const config = {
    once: true, // one_time browser
    headless: false, // support: true, 'new'
    autoClose: false,
    // remoteDebuggingPort: 9223,
    fingerprint: {
      name: 'test-turnstile',
      platform: 'windows', // support: windows, mac, linux
      kernel: 'chromium', // only support: chromium
      kernelMilestone: '120',
      hardwareConcurrency: 2, // support: 2, 4, 8, 10, 12, 14, 16
      deviceMemory: 8, // support: 2, 4, 8
      proxy: "" // input format: schema://user:password@host:port
    },
  };

  const query = new URLSearchParams({
    'x-api-key': apiKey,
    config: JSON.stringify(config),
  }).toString();

  const resp = await fetch(`http://localhost:8848/api/agent/devtool/launch?${query}`)
  const json = await resp.json();
  return json.data
}
```

> For more information on API related parameters, please refer to the Nstbrowser API documentation: https://apidocs.nstbrowser.io/api-541853


Next, create a `turnstile.js` file, and insert the following code to automate the retrieval of the Turnstile Token data using Puppeteer.
```javascript
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
```

By executing `node turnstile.js` in the terminal and waiting for the result, the output may look like this:

```javascript
{ token: '0.ZDHeg0BH58fAptHKige3NNlwavjsNJtp9mIHOxV6Qbqp30cpqwi7ib2M7utunoXsOAf2EYd71XFzJnMw2rA_Zi5VuAFqe-CaXx7bHdecjxrjOaTdOGWQ_0mk9WA3v-FfJgXaJZD5FVmp1UCtQuzrxt4__TVYwytrbtrKbFpBJKqKH6CdY5MCnORHgcjc2FXS9PD0rCBdzJuicWJedZkmDvvGeWG2iKQ5D1T85oUoqkKpT-NMkSt1webVc_Yfa0sPXmbw8DKkYsauwJPvqfbqyfSdrDi17qK2APCQANeWdXgd-1NsHdlkV4OMdZuunbsoROJVXIOu-i1R_8rkWKiejsGQfkubX8Y8_xempdEO0LfYEBmrMUbPzyr12QcEefE5r_BPmdn_RTX_dU2kh734G3qaodxCcOOcCo5UKM1cvHI.D_fh7cB0Bxhb4b0PHB7jew.451b703e4df2a4e8cd61d90d175329883eb3af85d72e77787959c0b52fe112e2' }
```

### **Step 4: Submit the form request**

After obtaining the Turnstile token, we usually need to submit this token as part of the form request to the server. The implementation of this step may vary depending on the actual site. Therefore, you need to modify and use the following code examples according to the actual site requirements.

```javascript
async function submitForm(token) {
  const formData = new FormData();
  formData.append('username', 'your_username');
  formData.append('password', 'your_password');
  formData.append('cf-turnstile-response', token);

  const response = await fetch('https://xxx.com/login', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    console.log('Form submitted successfully!');
  } else {
    console.error('Form submission failed!');
  }
}
```

In the above code, we create a new FormData object and add the username, password, and Turnstile Token. Please note that you need to modify these values according to the actual site requirements:

- `username`
- `password`
- `cf-turnstile-response`
- `https://xxx.com/login`

> For a complete Cloudflare Turnstile code example, please see [**Github**](https://github.com/Nstbrowser/nstbrowser-solver-examples.git)
>
