# 使用 Nstbrowser 获取 Cloudflare Turnstile 令牌

![turnstile_gif](./screenshots/turnstile_gif.gif)

欢迎来到本教程！在本教程中，我们将使用 Nstbrowser 完成从启用了 Cloudflare Turnstile 的站点中抓取 turnstile 令牌的步骤。

![turnstile_token](./screenshots/turnstile_token.gif)

### **第 1 步：安装 Nstbrowser**

首先，从以下网址下载 Nstbrowser 客户端安装程序：https://www.nstbrowser.io/download

下载完成后，打开安装程序并按照提示的步骤完成安装过程。安装完成后，你可以在你的设备上找到并启动 Nstbrowser 客户端。

### **第 2 步：设置您的 Nstbrowser**

在 Nstbrowser 官网注册一个新账户：https://app.nstbrowser.io/account/register

使用您的注册信息在 Nstbrowser 客户端进行登录。登录成功后，在 API 菜单中生成您自己的专属 `API Key`。

![api_key](./screenshots/api_key.png)

确保您已经下载了一个可用的内核，如果没有，请在 Nstbrowser 客户端中手动下载。您需要做的是：**点击右上角的头像 → 设置 → 版本**

![kernel_download](./screenshots/kernel_download.png)

### **第 3 步：编写获取令牌代码**

现在，创建一个 node 项目，在项目目录中创建一个`api.js`文件，并插入以下代码，用于创建并启动一个随机的指纹浏览器实例。

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
      kernelMilestone: '120', // support: 113, 115, 118, 120
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

> 更多API 相关参数说明请参考Nstbrowser API文档：https://apidocs.nstbrowser.io/api-541853


接下来，再创建一个`turnstile.js`文件，并插入以下代码，使用 Puppeteer 来自动化获取 Turnstile 的 Token 数据。

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

通过终端执行 `node turnstile.js` ，等待结果，结果可能如下所示：

```jsx
{ token: '0.ZDHeg0BH58fAptHKige3NNlwavjsNJtp9mIHOxV6Qbqp30cpqwi7ib2M7utunoXsOAf2EYd71XFzJnMw2rA_Zi5VuAFqe-CaXx7bHdecjxrjOaTdOGWQ_0mk9WA3v-FfJgXaJZD5FVmp1UCtQuzrxt4__TVYwytrbtrKbFpBJKqKH6CdY5MCnORHgcjc2FXS9PD0rCBdzJuicWJedZkmDvvGeWG2iKQ5D1T85oUoqkKpT-NMkSt1webVc_Yfa0sPXmbw8DKkYsauwJPvqfbqyfSdrDi17qK2APCQANeWdXgd-1NsHdlkV4OMdZuunbsoROJVXIOu-i1R_8rkWKiejsGQfkubX8Y8_xempdEO0LfYEBmrMUbPzyr12QcEefE5r_BPmdn_RTX_dU2kh734G3qaodxCcOOcCo5UKM1cvHI.D_fh7cB0Bxhb4b0PHB7jew.451b703e4df2a4e8cd61d90d175329883eb3af85d72e77787959c0b52fe112e2' }
```

### 第 4 步：提交表单请求

在获取到 Turnstile 的令牌后，我们通常需要将此令牌作为表单请求的一部分提交到服务器。这一步骤的实现可能因实际站点的不同而有所不同。因此，你需要根据实际站点的要求来修改和使用以下的代码示例。

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

在上述代码中，我们创建了一个新的 FormData 对象，并添加了用户名、密码和 Turnstile Token。请注意，你需要根据实际站点的要求来修改这些值:
- `username`
- `password`
- `cf-turnstile-response`
- `https://xxx.com/login`

> 关于完整Cloudflare Turnstile 代码示例，请见[**Github**](https://github.com/Nstbrowser/nstbrowser-solver-examples.git)
