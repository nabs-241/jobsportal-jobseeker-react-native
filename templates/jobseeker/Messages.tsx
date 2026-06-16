import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { buildApiUrl, buildCompanyLogoUrl } from '../../config/api';

interface Message {
  id: number;
  message: string;
  created_at: string;
  is_seeker: boolean;
  sender_name?: string;
  sender_avatar?: string;
}

interface Conversation {
  id: number;
  company_name: string;
  company_logo?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  job_title?: string;
}

interface MessagesProps {
  onBack?: () => void;
  onLogout?: () => void;
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
}

const Messages: React.FC<MessagesProps> = ({
  onBack,
  onLogout,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToJobSearch,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
        const [sending, setSending] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
 
   const navigationFunctions: NavigationFunctions = {
    onNavigateToJobDetail,
    onNavigateToJobAlerts,
    onNavigateToMyFollowings,
    onNavigateToEditProfile,
    onNavigateToBuildResume,
    onNavigateToMyApplications,
    onNavigateToFavouriteJobs,
    onNavigateToJobSearch,
    onNavigateToProfile,
    onNavigateToMessages,
    onNavigateToCompanies,
    onNavigateToPackages,
    onNavigateToPaymentHistory,
  };

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }
      
      const apiUrl = buildApiUrl('/my-messages');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

             if (response.ok) {
         const data = await response.json();
         
         if (data.success && data.data) {
           // Transform API data to match frontend interface
           const transformedConversations = data.data.map((item: any) => ({
             id: item.id,
             company_name: item.name || 'Unknown Company',
             company_logo: item.logo || null,
             last_message: item.last_message?.message || 'No message content',
             last_message_time: item.last_message?.created_at || new Date().toISOString(),
             unread_count: item.message_count || 0,
             job_title: null // API doesn't provide job title
           }));
           
           setConversations(transformedConversations);
         } else {
           Alert.alert('Error', `API Error: ${data.message || 'No data received'}`);
         }
       } else {
        const errorText = await response.text();
        Alert.alert('Error', `HTTP ${response.status}: ${errorText || 'Failed to load conversations'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Network Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: number) => {
    try {
      setLoadingMessages(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(buildApiUrl(`/seeker-append-messages?company_id=${conversationId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
  
        if (data.success && data.data && data.data.messages) {
          const rawMessages = data.data.messages;
        
        
          const transformedMessages = rawMessages.map((msg: any) => ({
            id: msg.id,
            message: msg.message,
            created_at: msg.created_at,
            is_seeker: msg.is_seeker,
            sender_name: msg.sender_name,
          }));
        
          setMessages(transformedMessages);
        } else {
          Alert.alert('Error', data.message || 'No messages found');
        }
      } else {
        const errorText = await response.text();
        Alert.alert('Error', `HTTP ${response.status}: ${errorText || 'Failed to load messages'}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };


  const markMessagesAsRead = async (conversationId: number) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      
      // Call your existing API endpoint
      const response = await fetch(buildApiUrl('/change-message-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender_id: conversationId, // Using sender_id as per your API
        }),
      });
      
      if (response.ok) {
        // Update local conversation to remove unread count
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        ));
      }
    } catch (error) {
      // Error marking messages as read
    }
  };
  

  

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(buildApiUrl('/seeker-submit-messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: selectedConversation.id,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNewMessage('');
          // Refresh messages
          await fetchMessages(selectedConversation.id);
          // Refresh conversations to update unread count
          await fetchConversations();
        } else {
          const errorText = await response.text();
          Alert.alert('Error', `HTTP ${response.status}: ${errorText}`);
        }
      } else {
        const errorText = await response.text();
        Alert.alert('Error', `HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

     // Get auth token from storage
   const getAuthToken = async () => {
     try {
       const token = await AsyncStorage.getItem('authToken');
       return token;
     } catch (error) {
       return null;
     }
   };

       // Get current user ID from stored user
    const getCurrentUserId = async (): Promise<number | null> => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (!userJson) return null;
        const user = JSON.parse(userJson);
        return user.id || null;
      } catch (error) {
        return null;
      }
    };

  // Format timestamp

// Format timestamp
const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`;
    
    // Format as date if older than a week
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    return 'Invalid date';
  }
};


  // Handle conversation selection
  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Go back to conversations list
  const goBackToConversations = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

     useEffect(() => {
     fetchConversations();
   }, []);

   // Scroll to bottom when messages change
   useEffect(() => {
     if (messages.length > 0) {
       setTimeout(() => {
         scrollViewRef.current?.scrollToEnd({ animated: true });
       }, 100);
     }
   }, [messages]);

  // Render conversations list
  const renderConversationsList = () => (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <Header
        title="Messages"
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />
      


      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchConversations}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {loading && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
                 ) : conversations.length > 0 ? (
           <View style={styles.conversationsContainer}>
             {conversations.map((conversation) => {
               // Safety check for required fields
               if (!conversation || !conversation.id) {
                 return null;
               }
               
               return (
                 <TouchableOpacity
                   key={conversation.id}
                   style={styles.conversationItem}
                   onPress={() => selectConversation(conversation)}
                 >
                <View style={styles.companyInfo}>
                                     <View style={styles.companyLogo}>
                     {conversation.company_logo ? (
                       <Image 
                         source={{ uri: buildCompanyLogoUrl(conversation.company_logo) }}
                         style={styles.companyLogoImage}
                         defaultSource={require('../../assets/company-placeholder.png')}
                       />
                     ) : (
                       <Text style={styles.companyLogoText}>
                         {conversation.company_name ? conversation.company_name.charAt(0).toUpperCase() : '?'}
                       </Text>
                     )}
                   </View>
                                     <View style={styles.conversationDetails}>
                     <Text style={styles.companyName}>{conversation.company_name || 'Unknown Company'}</Text>
                     {conversation.job_title && (
                       <Text style={styles.jobTitle}>{conversation.job_title}</Text>
                     )}
                     <Text style={styles.lastMessage} numberOfLines={1}>
                       {conversation.last_message || 'No message content'}
                     </Text>
                     <Text style={styles.lastMessageTime}>
                       {conversation.last_message_time ? formatTime(conversation.last_message_time) : 'Unknown time'}
                     </Text>
                   </View>
                </View>
                                 {conversation.unread_count > 0 && (
                   <View style={styles.unreadBadge}>
                     <Text style={styles.unreadCount}>{conversation.unread_count}</Text>
                   </View>
                 )}
               </TouchableOpacity>
               );
             })}
           </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              When employers contact you, their messages will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
    </SafeAreaView>
  );

     // Render chat view
   const renderChatView = () => (
    <SafeAreaView style={styles.safeArea}>
     <KeyboardAvoidingView 
       style={styles.container} 
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
     >
       <Header
         title={selectedConversation?.company_name || 'Chat'}
         onMenuPress={() => setSidebarVisible(true)}
         onBack={goBackToConversations}
         showBack={true}
       />
 
       <ScrollView 
         ref={scrollViewRef}
         style={styles.chatContainer} 
         showsVerticalScrollIndicator={false}
         onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
       >
         {loadingMessages ? (
           <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color="#007AFF" />
             <Text style={styles.loadingText}>Loading messages...</Text>
           </View>
         ) : (
           <View style={styles.messagesContainer}>
             {messages.map((message, index) => (
                               <View
                  key={message.id || index}
                  style={[
                    styles.messageWrapper,
                    message.is_seeker ? styles.outgoingMessageWrapper : styles.incomingMessageWrapper,
                  ]}
                >
                  {/* Debug info - remove this later */}
                  <Text style={styles.senderLabel}>
                    {message.is_seeker ? 'You' : selectedConversation?.company_name || 'Company'}
                  </Text>
                  
                  <View
                    style={[
                      styles.messageBubble,
                      message.is_seeker ? styles.outgoingMessage : styles.incomingMessage,
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      message.is_seeker ? styles.outgoingMessageText : styles.incomingMessageText,
                    ]}>
                      {message.message}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      message.is_seeker ? styles.outgoingMessageTime : styles.incomingMessageTime,
                    ]}>
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
             ))}
           </View>
         )}
       </ScrollView>
 
       <View style={styles.inputContainer}>
         <View style={styles.inputWrapper}>
           <TextInput
             style={styles.messageInput}
             placeholder="Type a message..."
             placeholderTextColor="#999"
             value={newMessage}
             onChangeText={setNewMessage}
             multiline
             maxLength={500}
             onFocus={() => {
               setTimeout(() => {
                 scrollViewRef.current?.scrollToEnd({ animated: true });
               }, 100);
             }}
           />
           <TouchableOpacity
             style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
             onPress={sendMessage}
             disabled={!newMessage.trim() || sending}
           >
                           {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialIcons name="send" size={20} color="#ffffff" />
              )}
           </TouchableOpacity>
         </View>
       </View>
     </KeyboardAvoidingView>
     </SafeAreaView>
   );

  return (
    <>
      {selectedConversation ? renderChatView() : renderConversationsList()}

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={(action) => {
          setSidebarVisible(false);
          const success = handleNavigation({
            action,
            userType: 'seeker',
            navigationFunctions,
            onLogout: onLogout || onBack || (() => {}),
          });
          if (!success) {
            // Navigation failed
          }
        }}
        onLogout={onLogout || onBack || (() => {})}
      />

     
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  conversationsContainer: {
    gap: 12,
  },
     conversationItem: {
     flexDirection: 'row',
     backgroundColor: '#ffffff',
     paddingVertical: 16,
     alignItems: 'center',
     marginBottom: 1,
   },
  companyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
     companyLogo: {
     width: 56,
     height: 56,
     borderRadius: 28,
     marginRight: 16,
     backgroundColor: '#007AFF',
     justifyContent: 'center',
     alignItems: 'center',
     shadowColor: '#007AFF',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.2,
     shadowRadius: 4,
     elevation: 3,
   },
   companyLogoImage: {
     width: 56,
     height: 56,
     borderRadius: 28,
   },
  companyLogoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationDetails: {
    flex: 1,
  },
     companyName: {
     fontSize: 17,
     fontWeight: '700',
     color: '#1a1a1a',
     marginBottom: 4,
   },
   jobTitle: {
     fontSize: 14,
     color: '#007AFF',
     marginBottom: 6,
     fontWeight: '500',
   },
   lastMessage: {
     fontSize: 15,
     color: '#666666',
     marginBottom: 6,
     lineHeight: 20,
   },
   lastMessageTime: {
     fontSize: 12,
     color: '#999999',
     fontWeight: '500',
   },
     unreadBadge: {
     backgroundColor: '#007AFF',
     borderRadius: 14,
     minWidth: 28,
     height: 28,
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 10,
     shadowColor: '#007AFF',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.3,
     shadowRadius: 4,
     elevation: 3,
   },
     unreadCount: {
     color: '#ffffff',
     fontSize: 13,
     fontWeight: '700',
   },
     messagesContainer: {
     gap: 12,
     paddingBottom: 20,
   },
   messageWrapper: {
     marginBottom: 8,
     paddingHorizontal: 16,
   },
   incomingMessageWrapper: {
     alignItems: 'flex-start',
   },
   outgoingMessageWrapper: {
     alignItems: 'flex-end',
   },
   messageBubble: {
     maxWidth: '75%',
     minWidth: 80,
     padding: 12,
     borderRadius: 18,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
     elevation: 2,
   },
   incomingMessage: {
     backgroundColor: '#fff',
     borderBottomLeftRadius: 6,
   },
   outgoingMessage: {
     backgroundColor: '#25D366',
     borderBottomRightRadius: 6,
   },
   messageText: {
     fontSize: 16,
     lineHeight: 22,
     marginBottom: 4,
   },
   incomingMessageText: {
     color: '#1a1a1a',
   },
   outgoingMessageText: {
     color: '#ffffff',
   },
   messageTime: {
     fontSize: 11,
     textAlign: 'right',
   },
   incomingMessageTime: {
     color: '#999999',
   },
   outgoingMessageTime: {
     color: 'rgba(255, 255, 255, 0.9)',
   },
     inputContainer: {
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      paddingVertical: 16,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,   
   },
   inputWrapper: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     backgroundColor: '#fff',
     borderRadius: 40,
     paddingHorizontal: 10,
     paddingLeft: 15,
     paddingVertical: 8,
     borderWidth: 1,
     borderColor: '#e0e0e0',
   },
     messageInput: {
     flex: 1,
     backgroundColor: 'transparent',
     paddingHorizontal: 0,
     paddingVertical: 8,
     marginRight: 12,
     maxHeight: 100,
     fontSize: 16,
     color: '#1a1a1a',
   },
     sendButton: {
     backgroundColor: '#25D366',
     width: 36,
     height: 36,
     borderRadius: 18,
     justifyContent: 'center',
     alignItems: 'center',
     shadowColor: '#25D366',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.3,
     shadowRadius: 4,
     elevation: 4,
   },
     sendButtonDisabled: {
     backgroundColor: '#cccccc',
   },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
     emptyStateSubtitle: {
     fontSize: 16,
     color: '#666666',
     textAlign: 'center',
     lineHeight: 24,
     paddingHorizontal: 20,
   },
   senderLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
    marginLeft: 4,
  },

});

export default Messages;
