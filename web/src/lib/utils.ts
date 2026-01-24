export function normalizeAiName(name: string): string {
    const lower = name.toLowerCase()
    const aliases: Record<string, string> = {
        '通义千问': 'qwen',
        '豆包': 'doubao',
        '智谱清言': 'chatglm',
        '智谱': 'chatglm',
        '文心': 'ernie',
        '文心一言': 'ernie',
    }
    return aliases[lower] || lower
}
