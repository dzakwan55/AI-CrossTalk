interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">使用帮助</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          <section>
            <h3 className="font-semibold text-slate-900 mb-2">配对步骤</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>在 Chrome 扩展的侧边栏中找到 6 位配对码</li>
              <li>在 Web App 中输入配对码并连接</li>
              <li>打开各 AI 网站标签页，等待自动连接</li>
              <li>绿点表示 AI 已连接可用</li>
            </ol>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900 mb-2">常用指令</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">/mutual</code>
                <span className="text-slate-600">让选中的 AI 互相评价对方的回复</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">/cross @A &lt;- @B</code>
                <span className="text-slate-600">让 A 评价 B 的回复</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">@Claude</code>
                <span className="text-slate-600">在消息中提及特定 AI</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900 mb-2">讨论模式</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>讨论模式让 2-4 个 AI 就同一主题进行深度辩论和交流。</p>
              <div className="space-y-1.5 pl-3">
                <p><span className="font-medium text-slate-800">开始讨论：</span>选择 2-4 个 AI，输入讨论主题，点击"开始讨论"</p>
                <p><span className="font-medium text-slate-800">下一轮：</span>AI 们会评价对方的观点，展开更深入的讨论</p>
                <p><span className="font-medium text-slate-800">插话功能：</span>你可以随时向所有参与者提问或引导讨论方向</p>
                <p><span className="font-medium text-slate-800">生成总结：</span>让其中一个 AI 总结整个讨论的共识和分歧</p>
                <p><span className="font-medium text-slate-800">布局说明：</span>2 个 AI 左右并排，4 个 AI 呈 2×2 网格排列</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900 mb-2">常见问题</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">Q: AI 显示未连接怎么办？</p>
                <p className="text-slate-600">A: 刷新对应的 AI 网页标签页，确保已登录。</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Q: 消息发送失败怎么办？</p>
                <p className="text-slate-600">A: 检查 AI 网页是否正常，或尝试刷新页面后重试。</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Q: 如何同时对比多个 AI 的回复？</p>
                <p className="text-slate-600">A: 在左侧选择多个 AI，发送消息后等待各自回复，然后使用 /mutual 命令互评。</p>
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      title="帮助"
    >
      <span className="text-sm font-medium">?</span>
    </button>
  )
}
