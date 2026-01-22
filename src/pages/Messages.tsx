import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Send, Users, MessageSquare, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Profile, ChatRoom, Message } from "@/types/database";

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  type: "dm" | "room";
  userId?: string;
  roomId?: string;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New conversation dialog
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  // New room dialog
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [isRoomPrivate, setIsRoomPrivate] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Add message if it's part of current conversation
          if (
            selectedConversation &&
            ((selectedConversation.type === "dm" &&
              (newMsg.sender_id === selectedConversation.userId ||
                newMsg.recipient_id === selectedConversation.userId)) ||
              (selectedConversation.type === "room" &&
                newMsg.room_id === selectedConversation.roomId))
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
          // Refresh conversations to update last message
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch employees for new conversation
      const { data: employeesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .neq("user_id", user.id)
        .order("first_name");

      setEmployees((employeesData as unknown as Profile[]) || []);

      // Fetch chat rooms user is member of
      const { data: roomMemberships } = await supabase
        .from("chat_room_members")
        .select("room_id")
        .eq("user_id", user.id);

      const roomIds = roomMemberships?.map((m) => m.room_id) || [];

      // Fetch public rooms and rooms user is member of
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("*")
        .or(`is_private.eq.false,id.in.(${roomIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
        .order("name");

      setRooms((roomsData as unknown as ChatRoom[]) || []);

      // Build conversations list
      const convos: Conversation[] = [];

      // Get DM conversations
      const { data: dmMessages } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(*)")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .is("room_id", null)
        .order("created_at", { ascending: false });

      const dmPartners = new Map<string, { profile: Profile; lastMessage: Message }>();
      
      for (const msg of dmMessages || []) {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (partnerId && !dmPartners.has(partnerId)) {
          const partner = employeesData?.find((e: Profile) => e.user_id === partnerId);
          if (partner) {
            dmPartners.set(partnerId, {
              profile: partner as unknown as Profile,
              lastMessage: msg as unknown as Message,
            });
          }
        }
      }

      dmPartners.forEach((data, partnerId) => {
        convos.push({
          id: partnerId,
          name: `${data.profile.first_name} ${data.profile.last_name}`,
          avatar: data.profile.avatar_url || undefined,
          lastMessage: data.lastMessage.content,
          lastMessageAt: data.lastMessage.created_at,
          unreadCount: 0, // Could be calculated
          type: "dm",
          userId: partnerId,
        });
      });

      // Add room conversations
      for (const room of roomsData || []) {
        const { data: lastRoomMsg } = await supabase
          .from("messages")
          .select("*")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        convos.push({
          id: room.id,
          name: room.name,
          lastMessage: lastRoomMsg?.content,
          lastMessageAt: lastRoomMsg?.created_at,
          unreadCount: 0,
          type: "room",
          roomId: room.id,
        });
      }

      // Sort by last message
      convos.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching messages data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation || !user) return;

    try {
      let query = supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(*)")
        .order("created_at", { ascending: true });

      if (selectedConversation.type === "dm" && selectedConversation.userId) {
        query = query
          .is("room_id", null)
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${selectedConversation.userId}),and(sender_id.eq.${selectedConversation.userId},recipient_id.eq.${user.id})`
          );
      } else if (selectedConversation.type === "room" && selectedConversation.roomId) {
        query = query.eq("room_id", selectedConversation.roomId);
      }

      const { data } = await query;
      setMessages((data as unknown as Message[]) || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setIsSending(true);
    try {
      const messageData: any = {
        content: newMessage.trim(),
        sender_id: user.id,
      };

      if (selectedConversation.type === "dm") {
        messageData.recipient_id = selectedConversation.userId;
      } else {
        messageData.room_id = selectedConversation.roomId;
      }

      const { error } = await supabase.from("messages").insert(messageData);

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = () => {
    if (!selectedEmployee) return;

    const employee = employees.find((e) => e.user_id === selectedEmployee);
    if (!employee) return;

    const existingConvo = conversations.find(
      (c) => c.type === "dm" && c.userId === selectedEmployee
    );

    if (existingConvo) {
      setSelectedConversation(existingConvo);
    } else {
      const newConvo: Conversation = {
        id: selectedEmployee,
        name: `${employee.first_name} ${employee.last_name}`,
        avatar: employee.avatar_url || undefined,
        unreadCount: 0,
        type: "dm",
        userId: selectedEmployee,
      };
      setConversations((prev) => [newConvo, ...prev]);
      setSelectedConversation(newConvo);
    }

    setIsNewConversationOpen(false);
    setSelectedEmployee("");
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    try {
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: newRoomName,
          description: newRoomDescription || null,
          is_private: isRoomPrivate,
          created_by: profile.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin member
      await supabase.from("chat_room_members").insert({
        room_id: room.id,
        user_id: user.id,
        is_admin: true,
      });

      toast.success("Room created successfully!");
      setIsNewRoomOpen(false);
      setNewRoomName("");
      setNewRoomDescription("");
      setIsRoomPrivate(false);
      fetchData();
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Connect with colleagues
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose someone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsNewConversationOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleStartConversation} disabled={!selectedEmployee}>
                    Start Chat
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
            <DialogTrigger asChild>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                New Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Chat Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomDescription">Description (optional)</Label>
                  <Input
                    id="roomDescription"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isRoomPrivate}
                    onChange={(e) => setIsRoomPrivate(e.target.checked)}
                  />
                  <Label htmlFor="isPrivate">Private room (invite only)</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewRoomOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Room</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex h-[calc(100%-5rem)] border rounded-lg overflow-hidden bg-background">
        {/* Conversations List */}
        <div className="w-80 border-r flex flex-col">
          <Tabs defaultValue="all" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-12 px-2">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="dms" className="flex-1">DMs</TabsTrigger>
              <TabsTrigger value="rooms" className="flex-1">Rooms</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="all" className="m-0">
                <ConversationsList
                  conversations={conversations}
                  selectedId={selectedConversation?.id}
                  onSelect={setSelectedConversation}
                />
              </TabsContent>
              <TabsContent value="dms" className="m-0">
                <ConversationsList
                  conversations={conversations.filter((c) => c.type === "dm")}
                  selectedId={selectedConversation?.id}
                  onSelect={setSelectedConversation}
                />
              </TabsContent>
              <TabsContent value="rooms" className="m-0">
                <ConversationsList
                  conversations={conversations.filter((c) => c.type === "room")}
                  selectedId={selectedConversation?.id}
                  onSelect={setSelectedConversation}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="h-16 border-b flex items-center px-4 gap-3">
                {selectedConversation.type === "dm" ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.avatar} />
                    <AvatarFallback>
                      {selectedConversation.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedConversation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.type === "dm" ? "Direct Message" : "Chat Room"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {message.sender
                              ? `${message.sender.first_name[0]}${message.sender.last_name[0]}`
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {selectedConversation.type === "room" && !isOwn && (
                            <p className="text-xs font-medium mb-1 opacity-80">
                              {message.sender?.first_name} {message.sender?.last_name}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="h-16 border-t flex items-center px-4 gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No conversation selected</h3>
                <p className="text-muted-foreground">
                  Select a conversation or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationsList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (c: Conversation) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div>
      {conversations.map((convo) => (
        <button
          key={convo.id}
          onClick={() => onSelect(convo)}
          className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left ${
            selectedId === convo.id ? "bg-muted" : ""
          }`}
        >
          {convo.type === "dm" ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={convo.avatar} />
              <AvatarFallback>
                {convo.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{convo.name}</p>
            {convo.lastMessage && (
              <p className="text-sm text-muted-foreground truncate">
                {convo.lastMessage}
              </p>
            )}
          </div>
          {convo.lastMessageAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(convo.lastMessageAt), {
                addSuffix: false,
              })}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
