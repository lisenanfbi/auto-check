// Background script for network request monitoring

// 存储网络请求数据
let networkRequests = [];
let isMonitoring = false;

// 生成 UUID v4 的备用函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 开始监听网络请求
function startNetworkMonitoring() {
  if (isMonitoring) return;

  isMonitoring = true;
  networkRequests = [];

  // 监听所有网络请求
  chrome.webRequest.onBeforeRequest.addListener(
    handleRequest,
    { urls: ["<all_urls>"] },
    ["requestBody"]
  );

  chrome.webRequest.onResponseStarted.addListener(
    handleResponse,
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
  );

  console.log('网络请求监听已启动');
}

// 停止监听网络请求
function stopNetworkMonitoring() {
  if (!isMonitoring) return;

  isMonitoring = false;

  chrome.webRequest.onBeforeRequest.removeListener(handleRequest);
  chrome.webRequest.onResponseStarted.removeListener(handleResponse);

  console.log('网络请求监听已停止');
}

// 处理请求
function handleRequest(details) {
  const requestData = {
    id: details.requestId,
    url: details.url,
    method: details.method,
    timestamp: Date.now(),
    requestBody: details.requestBody
  };

  networkRequests.push(requestData);

  // 只保留最近100个请求
  if (networkRequests.length > 100) {
    networkRequests = networkRequests.slice(-100);
  }
}

// 处理响应
function handleResponse(details) {
  const requestIndex = networkRequests.findIndex(req => req.id === details.requestId);
  if (requestIndex !== -1) {
    networkRequests[requestIndex].responseHeaders = details.responseHeaders;
    networkRequests[requestIndex].statusCode = details.statusCode;
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background收到消息:', message);

  // 处理需要异步操作的消息
  if (message.type === 'SEND_FEEDBACK') {
    // 异步处理，立即返回 true 保持消息通道开放
    (async () => {
      // 根据action选择不同的URL
      const action = message.data?.action;
      let url;

      if (action === 'useful') {
        url = 'https://cstool.reikyz.me:9443/good';
      } else if (action === 'feedback') {
        url = 'https://cstool.reikyz.me:9443/feedback';
      } else {
        url = 'https://10.83.3.3:8443/good';
      }

      console.log(`正在发送反馈到 ${url}`);

      // 根据action决定请求体格式
      let requestBody;
      if (action === 'feedback') {
        // 反馈请求体只包含输入内容
        requestBody = JSON.stringify({ content: message.data?.content || '' });
      } else {
        // 其他请求体包含完整数据
        requestBody = JSON.stringify(message.data || {});
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        });

        console.log('收到响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('反馈发送成功:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('发送反馈失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理error code API请求
  if (message.type === 'FETCH_ERROR_CODE') {
    (async () => {
      try {
        console.log('Background正在处理error code API请求');

        const response = await fetch('https://cstool.reikyz.me:9443/err_code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message.data)
        });

        console.log('Error code API响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Error code API请求成功:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('Error code API请求失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理 IP 地理位置 API 请求
  if (message.type === 'FETCH_IP_INFO') {
    (async () => {
      try {
        console.log('Background正在处理 IP 地理位置 API 请求');
        const ipAddress = message.data?.ipAddress;
        
        if (!ipAddress) {
          throw new Error('IP 地址为空');
        }

        const response = await fetch(`https://ipinfo.agoralab.co/v2/ipip/${ipAddress}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('IP 地理位置 API 响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('IP 地理位置 API 请求成功:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('IP 地理位置 API 请求失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理服务端 IP 查询 API 请求
  if (message.type === 'FETCH_SERVER_IP_INFO') {
    (async () => {
      try {
        console.log('Background正在处理服务端 IP 查询 API 请求');
        const ipAddress = message.data?.ipAddress;
        
        if (!ipAddress) {
          throw new Error('IP 地址为空');
        }

        const response = await fetch(`http://10.83.5.239:7766/api/query?ip=${ipAddress}&all_services=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('服务端 IP 查询 API 响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('服务端 IP 查询 API 请求成功:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('服务端 IP 查询 API 请求失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理获取用户信息的请求
  if (message.type === 'FETCH_USER_INFO') {
    (async () => {
      try {
        console.log('Background正在获取用户信息');

        const response = await fetch('https://argus.agoralab.co/api/user/info', {
          method: 'GET',
          credentials: 'include',  // 携带 cookie
          headers: {
            'Accept': 'application/json',
          }
        });

        console.log('用户信息API响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('获取用户信息成功:', data.name);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('获取用户信息失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理 Auto Check 点击事件 POST 请求
  if (message.type === 'AUTO_CHECK_CLICK') {
    (async () => {
      try {
        console.log('Background正在处理 Auto Check 点击事件');

        // 从 chrome.storage.local 获取 agora_uuid
        let agoraUuid;
        try {
          const result = await chrome.storage.local.get(['agora_uuid']);
          agoraUuid = result.agora_uuid;

          // 如果不存在，生成一个新的 UUID
          if (!agoraUuid) {
            // 使用 crypto.randomUUID() 生成 UUID v4（如果支持）
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              agoraUuid = crypto.randomUUID();
            } else {
              // 备用方案：生成 UUID v4
              agoraUuid = generateUUID();
            }

            // 保存到 chrome.storage.local
            await chrome.storage.local.set({ agora_uuid: agoraUuid });
            console.log('已生成并保存新的 agora_uuid:', agoraUuid);
          } else {
            console.log('从 storage 获取到 agora_uuid:', agoraUuid);
          }
        } catch (storageError) {
          console.error('获取或保存 agora_uuid 失败:', storageError);
          // 如果存储操作失败，仍然生成一个 UUID 用于本次请求
          agoraUuid = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : generateUUID();
        }

        // 构建请求体，包含 agora_uuid
        const requestBody = {
          agora_uuid: agoraUuid
        };

        const response = await fetch('https://cstool.reikyz.me:9443/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Auto Check 点击事件 POST 响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json().catch(() => ({})); // 如果响应不是 JSON，返回空对象
        console.log('Auto Check 点击事件 POST 请求成功:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('Auto Check 点击事件 POST 请求失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理 AI 分析请求
  if (message.type === 'SEND_AI_ANALYSIS') {
    (async () => {
      try {
        console.log('Background正在处理 AI 分析请求');

        // 目标 URL
        // 优先从 storage 获取 configured URL
        let baseUrl = 'http://10.80.0.69:3000';
        try {
          const result = await chrome.storage.local.get(['ai_analysis_server_url']);
          if (result.ai_analysis_server_url) {
            baseUrl = result.ai_analysis_server_url;
            console.log('Background: 获取到配置的 Base URL:', baseUrl);
          }
        } catch (e) {
          console.warn('Background: 获取配置 URL 失败，使用默认值:', e);
        }

        // 确保 URL 以 /analyze 结尾 (完全复刻 disk 逻辑的变体，兼容用户输入)
        // disk 逻辑是： const endpoint = `${baseUrl}/analyze`;
        // 我们为了兼容用户可能填了完整路径的情况，做个判断
        let url = baseUrl;
        if (!url.endsWith('/analyze')) {
          // 去掉末尾斜杠
          url = url.replace(/\/$/, '');
          url = `${url}/analyze`;
        }

        console.log('Background: 最终请求 URL:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message.data)
        });

        console.log('AI 分析请求响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ AI 分析请求成功:', result);
        // 直接透传服务器响应 (与 disk 项目一致)
        sendResponse(result);
      } catch (error) {
        console.error('❌ AI 分析请求失败:', error);
        sendResponse({
          success: false,
          error: `无法连接到服务器。\n详情: ${error.message}`
        });
      }
    })();

    return true; // 保持消息通道开放
  }

  // 处理启用 auto-check 按钮的消息，转发到 content script
  if (message.type === 'ENABLE_AUTO_CHECK_BUTTONS') {
    console.log('📡 Background: 收到启用 auto-check 按钮的请求');
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0]) {
        console.log(`📡 Background: 准备转发消息到 tab ${tabs[0].id}`);
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ENABLE_AUTO_CHECK_BUTTONS'
        }, function (response) {
          if (chrome.runtime.lastError) {
            console.log('⚠️ Background: 转发消息到 content script 失败:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ Background: 已转发消息到 content script，响应:', response);
          }
        });
      } else {
        console.log('⚠️ Background: 未找到活动标签页');
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // 处理同步消息
  switch (message.type) {
    case 'START_NETWORK_MONITORING':
      startNetworkMonitoring();
      sendResponse({ success: true, message: '网络监听已启动' });
      break;

    case 'STOP_NETWORK_MONITORING':
      stopNetworkMonitoring();
      sendResponse({ success: true, message: '网络监听已停止' });
      break;

    case 'GET_NETWORK_REQUESTS':
      sendResponse({
        success: true,
        requests: networkRequests,
        count: networkRequests.length
      });
      break;

    case 'GET_COUNTERS_DATA':
      const countersData = extractCountersData(networkRequests);
      sendResponse({
        success: true,
        counters: countersData
      });
      break;

    default:
      sendResponse({ success: false, message: '未知消息类型' });
  }

  return true;
});

// 提取counters数据
function extractCountersData(requests) {
  const countersData = [];

  requests.forEach(request => {
    // 检查URL是否包含counters相关路径
    if (request.url.includes('counters') ||
      request.url.includes('counter') ||
      request.url.includes('metric') ||
      request.url.includes('stats')) {

      const counterInfo = {
        url: request.url,
        method: request.method,
        timestamp: request.timestamp,
        statusCode: request.statusCode,
        requestBody: request.requestBody,
        responseHeaders: request.responseHeaders
      };

      // 尝试从请求体中提取counters数据
      if (request.requestBody && request.requestBody.formData) {
        counterInfo.formData = request.requestBody.formData;
      }

      if (request.requestBody && request.requestBody.raw) {
        try {
          const decoder = new TextDecoder();
          request.requestBody.raw.forEach(rawData => {
            if (rawData.bytes) {
              const bodyText = decoder.decode(rawData.bytes);
              counterInfo.bodyText = bodyText;

              // 尝试解析JSON
              try {
                counterInfo.parsedBody = JSON.parse(bodyText);
                // 提取AEC Delay数据
                counterInfo.aecDelayData = extractAecDelayData(counterInfo.parsedBody);
              } catch (e) {
                // 不是JSON格式，保持原始文本
              }
            }
          });
        } catch (error) {
          console.error('解析请求体失败:', error);
        }
      }

      countersData.push(counterInfo);
    }
  });

  return countersData;
}

// 提取AEC Delay数据
function extractAecDelayData(parsedBody) {
  if (!parsedBody || !Array.isArray(parsedBody)) {
    return null;
  }

  for (const item of parsedBody) {
    if (item.data && Array.isArray(item.data)) {
      for (const counter of item.data) {
        if (counter.name === "Audio AEC Delay" && counter.data) {
          return {
            name: counter.name,
            counterId: counter.counter_id,
            data: counter.data.map(point => ({
              timestamp: point[0],
              value: point[1]
            }))
          };
        }
      }
    }
  }

  return null;
}

// 清理过期数据
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  networkRequests = networkRequests.filter(request =>
    request.timestamp > oneHourAgo
  );
}, 5 * 60 * 1000); // 每5分钟清理一次

console.log('Background script已加载');
