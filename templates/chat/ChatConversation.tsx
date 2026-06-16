import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import chatService, { ChatConversation as ChatConversationType, ChatMessage } from '../../services/chatService';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '😊', '😎', '😘', '🥳', '🔥', '👏', '💯', '✨', '🎉'];

interface ChatConversationProps {
  conversation: ChatConversationType;
  userType: 'seeker' | 'company';
  onBack: () => void;
}

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatLastSeen = (dateStr: string | undefined) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
};

const POLL_INTERVAL_MS = 4000;

const HEADER_HEIGHT = 56;

const ChatConversation: React.FC<ChatConversationProps> = ({ conversation, userType, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; preview: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageForReaction, setMessageForReaction] = useState<ChatMessage | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Mark user as online when viewing conversation
  useEffect(() => {
    chatService.updateActivity().catch(() => {});
    const interval = setInterval(() => chatService.updateActivity().catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversationId = conversation?.id != null ? Number(conversation.id) : null;
  const hasValidConversation = conversationId != null && Number.isFinite(conversationId);

  const other = conversation?.other_participant;
  const displayName = other?.name ?? t('chat');
  const status = other?.status ?? 'offline';
  const lastSeen = other?.last_seen_at ?? other?.last_activity_at;
  const statusLabel = status === 'online'
    ? t('online')
    : (formatLastSeen(lastSeen) ? t('last_seen_at', { time: formatLastSeen(lastSeen) }) : t('offline'));

  /** Dedupe messages by id (keep last occurrence) so we never have duplicate keys. */
  const dedupeMessagesById = useCallback((list: ChatMessage[]) => {
    const seen = new Set<number>();
    const out: ChatMessage[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const id = Number(list[i].id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.unshift(list[i]);
    }
    return out;
  }, []);

  const loadMessages = useCallback(async () => {
    if (conversationId == null || !Number.isFinite(conversationId)) return;
    setLoadError(null);
    const res = await chatService.getMessages(conversationId);
    if (res.success && res.data) {
      setMessages(dedupeMessagesById(res.data));
      setLoadError(null);
      chatService.markAsRead(conversationId);
    } else {
      const msg = res.message ?? '';
      setLoadError(msg.toLowerCase().includes('unauthorized') ? t('unauthorized_chat_access') : msg || t('something_went_wrong'));
    }
  }, [conversationId, t]);

  useEffect(() => {
    if (!hasValidConversation) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages, hasValidConversation]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (messages.length > 0) {
        const lastId = Math.max(...messages.map((m) => m.id));
        chatService.getNewMessages(conversationId!, lastId).then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => Number(m.id)));
              const newOnes = (res.data || []).filter((m) => !existingIds.has(Number(m.id)));
              if (newOnes.length === 0) return prev;
              return dedupeMessagesById([...prev, ...newOnes]);
            });
          }
        });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, messages.length]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending || conversationId == null || !Number.isFinite(conversationId)) return;
    Keyboard.dismiss();
    setInputText('');
    setReplyTo(null);
    setSending(true);
    const res = await chatService.sendMessage(conversationId, {
      message: text,
      reply_to: replyTo?.id,
    });
    setSending(false);
    if (res.success && res.data) {
      const msg = normalizeSentMessage(res.data);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  /** Ensure sent message shows as own (blue, right) and attachments array is normalized - API may return attachment singular or different keys. */
  const normalizeSentMessage = (raw: any): ChatMessage => ({
    ...raw,
    is_own: true,
    sender_type: userType === 'company' ? 'company' : 'user',
    attachments: chatService.normalizeMessageAttachments(raw),
  });

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0] || !conversationId) return;
    const asset = result.assets[0];
    setSending(true);
    const formData = new FormData();
    formData.append('message', '');
    formData.append('attachment', {
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? 'image.jpg',
    } as any);
    const res = await chatService.sendMessageWithFile(conversationId, formData);
    setSending(false);
    if (res.success && res.data) {
      const raw = res.data as any;
      // API often returns message with attachments: [] and puts the file in .attachment or .file
      const merged =
        Array.isArray(raw.attachments) && raw.attachments.length === 0 && (raw.attachment != null || raw.file != null)
          ? { ...raw, attachments: [raw.attachment ?? raw.file] }
          : raw;
      const msg = normalizeSentMessage(merged);
      setMessages((prev) => {
        const id = Number(msg.id);
        if (prev.some((m) => Number(m.id) === id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      // If still no attachments (e.g. API only returns empty array), refetch so we get server version with attachments
      if (!msg.attachments?.length && (msg.message_type === 'image' || msg.message_type === 'file')) {
        setTimeout(() => loadMessages(), 600);
      }
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    setMessageForReaction(null);
    const res = await chatService.toggleReaction(messageId, emoji);
    if (res.success) loadMessages();
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  /** Bottom padding: when keyboard visible use 0; when hidden use safe area for nav bar */
  const BOTTOM_NAV_HEIGHT = Platform.OS === 'android' ? 48 : 16;
  const inputBottomPadding = keyboardVisible ? 0 : BOTTOM_NAV_HEIGHT;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Chat header: back, name, status (like web) */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.chatHeaderBack} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.chatHeaderStatusRow}>
            <View style={[styles.chatHeaderStatusDot, status === 'online' ? styles.statusOnline : styles.statusOffline]} />
            <Text style={styles.chatHeaderStatusText} numberOfLines={1}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.chatHeaderRight} />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E5CD0" />
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <MaterialIcons name="lock" size={48} color="#94A3B8" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('no_messages_msg')}</Text>
              </View>
            ) : (
              <>
              {messages.map((msg) => {
                const hasAttachments = (msg.attachments?.length ?? 0) > 0;
                const isImageMsg = msg.message_type === 'image';
                if (__DEV__ && (hasAttachments || isImageMsg)) {
                  const firstAtt = msg.attachments?.[0];
                  const imgUri = firstAtt ? chatService.getAttachmentDisplayUrl(firstAtt) : '';
                  const wouldShowImage = hasAttachments && firstAtt && (firstAtt.mime_type || '').startsWith('image/') && imgUri;
                  if (!msg.message && !wouldShowImage && (hasAttachments || isImageMsg)) {
                    if (false) console.log('[Chat] empty bubble', { msgId: msg.id, message_type: msg.message_type, attachmentsCount: msg.attachments?.length ?? 0, firstAttId: firstAtt?.id, firstAtt_file_url: (firstAtt as any)?.file_url, imgUri: imgUri ? 'set' : 'empty' });
                  }
                }
                return (
                <View key={`msg-${msg.id}`} style={[styles.bubbleWrap, msg.is_own ? styles.bubbleOwn : styles.bubbleOther]}>
                  <View style={[styles.bubble, msg.is_own ? styles.bubbleOwnBg : styles.bubbleOtherBg]}>
                    {msg.reply_to?.message_preview && (
                      <View style={[styles.replyPreview, msg.is_own ? styles.replyPreviewOwn : styles.replyPreviewOther]}>
                        <Text style={[styles.replyPreviewText, msg.is_own ? styles.replyPreviewTextOwn : styles.replyPreviewTextOther]} numberOfLines={1}>{msg.reply_to.message_preview}</Text>
                      </View>
                    )}
                    {msg.attachments?.length > 0 &&
                      msg.attachments.map((att) => {
                        const isImage = (att.mime_type || '').startsWith('image/') || (att.file_type || '').toLowerCase().includes('image');
                        const imgUri = chatService.getAttachmentDisplayUrl(att);
                        // Trace: attachment display (remove when issue is fixed)
                        if (__DEV__) {
                          const branch = isImage && imgUri ? 'IMAGE' : isImage && !imgUri ? 'PLACEHOLDER' : 'FILE';
                          if (false) console.log('[Chat] attachment', { msgId: msg.id, attId: att.id, file_url: (att as any).file_url, file_path: (att as any).file_path, mime: att.mime_type, isImage, imgUri: imgUri ? imgUri.slice(0, 100) : '', branch });
                        }
                        if (isImage && imgUri) {
                          return (
                            <View key={`img-${msg.id}-${att.id}-${imgUri}`} style={styles.attachImageWrap}>
                              <Image source={{ uri: imgUri }} style={styles.attachImage} resizeMode="cover" />
                            </View>
                          );
                        }
                        if (isImage && !imgUri) {
                          return (
                            <View key={`img-placeholder-${msg.id}-${att.id}`} style={styles.attachImageWrap}>
                              <Text style={[styles.attachLabel, msg.is_own ? styles.attachLabelOwn : styles.attachLabelOther]}>📷 {att.file_name || 'Image'}</Text>
                            </View>
                          );
                        }
                        return (
                          <Text key={att.id} style={[styles.attachLabel, msg.is_own ? styles.attachLabelOwn : styles.attachLabelOther]}>
                            📎 {att.file_name}
                          </Text>
                        );
                      })}
                    {/* Message-type image with no attachments: try message-level file_url/path (some APIs return path here) */}
                    {msg.message_type === 'image' && (!msg.attachments || msg.attachments.length === 0) && (() => {
                      const msgLevelAtt = {
                        file_url: (msg as any).file_url,
                        file_path: (msg as any).file_path,
                        path: (msg as any).path,
                        url: (msg as any).url,
                        file_name: (msg as any).file_name,
                      };
                      const msgLevelUrl = chatService.getAttachmentDisplayUrl(msgLevelAtt);
                      if (msgLevelUrl) {
                        return (
                          <View key={`img-msg-${msg.id}`} style={styles.attachImageWrap}>
                            <Image source={{ uri: msgLevelUrl }} style={styles.attachImage} resizeMode="cover" />
                          </View>
                        );
                      }
                      return null;
                    })()}
                    {(msg.message || (msg.message_type === 'image' && (!msg.attachments || msg.attachments.length === 0) && !chatService.getAttachmentDisplayUrl({ file_url: (msg as any).file_url, file_path: (msg as any).file_path, path: (msg as any).path }))) && (
                      <Text style={[styles.bubbleText, msg.is_own ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                        {msg.message || (msg.message_type === 'image' ? '📷 Image' : msg.message_type === 'file' ? '📎 File' : '')}
                      </Text>
                    )}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <View style={styles.reactionsRow}>
                        {msg.reactions.map((r: any, i: number) => (
                          <Text key={i} style={styles.reactionEmoji}>{r.emoji} {r.count > 1 ? r.count : ''}</Text>
                        ))}
                      </View>
                    )}
                    <View style={[styles.bubbleFooterRow, msg.is_own ? styles.bubbleFooterOwn : styles.bubbleFooterOther]}>
                      <Text style={[styles.bubbleTime, msg.is_own ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
                        {formatTime(msg.created_at)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setMessageForReaction(msg)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.msgActionBtn}
                      >
                        <MaterialIcons name="more-horiz" size={16} color={msg.is_own ? 'rgba(255,255,255,0.8)' : '#94A3B8'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
              })}
              </>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>
          {replyTo && (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarPreview} numberOfLines={1}>{replyTo.preview}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.inputRow, { paddingBottom: inputBottomPadding }]}>
            <TouchableOpacity style={styles.emojiBtn} onPress={() => setShowEmojiPicker(true)}>
              <MaterialIcons name="emoji-emotions" size={24} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={sending}>
              <MaterialIcons name="attach-file" size={24} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={t('type_message')}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Message action: Reply + Reactions */}
      <Modal visible={!!messageForReaction} transparent animationType="fade">
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setMessageForReaction(null)}
        >
          <View style={styles.messageActionBar}>
            <TouchableOpacity
              style={styles.messageActionItem}
              onPress={() => {
                if (messageForReaction) {
                  setReplyTo({ id: messageForReaction.id, preview: (messageForReaction.message || '').slice(0, 50) });
                  setMessageForReaction(null);
                }
              }}
            >
              <MaterialIcons name="reply" size={22} color="#2E5CD0" />
              <Text style={styles.messageActionText}>{t('reply')}</Text>
            </TouchableOpacity>
            <View style={styles.reactionQuickRow}>
              {EMOJI_LIST.slice(0, 6).map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionQuickBtn}
                  onPress={() => messageForReaction && handleReaction(messageForReaction.id, emoji)}
                >
                  <Text style={styles.reactionQuickText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEmojiPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.emojiOverlay} activeOpacity={1} onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.emojiModal} onStartShouldSetResponder={() => true}>
            <View style={styles.emojiModalHeader}>
              <Text style={styles.emojiModalTitle}>{t('select_emoji')}</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.emojiGrid}>
              {EMOJI_LIST.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiCell}
                  onPress={() => { insertEmoji(emoji); setShowEmojiPicker(false); }}
                >
                  <Text style={styles.emojiCellText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: HEADER_HEIGHT + (Platform.OS === 'ios' ? 44 : 36),
  },
  chatHeaderBack: { padding: 8, marginRight: 4 },
  chatHeaderCenter: { flex: 1, minWidth: 0 },
  chatHeaderName: { fontSize: 17, fontWeight: '600', color: '#1E293B' },
  chatHeaderStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  chatHeaderStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusOnline: { backgroundColor: '#22C55E' },
  statusOffline: { backgroundColor: '#94A3B8' },
  chatHeaderStatusText: { fontSize: 13, color: '#64748B' },
  chatHeaderRight: { width: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  errorText: { fontSize: 15, color: '#64748B', marginTop: 16, textAlign: 'center', paddingHorizontal: 24 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  replyBarPreview: { flex: 1, fontSize: 13, color: '#475569' },
  replyBarClose: { padding: 4 },
  bubbleWrap: { marginBottom: 8 },
  bubbleOwn: { alignItems: 'flex-end' },
  bubbleOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    position: 'relative',
  },
  bubbleOwnBg: { backgroundColor: '#2E5CD0', borderBottomRightRadius: 4 },
  bubbleOtherBg: { backgroundColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  replyPreview: { marginBottom: 4, paddingLeft: 8, borderLeftWidth: 3 },
  replyPreviewOwn: { borderLeftColor: 'rgba(255,255,255,0.5)' },
  replyPreviewOther: { borderLeftColor: 'rgba(0,0,0,0.2)' },
  replyPreviewText: { fontSize: 12 },
  replyPreviewTextOwn: { color: 'rgba(255,255,255,0.9)' },
  replyPreviewTextOther: { color: 'rgba(0,0,0,0.6)' },
  bubbleFooterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  bubbleFooterOwn: { justifyContent: 'flex-end' },
  bubbleFooterOther: { justifyContent: 'flex-start' },
  msgActionBtn: { padding: 4 },
  bubbleText: { fontSize: 15 },
  bubbleTextOwn: { color: '#fff' },
  bubbleTextOther: { color: '#1E293B' },
  attachLabel: { fontSize: 12, marginTop: 4 },
  attachLabelOwn: { color: 'rgba(255,255,255,0.9)' },
  attachLabelOther: { color: '#64748B' },
  attachImageWrap: { marginTop: 6, borderRadius: 8, overflow: 'hidden', maxWidth: 200 },
  attachImage: { width: 200, height: 150 },
  bubbleTime: { fontSize: 11 },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.8)' },
  bubbleTimeOther: { color: '#64748B' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 3 },
  reactionEmoji: { fontSize: 14 },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  messageActionBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  messageActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  messageActionText: { fontSize: 15, color: '#2E5CD0', marginLeft: 8, fontWeight: '600' },
  reactionQuickRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  reactionQuickBtn: { padding: 5, margin: 2 },
  reactionQuickText: { fontSize: 22 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  emojiBtn: { padding: 8, marginRight: 4 },
  attachBtn: { padding: 8, marginRight: 4 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E5CD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  emojiModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: 320,
  },
  emojiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  emojiModalTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  emojiCell: {
    width: '20%',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellText: { fontSize: 28 },
});

export default ChatConversation;
