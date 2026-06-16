/**
 * JP Chat addon API service
 * Matches backend: Route::prefix('jpchat')->middleware(['auth:sanctum', 'jpchat.api.auth'])
 * Base: buildApiUrl('/jpchat') => .../api/jpchat
 */
import { getAuthToken } from './authStorage';
import { buildApiUrl, getCommonHeaders, getChatAttachmentsBaseUrl } from '../config/api';

const JPCHAT_BASE = '/jpchat';

export interface ChatOtherParticipant {
  id: number;
  name: string;
  logo: string;
  type: 'user' | 'company';
  status: 'online' | 'offline';
  slug?: string;
  last_seen_at?: string;
  last_activity_at?: string;
}

export interface ChatConversation {
  id: number;
  company?: { id: number; name: string; logo?: string; slug?: string } | null;
  user?: { id: number; name: string; logo?: string } | null;
  other_participant: ChatOtherParticipant;
  last_message?: {
    message: string;
    message_type: string;
    created_at: string;
  } | null;
  unread_count: number;
  last_message_at: string;
}

export interface ChatAttachment {
  id: number;
  file_name: string;
  file_url: string;
  /** Relative path (e.g. 2026/03/xxx.png) when provided by API; used to build display URL */
  file_path?: string;
  thumbnail_url?: string | null;
  file_type: string;
  mime_type: string;
  file_size: number;
  formatted_size: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_type: 'user' | 'company';
  message: string;
  message_type: 'text' | 'image' | 'file';
  is_read: boolean;
  is_own: boolean;
  created_at: string;
  reactions?: Array<{ emoji: string; count: number; users: Array<{ id: number; type: string }> }>;
  reply_to?: { message_id: number; message_preview: string } | null;
  attachments: ChatAttachment[];
}

export interface ChatJob {
  id: number;
  title: string;
  created_at: string;
  chat_count: number;
}

class ChatService {
  private async getToken(): Promise<string | null> {
    return getAuthToken();
  }

  private async chatFetch<T>(
    endpoint: string,
    options: { method?: string; body?: any; formData?: FormData } = {}
  ): Promise<{ success: boolean; data?: T; message?: string }> {
    const token = await this.getToken();
    if (!token) return { success: false, message: 'Not authenticated' };

    const url = buildApiUrl(`${JPCHAT_BASE}${endpoint}`);
    const headers: Record<string, string> = {
      ...getCommonHeaders(token),
    };

    let body: string | FormData | undefined;
    if (options.formData) {
      delete headers['Content-Type'];
      body = options.formData;
    } else if (options.body) {
      body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
      });
      const rawText = await res.text();
      let json: any = {};
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch {
        json = { _raw: rawText?.slice(0, 500) };
      }
      const ok = res.ok && (json.success !== false);
      if (!ok) {
        console.warn('[ChatService] request failed', {
          url,
          status: res.status,
          statusText: res.statusText,
          body: json,
        });
      }
      const message = json.message || (res.status === 401 ? 'Unauthenticated' : res.status === 500 ? 'Server error' : undefined);
      return { success: ok, data: json.data ?? json, message: message || (ok ? undefined : 'Request failed') };
    } catch (e: any) {
      console.warn('[ChatService] fetch error', { url, error: e?.message ?? String(e) });
      return { success: false, message: String(e) };
    }
  }

  async getConversations(filter?: 'all' | 'unlocked' | 'byjobs' | 'unread', jobId?: number): Promise<{ success: boolean; data?: ChatConversation[]; message?: string }> {
    let qs = '';
    if (filter) qs += `filter=${filter}`;
    if (jobId != null) qs += (qs ? '&' : '') + `job_id=${jobId}`;
    const endpoint = qs ? `/conversations?${qs}` : '/conversations';
    const res = await this.chatFetch<ChatConversation[] | { conversations?: ChatConversation[]; data?: ChatConversation[]; list?: ChatConversation[] }>(endpoint);
    const raw = res.data as any;
    let list: any[] | undefined;
    if (Array.isArray(raw)) list = raw;
    else if (raw && typeof raw === 'object') {
      list = raw.conversations ?? raw.data ?? raw.list ?? raw.chats;
    }
    const normalized = Array.isArray(list)
      ? list.map((c: any) => {
          const id = c.id ?? c.conversation_id ?? c.conversation?.id;
          const conv = c.conversation ?? c;
          const other = conv.other_participant ?? conv.otherParticipant ?? conv.user ?? conv.company;
          const unreadCount = Number(conv.unread_count ?? conv.unread_count_user ?? conv.unread_count_company ?? 0);
          return { ...conv, id: id ?? conv.id, other_participant: other ?? conv.other_participant, unread_count: unreadCount } as ChatConversation;
        })
      : [];
    if (__DEV__ && normalized.length === 0) {
      const hint = Array.isArray(raw) ? `API returned empty array (length ${raw.length})` : raw && typeof raw === 'object' ? `API keys: ${Object.keys(raw).join(', ')}` : 'no data';
      console.warn('[ChatService] getConversations empty list:', hint);
    }
    return { ...res, data: normalized };
  }

  /** Total unread messages across all conversations (for badge). */
  async getUnreadCount(): Promise<number> {
    const res = await this.getConversations();
    if (!res.success || !Array.isArray(res.data)) return 0;
    return res.data.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
  }

  async getJobs(search?: string): Promise<{ success: boolean; data?: ChatJob[]; message?: string }> {
    const endpoint = search ? `/jobs?search=${encodeURIComponent(search)}` : '/jobs';
    const res = await this.chatFetch<ChatJob[]>(endpoint);
    const list = Array.isArray(res.data) ? res.data : (res.data as any)?.jobs;
    return { ...res, data: Array.isArray(list) ? list : [] };
  }

  private normalizeMessage(raw: any): ChatMessage {
    if (!raw || typeof raw !== 'object') return raw;
    const attachments = this.normalizeMessageAttachments(raw);
    return { ...raw, attachments } as ChatMessage;
  }

  async getMessages(conversationId: number, search?: string): Promise<{ success: boolean; data?: ChatMessage[]; message?: string }> {
    const endpoint = search
      ? `/conversations/${conversationId}/messages?search=${encodeURIComponent(search)}`
      : `/conversations/${conversationId}/messages`;
    const res = await this.chatFetch<ChatMessage[] | { messages?: ChatMessage[] }>(endpoint);
    const list = Array.isArray(res.data) ? res.data : (res.data as any)?.messages;
    const normalized = Array.isArray(list) ? list.map((m: any) => this.normalizeMessage(m)) : [];
    return { ...res, data: normalized };
  }

  async getNewMessages(conversationId: number, sinceMessageId: number): Promise<{ success: boolean; data?: ChatMessage[]; message?: string }> {
    const res = await this.chatFetch<ChatMessage[] | { messages?: ChatMessage[] }>(
      `/conversations/${conversationId}/messages/new?since=${sinceMessageId}`
    );
    const list = Array.isArray(res.data) ? res.data : (res.data as any)?.messages;
    const normalized = Array.isArray(list) ? list.map((m: any) => this.normalizeMessage(m)) : [];
    return { ...res, data: normalized };
  }

  async sendMessage(conversationId: number, body: { message?: string; reply_to?: number }): Promise<{ success: boolean; data?: ChatMessage; message?: string }> {
    return this.chatFetch<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body,
    });
  }

  async sendMessageWithFile(conversationId: number, formData: FormData): Promise<{ success: boolean; data?: ChatMessage; message?: string }> {
    return this.chatFetch<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      formData,
    });
  }

  async markAsRead(conversationId: number): Promise<{ success: boolean; message?: string }> {
    return this.chatFetch(`/conversations/${conversationId}/read`, { method: 'PUT' });
  }

  /** Normalize conversation so .id is always set (API may return id, conversation_id, or data.conversation). */
  private normalizeConversation(raw: any): ChatConversation | null {
    if (!raw || typeof raw !== 'object') return null;
    const id = Number(raw.id ?? raw.conversation_id ?? raw.conversation?.id);
    if (!id || !Number.isFinite(id)) return null;
    const conv = raw.conversation ?? raw;
    return { ...conv, id } as ChatConversation;
  }

  async startConversation(userId: number): Promise<{ success: boolean; data?: ChatConversation; message?: string }> {
    const res = await this.chatFetch<ChatConversation>(`/start/${userId}`, { method: 'POST' });
    const normalized = res.data ? this.normalizeConversation(res.data) : null;
    return { ...res, data: normalized ?? undefined };
  }

  async editMessage(messageId: number, message: string): Promise<{ success: boolean; data?: ChatMessage; message?: string }> {
    return this.chatFetch<ChatMessage>(`/messages/${messageId}`, { method: 'PUT', body: { message } });
  }

  async deleteMessage(messageId: number): Promise<{ success: boolean; message?: string }> {
    return this.chatFetch(`/messages/${messageId}`, { method: 'DELETE' });
  }

  async toggleReaction(messageId: number, emoji: string): Promise<{ success: boolean; message?: string }> {
    return this.chatFetch(`/messages/${messageId}/reaction`, { method: 'POST', body: { emoji } });
  }

  getAttachmentDownloadUrl(attachmentId: number): string {
    return buildApiUrl(`${JPCHAT_BASE}/attachments/${attachmentId}/download`);
  }

  /**
   * Normalize a single attachment from API (handles path, file_path, url, file_url, filename, etc.).
   * Prefer file_url from API only when it looks complete (has file extension). Otherwise build from file_path.
   */
  normalizeAttachment(raw: any): ChatAttachment {
    if (!raw || typeof raw !== 'object') {
      return { id: 0, file_name: '', file_url: '', file_type: 'file', mime_type: '', file_size: 0, formatted_size: '' } as ChatAttachment;
    }
    const path = (raw.file_path ?? raw.path ?? raw.storage_path ?? raw.filename ?? '').toString().trim();
    const url = (raw.file_url ?? raw.url ?? '').toString().trim();
    const name = raw.file_name ?? raw.name ?? raw.original_name ?? raw.filename ?? '';
    const filePath = path || (url && !url.startsWith('http') ? url : undefined);
    const cleanPath = path ? path.replace(/^\//, '').replace(/^public\/?/, '').replace(/^chat\/attachments\//, '') : '';
    const base = getChatAttachmentsBaseUrl();
    // Use API url only if it looks like a complete file URL (has extension). Else build from path so we never end up with .../2026/03/1
    const urlPathPart = url.replace(/^.*\/chat\/attachments\//, '').split('?')[0];
    const urlHasExtension = /\.[a-z0-9]+$/i.test(urlPathPart);
    const lastSegment = urlPathPart.split('/').pop() || '';
    const urlLooksComplete = url.startsWith('http') && url.includes('/chat/attachments/') && (urlHasExtension || lastSegment.length > 12);
    const fileUrl = urlLooksComplete ? url : (cleanPath ? `${base}/${cleanPath}` : url || '');
    return {
      ...raw,
      id: Number(raw.id) || 0,
      file_name: (typeof name === 'string' ? name : '') || (cleanPath ? cleanPath.split('/').pop() || '' : ''),
      file_url: fileUrl,
      file_path: filePath || (cleanPath || undefined),
      file_type: raw.file_type ?? raw.type ?? 'file',
      mime_type: raw.mime_type ?? raw.mime ?? '',
      file_size: Number(raw.file_size) || 0,
      formatted_size: raw.formatted_size ?? raw.file_size ?? '',
    } as ChatAttachment;
  }

  /**
   * Normalize message attachments array (API may return attachment singular, file, or attachments with different keys).
   * When API returns attachments: [] but includes .attachment or .file (e.g. after upload), use those.
   */
  normalizeMessageAttachments(msg: any): ChatAttachment[] {
    if (!msg || typeof msg !== 'object') return [];
    const arr = Array.isArray(msg.attachments) ? msg.attachments : [];
    const singleAttachment = msg.attachment ?? msg.file;
    const list = arr.length > 0 ? arr : (singleAttachment != null ? [singleAttachment] : []);
    const normalized = list.map((a: any) => this.normalizeAttachment(a)).filter((a: ChatAttachment) => a.file_url || a.file_path || a.file_name);
    if (__DEV__ && normalized.length > 0 && msg.id) {
      const first = list[0];
      console.log('[ChatService] normalizeMessageAttachments', { msgId: msg.id, rawKeys: first ? Object.keys(first) : [], raw_file_url: first?.file_url, raw_file_path: first?.file_path, normalizedCount: normalized.length, firstNorm: normalized[0] ? { file_url: normalized[0].file_url?.slice(0, 80), file_path: normalized[0].file_path } : null });
    }
    return normalized;
  }

  /**
   * Get display URL for a chat attachment (images, etc.).
   * Prefer full file_url from API. If we only have a path like "2026/03/1" (id, no filename), use download-by-id.
   */
  getAttachmentDisplayUrl(att: { file_url?: string; file_path?: string; path?: string; url?: string; storage_path?: string; file_name?: string; filename?: string; id?: number }): string {
    const base = getChatAttachmentsBaseUrl();
    const filePath = (att.file_path ?? att.path ?? att.storage_path ?? att.filename ?? '').toString().trim();
    const fileUrl = (att.file_url ?? att.url ?? '').toString().trim();

    // Trace: URL resolution (remove when issue is fixed)
    if (__DEV__ && (att.id || fileUrl || filePath)) {
      const result = this.getAttachmentDisplayUrlImpl(att, base, filePath, fileUrl);
      console.log('[ChatService] getAttachmentDisplayUrl', { attId: att.id, file_url: fileUrl?.slice(0, 90), file_path: filePath?.slice(0, 60), result: result?.slice(0, 100) });
      return result;
    }
    return this.getAttachmentDisplayUrlImpl(att, base, filePath, fileUrl);
  }

  private getAttachmentDisplayUrlImpl(
    att: { file_url?: string; file_path?: string; path?: string; url?: string; storage_path?: string; file_name?: string; filename?: string; id?: number },
    base: string,
    filePath: string,
    fileUrl: string
  ): string {
    const clean = (p: string) => p.replace(/^\//, '').replace(/^public\/?/, '').replace(/^chat\/attachments\//, '');

    // If file_path has a proper filename (with extension), build URL from it first – avoids truncated file_url from API
    if (filePath) {
      const path = clean(filePath);
      if (path && !path.startsWith('http') && /\.[a-z0-9]+$/i.test(path)) {
        const fromPath = `${base}/${path}`;
        return fromPath;
      }
    }

    // Prefer full URL from API (must look like a real file: has extension or long path segment)
    if (fileUrl.startsWith('http') && fileUrl.includes('/chat/attachments/')) {
      const pathPart = fileUrl.replace(/^.*\/chat\/attachments\//, '').split('?')[0];
      const hasExtension = /\.[a-z0-9]+$/i.test(pathPart);
      const lastSegment = pathPart.split('/').pop() || '';
      if (hasExtension || lastSegment.length > 12) return fileUrl;
    }

    const pathToUse = filePath || fileUrl;
    let built = '';

    if (pathToUse && typeof pathToUse === 'string') {
      const path = clean(pathToUse);
      if (path && !path.startsWith('http')) built = `${base}/${path}`;
    }
    if (!built && fileUrl.includes('attachments/')) {
      const m = fileUrl.match(/attachments\/(.+?)(?:\?|$)/);
      if (m) built = `${base}/${m[1]}`;
    }
    if (!built) {
      const yearMonthFile = fileUrl.match(/(\d{4}\/\d{2}\/[^/?#]+)/) || (pathToUse && pathToUse.match(/(\d{4}\/\d{2}\/[^/?#]+)/));
      if (yearMonthFile) built = `${base}/${yearMonthFile[1]}`;
    }
    if (!built) {
      const path = pathToUse ? clean(pathToUse.toString()) : '';
      if (path && !path.startsWith('http')) built = `${base}/${path}`;
    }
    if (!built) {
      const fileName = (att.file_name ?? att.filename ?? '').toString().trim();
      if (fileName) built = `${base}/${fileName}`;
    }

    // If built URL looks like .../YYYY/MM/id (no extension), it won't load; use download-by-id
    if (built) {
      const pathPart = built.replace(/^.*\/chat\/attachments\//, '').split('?')[0];
      const hasExtension = /\.[a-z0-9]+$/i.test(pathPart);
      const lastSegment = pathPart.split('/').pop() || '';
      if (!hasExtension && /^\d+$/.test(lastSegment) && att.id) return this.getAttachmentDownloadUrl(Number(att.id));
    }

    return built || (att.id ? this.getAttachmentDownloadUrl(Number(att.id)) : '');
  }

  /** POST jpchat/status/activity - update presence */
  async updateActivity(): Promise<{ success: boolean }> {
    return this.chatFetch('/status/activity', { method: 'POST' });
  }

  /** POST jpchat/status/typing - body: { conversation_id, is_typing } */
  async updateTyping(conversationId: number, isTyping: boolean): Promise<{ success: boolean }> {
    return this.chatFetch('/status/typing', {
      method: 'POST',
      body: { conversation_id: conversationId, is_typing: isTyping },
    });
  }

  /** GET jpchat/status/typing/{conversationId} */
  async getTypingStatus(conversationId: number): Promise<{ success: boolean; data?: { is_typing?: boolean; user?: any } }> {
    return this.chatFetch<{ is_typing?: boolean; user?: any }>(`/status/typing/${conversationId}`);
  }

  /** GET jpchat/status/{userId}/{userType} - userType: 'user' | 'company' */
  async getUserStatus(userId: number, userType: 'user' | 'company'): Promise<{ success: boolean; data?: { status?: string; last_seen_at?: string } }> {
    return this.chatFetch<{ status?: string; last_seen_at?: string }>(`/status/${userId}/${userType}`);
  }
}

export const chatService = new ChatService();
export default chatService;
