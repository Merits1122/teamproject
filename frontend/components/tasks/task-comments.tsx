"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, parseISO, differenceInSeconds } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, MessageSquare, Send, Trash2, Edit } from "lucide-react";
import { apiCall } from "@/lib/api";
import { ApiComment } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const getInitials = (name?: string | null): string => name ? name.charAt(0).toUpperCase() : "U";

const formatCommentTimestamp = (timestamp?: string): string => {
    if (!timestamp) return "방금 전";
    const date = parseISO(timestamp);
    if (differenceInSeconds(new Date(), date) < 60) {
        return "방금 전";
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};

interface TaskCommentsProps {
  taskId: number | string;
  currentUserId?: number;
  canModify: boolean;
  isAdmin?: boolean;
  onCommentAdded: () => void;
}

export function TaskComments({ taskId, currentUserId, canModify, isAdmin, onCommentAdded }: TaskCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    const response = await apiCall<ApiComment[]>(`/api/tasks/${taskId}/comments`);
    if (response.success) {
      setComments(response.data);
    }
    setIsLoading(false);
  }, [taskId, toast]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    const response = await apiCall<ApiComment>(`/api/tasks/${taskId}/comments`, {
      method: "POST", body: JSON.stringify({ content: newComment }),
    });

    if (response.success) {
      setComments(prev => [...prev, response.data]);
      setNewComment("");
      onCommentAdded();
      toast({ 
        description: "댓글이 등록되었습니다." 
      });
    } else {
      toast({ 
        title: "댓글 작성 실패", 
        description: response.error.message, 
        variant: "destructive" 
      });
    }
    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editedContent.trim()) return;
    const originalComments = [...comments];
    const updatedComment = comments.find(c => c.id === commentId);
    if (!updatedComment) return;

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editedContent } : c));
    setEditingCommentId(null);

    const response = await apiCall<ApiComment>(`/api/comments/${commentId}`, {
        method: "PUT", body: JSON.stringify({ content: editedContent }),
    });

    if (!response.success) {
      toast({ 
        title: "댓글 수정 실패", 
        description: response.error.message, 
        variant: "destructive"
      });
      setComments(originalComments);
    } else {
      toast({ description: "댓글이 수정되었습니다."});
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const originalComments = [...comments];
    setComments(prev => prev.filter(c => c.id !== commentId));
    
    const response = await apiCall(`/api/comments/${commentId}`, { method: 'DELETE' });

    if (!response.success) {
      toast({ 
        title: "댓글 삭제 실패", 
        description: response.error.message, 
        variant: "destructive"
      });
      setComments(originalComments);
    } else {
      toast({ description: "댓글이 삭제되었습니다."});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />
      <h3 className="text-lg font-semibold">댓글 ({comments.length})</h3>
    </div>

      {isLoading ? (<div className="text-center text-muted-foreground py-4">댓글을 불러오는 중...</div>)
      : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={comment.user.avatarUrl || undefined} />
                <AvatarFallback>{getInitials(comment.user.name)}</AvatarFallback>
              </Avatar>
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{comment.user.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCommentTimestamp(comment.createdAt)}</p>
                  </div>
                  {(currentUserId === comment.user.id || isAdmin) && (
                    <div className="flex items-center gap-1">
                      {currentUserId === comment.user.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCommentId(comment.id); setEditedContent(comment.content); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>댓글을 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteComment(comment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <div className="space-y-2 mt-2">
                    <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="min-h-[80px]" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingCommentId(null)}>취소</Button>
                      <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>저장</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : ( <div className="text-center text-muted-foreground py-4 border rounded-md">댓글이 없습니다.</div> )}

      {canModify && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">새 댓글 작성</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="댓글을 입력하세요... (Ctrl+Enter로 전송)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={isSubmitting || !newComment.trim()}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  댓글 등록
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}