# AI-CrossTalk - 多 AI 智能对话协作平台

> 本项目基于 [ai-roundtable](https://github.com/axtonliu/ai-roundtable) 开发，新增了对国产 AI 的全面支持，并提供了功能丰富的 Web 控制面板。

让多个 AI 助手围桌讨论，交叉评价，深度协作。支持 Claude、ChatGPT、Gemini、DeepSeek、Kimi、豆包、ChatGLM 等主流 AI 平台。

## ✨ 新增特性

相比原项目，本版本新增：

- 🇨🇳 **国产 AI 支持**：DeepSeek、Kimi（月之暗面）、豆包（字节跳动）、ChatGLM（智谱）
- 🎨 **现代化 Web 界面**：基于 React + TypeScript + Tailwind CSS 构建
- 🔄 **刷新对话功能**：手动刷新 AI 回答，确保内容完整
- 🎯 **优化的 Kimi 支持**：改进回答捕获稳定性，减少中断
- 🖱️ **快捷操作**：Ctrl+点击后台打开 AI 网站
- 📱 **响应式布局**：支持 2-4 个 AI 的灵活窗口布局

## 📦 支持的 AI 平台

### 国际 AI
- **Claude** (Anthropic)
- **ChatGPT** (OpenAI)
- **Gemini** (Google)

### 国产 AI
- **DeepSeek** (深度求索)
- **Kimi** (月之暗面)
- **豆包** (字节跳动)
- **ChatGLM** (智谱 AI)

## 🚀 快速开始

### 安装插件

#### 方式一：下载预编译版本

1. 下载 [ai-roundtable-v1.0.3.zip](https://github.com/YOUR_USERNAME/AI-CrossTalk/releases)
2. 解压到本地文件夹
3. 打开 Chrome 浏览器，进入 `chrome://extensions/`
4. 开启右上角的"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的文件夹

#### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/AI-CrossTalk.git
cd AI-CrossTalk

# 构建 Web 界面
cd web
npm install
npm run build
cd ..

# 加载插件
# 在 Chrome 扩展页面加载 AI-CrossTalk 文件夹
```

### 配对扩展与 Web 界面

1. 安装插件后，点击浏览器工具栏中的扩展图标
2. 在侧边栏中会看到配对码
3. Web 界面会自动打开（如未打开，刷新页面）
4. 输入配对码完成连接

## 📖 使用指南

### 普通模式

普通模式适合同时与多个 AI 进行对话，比较它们的回答。

#### 基本操作

1. **选择 AI**：在左侧边栏勾选要使用的 AI（支持多选）
2. **快速打开**：在右侧"快速打开"栏点击 AI 图标，打开对应网站
   - 普通点击：新标签页打开并切换
   - Ctrl+点击：后台标签页打开
3. **发送消息**：在输入框输入内容，点击"发送"
4. **刷新对话**：点击"刷新对话"按钮，重新获取所有 AI 的最新回答
5. **新对话**：点击"新对话"按钮，清空当前对话并开始新会话

#### 高级功能

**@ 提及功能**
```
向 @claude 和 @chatgpt 发送：请解释量子计算的基本原理
```

**引用其他 AI 的回答**
```
@gemini 你怎么看待 @claude 的解释？
```
系统会自动将 Claude 的回答插入到发送给 Gemini 的消息中。

**互评模式**
点击"互评"按钮，让所有选中的 AI 互相评价对方的回答。

**交叉评价**
```
/cross @claude -> @chatgpt, @gemini: 请评价这个回答
```
将 Claude 的回答发送给 ChatGPT 和 Gemini 进行评价。

### 讨论模式

讨论模式让多个 AI 进行多轮对话讨论，模拟圆桌会议。

#### 使用步骤

1. 点击顶部"讨论"按钮切换到讨论模式
2. 选择 2-4 个参与讨论的 AI
3. 输入讨论主题，点击"开始讨论"
4. AI 们会轮流发言，进行多轮讨论
5. 可随时点击"插话"向所有参与者发送消息
6. 点击"下一轮"继续讨论
7. 点击"生成总结"让每个 AI 总结讨论内容
8. 点击"刷新回答"手动刷新所有参与者的最新回答

#### 窗口布局

- **2 个 AI**：2 列布局，每个占 50% 宽度 × 100% 高度
- **3 个 AI**：3 列布局，每个占 33.33% 宽度 × 100% 高度
- **4 个 AI**：2×2 网格布局，每个占 50% 宽度 × 50% 高度

## 🛠️ Web 端开发

Web 界面采用现代化技术栈，易于定制和扩展。

### 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **Markdown 渲染**：ReactMarkdown + remark-gfm
- **代码高亮**：Prism.js

### 项目结构

```
web/
├── src/
│   ├── components/       # React 组件
│   │   ├── AiCard.tsx           # AI 对话卡片
│   │   ├── AiGrid.tsx           # AI 网格布局
│   │   ├── AiLogo.tsx           # AI 图标组件
│   │   ├── DiscussionMode.tsx   # 讨论模式
│   │   ├── HelpDialog.tsx       # 帮助对话框
│   │   ├── InputBar.tsx         # 输入栏
│   │   ├── LogPanel.tsx         # 日志面板
│   │   ├── PairingDialog.tsx    # 配对对话框
│   │   ├── QuickLinks.tsx       # 快速打开链接
│   │   └── Sidebar.tsx          # 侧边栏
│   ├── hooks/            # React Hooks
│   │   ├── useAiStatus.ts       # AI 状态管理
│   │   └── useBridge.ts         # 插件通信桥接
│   ├── lib/              # 工具库
│   │   ├── constants.ts         # 常量定义
│   │   ├── types.ts             # TypeScript 类型
│   │   └── utils.ts             # 工具函数
│   ├── App.tsx           # 主应用组件
│   └── main.tsx          # 入口文件
├── public/               # 静态资源
├── package.json
└── vite.config.ts
```

### 本地开发

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check
```

### 自定义配置

#### 添加新的 AI 平台

1. 在 `src/lib/constants.ts` 中添加配置：

```typescript
export const AI_TYPES = [..., 'newai'] as const

export const AI_DISPLAY_NAMES: Record<AiType, string> = {
  // ...
  newai: '新 AI',
}

export const AI_URLS: Record<AiType, string> = {
  // ...
  newai: 'https://newai.example.com',
}

export const AI_BRAND_COLORS: Record<AiType, string> = {
  // ...
  newai: '#FF5733',
}
```

2. 在插件端创建对应的 content script（参考 `content/` 目录下的其他文件）

3. 在 `manifest.json` 中添加权限和 content script 配置

## 🔧 插件开发

### 项目结构

```
AI-CrossTalk/
├── content/              # Content Scripts
│   ├── claude.js
│   ├── chatgpt.js
│   ├── gemini.js
│   ├── deepseek.js
│   ├── kimi.js
│   ├── doubao.js
│   └── chatglm.js
├── sidepanel/            # 侧边栏
│   ├── panel.html
│   ├── panel.js
│   └── panel.css
├── icons/                # 图标资源
├── web/                  # Web 界面（见上文）
├── background.js         # 后台服务
└── manifest.json         # 插件清单
```

### Content Script 开发要点

每个 AI 平台的 content script 需要实现以下功能：

1. **消息注入**：找到输入框并模拟用户输入
2. **回答捕获**：监听 DOM 变化，捕获 AI 的回答
3. **流式处理**：检测 AI 是否还在输出，等待完成后捕获
4. **新对话**：触发"新对话"功能

示例（简化版）：

```javascript
async function injectMessage(text) {
  const input = document.querySelector('textarea');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));

  const sendButton = document.querySelector('button[type="submit"]');
  sendButton.click();

  waitForStreamingComplete();
}

function getLatestResponse() {
  const messages = document.querySelectorAll('.message.assistant');
  const lastMessage = messages[messages.length - 1];
  return lastMessage ? lastMessage.innerText : null;
}

async function waitForStreamingComplete() {
  let previousContent = '';
  let stableCount = 0;

  while (true) {
    const isStreaming = document.querySelector('.streaming-indicator');
    const currentContent = getLatestResponse();

    if (!isStreaming && currentContent === previousContent) {
      stableCount++;
      if (stableCount >= 5) {
        chrome.runtime.sendMessage({
          type: 'RESPONSE_CAPTURED',
          aiType: 'your-ai',
          content: currentContent
        });
        break;
      }
    } else {
      stableCount = 0;
    }

    previousContent = currentContent;
    await sleep(500);
  }
}
```

## 📝 更新日志

### v1.0.3 (2024-01-24)

- ✨ 新增：普通界面刷新对话功能
- 🐛 修复：Kimi 回答捕获中断问题
- 🐛 修复：快速打开栏 Ctrl+点击无法后台打开
- 🔧 优化：刷新对话前自动捕获当前回答
- 🔧 优化：Kimi 回答捕获稳定性（增加检测阈值）
- 📦 更新：添加 kimi.moonshot.cn 域名支持

### v1.0.2

- ✨ 新增：讨论模式网格布局自适应
- 🐛 修复：讨论界面窗口大小问题
- 🐛 修复：参与者选择限制为 4 个

### v1.0.1

- ✨ 初始版本发布
- ✨ 支持 7 个 AI 平台
- ✨ 普通模式和讨论模式

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源。

## 🙏 致谢

- 原项目：[ai-roundtable](https://github.com/axtonliu/ai-roundtable) by @axtonliu
- 所有贡献者和使用者

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/YOUR_USERNAME/AI-CrossTalk/issues)
- 发起 [Discussion](https://github.com/YOUR_USERNAME/AI-CrossTalk/discussions)

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
