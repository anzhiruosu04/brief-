import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

// token 进程内缓存（多实例下各自缓存，仍可避免单次请求内重复换取）
let cachedToken: { token: string; expireAt: number } | null = null;

async function getTenantToken(appId: string, appSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expireAt - Date.now() > 60_000) {
    return cachedToken.token;
  }
  const resp = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await resp.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`飞书鉴权失败：${data.msg}（code: ${data.code}），请检查 App ID / App Secret 与应用权限`);
  }
  cachedToken = {
    token: data.tenant_access_token,
    expireAt: Date.now() + (data.expire ?? 7200) * 1000,
  };
  return data.tenant_access_token;
}

interface DocRef {
  type: 'docx' | 'doc' | 'wiki' | 'sheet' | 'bitable';
  token: string;
}

/** 从多种飞书链接中解析文档类型与 token */
function parseFeishuUrl(url: string): DocRef | null {
  try {
    const u = new URL(url.trim());
    if (!/(feishu\.cn|larksuite\.com|larkoffice\.com)$/.test(u.hostname.replace(/^.*?([^.]+\.[^.]+\.[^.]+)$/, '$1'))) {
      // 宽松放行，避免企业私有域名误判
    }
    const parts = u.pathname.split('/').filter(Boolean);
    // /docx/xxx, /docs/xxx, /wiki/xxx, /sheets/xxx, /base/xxx
    const typeIndex: Record<string, DocRef['type']> = {
      docx: 'docx',
      docs: 'doc',
      doc: 'doc',
      wiki: 'wiki',
      sheets: 'sheet',
      base: 'bitable',
    };
    for (let i = 0; i < parts.length - 1; i += 1) {
      const type = typeIndex[parts[i]];
      if (type) return { type, token: parts[i + 1] };
    }
    return null;
  } catch {
    return null;
  }
}

async function feishuGet(url: string, token: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

function blocksToText(data: unknown): string {
  const lines: string[] = [];
  const container = (data as { data?: { items?: unknown[] } })?.data?.items ?? [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    // 文本块：block_type 2 是 text，其余带 text/elements 的也尝试提取
    const textBody =
      (obj.text as { elements?: Array<{ text_run?: { content?: string } }> } | undefined)
        ?? (obj.heading1 as { elements?: Array<{ text_run?: { content?: string } }> } | undefined)
        ?? (obj.heading2 as { elements?: Array<{ text_run?: { content?: string } }> } | undefined)
        ?? (obj.heading3 as { elements?: Array<{ text_run?: { content?: string } }> } | undefined)
        ?? (obj.bullet as { elements?: Array<{ text_run?: { content?: string } }> } | undefined)
        ?? (obj.ordered as { elements?: Array<{ text_run?: { content?: string } }> } | undefined);
    if (textBody?.elements) {
      const line = textBody.elements
        .map((el) => el.text_run?.content ?? '')
        .join('');
      if (line.trim()) lines.push(line);
    }
    const children = obj.children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  container.forEach(walk);
  return lines.join('\n');
}

async function readDocx(documentId: string, token: string): Promise<string> {
  const data = await feishuGet(
    `${FEISHU_BASE}/docx/v1/documents/${documentId}/blocks?page_size=500`,
    token,
  );
  const code = (data as { code?: number })?.code;
  if (code !== 0) {
    throw new Error(`文档读取失败：${(data as { msg?: string })?.msg ?? '未知错误'}（code: ${code}`);
  }
  return blocksToText(data);
}

async function readSheet(spreadsheetToken: string, token: string): Promise<string> {
  const meta = (await feishuGet(
    `${FEISHU_BASE}/sheets/v3/spreadsheets/${spreadsheetToken}/sheets/query`,
    token,
  )) as {
    code?: number;
    msg?: string;
    data?: { sheets?: Array<{ sheet_id: string; title?: string }> };
  };
  if (meta.code !== 0) {
    throw new Error(`表格读取失败：${meta.msg ?? '未知错误'}`);
  }
  const sheets = meta.data?.sheets ?? [];
  const parts: string[] = [];
  for (const sheet of sheets.slice(0, 10)) {
    const range = await feishuGet(
      `${FEISHU_BASE}/sheets/v2/spreadsheets/${spreadsheetToken}/values/${sheet.sheet_id}!A1:Z200`,
      token,
    );
    const values = (range as { data?: { valueRange?: { values?: string[][] } } })?.data
      ?.valueRange?.values;
    if (values?.length) {
      parts.push(`# ${sheet.title ?? sheet.sheet_id}`);
      parts.push(
        ...values.map((row) =>
          row.map((cell) => String(cell ?? '')).join('\t'),
        ),
      );
    }
  }
  return parts.join('\n');
}

async function resolveWiki(wikiToken: string, token: string): Promise<DocRef> {
  const data = (await feishuGet(
    `${FEISHU_BASE}/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
    token,
  )) as {
    code?: number;
    msg?: string;
    data?: { node?: { obj_token?: string; obj_type?: string } };
  };
  if (data.code !== 0 || !data.data?.node?.obj_token) {
    throw new Error(`知识库节点读取失败：${data.msg ?? '未知错误'}（请确认应用已被添加为知识库成员）`);
  }
  const objTypeMap: Record<string, DocRef['type']> = {
    docx: 'docx',
    doc: 'doc',
    sheet: 'sheet',
    bitable: 'bitable',
  };
  return {
    type: objTypeMap[data.data.node.obj_type ?? ''] ?? 'docx',
    token: data.data.node.obj_token,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      url?: string;
      appId?: string;
      appSecret?: string;
    };

    if (!body.appId?.trim() || !body.appSecret?.trim()) {
      return NextResponse.json(
        {
          error:
            '未配置飞书应用凭证。请前往「设置」页填写飞书自建应用的 App ID 与 App Secret，并为应用开通文档读取权限。',
          code: 'FEISHU_NOT_CONFIGURED',
        },
        { status: 400 },
      );
    }

    const ref = body.url ? parseFeishuUrl(body.url) : null;
    if (!ref) {
      return NextResponse.json(
        { error: '无法识别的飞书链接，请粘贴完整的文档/知识库/表格链接' },
        { status: 400 },
      );
    }

    const tenantToken = await getTenantToken(body.appId, body.appSecret);
    let target = ref;
    if (ref.type === 'wiki') {
      target = await resolveWiki(ref.token, tenantToken);
    }

    let text = '';
    let titleType = target.type;
    if (target.type === 'docx' || target.type === 'doc') {
      text = await readDocx(target.token, tenantToken);
    } else if (target.type === 'sheet') {
      text = await readSheet(target.token, tenantToken);
    } else {
      return NextResponse.json(
        { error: '暂不支持多维表格（Base）链接，请使用文档或电子表格' },
        { status: 400 },
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: '文档内容为空，或应用没有该文档的阅读权限（请在文档中添加应用为协作者）' },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text: text.slice(0, 200_000),
      docType: titleType,
      length: text.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '飞书文档读取失败';
    const status = message.includes('鉴权') ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
